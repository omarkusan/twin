"""Operational visibility without collecting personal information.

Events are emitted as single-line JSON (CloudWatch Logs Insights friendly).
They contain request ids, latency, token usage, versions and error codes.
They never contain message text, model output, IP addresses, or secrets;
session and client identifiers are one-way hashed.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any

logger = logging.getLogger("twin")
logger.setLevel(logging.INFO)
if not logger.handlers and not logging.getLogger().handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)

# Approximate USD per 1M tokens (input, output). Override with MODEL_PRICING_JSON, e.g.
# {"amazon.nova-pro-v1:0": [0.8, 3.2]}. Unknown models report cost as null.
_DEFAULT_PRICING: dict[str, tuple[float, float]] = {
    "amazon.nova-micro-v1:0": (0.035, 0.14),
    "amazon.nova-lite-v1:0": (0.06, 0.24),
    "amazon.nova-pro-v1:0": (0.80, 3.20),
}


def _pricing() -> dict[str, tuple[float, float]]:
    table = dict(_DEFAULT_PRICING)
    raw = os.getenv("MODEL_PRICING_JSON")
    if raw:
        try:
            for model, (inp, out) in json.loads(raw).items():
                table[model] = (float(inp), float(out))
        except (ValueError, TypeError):
            pass
    return table


def estimate_cost_usd(model_id: str, input_tokens: int | None, output_tokens: int | None) -> float | None:
    if input_tokens is None or output_tokens is None:
        return None
    key = model_id.split(".", 1)[1] if model_id.split(".", 1)[0] in {"global", "us", "eu", "apac"} else model_id
    prices = _pricing().get(key)
    if not prices:
        return None
    return round((input_tokens * prices[0] + output_tokens * prices[1]) / 1_000_000, 6)


def short_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:10]


def log_event(event: str, **fields: Any) -> None:
    record = {"event": event, "ts": round(time.time(), 3), **fields}
    logger.info(json.dumps(record, default=str, separators=(",", ":")))
