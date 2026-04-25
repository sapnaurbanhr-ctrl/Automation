# Grove CRM — Product Requirements Document

## Original Problem Statement
Build a simple web-based CRM for a small business to manage leads. Add new leads (Lead Name, Company, Email, Phone, Source [LinkedIn/Website/Referral/Other], Deal Value, Status [New/Contacted/Won/Lost]); table view; edit; delete; update status; filter by status; search by name/company; dashboard with totals and counts by status. Auth via Google SSO.

User chose: Emergent-managed Google Auth · MongoDB · Build Prompt 1 first · Designer-driven aesthetic.

## Architecture
- **Frontend:** React + react-router-dom, shadcn/ui, lucide-react, sonner toasts
- **Backend:** FastAPI + Motor (async MongoDB) + httpx
- **Auth:** Emergent-managed Google OAuth → session_token persisted in `user_sessions` (cookie + Bearer fallback)
- **DB:** MongoDB collections — `users`, `user_sessions`, `leads`

## User Persona
Non-technical small-business owner / sales lead manager who needs a calm, no-nonsense pipeline view.

## Core Requirements (static)
- Auth-gated leads scoped per user
- Lead CRUD with required fields
- Search (name, company) + status filter
- Dashboard with total + per-status counts and pipeline value

## Implemented (2026-02)
- Emergent Google SSO (login → /dashboard with session cookie)
- Leads: create, read, update, delete (per-user isolation enforced server-side)
- Search by name/company, filter by status
- Dashboard stats (total, per-status, pipeline value, won value)
- Earthy/organic UI: warm sand BG, moss-green primary, Manrope + IBM Plex Sans
- Comprehensive `data-testid` coverage; shadcn dialog/select/table/dropdown/alert-dialog/sonner

## Backlog / Next Tasks (Prompt 2 — deferred by user)
- **P0** Notes per lead (multi-note, chronological)
- **P0** Next Follow-Up date field + overdue/today highlighting
- **P0** One-click status update buttons (Mark Contacted/Won/Lost)
- **P1** Lead Source insights card on dashboard (counts by source)
- **P2** Lead detail page (currently inline edit dialog only)
- **P2** EmailStr validation; surface API errors with toasts everywhere

## Test Credentials
Emergent OAuth — no app passwords. See `/app/memory/test_credentials.md` for mongosh-based session bootstrap.
