import json
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    ConnectTimeoutError,
    ReadTimeoutError,
)
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from context import PROMPT_VERSION, canary, knowledge_version, prompt
from knowledge import contextual_query, retrieve, suggest_followups
from safety import MAX_MESSAGE_CHARS, SlidingWindowLimiter, clean_message, is_valid_session_id
from telemetry import estimate_cost_usd, log_event, short_hash

# Load environment variables
load_dotenv()


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "global.amazon.nova-2-lite-v1:0")
AWS_REGION = os.getenv("DEFAULT_AWS_REGION", "us-east-1")

USE_S3 = os.getenv("USE_S3", "false").lower() == "true"
S3_BUCKET = os.getenv("S3_BUCKET", "")
MEMORY_DIR = os.getenv("MEMORY_DIR", "../memory")
MEMORY_TTL_DAYS = _int_env("MEMORY_TTL_DAYS", 30)

MAX_HISTORY_MESSAGES = _int_env("MAX_HISTORY_MESSAGES", 20)  # messages sent to the model (10 exchanges)
MAX_HISTORY_CHARS = _int_env("MAX_HISTORY_CHARS", 12000)
MAX_SESSION_MESSAGES = _int_env("MAX_SESSION_MESSAGES", 80)  # hard cap per stored conversation
MAX_OUTPUT_TOKENS = _int_env("MAX_OUTPUT_TOKENS", 1200)
# API Gateway HTTP APIs time out at 30s, so fail the model call first and return a clean error.
MODEL_READ_TIMEOUT_S = _int_env("BEDROCK_READ_TIMEOUT", 24)
RATE_LIMIT_PER_MINUTE = _int_env("RATE_LIMIT_PER_MINUTE", 15)

SAFE_LEAK_REPLY = (
    "I can't share my internal instructions or configuration. I'm happy to talk about Omar's engineering background, "
    "his projects, or a technical topic, though. What would you like to know?"
)

app = FastAPI(
    title="AI Digital Twin API",
    docs_url="/docs" if os.getenv("ENABLE_DOCS") == "true" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if os.getenv("ENABLE_DOCS") == "true" else None,
)

# Configure CORS
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Bedrock client with explicit timeouts and no hidden retries (retries could exceed the gateway timeout).
bedrock_client = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION,
    config=Config(connect_timeout=5, read_timeout=MODEL_READ_TIMEOUT_S, retries={"max_attempts": 1, "mode": "standard"}),
)

if USE_S3:
    s3_client = boto3.client("s3")

rate_limiter = SlidingWindowLimiter(limit=RATE_LIMIT_PER_MINUTE, window_seconds=60)


@app.middleware("http")
async def _request_id_middleware(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex[:12]
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    return response


# --------------------------------------------------------------------------- #
# API models and errors
# --------------------------------------------------------------------------- #
class ChatRequest(BaseModel):
    message: str = Field(max_length=MAX_MESSAGE_CHARS * 2)
    session_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def _message_ok(cls, value: str) -> str:
        cleaned = clean_message(value)
        if not cleaned:
            raise ValueError("Message must not be empty.")
        if len(cleaned) > MAX_MESSAGE_CHARS:
            raise ValueError(f"Message must be at most {MAX_MESSAGE_CHARS} characters.")
        return cleaned

    @field_validator("session_id")
    @classmethod
    def _session_ok(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not is_valid_session_id(value):
            raise ValueError("Invalid session id.")
        return value


class Source(BaseModel):
    id: str
    title: str
    type: str


class ChatResponse(BaseModel):
    response: str
    session_id: str
    request_id: str
    sources: List[Source] = []
    suggestions: List[str] = []


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, headers: Optional[Dict[str, str]] = None):
        self.status = status
        self.code = code
        self.message = message
        self.headers = headers or {}


def _error_response(status: int, code: str, message: str, request_id: str, headers: Optional[Dict[str, str]] = None):
    return JSONResponse(
        status_code=status,
        content={"detail": {"code": code, "message": message, "request_id": request_id}},
        headers=headers,
    )


@app.exception_handler(ApiError)
async def _api_error_handler(request: Request, exc: ApiError):
    return _error_response(exc.status, exc.code, exc.message, getattr(request.state, "request_id", "-"), exc.headers)


@app.exception_handler(RequestValidationError)
async def _validation_handler(request: Request, exc: RequestValidationError):
    # Never echo the submitted input back; report only which field failed.
    message = "Please send a message between 1 and %d characters." % MAX_MESSAGE_CHARS
    fields = {str(e["loc"][-1]) for e in exc.errors() if e.get("loc")}
    if "session_id" in fields:
        message = "Invalid conversation id. Start a new conversation and try again."
    return _error_response(400, "invalid_request", message, getattr(request.state, "request_id", "-"))


@app.exception_handler(Exception)
async def _unhandled_handler(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", "-")
    log_event("unhandled_error", request_id=rid, error_type=type(exc).__name__)
    return _error_response(500, "internal_error", "Something went wrong on my side. Please try again.", rid)


# --------------------------------------------------------------------------- #
# Memory (conversation history)
# --------------------------------------------------------------------------- #
def get_memory_path(session_id: str) -> str:
    return f"{session_id}.json"


def load_conversation(session_id: str) -> List[Dict]:
    """Load conversation history from storage"""
    if USE_S3:
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=get_memory_path(session_id))
            return json.loads(response["Body"].read().decode("utf-8"))
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return []
            raise
    else:
        # Local file storage
        file_path = os.path.join(MEMORY_DIR, get_memory_path(session_id))
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                return json.load(f)
        return []


def save_conversation(session_id: str, messages: List[Dict]):
    """Save conversation history to storage"""
    if USE_S3:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=get_memory_path(session_id),
            Body=json.dumps(messages, indent=2),
            ContentType="application/json",
        )
    else:
        # Local file storage
        os.makedirs(MEMORY_DIR, exist_ok=True)
        file_path = os.path.join(MEMORY_DIR, get_memory_path(session_id))
        with open(file_path, "w") as f:
            json.dump(messages, f, indent=2)


