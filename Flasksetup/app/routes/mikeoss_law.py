"""ThinkerStreet Law / MikeOSS Flask blueprint.

This module keeps the MikeOSS-derived law experience isolated from the main
ThinkerStreet blueprint. Chat content is sent to the configured model provider
and is not written to a database or file by this module. Browser chat history
is kept only in sessionStorage by the frontend.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from flask import Blueprint, current_app, jsonify, redirect, render_template, request


mikeoss_law = Blueprint("mikeoss_law", __name__)

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_DEFAULT_MODELS = {
    "fast": "openai/gpt-oss-20b",
    "smart": "openai/gpt-oss-120b",
    "deep": "qwen/qwen3.8-27b",
}
_SYSTEM_PROMPT = """You are ThinkerStreet Law, a legal work assistant for lawyers.
Help lawyers analyze, organize, compare, research, and draft legal material.
Distinguish facts, assumptions, authorities, and conclusions. Never invent
authorities or quotations. When a claim depends on current law or an
unprovided source, say that verification is required. Use concise Markdown
when it improves readability. Your output is work product for lawyer review,
not legal advice to a client."""


def _model_for(tier: str) -> str:
    return os.getenv(f"GROQ_{tier.upper()}_MODEL", _DEFAULT_MODELS[tier]).strip()


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


def _canonical_law_url() -> str:
    return os.getenv(
        "THINKERSTREET_LAW_URL",
        "https://law.thinkerstreet.com",
    ).rstrip("/")


def _is_law_host() -> bool:
    host = request.host.split(":", 1)[0].lower()
    return host == "law.thinkerstreet.com" or host in {"localhost", "127.0.0.1"}


@mikeoss_law.get("/law")
def law_page():
    # On the primary ThinkerStreet host, /law becomes a clean canonical redirect.
    # Nginx on law.thinkerstreet.com internally proxies / to /law while retaining
    # the law.thinkerstreet.com Host header, so the law subdomain renders here.
    if not _is_law_host() and os.getenv("LAW_CANONICAL_REDIRECT", "1") == "1":
        return redirect(_canonical_law_url(), code=302)

    return render_template(
        "mikeoss/law.html",
        zdr_enabled=os.getenv("GROQ_ZDR_ENABLED", "0") == "1",
        law_site_url=_canonical_law_url(),
    )


@mikeoss_law.post("/api/law/chat")
def law_chat():
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return jsonify(error="Law AI is not configured."), 503

    payload = request.get_json(silent=True) or {}
    tier = str(payload.get("tier", "smart")).lower()
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
            "max_completion_tokens": 3000,
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
        usage = result.get("usage") or {}
        return jsonify(
            answer=answer,
            model=_model_for(tier),
            tier=tier,
            usage=usage,
        )
    except (
        urllib.error.HTTPError,
        urllib.error.URLError,
        TimeoutError,
        IndexError,
        KeyError,
        TypeError,
        json.JSONDecodeError,
    ) as exc:
        current_app.logger.warning(
            "ThinkerStreet Law provider request failed: %s",
            exc,
        )
        return jsonify(
            error="The model could not complete this request. Please try again."
        ), 502
