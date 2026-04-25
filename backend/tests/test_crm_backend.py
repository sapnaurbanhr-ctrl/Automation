"""Backend tests for the CRM MVP.

Covers: auth (Bearer fallback), leads CRUD, list filters, dashboard stats,
cross-user isolation. Sessions are provisioned directly in MongoDB to bypass
the Emergent OAuth exchange (per /app/auth_testing.md).
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if BASE_URL is None:
    # fall back to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("MONGO_URL="):
            MONGO_URL = line.split("=", 1)[1].strip().strip('"')
        elif line.startswith("DB_NAME="):
            DB_NAME = line.split("=", 1)[1].strip().strip('"')

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


def _provision_user(suffix: str):
    user_id = f"TEST_user_{suffix}_{uuid.uuid4().hex[:8]}"
    token = f"TEST_token_{suffix}_{uuid.uuid4().hex[:12]}"
    db.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{suffix}_{int(time.time()*1000)}@example.com",
        "name": f"Test {suffix}",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    return user_id, token


@pytest.fixture(scope="module")
def user_a():
    uid, tok = _provision_user("A")
    yield uid, tok
    db.leads.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.users.delete_many({"user_id": uid})


@pytest.fixture(scope="module")
def user_b():
    uid, tok = _provision_user("B")
    yield uid, tok
    db.leads.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.users.delete_many({"user_id": uid})


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_me_unauthenticated_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_invalid_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h("nope"))
        assert r.status_code == 401

    def test_me_with_valid_bearer_returns_user(self, user_a):
        uid, tok = user_a
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == uid
        assert "email" in data and data["email"].startswith("TEST_")
        assert "name" in data


# ---------- Leads CRUD ----------
class TestLeadsCrud:
    def test_create_and_get_persistence(self, user_a):
        _, tok = user_a
        payload = {
            "lead_name": "TEST Acme Lead",
            "company_name": "TEST Acme Corp",
            "email": "acme@example.com",
            "phone": "555-0100",
            "source": "LinkedIn",
            "deal_value": 1500,
            "status": "New",
        }
        r = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["lead_name"] == payload["lead_name"]
        assert created["company_name"] == payload["company_name"]
        assert created["status"] == "New"
        assert created["deal_value"] == 1500
        assert "lead_id" in created

        # GET list -> verify present
        rl = requests.get(f"{BASE_URL}/api/leads", headers=_h(tok))
        assert rl.status_code == 200
        assert any(l["lead_id"] == created["lead_id"] for l in rl.json())

    def test_filter_by_status_and_search(self, user_a):
        _, tok = user_a
        # seed extra leads
        for ld in [
            {"lead_name": "Bob", "company_name": "Globex", "email": "b@g.com", "phone": "1",
             "source": "Website", "deal_value": 0, "status": "Contacted"},
            {"lead_name": "Carol", "company_name": "Initech", "email": "c@i.com", "phone": "2",
             "source": "Referral", "deal_value": 200, "status": "Won"},
        ]:
            requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json=ld)

        r = requests.get(f"{BASE_URL}/api/leads?status=Won", headers=_h(tok))
        assert r.status_code == 200
        statuses = {l["status"] for l in r.json()}
        assert statuses == {"Won"} or len(statuses) == 0 or statuses.issubset({"Won"})
        assert all(l["status"] == "Won" for l in r.json())

        r = requests.get(f"{BASE_URL}/api/leads?search=acme", headers=_h(tok))
        assert r.status_code == 200
        leads = r.json()
        assert len(leads) >= 1
        for l in leads:
            assert "acme" in (l["lead_name"] + l["company_name"]).lower()

    def test_update_lead_status(self, user_a):
        _, tok = user_a
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "UpdTest", "company_name": "UpdCo", "email": "u@u.com",
            "phone": "9", "source": "Other", "deal_value": 10, "status": "New",
        }).json()
        lid = c["lead_id"]
        u = requests.put(f"{BASE_URL}/api/leads/{lid}", headers=_h(tok),
                         json={"status": "Contacted"})
        assert u.status_code == 200
        assert u.json()["status"] == "Contacted"
        # verify persisted via list
        leads = requests.get(f"{BASE_URL}/api/leads", headers=_h(tok)).json()
        found = next(l for l in leads if l["lead_id"] == lid)
        assert found["status"] == "Contacted"

    def test_delete_lead(self, user_a):
        _, tok = user_a
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "DelTest", "company_name": "DelCo", "email": "d@d.com",
            "phone": "9", "source": "Other", "deal_value": 0, "status": "New",
        }).json()
        lid = c["lead_id"]
        d = requests.delete(f"{BASE_URL}/api/leads/{lid}", headers=_h(tok))
        assert d.status_code == 200
        leads = requests.get(f"{BASE_URL}/api/leads", headers=_h(tok)).json()
        assert all(l["lead_id"] != lid for l in leads)
        # subsequent delete should 404
        d2 = requests.delete(f"{BASE_URL}/api/leads/{lid}", headers=_h(tok))
        assert d2.status_code == 404


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats_shape_and_counts(self, user_a):
        _, tok = user_a
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "by_status" in data
        for s in ("New", "Contacted", "Won", "Lost"):
            assert s in data["by_status"]
        assert data["total"] == sum(data["by_status"].values())


# ---------- Cross-user isolation ----------
class TestIsolation:
    def test_user_b_cannot_see_user_a_leads(self, user_a, user_b):
        _, tok_a = user_a
        _, tok_b = user_b
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok_a), json={
            "lead_name": "PrivateA", "company_name": "PrivateCo", "email": "p@a.com",
            "phone": "1", "source": "Other", "deal_value": 1, "status": "New",
        }).json()
        a_id = c["lead_id"]

        b_leads = requests.get(f"{BASE_URL}/api/leads", headers=_h(tok_b)).json()
        assert all(l["lead_id"] != a_id for l in b_leads)

        # update attempt by B -> 404
        u = requests.put(f"{BASE_URL}/api/leads/{a_id}", headers=_h(tok_b),
                         json={"status": "Lost"})
        assert u.status_code == 404

        # delete attempt by B -> 404
        d = requests.delete(f"{BASE_URL}/api/leads/{a_id}", headers=_h(tok_b))
        assert d.status_code == 404