def is_stale(conversation: List[Dict]) -> bool:
    """Conversations idle for longer than MEMORY_TTL_DAYS are not used as context."""
    if not conversation or MEMORY_TTL_DAYS <= 0:
        return False
    try:
        last = datetime.fromisoformat(conversation[-1]["timestamp"])
    except (KeyError, ValueError, TypeError):
        return False
    return datetime.now() - last > timedelta(days=MEMORY_TTL_DAYS)


def history_for_model(conversation: List[Dict]) -> List[Dict]:
    """Most recent turns that fit the limits, always starting with a user message."""
    recent = conversation[-MAX_HISTORY_MESSAGES:]
    total = 0
    kept: List[Dict] = []
    for msg in reversed(recent):
        total += len(msg["content"])
        if total > MAX_HISTORY_CHARS and kept:
            break
        kept.append(msg)
    kept.reverse()
    while kept and kept[0]["role"] != "user":
        kept.pop(0)
    return kept


# --------------------------------------------------------------------------- #
# Model call
# --------------------------------------------------------------------------- #
def map_model_error(exc: Exception) -> ApiError:
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"ThrottlingException", "TooManyRequestsException", "ServiceQuotaExceededException"}:
            return ApiError(429, "model_busy", "The AI service is busy right now. Please try again in a few seconds.", {"Retry-After": "5"})
        if code == "ModelTimeoutException":
            return ApiError(504, "timeout", "The answer took too long to generate. Please try again, or ask a shorter question.")
        return ApiError(503, "unavailable", "The AI service is temporarily unavailable. Please try again shortly.")
    if isinstance(exc, (ReadTimeoutError, ConnectTimeoutError)):
        return ApiError(504, "timeout", "The answer took too long to generate. Please try again, or ask a shorter question.")
    if isinstance(exc, BotoCoreError):
        return ApiError(503, "unavailable", "The AI service is temporarily unavailable. Please try again shortly.")
    return ApiError(500, "internal_error", "Something went wrong on my side. Please try again.")


