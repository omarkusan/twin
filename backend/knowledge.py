"""Structured knowledge source for the digital twin.

The single source of truth is ``content/profile.json`` (repo root). The website
renders it and the twin is grounded on it. At deploy time ``deploy.py`` copies
it next to this module as ``data/profile.json`` so the Lambda package is
self-contained.

The profile is small (a few thousand tokens), so the *whole* profile is placed
in the system prompt: that is the most reliable form of grounding and needs no
vector database. A lightweight lexical retriever is used only to (a) tell the
UI which documented sections an answer most likely relates to and (b) pick
relevant follow-up questions.
"""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent


def _profile_candidates() -> list[Path]:
    env_path = os.getenv("PROFILE_PATH")
    candidates = [Path(env_path)] if env_path else []
    candidates += [
        _HERE / "data" / "profile.json",  # Lambda package
        _HERE.parent / "content" / "profile.json",  # repository checkout
    ]
    return candidates


@lru_cache(maxsize=1)
def load_profile() -> dict[str, Any]:
    for path in _profile_candidates():
        if path.is_file():
            with path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
    raise FileNotFoundError("profile.json not found. Looked in: " + ", ".join(str(p) for p in _profile_candidates()))


@dataclass(frozen=True)
class Document:
    id: str
    type: str  # profile | experience | skills | project | learning | education
    title: str
    text: str
    followups: tuple[str, ...] = field(default_factory=tuple)
    is_this_site: bool = False  # the project that IS this website; "this twin" / "this site" refers to it


def _join(items: list[str] | None) -> str:
    return "; ".join(items or [])


def build_documents(profile: dict[str, Any] | None = None) -> list[Document]:
    p = profile or load_profile()
    followups = p.get("twin", {}).get("followups", {})
    docs: list[Document] = []

    prof = p["profile"]
    docs.append(
        Document(
            id="profile",
            type="profile",
            title="Profile and summary",
            text=" ".join(
                [prof["fullName"], prof["preferredName"], prof["headline"], prof["location"], prof["summary"]]
                + prof.get("about", [])
                + [f"{x['title']} {x['body']} {x['evidence']}" for x in prof.get("principles", [])]
                + [f"{x['value']} {x['label']} {x['company']}" for x in prof.get("proofPoints", [])]
            ),
            followups=tuple(followups.get("profile", [])),
        )
    )

    for job in p["experience"]:
        docs.append(
            Document(
                id=f"experience:{job['id']}",
                type="experience",
                title=f"{job['company']} ({job['title']})",
                text=" ".join(
                    [job["company"], job["title"], job["start"], job["end"], job.get("context", "")]
                    + job.get("highlights", [])
                    + job.get("impact", [])
                    + job.get("technologies", [])
                ),
                followups=tuple(followups.get("experience", [])),
            )
        )

    for group in p["skills"]:
        docs.append(
            Document(
                id=f"skills:{group['id']}",
                type="skills",
                title=f"Skills: {group['title']}",
                text=" ".join([group["title"]] + group["items"] + [group.get("note", "")]),
                followups=tuple(followups.get("skills", [])),
            )
        )

    for proj in p["projects"]:
        docs.append(
            Document(
                id=f"project:{proj['id']}",
                type="project",
                title=proj["name"],
                text=" ".join(
                    [proj["name"], proj["kind"], proj["status"], proj["summary"], proj["problem"]]
                    + proj.get("approach", [])
                    + proj.get("stack", [])
                    + proj.get("flow", [])
                    + [proj.get("limits", "")]
                ),
                followups=tuple(followups.get("project", [])),
                is_this_site=bool(proj.get("isThisSite")),
            )
        )

    learning = p["learning"]
    learning_bits: list[str] = []
    for key in ("now", "completed", "building"):
        for item in learning.get(key, []):
            learning_bits.append(f"{item['title']} {item['detail']}")
    learning_bits += [f"{n['title']} {n['detail']}" for n in learning.get("engineeringNotes", [])]
    learning_bits.append(learning.get("focus", ""))
    docs.append(
        Document(
            id="learning",
            type="learning",
            title="Learning and AI engineering journey",
            text=" ".join(learning_bits),
            followups=tuple(followups.get("learning", [])),
        )
    )

    for edu in p.get("education", []):
        docs.append(
            Document(
                id="education",
                type="education",
                title=f"Education: {edu['institution']}",
                text=f"{edu['title']} {edu['institution']} {edu['detail']}",
                followups=tuple(followups.get("education", [])),
            )
        )
    return docs


