# Deploy Grove CRM to Vercel (+ Railway/Render + MongoDB Atlas)

This stack is **frontend (Vercel) + backend (Railway or Render) + database (MongoDB Atlas)**.
Your existing Emergent setup keeps working — none of the production env files are modified.

---

## 1. Provision MongoDB Atlas (free)
1. Sign up: https://www.mongodb.com/cloud/atlas/register
2. Create an **M0 (Free) cluster** in the region closest to your backend host.
3. **Database Access** → add a user (username + strong password).
4. **Network Access** → "Allow access from anywhere" `0.0.0.0/0` (or restrict to your backend host IPs).
5. **Connect** → Drivers → Python → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Save this — it's your `MONGO_URL`.

---

## 2. Push this repo to GitHub
```bash
cd /app
git init -b main           # if not already
git add .
git commit -m "Grove CRM"
git remote add origin git@github.com:<you>/grove-crm.git
git push -u origin main
```

---

## 3. Deploy backend to Railway *(recommended — simplest)*
1. https://railway.app → **New Project** → **Deploy from GitHub repo**.
2. Pick your `grove-crm` repo.
3. Settings → **Root Directory** = `backend`.
4. **Variables** tab → add:
   - `MONGO_URL` = your Atlas SRV string from step 1
   - `DB_NAME` = `grove_crm` (or any name)
   - `CORS_ORIGINS` = (you'll fill this after Vercel deploy — leave `*` for now)
5. Settings → **Networking** → click **Generate Domain**. You'll get something like
   `https://grove-crm-backend-production.up.railway.app`. Copy it — that's your **backend URL**.
6. Hit it: `https://...railway.app/api/` should return `{"message": "CRM API"}`.

### Alternative: Render
- https://render.com → **New** → **Blueprint** → pick this repo.
- Render reads `/app/render.yaml` and creates the service automatically.
- Add the same three env vars in the Render dashboard.

---

## 4. Deploy frontend to Vercel
1. https://vercel.com → **Add New** → **Project** → import the same GitHub repo.
2. **Root Directory** = `frontend`.
3. Vercel auto-detects Create React App; the included `frontend/vercel.json` handles SPA routing.
4. **Environment Variables** → add:
   - `REACT_APP_BACKEND_URL` = your Railway/Render backend URL **without** trailing slash
     (e.g. `https://grove-crm-backend-production.up.railway.app`)
5. **Deploy**. You'll get something like `https://grove-crm.vercel.app`.

---

## 5. Wire CORS so the cookie auth works
Cross-origin cookies require an **explicit** allowed origin (not `*`) plus `secure=true; samesite=none`.
Both are already set in code — you just need to update the backend env:

1. Go back to **Railway/Render → backend service → Variables**.
2. Set:
   ```
   CORS_ORIGINS=https://grove-crm.vercel.app
   ```
   If you use Vercel preview URLs too, comma-separate them:
   ```
   CORS_ORIGINS=https://grove-crm.vercel.app,https://grove-crm-git-main-you.vercel.app
   ```
3. Restart the service (Railway auto-restarts on env change; on Render click **Manual Deploy**).

---

## 6. Test the live deploy
1. Open `https://grove-crm.vercel.app` — login screen should render.
2. Click **Continue with Google** → after auth you should be returned to `/dashboard`
   on your Vercel domain (the code uses `window.location.origin` so this just works).
3. Add a lead, refresh — it should persist (Atlas).
4. Check Railway/Render logs if anything fails — most issues are CORS or `MONGO_URL`.

---

## 7. Common gotchas
| Symptom | Likely cause | Fix |
|---|---|---|
| Browser blocks `/api/auth/google` with CORS error | `CORS_ORIGINS` doesn't include the exact Vercel URL | Update env, restart backend |
| Login succeeds but `/dashboard` redirects to `/` | Cookie not sent — backend isn't HTTPS or third-party cookies blocked | Confirm backend is on HTTPS; some browsers (Brave, Safari ITP) need user to allow |
| `mongodb` connection timeout | Atlas IP allowlist | Allow `0.0.0.0/0` or add backend's outbound IP |
| Build fails on Vercel | Wrong root directory | Set Root Directory = `frontend` |
| `Module not found` on Railway | Wrong root directory | Set Root Directory = `backend` |

---

## What is *not* automated
- A custom domain (point CNAME to Vercel; add it to `CORS_ORIGINS`).
- Backups of MongoDB (Atlas free tier has snapshots; configure under Backup tab).
- Email digest for overdue follow-ups (deferred — needs Resend/SendGrid integration when you're ready).

---

## Files added to support this deployment
- `frontend/vercel.json` — SPA routing for Vercel
- `frontend/.env.example` — required Vercel env var
- `backend/.env.example` — required backend env vars
- `backend/Procfile` — process definition for Railway/Heroku-style hosts
- `backend/runtime.txt` — pins Python 3.11
- `backend/railway.toml` — Railway build/deploy config
- `render.yaml` — Render Blueprint definition (root of repo)
- `DEPLOYMENT_VERCEL.md` — this guide

None of these files affect your Emergent preview deployment — you can keep using both in parallel.
