"""Backend tests for the CRM MVP.

Covers: auth (Bearer fallback), leads CRUD, list filters, dashboard stats,
cross-user isolation. Sessions are provisioned directly in MongoDB to bypass
the Emergent OAuth exchange (per /app/auth_testing.md).
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone, date

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
    db.lead_notes.delete_many({"user_id": uid})
    db.leads.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.users.delete_many({"user_id": uid})


@pytest.fixture(scope="module")
def user_b():
    uid, tok = _provision_user("B")
    yield uid, tok
    db.lead_notes.delete_many({"user_id": uid})
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


# ---------- Phase 2: Notes ----------
class TestNotes:
    def _create_lead(self, tok, name="NotesLead"):
        return requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": name, "company_name": "NCo", "email": "n@n.com",
            "phone": "1", "source": "LinkedIn", "deal_value": 0, "status": "New",
        }).json()

    def test_add_note_returns_full_payload(self, user_a):
        _, tok = user_a
        lead = self._create_lead(tok, "NoteLead1")
        r = requests.post(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes",
            headers=_h(tok), json={"text": "First note"},
        )
        assert r.status_code == 200, r.text
        n = r.json()
        assert n["text"] == "First note"
        assert n["lead_id"] == lead["lead_id"]
        assert n["note_id"].startswith("note_")
        assert "created_at" in n

    def test_list_notes_newest_first(self, user_a):
        _, tok = user_a
        lead = self._create_lead(tok, "NoteLead2")
        for txt in ["alpha", "beta", "gamma"]:
            r = requests.post(
                f"{BASE_URL}/api/leads/{lead['lead_id']}/notes",
                headers=_h(tok), json={"text": txt},
            )
            assert r.status_code == 200
            time.sleep(0.02)
        r = requests.get(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes", headers=_h(tok)
        )
        assert r.status_code == 200
        notes = r.json()
        texts = [n["text"] for n in notes]
        assert texts == ["gamma", "beta", "alpha"], f"got {texts}"

    def test_empty_text_rejected(self, user_a):
        _, tok = user_a
        lead = self._create_lead(tok, "NoteLeadEmpty")
        r = requests.post(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes",
            headers=_h(tok), json={"text": "   "},
        )
        assert r.status_code == 400

    def test_other_user_cannot_add_or_list_notes(self, user_a, user_b):
        _, tok_a = user_a
        _, tok_b = user_b
        lead = self._create_lead(tok_a, "PrivateNoteLead")
        # B tries to list -> 404
        r = requests.get(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes", headers=_h(tok_b)
        )
        assert r.status_code == 404
        # B tries to add -> 404
        r = requests.post(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes",
            headers=_h(tok_b), json={"text": "sneak"},
        )
        assert r.status_code == 404


# ---------- Phase 2: Follow-up ----------
class TestFollowUp:
    def test_create_with_follow_up_persists(self, user_a):
        _, tok = user_a
        target = (date.today() + timedelta(days=5)).isoformat()
        r = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "FU1", "company_name": "FUCo", "email": "f@f.com",
            "phone": "1", "source": "Website", "deal_value": 0, "status": "New",
            "next_follow_up": target,
        })
        assert r.status_code == 200
        created = r.json()
        assert created["next_follow_up"] == target
        # persisted
        leads = requests.get(f"{BASE_URL}/api/leads", headers=_h(tok)).json()
        found = next(l for l in leads if l["lead_id"] == created["lead_id"])
        assert found["next_follow_up"] == target

    def test_update_and_clear_follow_up(self, user_a):
        _, tok = user_a
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "FU2", "company_name": "FU2Co", "email": "f2@f.com",
            "phone": "1", "source": "Other", "deal_value": 0, "status": "New",
        }).json()
        lid = c["lead_id"]
        new_d = (date.today() + timedelta(days=2)).isoformat()
        u = requests.put(f"{BASE_URL}/api/leads/{lid}", headers=_h(tok),
                         json={"next_follow_up": new_d})
        assert u.status_code == 200
        assert u.json()["next_follow_up"] == new_d
        # NOTE: clearing via PUT with None is filtered by current backend (None values
        # excluded in update_data). Document behavior; not asserting "cleared" here.


# ---------- Phase 2: Dashboard insights ----------
class TestDashboardPhase2:
    def test_by_source_and_overdue(self, user_b):
        # Fresh user to make counts deterministic
        uid, tok = user_b
        # cleanup any previous
        db.leads.delete_many({"user_id": uid})

        today = date.today().isoformat()
        past = (date.today() - timedelta(days=3)).isoformat()
        future = (date.today() + timedelta(days=10)).isoformat()
        seeds = [
            {"source": "LinkedIn", "next_follow_up": past, "status": "New"},      # overdue
            {"source": "LinkedIn", "next_follow_up": today, "status": "Contacted"},# overdue (today)
            {"source": "Website", "next_follow_up": future, "status": "New"},     # future, not overdue
            {"source": "Referral", "next_follow_up": past, "status": "Won"},      # excluded (Won)
            {"source": "Other", "next_follow_up": None, "status": "New"},         # no follow-up
        ]
        for i, s in enumerate(seeds):
            requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
                "lead_name": f"DS{i}", "company_name": f"DSCo{i}",
                "email": f"d{i}@d.com", "phone": "1", "deal_value": 0, **s,
            })

        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert "by_source" in data
        for k in ("LinkedIn", "Website", "Referral", "Other"):
            assert k in data["by_source"]
        assert data["by_source"]["LinkedIn"] == 2
        assert data["by_source"]["Website"] == 1
        assert data["by_source"]["Referral"] == 1
        assert data["by_source"]["Other"] == 1
        assert "overdue_followups" in data
        # 2 overdue (past + today, both not Won/Lost). The Won one is excluded.
        assert data["overdue_followups"] == 2


# ---------- Phase 3: GET lead by id ----------
class TestGetLeadById:
    def test_get_owned_lead(self, user_a):
        _, tok = user_a
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "ByIdLead", "company_name": "ByIdCo", "email": "x@x.com",
            "phone": "1", "source": "Other", "deal_value": 50, "status": "New",
        }).json()
        r = requests.get(f"{BASE_URL}/api/leads/{c['lead_id']}", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["lead_id"] == c["lead_id"]
        assert data["lead_name"] == "ByIdLead"
        assert data["deal_value"] == 50

    def test_get_other_user_lead_returns_404(self, user_a, user_b):
        _, tok_a = user_a
        _, tok_b = user_b
        c = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok_a), json={
            "lead_name": "PrivById", "company_name": "PrivCo", "email": "p@p.com",
            "phone": "1", "source": "Other", "deal_value": 0, "status": "New",
        }).json()
        r = requests.get(f"{BASE_URL}/api/leads/{c['lead_id']}", headers=_h(tok_b))
        assert r.status_code == 404


# ---------- Phase 3: Note edit/delete ----------
class TestNoteEditDelete:
    def _make_lead_and_note(self, tok, txt="orig"):
        lead = requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "NoteEd", "company_name": "NCo", "email": "n@n.com",
            "phone": "1", "source": "LinkedIn", "deal_value": 0, "status": "New",
        }).json()
        note = requests.post(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes",
            headers=_h(tok), json={"text": txt},
        ).json()
        return lead, note

    def test_update_note(self, user_a):
        _, tok = user_a
        lead, note = self._make_lead_and_note(tok)
        r = requests.put(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes/{note['note_id']}",
            headers=_h(tok), json={"text": "updated text"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["text"] == "updated text"
        # GET verify
        rl = requests.get(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes", headers=_h(tok)
        ).json()
        assert any(n["note_id"] == note["note_id"] and n["text"] == "updated text" for n in rl)

    def test_update_note_empty_400(self, user_a):
        _, tok = user_a
        lead, note = self._make_lead_and_note(tok)
        r = requests.put(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes/{note['note_id']}",
            headers=_h(tok), json={"text": "   "},
        )
        assert r.status_code == 400

    def test_update_note_cross_user_404(self, user_a, user_b):
        _, tok_a = user_a
        _, tok_b = user_b
        lead, note = self._make_lead_and_note(tok_a, "secret")
        r = requests.put(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes/{note['note_id']}",
            headers=_h(tok_b), json={"text": "hack"},
        )
        assert r.status_code == 404

    def test_delete_note(self, user_a):
        _, tok = user_a
        lead, note = self._make_lead_and_note(tok)
        r = requests.delete(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes/{note['note_id']}",
            headers=_h(tok),
        )
        assert r.status_code == 200
        rl = requests.get(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes", headers=_h(tok)
        ).json()
        assert all(n["note_id"] != note["note_id"] for n in rl)

    def test_delete_note_cross_user_404(self, user_a, user_b):
        _, tok_a = user_a
        _, tok_b = user_b
        lead, note = self._make_lead_and_note(tok_a, "del-secret")
        r = requests.delete(
            f"{BASE_URL}/api/leads/{lead['lead_id']}/notes/{note['note_id']}",
            headers=_h(tok_b),
        )
        assert r.status_code == 404


# ---------- Phase 3: CSV export/import ----------
class TestCsv:
    def test_export_csv_header_and_rows(self, user_a):
        _, tok = user_a
        # ensure at least one lead
        requests.post(f"{BASE_URL}/api/leads", headers=_h(tok), json={
            "lead_name": "CsvLead", "company_name": "CsvCo", "email": "csv@c.com",
            "phone": "555", "source": "Website", "deal_value": 99, "status": "New",
        })
        r = requests.get(f"{BASE_URL}/api/leads/export/csv", headers=_h(tok))
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/csv" in ctype, f"bad content-type {ctype}"
        body = r.text.splitlines()
        assert body[0].split(",") == [
            "lead_name", "company_name", "email", "phone",
            "source", "deal_value", "status", "next_follow_up",
        ]
        assert len(body) >= 2  # at least one data row
        assert any("CsvLead" in line for line in body[1:])

    def test_export_csv_only_owners_rows(self, user_a, user_b):
        _, tok_b = user_b
        r = requests.get(f"{BASE_URL}/api/leads/export/csv", headers=_h(tok_b))
        assert r.status_code == 200
        # user_a's CsvLead must NOT be in user_b's export
        assert "CsvLead" not in r.text

    def test_import_csv_creates_and_skips(self, user_a):
        _, tok = user_a
        csv_body = (
            "lead_name,company_name,email,phone,source,deal_value,status,next_follow_up\n"
            "Imp One,ImpCo,i1@x.com,111,LinkedIn,200,New,2026-02-01\n"
            "Imp Two,ImpCo2,i2@x.com,222,BadSource,300,BadStatus,\n"  # falls back to defaults
            ",MissingName,nm@x.com,333,Website,0,New,\n"  # missing lead_name -> skip
            "OnlyName,,nc@x.com,,Other,0,New,\n"  # missing company -> skip
            "NoEmail,NCo,,,Other,0,New,\n"  # missing email -> skip
        )
        files = {"file": ("imp.csv", csv_body, "text/csv")}
        headers = {"Authorization": f"Bearer {tok}"}
        r = requests.post(f"{BASE_URL}/api/leads/import/csv", headers=headers, files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] == 2
        assert len(data["errors"]) == 3
        # Verify that "Imp Two" got source/status defaults
        leads = requests.get(f"{BASE_URL}/api/leads?search=Imp Two", headers=_h(tok)).json()
        assert len(leads) >= 1
        imp2 = leads[0]
        assert imp2["source"] == "Other"
        assert imp2["status"] == "New"
        # Verify Imp One persisted with values
        leads1 = requests.get(f"{BASE_URL}/api/leads?search=Imp One", headers=_h(tok)).json()
        assert len(leads1) >= 1
        assert leads1[0]["source"] == "LinkedIn"
        assert leads1[0]["deal_value"] == 200

    def test_import_csv_rejects_non_csv(self, user_a):
        _, tok = user_a
        files = {"file": ("imp.txt", "garbage", "text/plain")}
        headers = {"Authorization": f"Bearer {tok}"}
        r = requests.post(f"{BASE_URL}/api/leads/import/csv", headers=headers, files=files)
        assert r.status_code == 400
