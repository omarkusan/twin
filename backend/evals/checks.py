"""Rule-based checks shared by the offline test suite and the live evaluation runner.

They are deliberately simple and deterministic: regular-expression expectations per case
(see cases.json). They catch regressions in grounding and refusal behaviour without
needing a second model as a judge.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

CASES_PATH = Path(__file__).with_name("cases.json")

# Phrases a grounded answer uses when information is not documented or a request is declined.
ACKNOWLEDGES_MISSING = re.compile(
    r"(isn'?t|is not|aren'?t|are not|not)\s+(in|part of|covered|documented|something|available|listed|mentioned)"
    r"|doesn'?t (list|include|mention|document|contain|show)|not (listed|mentioned|included)"
    r"|don'?t have|do not have|no (documented|record|information|public|details|mention)"
    r"|can(no|')t (confirm|verify|share|speak|say|provide|help with|find|point)"
    r"|cannot (confirm|verify|share|speak|say|provide)"
    r"|unable to|not able to|haven'?t (shared|documented|published)|nothing (in|about)|no public"
    r"|isn'?t documented|outside (of )?(my|the)|not (something )?I can",
    re.IGNORECASE,
)


def load_cases() -> list[dict[str, Any]]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


def evaluate_response(case: dict[str, Any], text: str) -> list[str]:
    """Return a list of failure reasons (empty means the response passed)."""
    failures: list[str] = []
    text = text.replace("\u2019", "'").replace("\u2018", "'")  # models often emit typographic apostrophes
    patterns = case.get("must_match_any", [])
    if patterns and not any(re.search(p, text, re.IGNORECASE) for p in patterns):
        failures.append(f"none of the expected patterns matched: {patterns}")
    for p in case.get("must_not_match", []):
        if re.search(p, text, re.IGNORECASE):
            failures.append(f"forbidden pattern matched: {p}")
    if (case.get("acknowledges_missing") or case.get("refuses")) and not ACKNOWLEDGES_MISSING.search(text):
        failures.append("expected the answer to acknowledge missing information or decline")
    if not text.strip():
        failures.append("empty response")
    return failures
