"""Request validation helpers and a small in-process rate limiter.

The limiter is defence in depth: in Lambda each warm instance keeps its own
counters, so API Gateway throttling (configured in Terraform) remains the
global control. It still stops a single client from hammering one instance.
"""

from __future__ import annotations

import re
import threading
import time
from collections import deque

SESSION_ID_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

MAX_MESSAGE_CHARS = 2000


def is_valid_session_id(value: str) -> bool:
    """Session ids become storage keys, so only a conservative alphabet is allowed."""
    return bool(SESSION_ID_RE.match(value))


def clean_message(value: str) -> str:
    """Strip control characters and surrounding whitespace."""
    return _CONTROL_CHARS_RE.sub("", value).strip()


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, max_keys: int = 5000):
        self.limit = limit
        self.window = window_seconds
        self.max_keys = max_keys
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, now: float | None = None) -> tuple[bool, int]:
        """Record a hit. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic() if now is None else now
        with self._lock:
            if len(self._hits) > self.max_keys:
                self._evict(now)
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_after = max(1, int(self.window - (now - hits[0])) + 1)
                return False, retry_after
            hits.append(now)
            return True, 0

    def _evict(self, now: float) -> None:
        for k in [k for k, v in self._hits.items() if not v or now - v[-1] >= self.window]:
            del self._hits[k]
