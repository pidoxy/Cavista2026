#!/usr/bin/env python3
"""
AidCare API Test Suite
Run: python scripts/run_api_tests.py [--base-url URL]
Requires: requests (pip install requests)
"""
import argparse
import json
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: Install requests first: pip install requests")
    sys.exit(1)

# Config
DEFAULT_BASE = "https://cavista2026-production.up.railway.app"
TEST_EMAIL = "chioma@lasuth.ng"
TEST_PASSWORD = "demo1234"


def log(msg: str, ok: bool | None = None):
    prefix = "✓" if ok is True else ("✗" if ok is False else " ")
    print(f"  {prefix} {msg}")


def run_test(name: str, fn):
    """Run a test and return (passed, message)"""
    try:
        result = fn()
        return (True, result)
    except AssertionError as e:
        return (False, str(e))
    except Exception as e:
        return (False, f"{type(e).__name__}: {e}")


def test_health(base: str):
    r = requests.get(f"{base}/health", timeout=5)
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert d.get("status") == "healthy", d
    return "OK"


def test_login(base: str):
    r = requests.post(
        f"{base}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=10,
    )
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    d = r.json()
    assert "access_token" in d, d
    assert "user" in d, d
    return d["access_token"]


def test_me(base: str, token: str):
    r = requests.get(
        f"{base}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert "name" in d, d
    return d["name"]


def test_patients_list(base: str, token: str):
    r = requests.get(
        f"{base}/patients/",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert "patients" in d, d
    total = d.get("total", 0)
    return f"total={total}"


def test_patient_detail(base: str, token: str, patient_id: str):
    r = requests.get(
        f"{base}/patients/{patient_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert "full_name" in d, d
    return d["full_name"]


def test_shift_active(base: str, token: str):
    r = requests.get(
        f"{base}/doctor/shifts/active",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    return "shift active" if d.get("shift") else "no active shift"


def test_triage_process_text(base: str):
    r = requests.post(
        f"{base}/triage/process_text",
        json={
            "transcript_text": "Patient has fever 39C and cough for 2 days. Child age 4.",
            "language": "en",
        },
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:300]}"
    d = r.json()
    assert "triage_recommendation" in d or "extracted_symptoms" in d, d
    return "OK"


def test_triage_conversation(base: str):
    r = requests.post(
        f"{base}/triage/conversation/continue",
        json={
            "conversation_history": "AI: Hello, how are you feeling?",
            "patient_message": "I have headache and fever.",
            "language": "en",
        },
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert "response" in d, d
    return "OK"


def test_handover(base: str, token: str, shift_id: str):
    r = requests.post(
        f"{base}/doctor/handover/",
        json={"shift_uuid": shift_id, "handover_notes": "Test handover"},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    assert r.status_code == 200, f"Status {r.status_code}"
    d = r.json()
    assert "critical_patients" in d or "stable_patients" in d, d
    return "OK"


def main():
    parser = argparse.ArgumentParser(description="AidCare API Test Suite")
    parser.add_argument("--base-url", default=DEFAULT_BASE, help="API base URL")
    parser.add_argument("--skip-ai", action="store_true", help="Skip AI-heavy tests (triage)")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    print("\n" + "=" * 60)
    print(" AIDCARE API TEST SUITE")
    print(f" Base URL: {base}")
    print(f" Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    results = []
    token = None
    patient_id = None
    shift_id = None

    # 1. Health
    passed, msg = run_test("Health", lambda: test_health(base))
    results.append(("Health check", passed, msg))
    log(f"Health check: {msg}", passed)
    if not passed:
        print("\n  Backend not reachable. Start it with: cd aidcare-backend && uvicorn main:app --reload")
        print("  Seed data: python seed_demo.py (creates chioma@lasuth.ng / demo1234)")
        sys.exit(1)

    # 2. Login
    passed, msg = run_test("Login", lambda: test_login(base))
    results.append(("Login", passed, msg))
    log(f"Login ({TEST_EMAIL}): {msg}", passed)
    if not passed:
        print("\n  Run seed_demo.py to create test user: chioma@lasuth.ng / demo1234")
        sys.exit(1)
    token = msg

    # 3. /auth/me
    passed, msg = run_test("/auth/me", lambda: test_me(base, token))
    results.append(("/auth/me", passed, msg))
    log(f"/auth/me: {msg}", passed)

    # 4. Patients list
    passed, msg = run_test("Patients list", lambda: test_patients_list(base, token))
    results.append(("Patients list", passed, msg))
    log(f"Patients list: {msg}", passed)

    # 5. Patient detail (if we have patients)
    r = requests.get(f"{base}/patients/", headers={"Authorization": f"Bearer {token}"}, timeout=5)
    if r.status_code == 200:
        data = r.json()
        all_p = data.get("patients", {})
        flat = (all_p.get("critical") or []) + (all_p.get("stable") or []) + (all_p.get("discharged") or [])
        if flat:
            patient_id = flat[0]["patient_id"]
            passed, msg = run_test("Patient detail", lambda: test_patient_detail(base, token, patient_id))
            results.append(("Patient detail", passed, msg))
            log(f"Patient detail ({patient_id[:8]}...): {msg}", passed)

    # 6. Shift active
    passed, msg = run_test("Shift active", lambda: test_shift_active(base, token))
    results.append(("Shift active", passed, msg))
    log(f"Shift active: {msg}", passed)
    r = requests.get(f"{base}/doctor/shifts/active", headers={"Authorization": f"Bearer {token}"}, timeout=5)
    if r.status_code == 200 and r.json().get("shift"):
        shift_id = r.json()["shift"]["shift_id"]

    # 7. Triage process_text (AI - can be slow)
    if not args.skip_ai:
        log("Triage process_text (may take 10–30s)...", None)
        passed, msg = run_test("Triage process_text", lambda: test_triage_process_text(base))
        results.append(("Triage process_text", passed, msg))
        log(f"Triage process_text: {msg}", passed)
        if not passed:
            log("  (503 = knowledge base not built; 500 = API key issue)", None)

        # 8. Triage conversation
        passed, msg = run_test("Triage conversation", lambda: test_triage_conversation(base))
        results.append(("Triage conversation", passed, msg))
        log(f"Triage conversation: {msg}", passed)
    else:
        log("Triage tests skipped (--skip-ai)", None)

    # 9. Handover (if we have a shift)
    if shift_id:
        passed, msg = run_test("Handover", lambda: test_handover(base, token, shift_id))
        results.append(("Handover", passed, msg))
        log(f"Handover: {msg}", passed)
    else:
        log("Handover: skipped (no active shift)", None)

    # Summary
    print("\n" + "-" * 60)
    passed_count = sum(1 for _, p, _ in results if p)
    total = len(results)
    print(f" Passed: {passed_count}/{total}")
    for name, p, m in results:
        log(f"{name}: {m}", p)
    print("=" * 60 + "\n")

    sys.exit(0 if passed_count == total else 1)