def call_bedrock(history: List[Dict], user_message: str) -> Dict:
    """Call Amazon Bedrock (Converse API). The system prompt goes in the dedicated system field."""
    messages = [{"role": m["role"], "content": [{"text": m["content"]}]} for m in history]
    messages.append({"role": "user", "content": [{"text": user_message}]})

    response = bedrock_client.converse(
        modelId=BEDROCK_MODEL_ID,
        system=[{"text": prompt()}],
        messages=messages,
        inferenceConfig={"maxTokens": MAX_OUTPUT_TOKENS, "temperature": 0.4, "topP": 0.9},
    )
    blocks = response.get("output", {}).get("message", {}).get("content", [])
    text = "".join(b.get("text", "") for b in blocks).strip()
    usage = response.get("usage", {})
    return {
        "text": text,
        "input_tokens": usage.get("inputTokens"),
        "output_tokens": usage.get("outputTokens"),
        "stop_reason": response.get("stopReason"),
    }


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/")
async def root():
    return {"message": "AI Digital Twin API", "status": "ok"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "prompt_version": PROMPT_VERSION, "knowledge_version": knowledge_version()}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, http: Request):
    started = time.perf_counter()
    request_id = getattr(http.state, "request_id", None) or uuid.uuid4().hex[:12]
    session_id = request.session_id or str(uuid.uuid4())
    base = {
        "request_id": request_id,
        "session": short_hash(session_id),
        "model_id": BEDROCK_MODEL_ID,
        "prompt_version": PROMPT_VERSION,
        "knowledge_version": knowledge_version(),
    }

    def latency() -> int:
        return int((time.perf_counter() - started) * 1000)

    # 1. Rate limit per client
    client = http.client.host if http.client else "unknown"
    allowed, retry_after = rate_limiter.check(client)
    if not allowed:
        log_event("chat", status="rate_limited", error_code="rate_limited", latency_ms=latency(), client=short_hash(client), **base)
        raise ApiError(
            429,
            "rate_limited",
            "You're sending messages quickly. Please wait a moment and try again.",
            {"Retry-After": str(retry_after)},
        )

    # 2. Conversation memory
    try:
        conversation = load_conversation(session_id)
    except Exception as exc:  # storage problems must not leak details
        log_event("chat", status="error", error_code="memory_unavailable", error_type=type(exc).__name__, latency_ms=latency(), **base)
        raise ApiError(503, "unavailable", "I couldn't load our conversation just now. Please try again shortly.")
    if is_stale(conversation):
        conversation = []
    if len(conversation) >= MAX_SESSION_MESSAGES:
        log_event("chat", status="rejected", error_code="conversation_limit", latency_ms=latency(), **base)
        raise ApiError(429, "conversation_limit", "This conversation has reached its length limit. Please start a new conversation.")

    # 3. Documented references and follow-up ideas (lexical retrieval; the model still receives the full profile)
    last_user = next((m["content"] for m in reversed(conversation) if m["role"] == "user"), "")
    matches = retrieve(contextual_query(request.message, last_user))
    asked = [m["content"] for m in conversation if m["role"] == "user"] + [request.message]

    # 4. Model call
    try:
        result = call_bedrock(history_for_model(conversation), request.message)
    except Exception as exc:
        err = map_model_error(exc)
        detail = exc.response.get("Error", {}).get("Code") if isinstance(exc, ClientError) else type(exc).__name__
        log_event("chat", status="error", error_code=err.code, upstream=detail, latency_ms=latency(), **base)
        raise err

    text = result["text"]
    if not text:
        log_event("chat", status="error", error_code="empty_response", latency_ms=latency(), **base)
        raise ApiError(502, "empty_response", "I couldn't produce an answer. Please try rephrasing your question.")

    leaked = canary() in text
    if leaked:
        log_event("prompt_leak_blocked", **base)
        text = SAFE_LEAK_REPLY
        matches = []

    # 5. Persist the turn (failure to persist must not discard a good answer)
    now = datetime.now().isoformat()
    conversation.append({"role": "user", "content": request.message, "timestamp": now})
    conversation.append({"role": "assistant", "content": text, "timestamp": datetime.now().isoformat()})
    try:
        save_conversation(session_id, conversation)
    except Exception as exc:
        log_event("memory_save_failed", error_type=type(exc).__name__, **base)

    in_tok, out_tok = result["input_tokens"], result["output_tokens"]
    log_event(
        "chat",
        status="ok",
        latency_ms=latency(),
        input_tokens=in_tok,
        output_tokens=out_tok,
        est_cost_usd=estimate_cost_usd(BEDROCK_MODEL_ID, in_tok, out_tok),
        stop_reason=result["stop_reason"],
        sources=[m.document.id for m in matches],
        turns=len(conversation) // 2,
        **base,
    )

    return ChatResponse(
        response=text,
        session_id=session_id,
        request_id=request_id,
        sources=[Source(id=m.document.id, title=m.document.title, type=m.document.type) for m in matches],
        suggestions=suggest_followups(matches, asked),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
