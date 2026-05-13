# ChatMate

Emotional connection platform (listeners book paid sessions). Monorepo: **React + Vite** frontend (`client/`) and **Express** API (`server/`).

## Prerequisites

- **Node.js** 20.x (matches project tooling; Vite 5.x works on 20.18+)
- **Supabase** project (PostgreSQL + Auth)
- Optional for full flows: **Razorpay** (test keys), **SendGrid**, **Google Cloud** (Calendar + Meet), payment webhooks only if you expose a public URL

---

## End-to-end: run locally

Do these steps once, then start both apps whenever you develop.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy **Project URL**, **anon public** key, and **service_role** key (keep the service key secret; backend only).
3. **Authentication → Providers**: enable Email (and Google OAuth if you use it on the client later).
4. Open **SQL Editor** and run the full schema from [`server/db/schema.sql`](server/db/schema.sql).  
   If you already ran an older version, apply any missing pieces (for example `reminder_sent` on `bookings`, `reviews`, `reports` tables) so it matches the file.

### 2. Backend (`server/`)

```bash
cd server
cp .env.example .env
npm install
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side DB + auth helpers) |
| `JWT_SECRET` | Long random string (e.g. `openssl rand -base64 64`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay test/live keys for checkout |
| `PLATFORM_COMMISSION` | Decimal fraction (e.g. `0.35` for 35%) |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | Transactional email (verify sender in SendGrid) |
| `GOOGLE_*` | Calendar API + refresh token for Meet links on confirmed bookings |
| `FRONTEND_URL` | `http://localhost:5173` for local CORS |
| `PORT` | API port (default `5000`) |

Start the API:

```bash
npm run dev
```

You should see `ChatMate API running on port 5000` and the reminder cron scheduling message.

### 3. Frontend (`client/`)

In a **second** terminal:

```bash
cd client
cp .env.example .env
npm install
```

Edit `.env`:

- `VITE_API_URL` — `http://localhost:5000/api` (must match backend + `/api`)
- `VITE_SUPABASE_URL` — same Project URL as backend
- `VITE_SUPABASE_ANON_KEY` — anon key from Supabase

Start the app:

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

### 4. Smoke-check the stack

1. Visit **http://localhost:5000/api/health** → should return `{ "ok": true, ... }`.
2. In the browser, sign up as a **user** or **listener**, then log in.

---

## End-to-end user journey (happy path)

Typical flow to exercise the whole product locally:

1. **Listener**: Sign up as listener → **Listener dashboard** → complete profile and weekly availability → slots appear for booking.
2. **User**: Sign up as user (or use another browser/incognito) → **Browse** → open a listener → pick an **available** slot and platform (Meet/Zoom) → **Payment** page → complete **Razorpay** test checkout.
3. After payment verifies, you should land on **booking confirmation**; Meet links and emails require Google + SendGrid configured.
4. **Dashboards**: User sees upcoming/past sessions; listener sees sessions and earnings.
5. After a session time passes, the cron job can mark bookings **completed**; user can **leave a review** or **report** a session.
6. **Admin**: Promote a user in Supabase SQL:  
   `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';`  
   Then open **Admin Panel** from the nav for reports, users, bookings, and revenue.

---

## Troubleshooting

- **CORS errors**: Ensure `FRONTEND_URL` in `server/.env` matches the exact Vite origin (including port).
- **`VITE_API_URL`**: Must include `/api` suffix so the client hits `http://localhost:5000/api/...`.
- **Supabase “fetch failed” / wrong HTML**: Double-check `SUPABASE_URL` is the API URL, not the dashboard URL.
- **SendGrid**: From-address must be a verified sender identity.
- **Google Meet**: OAuth consent + Calendar API enabled; refresh token must be valid for the Calendar scope you use in code.

---

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `client/` | `npm run dev` | Vite dev server |
| `client/` | `npm run build` | Production build |
| `server/` | `npm run dev` | Nodemon API |
| `server/` | `npm start` | Production `node index.js` |

---

## Deploy (outline)

- **Frontend**: Vercel (or similar) — set the same `VITE_*` vars; point `VITE_API_URL` at your deployed API.
- **Backend**: Railway/Render/Fly — set all server env vars; set `FRONTEND_URL` to your production site.
- **Webhooks**: Razorpay webhooks need a public HTTPS URL to your `/api/payments/webhook` route.

For deeper API and schema detail, see [`spec.md`](spec.md).
