# Grove CRM — Product Requirements Document

## Original Problem Statement
Build a simple web-based CRM for a small business to manage leads. Add new leads (Lead Name, Company, Email, Phone, Source [LinkedIn/Website/Referral/Other], Deal Value, Status [New/Contacted/Won/Lost]); table view; edit; delete; update status; filter by status; search by name/company; dashboard with totals and counts by status. Auth via Google SSO.

User chose: Emergent-managed Google Auth · MongoDB · Designer-driven aesthetic.

## Architecture
- **Frontend:** React + react-router-dom, shadcn/ui, lucide-react, sonner toasts, date-fns
- **Backend:** FastAPI + Motor (async MongoDB) + httpx; CSV via stdlib `csv`
- **Auth:** Emergent-managed Google OAuth → session_token persisted in `user_sessions` (cookie + Bearer fallback)
- **DB:** MongoDB collections — `users`, `user_sessions`, `leads`, `lead_notes`

## User Persona
Non-technical small-business owner / sales lead manager who needs a calm, no-nonsense pipeline view.

## Implemented (2026-02 → 2026-04)

### Phase 1 — MVP
Emergent Google SSO · Leads CRUD (per-user) · Search & status filter · Dashboard stats

### Phase 2
Multi-note timeline · Follow-up date with overdue/today highlighting · Quick-action status buttons · Source insights

### Phase 3
- **CSV import** (`POST /api/leads/import/csv`) with row-level error reporting + import-results dialog
- **CSV export** (`GET /api/leads/export/csv`) downloading `leads-YYYY-MM-DD.csv`
- **Notes edit & delete** (PUT/DELETE `/api/leads/{lead_id}/notes/{note_id}`) via NotesPanel inline editor
- **Full Lead Detail Page** at `/leads/:id` (kept LeadDetailSheet for quick view; sheet has "Open full page" link)

## Backlog
- **P1** Email reminders (Resend/SendGrid) for daily overdue digest — deferred by user
- **P1** AI follow-up assistant inside Notes (draft next email/script grounded on note history)
- **P2** Tag system / custom pipelines
- **P2** Optimistic updates in NotesPanel
- **P2** Extract shared LeadStatsCards from sheet/detail page
- **P3** Multi-user team workspaces & roles

## Test Credentials
Emergent OAuth — no app passwords. See `/app/memory/test_credentials.md` for mongosh-based session bootstrap. Backend tests live at `/app/backend/tests/test_crm_backend.py` (27 tests, all green).
