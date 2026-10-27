import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "evals"))

# Configure before importing the app: local file memory in a temp dir, no real AWS calls.
os.environ["USE_S3"] = "false"
os.environ["MEMORY_DIR"] = tempfile.mkdtemp(prefix="twin-test-")
os.environ["DEFAULT_AWS_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "test"
os.environ["AWS_SECRET_ACCESS_KEY"] = "test"
os.environ["BEDROCK_MODEL_ID"] = "amazon.nova-pro-v1:0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import server  # noqa: E402


class FakeBedrock:
    """Stands in for the Bedrock runtime client. Records calls and returns scripted replies."""

    def __init__(self):
        self.calls: list[dict] = []
        self.reply = "Hello from the fake model."
        self.error: Exception | None = None

    def converse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return {
            "output": {"message": {"role": "assistant", "content": [{"text": self.reply}]}},
            "usage": {"inputTokens": 1000, "outputTokens": 50},
            "stopReason": "end_turn",
        }


@pytest.fixture()
def fake_bedrock(monkeypatch):
    fake = FakeBedrock()
    monkeypatch.setattr(server, "bedrock_client", fake)
    return fake


@pytest.fixture()
def client(fake_bedrock):
    server.rate_limiter._hits.clear()
    return TestClient(server.app)
