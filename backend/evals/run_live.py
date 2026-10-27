"""Live evaluation of the digital twin against the real model (costs a few cents).

Not part of the default test suite. Requires AWS credentials with Amazon Bedrock access.

    cd backend
    uv run python evals/run_live.py                 # all cases
    uv run python evals/run_live.py --only extract-prompt --only missing-salary
    uv run python evals/run_live.py --json /tmp/eval.json

It exercises the real request pipeline (validation, prompt, model, post-processing) through
FastAPI's TestClient, then applies the rule-based checks in checks.py to each answer.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

os.environ["USE_S3"] = "false"
os.environ["MEMORY_DIR"] = tempfile.mkdtemp(prefix="twin-eval-")
os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "10000")

from fastapi.testclient import TestClient  # noqa: E402

import server  # noqa: E402
from checks import evaluate_response, load_cases  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", action="append", default=[], help="case id (repeatable)")
    parser.add_argument("--json", help="write results to this file")
    args = parser.parse_args()

    server.rate_limiter.limit = 10_000
    client = TestClient(server.app)
    cases = [c for c in load_cases() if not args.only or c["id"] in args.only]

    print(f"Model: {server.BEDROCK_MODEL_ID}  prompt={server.PROMPT_VERSION}  knowledge={server.knowledge_version()}")
    results = []
    for case in cases:
        session_id = str(uuid.uuid4())
        if case.get("history"):
            now = datetime.now().isoformat()
            server.save_conversation(session_id, [{**m, "timestamp": now} for m in case["history"]])

        t0 = time.perf_counter()
        resp = client.post("/chat", json={"message": case["question"], "session_id": session_id})
        latency = int((time.perf_counter() - t0) * 1000)

        if resp.status_code != 200:
            failures = [f"HTTP {resp.status_code}: {resp.json().get('detail')}"]
            text, sources = "", []
        else:
            body = resp.json()
            text, sources = body["response"], [s["id"] for s in body["sources"]]
            failures = evaluate_response(case, text)
            expected = case.get("expected_sources", [])
            if expected and not any(e in sources for e in expected):
                failures.append(f"expected a source in {expected}, got {sources}")
            if case.get("expect_no_sources") and sources:
                failures.append(f"expected no sources, got {sources}")

        results.append({"id": case["id"], "category": case["category"], "passed": not failures, "failures": failures, "latency_ms": latency, "response": text})
        mark = "PASS" if not failures else "FAIL"
        print(f"[{mark}] {case['id']:<28} {latency:>5} ms")
        for f in failures:
            print(f"        - {f}")
        if failures and text:
            print("        response: " + text.replace("\n", " ")[:300])

    by_cat: dict[str, list[bool]] = defaultdict(list)
    for r in results:
        by_cat[r["category"]].append(r["passed"])
    print("\nSummary")
    for cat, flags in sorted(by_cat.items()):
        print(f"  {cat:<22} {sum(flags)}/{len(flags)}")
    passed = sum(r["passed"] for r in results)
    print(f"  {'TOTAL':<22} {passed}/{len(results)}")

    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=2))
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
