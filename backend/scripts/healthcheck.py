#!/usr/bin/env python3
"""
Health check monitor for api.bankread.ai.
Runs standalone via cron — no FastAPI or Docker dependencies.

Checks:
  1. GET  /           → expects {"status": "ok"}
  2. POST /api/v1/auth/login with bad creds → expects 401

On failure, sends an alert email via the Resend HTTP API.
On success, exits silently.

Env vars (sourced from .env.production):
  RESEND_API_KEY
  CONTACT_EMAIL
"""

import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = "https://api.bankread.ai"
TIMEOUT = 10  # seconds


def check_health():
    """GET / — should return {"status": "ok"}."""
    url = f"{BASE_URL}/"
    req = urllib.request.Request(url, method="GET")
    resp = urllib.request.urlopen(req, timeout=TIMEOUT)
    body = json.loads(resp.read())
    if resp.status != 200 or body.get("status") != "ok":
        return f"GET / returned status {resp.status}, body: {body}"
    return None


def check_login_stack():
    """POST /api/v1/auth/login with bad creds — should return 401."""
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = json.dumps({"email": "healthcheck@invalid.test", "password": "invalid"}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        # If we get here, it means 2xx — that's wrong for bad creds
        return f"POST /api/v1/auth/login returned {resp.status} (expected 401)"
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return None  # expected
        return f"POST /api/v1/auth/login returned {e.code} (expected 401)"


def send_alert(failures):
    api_key = os.environ.get("RESEND_API_KEY", "")
    to_email = os.environ.get("CONTACT_EMAIL", "")
    if not api_key or not to_email:
        print("RESEND_API_KEY or CONTACT_EMAIL not set — cannot send alert", file=sys.stderr)
        sys.exit(2)

    body_text = "The following health checks failed for api.bankread.ai:\n\n"
    for f in failures:
        body_text += f"  - {f}\n"
    body_text += "\nCheck the server immediately."

    payload = json.dumps({
        "from": "BankRead Alerts <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "ALERT: api.bankread.ai health check failed",
        "text": body_text,
    }).encode()

    req = urllib.request.Request("https://api.resend.com/emails", data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {api_key}")

    try:
        urllib.request.urlopen(req, timeout=TIMEOUT)
    except Exception as e:
        print(f"Failed to send alert email: {e}", file=sys.stderr)
        sys.exit(2)


def main():
    failures = []

    for name, check in [("health", check_health), ("login-stack", check_login_stack)]:
        try:
            result = check()
            if result:
                failures.append(result)
        except Exception as e:
            failures.append(f"{name}: {e}")

    if failures:
        print(f"Health check failed: {failures}", file=sys.stderr)
        send_alert(failures)
        sys.exit(1)


if __name__ == "__main__":
    main()
