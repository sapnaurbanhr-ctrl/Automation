# Grove CRM — Product Requirements Document

## Original Problem Statement
Build a simple web-based CRM for a small business to manage leads. Add new leads (Lead Name, Company, Email, Phone, Source [LinkedIn/Website/Referral/Other], Deal Value, Status [New/Contacted/Won/Lost]); table view; edit; delete; update status; filter by status; search by name/company; dashboard with totals and counts by status. Auth via Google SSO.

Phase 2 added: notes timeline per lead, follow-up date with overdue highlighting, one-click status buttons, and lead source insights.

User chose: Emergent-managed Google Auth · MongoDB · Designer-driven aesthetic.

## Architecture
- **Frontend:** React + react-router-dom, shadcn/ui, lucide-react, sonner toasts, date-fns
- **Backend:** FastAPI + Motor (async MongoDB) + httpx
- **Auth:** Emergent-managed Google OAuth → session_token persisted in `user_sessions` (cookie + Bearer fallback)
- **DB:** MongoDB collections — `users`, `user_sessions`, `leads`, `lead_notes`

## User Persona
Non-technical small-business owner / sales lead manager who needs a calm, no-nonsense pipeline view.

## Core Requirements (static)
- Auth-gated leads scoped per user
- Lead CRUD with required fields
- Search (name, company) + status filter
- Dashboard with total + per-status counts and pipeline value
- Multi-note timeline per lead
- Next follow-up date with overdue/today highlighting
- One-click status quick actions
- Lead source insights

## Implemented (2026-02 → 2026-04)
- Phase 1: Emergent Google SSO, leads CRUD, search, status filter, dashboard stats
- Phase 2:
  - `/api/leads/{id}/notes` GET/POST + LeadDetailSheet timeline UI
  - `next_follow_up` field, calendar picker in form, overdue/today badge in row, overdue banner on dashboard
  - Quick action buttons (Mark Contacted/Won/Lost) on each row
  - SourceInsights card on dashboard with by_source counts and percentages
  - PUT endpoint now accepts explicit null to clear follow-up date

## Backlog / Next Tasks
- **P1** Email reminders for overdue follow-ups (Resend/SendGrid)
- **P1** Bulk import / export CSV
- **P2** Lead detail page (currently a side-sheet)
- **P2** EmailStr validation server-side
- **P2** Edit/delete notes
- **P2** Tag system & custom pipelines

## Test Credentials
Emergent OAuth — no app passwords. See `/app/memory/test_credentials.md` for mongosh-based session bootstrap.
