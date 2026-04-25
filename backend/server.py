from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
import httpx
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Models ----------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionRequest(BaseModel):
    session_id: str

LeadStatus = Literal["New", "Contacted", "Won", "Lost"]
LeadSource = Literal["LinkedIn", "Website", "Referral", "Other"]

class LeadCreate(BaseModel):
    lead_name: str
    company_name: str
    email: str
    phone: str
    source: LeadSource
    deal_value: float = 0
    status: LeadStatus = "New"

class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[LeadSource] = None
    deal_value: Optional[float] = None
    status: Optional[LeadStatus] = None

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_id: str
    user_id: str
    lead_name: str
    company_name: str
    email: str
    phone: str
    source: LeadSource
    deal_value: float
    status: LeadStatus
    created_at: datetime
    updated_at: datetime


# ---------- Auth Helper ----------
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])

    return User(**user_doc)


# ---------- Auth Routes ----------
@api_router.post("/auth/google")
async def auth_google(payload: SessionRequest, response: Response):
    """Exchange Emergent session_id for a session_token, persist user + session, set cookie."""
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")

    data = r.json()
    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------- Leads ----------
def _serialize_lead(doc: dict) -> dict:
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), str):
            doc[k] = datetime.fromisoformat(doc[k])
    return doc


@api_router.get("/leads", response_model=List[Lead])
async def list_leads(
    user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    query: dict = {"user_id": user.user_id}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"lead_name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Lead(**_serialize_lead(d)) for d in docs]


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "lead_id": f"lead_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        **payload.model_dump(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.leads.insert_one(doc)
    return Lead(**_serialize_lead({k: v for k, v in doc.items() if k != "_id"}))


@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, payload: LeadUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.leads.update_one(
        {"lead_id": lead_id, "user_id": user.user_id},
        {"$set": update_data},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    doc = await db.leads.find_one({"lead_id": lead_id, "user_id": user.user_id}, {"_id": 0})
    return Lead(**_serialize_lead(doc))


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: User = Depends(get_current_user)):
    res = await db.leads.delete_one({"lead_id": lead_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"ok": True}


@api_router.get("/dashboard/stats")
async def dashboard_stats(user: User = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "value": {"$sum": "$deal_value"}}},
    ]
    by_status = {"New": 0, "Contacted": 0, "Won": 0, "Lost": 0}
    total = 0
    total_value = 0.0
    won_value = 0.0
    async for row in db.leads.aggregate(pipeline):
        s = row["_id"]
        c = row["count"]
        v = row.get("value", 0) or 0
        by_status[s] = c
        total += c
        total_value += v
        if s == "Won":
            won_value = v
    return {
        "total": total,
        "by_status": by_status,
        "total_value": total_value,
        "won_value": won_value,
    }


@api_router.get("/")
async def root():
    return {"message": "CRM API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