# --------------------------------------------------------------------------- #
# Prompt rendering
# --------------------------------------------------------------------------- #


def render_knowledge(profile: dict[str, Any] | None = None) -> str:
    """Render the structured profile as Markdown for the system prompt."""
    p = profile or load_profile()
    prof = p["profile"]
    out: list[str] = []

    out.append("## PROFILE")
    out.append(f"- Name: {prof['fullName']} (goes by {prof['preferredName']})")
    out.append(f"- Headline: {prof['headline']}")
    out.append(f"- Location: {prof['location']}")
    out.append(f"- Years of professional experience: {prof['yearsExperience']}")
    out.append(f"- Summary: {prof['summary']}")
    out.append(f"- Public contact: email {prof['links']['email']}; LinkedIn {prof['links']['linkedin']}; GitHub {prof['links']['github']}")
    out.append("- Engineering principles (each backed by documented evidence):")
    for pr in prof.get("principles", []):
        out.append(f"  - {pr['title']}: {pr['body']} Evidence: {pr['evidence']}")

    out.append("\n## EXPERIENCE (most recent first)")
    for job in p["experience"]:
        out.append(f"### {job['company']}: {job['title']} ({job['start']} to {job['end']})")
        if job.get("context"):
            out.append(f"Context: {job['context']}")
        for h in job.get("highlights", []):
            out.append(f"- {h}")
        if job.get("impact"):
            out.append("Impact (documented):")
            for i in job["impact"]:
                out.append(f"- {i}")
        out.append(f"Technologies: {_join(job.get('technologies'))}")

    out.append("\n## SKILLS")
    labels = {"hands-on": "hands-on", "core": "core strength", "exploring": "EXPLORING, not established production experience"}
    for g in p["skills"]:
        note = f" Note: {g['note']}" if g.get("note") else ""
        out.append(f"- {g['title']} [{labels.get(g['status'], g['status'])}]: {_join(g['items'])}.{note}")

    out.append("\n## PROJECTS")
    for proj in p["projects"]:
        out.append(f"### {proj['name']} [{proj['status']}; {proj['kind']}]")
        out.append(f"Summary: {proj['summary']}")
        out.append(f"Problem: {proj['problem']}")
        out.append("Technical approach:")
        for a in proj.get("approach", []):
            out.append(f"- {a}")
        out.append(f"Stack: {_join(proj.get('stack'))}")
        links = proj.get("links", {})
        if links:
            out.append("Links: " + "; ".join(f"{k}: {v}" for k, v in links.items()))
        else:
            out.append("Links: none published (do not invent repository or demo URLs).")
        if proj.get("limits"):
            out.append(f"Known limits: {proj['limits']}")

    learning = p["learning"]
    out.append("\n## LEARNING AND AI JOURNEY")
    for label, key in (("In progress / exploring", "now"), ("Completed", "completed"), ("Building", "building")):
        for item in learning.get(key, []):
            out.append(f"- {label}: {item['title']}. {item['detail']}")
    for note in learning.get("engineeringNotes", []):
        out.append(f"- Engineering note: {note['title']}. {note['detail']}")
    out.append(f"- Focus: {learning.get('focus', '')}")

    out.append("\n## EDUCATION")
    for e in p.get("education", []):
        out.append(f"- {e['title']}, {e['institution']}. {e['detail']}")

    prefs = p.get("preferences", {})
    out.append("\n## COMMUNICATION STYLE AND INTERESTS")
    out.append("- Style: " + _join(prefs.get("communicationStyle")))
    out.append("- Interests: " + _join(prefs.get("interests")))

    out.append("\n## NOT DOCUMENTED (say so if asked; never guess)")
    out.append(
        "Salary expectations, availability, visa or work-authorization status, references, family or other personal life, "
        "home address, phone number, open-source contributions, publications, and measured results of the personal AI projects. "
        "Employment history beyond the entries listed above."
    )
    return "\n".join(out)


