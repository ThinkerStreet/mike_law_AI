"""Drop-in ThinkerStreet Law blueprint.

Chat content is forwarded to Groq and is not written to a database or file by
this module. Browser session history is managed by the accompanying JavaScript.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from flask import Blueprint, current_app, jsonify, render_template, request


mikeoss_law = Blueprint("mikeoss_law", __name__)

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_DEFAULT_MODELS = {
    "fast": "llama-3.1-8b-instant",
    "smart": "openai/gpt-oss-120b",
    "deep": "qwen/qwen3-32b",
}
_SYSTEM_PROMPT = """You are ThinkerStreet Law, a legal work assistant for lawyers.
Help analyze, organize, compare, and draft legal material. Distinguish facts,
assumptions, and conclusions. Never invent authorities or quotations. When a
claim depends on current law or an unprovided source, say that verification is
required. Your output is work product for lawyer review, not legal advice to a
client. Use concise Markdown."""


def _model_for(tier: str) -> str:
    defaults = _DEFAULT_MODELS
    return os.getenv(f"GROQ_{tier.upper()}_MODEL", defaults[tier])


def _clean_messages(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        raise ValueError("messages must be a list")
    cleaned: list[dict[str, str]] = []
    for item in value[-20:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue
        content = content.strip()
        if content:
            cleaned.append({"role": role, "content": content[:16000]})
    if not cleaned or cleaned[-1]["role"] != "user":
        raise ValueError("the final message must be from the user")
    return cleaned


@mikeoss_law.get("/law")
def law_page():
    return render_template("mikeoss/law.html")


@mikeoss_law.post("/api/law/chat")
def law_chat():
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return jsonify(error="Law AI is not configured."), 503

    payload = request.get_json(silent=True) or {}
    tier = payload.get("tier", "smart")
    if tier not in _DEFAULT_MODELS:
        return jsonify(error="Unknown intelligence level."), 400

    try:
        messages = _clean_messages(payload.get("messages"))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    upstream_body = json.dumps(
        {
            "model": _model_for(tier),
            "messages": [{"role": "system", "content": _SYSTEM_PROMPT}, *messages],
            "temperature": 0.2,
            "max_tokens": 3000,
            "stream": False,
        }
    ).encode("utf-8")
    upstream_request = urllib.request.Request(
        _GROQ_URL,
        data=upstream_body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(upstream_request, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
        answer = result["choices"][0]["message"]["content"]
        return jsonify(answer=answer, model=_model_for(tier))
    except (
        urllib.error.HTTPError,
        urllib.error.URLError,
        TimeoutError,
        IndexError,
        KeyError,
        TypeError,
        json.JSONDecodeError,
    ):
        current_app.logger.warning("ThinkerStreet Law provider request failed")
        return jsonify(error="The model could not complete this request. Please try again."), 502