# --------------------------------------------------------------------------- #
# Lightweight retrieval (for references and follow-ups only)
# --------------------------------------------------------------------------- #

_STOPWORDS = frozenset(
    """a an and are as at be but by can do does did for from had has have how i in into is it its me my of on or
    our so than that the their then there these they this to up us was we were what when where which who why will
    with you your about tell more also any some just very really like please give explain describe walk through
    omar maimaiti aimaier experience experiences work worked working
    write wrote live lives living make made get got know say show use used using new current currently exactly real
    could would should may might much many most other another each both few such only own same too here now""".split()
)

_ALIASES = {
    "springboot": "spring",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "llms": "llm",
    "agents": "agent",
    "agentic": "agent",
    "bank": "banking",
    "twin": "twin",
    "digital": "twin",
    "website": "twin",
    "site": "twin",
}


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9+#.]+", text.lower())
    out: list[str] = []
    for w in words:
        w = w.strip(".")
        if len(w) < 2 or w in _STOPWORDS:
            continue
        w = _ALIASES.get(w, w)
        if len(w) > 4 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        out.append(w)
    return out


@dataclass(frozen=True)
class Match:
    document: Document
    score: float


_SELF_REFERENCE = re.compile(r"\b(this|your|the)\s+(digital\s+)?(twin|site|website|chatbot|bot|app)\b", re.IGNORECASE)


class Retriever:
    def __init__(self, documents: list[Document]):
        self.documents = documents
        self._doc_tokens = [set(_tokens(d.title + " " + d.text)) for d in documents]
        n = len(documents)
        df: dict[str, int] = {}
        for toks in self._doc_tokens:
            for t in toks:
                df[t] = df.get(t, 0) + 1
        self._idf = {t: math.log(1 + n / c) for t, c in df.items()}

    def search(self, query: str, k: int = 2, min_score: float = 1.2) -> list[Match]:
        q = set(_tokens(query))
        if not q:
            return []
        self_ref = bool(_SELF_REFERENCE.search(query))
        matches: list[Match] = []
        for doc, toks in zip(self.documents, self._doc_tokens):
            overlap = q & toks
            if not overlap:
                continue
            score = sum(self._idf[t] for t in overlap)
            title_tokens = set(_tokens(doc.title))
            score += 0.75 * sum(self._idf.get(t, 0) for t in q & title_tokens)
            if self_ref and doc.is_this_site:
                score += 3.0
            if score >= min_score:
                matches.append(Match(doc, score))
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:k]


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    return Retriever(build_documents())


def retrieve(query: str, k: int = 2) -> list[Match]:
    return get_retriever().search(query, k=k)


_REFERENTS = frozenset({"it", "that", "this", "there", "those", "these", "them", "he", "his", "then", "also", "more"})


def contextual_query(message: str, last_user: str) -> str:
    """Follow-ups like "what did you use there?" only make sense with the previous question."""
    words = re.findall(r"[a-z']+", message.lower())
    if last_user and (len(words) < 8 or _REFERENTS & set(words)):
        return f"{message} {last_user}"
    return message


def suggest_followups(matches: list[Match], asked: list[str], limit: int = 3) -> list[str]:
    """Pick follow-up questions related to the matched documents, falling back to unused starters."""
    asked_norm = {a.strip().lower() for a in asked}
    picks: list[str] = []

    def add(q: str) -> None:
        if q.strip().lower() not in asked_norm and q not in picks:
            picks.append(q)

    for m in matches:
        for q in m.document.followups:
            add(q)
            if len(picks) >= limit:
                return picks
    for q in load_profile().get("twin", {}).get("starters", []):
        add(q)
        if len(picks) >= limit:
            break
    return picks[:limit]
