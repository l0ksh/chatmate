# Emotional Connection Platform — Phase 1 Build Plan

> **How to use this document:** Share this entire file with Claude and say _"Build the next module from this plan."_ Claude will read the context, tech stack, and constraints, then produce ready-to-run code. Work through modules in order — each one builds on the previous.

---

## Project Overview

A web platform where users can browse empathetic listeners, pick an available time slot, pay upfront, and receive a Google Meet or Zoom link via email. No real-time chat. No WebRTC. Listeners and users both get email confirmations with the meeting link.

---

## Tech Stack (Phase 1)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Single-page app |
| Backend | Node.js + Express | REST API |
| Database | PostgreSQL | Use Supabase free tier |
| Auth | Supabase Auth (JWT) | Email/password + Google OAuth |
| Email | SendGrid | Confirmation + reminder emails |
| Payments | Razorpay | India-first; holds funds until session ends |
| Meeting links | Google Calendar API | Auto-generates Meet link; sends calendar invite |
| File storage | Supabase Storage | Listener profile photos |
| Frontend hosting | Vercel | Free tier |
| Backend hosting | Railway | Free tier |

---

## Folder Structure

```
project-root/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Browse.jsx
│   │   │   ├── ListenerProfile.jsx
│   │   │   ├── BookSlot.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── BookingConfirmation.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── UserDashboard.jsx
│   │   │   │   └── ListenerDashboard.jsx
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Signup.jsx
│   │   │   └── Admin/
│   │   │       └── AdminPanel.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ListenerCard.jsx
│   │   │   ├── SlotPicker.jsx
│   │   │   ├── PlatformSelector.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Node.js + Express backend
│   ├── routes/
│   │   ├── auth.js
│   │   ├── listeners.js
│   │   ├── slots.js
│   │   ├── bookings.js
│   │   ├── payments.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── services/
│   │   ├── googleCalendar.js
│   │   ├── sendgrid.js
│   │   ├── razorpay.js
│   │   └── reminderJob.js
│   ├── db/
│   │   └── schema.sql
│   ├── .env.example
│   └── index.js
│
└── README.md
```

---

## Database Schema

```sql
-- Users table (both listeners and regular users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'listener', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  agreed_to_disclaimer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listener profiles (extends users where role = 'listener')
CREATE TABLE listener_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  tags TEXT[],               -- e.g. ['anxiety', 'breakups', 'loneliness']
  languages TEXT[],          -- e.g. ['English', 'Hindi']
  price_per_session INTEGER, -- in INR (paise: multiply by 100 for Razorpay)
  session_duration INTEGER DEFAULT 60, -- minutes
  is_available BOOLEAN DEFAULT TRUE,
  total_sessions INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  UNIQUE(user_id)
);

-- Weekly availability slots set by listeners
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  listener_id UUID REFERENCES users(id),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_meet', 'zoom')),
  meeting_link TEXT,
  calendar_event_id TEXT,    -- Google Calendar event ID (for cancellation)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  payment_id TEXT,           -- Razorpay payment ID
  payment_order_id TEXT,     -- Razorpay order ID
  amount INTEGER NOT NULL,   -- in paise
  platform_fee INTEGER,      -- 30-40% of amount
  listener_payout INTEGER,   -- amount - platform_fee
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews (post-session)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  reviewer_id UUID REFERENCES users(id),
  listener_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Reports (safety)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id),
  reported_user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Environment Variables

```env
# server/.env

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-jwt-secret

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=hello@yourplatform.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret

# Google Calendar API
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Platform config
PLATFORM_COMMISSION=0.35
FRONTEND_URL=http://localhost:5173
PORT=5000
```

---

## Module 1 — Project Setup & Auth

**Goal:** Working React + Vite frontend connected to Node.js backend with Supabase auth. Users can sign up, log in, and choose their role (User or Listener). Disclaimer checkbox required on signup.

**What to build:**
- Vite + React project with TailwindCSS configured
- Express server with CORS, dotenv, and basic middleware
- Supabase client setup in both frontend and backend
- `/api/auth/signup` — creates user in Supabase Auth + inserts into `users` table with role
- `/api/auth/login` — returns JWT
- `AuthContext.jsx` — stores user state, exposes `login()`, `logout()`, `user`
- `ProtectedRoute.jsx` — redirects unauthenticated users to `/login`
- Signup page — fields: name, email, password, role selector (User / Listener), disclaimer checkbox ("This platform is not therapy. By signing up you agree to our terms.")
- Login page — email + password

**Design notes:** Clean, warm, minimal. Soft off-white background (`#FAF9F6`). Primary colour: muted teal (`#2A9D8F`). Font: Inter. No aggressive gradients.

**API contract:**
```
POST /api/auth/signup
Body: { full_name, email, password, role, agreed_to_disclaimer }
Response: { user, token }

POST /api/auth/login
Body: { email, password }
Response: { user, token }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user }
```

---

## Module 2 — Listener Profiles & Availability Setup

**Goal:** Listeners can fill out their profile and set weekly availability. Users can browse listeners.

**What to build:**
- `ListenerDashboard.jsx` — profile edit form + availability grid
- `/api/listeners/profile` — GET and PUT listener profile (bio, tags, price, languages, session duration)
- `/api/listeners/availability` — GET and POST weekly availability slots
- Availability UI: 7-column grid (Mon–Sun), each column has selectable time slots (8am–10pm in 1-hour blocks). Listener clicks to toggle slots on/off.
- `/api/listeners` — GET all active listeners (with filters: tag, language, price range, available today)
- `Browse.jsx` — grid of `ListenerCard` components
- `ListenerCard.jsx` — shows avatar, name, tags (pills), price/session, rating, "Book a session" button
- `ListenerProfile.jsx` — full profile page with bio, tags, available slots this week, book button

**API contract:**
```
GET  /api/listeners               Query: ?tag=anxiety&lang=Hindi&maxPrice=500
GET  /api/listeners/:id           Returns profile + available slots for next 7 days
PUT  /api/listeners/profile       Body: { bio, tags, languages, price_per_session, session_duration }
GET  /api/listeners/availability  Returns weekly slot grid
POST /api/listeners/availability  Body: { slots: [{ day_of_week, start_time, end_time }] }
```

---

## Module 3 — Slot Selection & Platform Choice

**Goal:** User selects an open slot and chooses Google Meet or Zoom before payment.

**What to build:**
- `SlotPicker.jsx` — shows available slots for the selected listener over the next 7 days. Booked slots are greyed out. Clicking an open slot selects it.
- `PlatformSelector.jsx` — two cards: Google Meet and Zoom. User picks one.
- `BookSlot.jsx` — combines SlotPicker + PlatformSelector + "Proceed to payment" button
- `/api/bookings/check-slot` — validates that slot is still free before payment
- Store selected slot + platform in React state / sessionStorage before redirecting to payment

**Logic:**
- Backend computes available dates: take listener's weekly recurring slots, filter out dates that already have a confirmed booking in the `bookings` table for that date + time
- Return next 7 days of open slots as: `[{ date: "2026-05-01", start_time: "18:00", end_time: "19:00" }]`

**API contract:**
```
GET /api/listeners/:id/open-slots    Returns open slots for next 7 days
POST /api/bookings/check-slot        Body: { listener_id, slot_date, start_time }
                                     Response: { available: true/false }
```

---

## Module 4 — Payments (Razorpay)

**Goal:** User pays for the session upfront. On success, booking is created with status `confirmed`.

**What to build:**
- `/api/payments/create-order` — creates Razorpay order for the session amount
- `PaymentPage.jsx` — shows session summary (listener name, date, time, platform, price). Loads Razorpay checkout script. On success calls `/api/payments/verify`.
- `/api/payments/verify` — verifies Razorpay signature, marks booking as `confirmed`, triggers meeting link generation + email (Module 5)
- `/api/payments/webhook` — Razorpay webhook handler for payment failures and refunds

**Razorpay flow:**
1. Frontend calls `POST /api/payments/create-order` → gets `order_id`
2. Frontend opens Razorpay modal with `order_id`
3. On payment success, Razorpay returns `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`
4. Frontend posts these to `/api/payments/verify`
5. Backend verifies HMAC signature → creates booking → triggers Google Calendar + email

**Commission logic (in verify handler):**
```js
const platformFee = Math.round(amount * PLATFORM_COMMISSION); // 35%
const listenerPayout = amount - platformFee;
```

**API contract:**
```
POST /api/payments/create-order
Body: { listener_id, slot_date, start_time, end_time, platform }
Response: { order_id, amount, currency, booking_draft_id }

POST /api/payments/verify
Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_draft_id }
Response: { booking_id, status: 'confirmed' }
```

---

## Module 5 — Google Calendar API + Email Invites

**Goal:** On booking confirmation, auto-generate a Google Meet link and send confirmation emails to both user and listener.

**What to build:**
- `server/services/googleCalendar.js` — wrapper around Google Calendar API
- `server/services/sendgrid.js` — email templates and send functions
- Called from the payment verify handler after booking is confirmed

**Google Calendar setup steps (do once, not in code):**
1. Create Google Cloud project
2. Enable Calendar API
3. Create OAuth2 credentials (Desktop app type)
4. Run auth flow once to get refresh token
5. Store `client_id`, `client_secret`, `refresh_token` in `.env`

**`googleCalendar.js` — createMeetingEvent function:**
```js
// Input: { summary, description, startDateTime, endDateTime, attendees: [email1, email2] }
// Output: { meetLink, eventId, htmlLink }
// Uses conferenceData.createRequest to auto-generate Meet link
// Sets sendUpdates: 'all' so Google sends calendar invites automatically
```

**Email templates (SendGrid dynamic templates):**

Confirmation email to user:
- Subject: "Your session with [Listener Name] is confirmed"
- Body: Listener name, date, time (with timezone), platform, join link (big button), "Add to calendar" link, disclaimer footer

Confirmation email to listener:
- Subject: "New session booked — [Date] at [Time]"
- Body: User first name (not full name, for privacy), date, time, platform, join link, earnings amount

Reminder email (1 hour before — Module 7):
- Subject: "Your session starts in 1 hour"
- Body: Quick reminder + join link

**API contract (internal — called from payment handler):**
```
generateMeetingAndNotify(bookingId) → void
  1. Fetch booking + user + listener from DB
  2. Call googleCalendar.createMeetingEvent()
  3. Update booking: meeting_link, calendar_event_id
  4. Send confirmation email to user
  5. Send confirmation email to listener
```

---

## Module 6 — Booking Confirmation Page & Dashboards

**Goal:** After payment, user sees a confirmation screen. Both user and listener have dashboards showing their sessions.

**What to build:**
- `BookingConfirmation.jsx` — shows: "Booking confirmed!", listener name, date + time, platform icon, meeting link (big "Join session" button), "Add to Google Calendar" link, note about email confirmation sent
- `UserDashboard.jsx` — lists user's upcoming and past bookings. Each booking shows: listener name, date/time, platform, join link (if upcoming), review button (if past and not yet reviewed)
- `ListenerDashboard.jsx` (extend from Module 2) — adds "Upcoming sessions" tab. Shows: user first name, date/time, platform, join link, earnings per session, total earnings this month
- `/api/bookings/my` — returns bookings for the logged-in user
- `/api/bookings/listener` — returns bookings for the logged-in listener

**API contract:**
```
GET /api/bookings/my          Returns upcoming + past bookings for logged-in user
GET /api/bookings/listener    Returns upcoming + past sessions for logged-in listener
GET /api/bookings/:id         Returns single booking details
```

---

## Module 7 — Reminder Emails & Post-Session Review

**Goal:** Send a reminder 1 hour before each session. After session ends, prompt user to leave a review.

**What to build:**
- `server/services/reminderJob.js` — cron job using `node-cron`. Runs every 15 minutes. Queries bookings where `slot_date + start_time` is 60 minutes from now and `status = 'confirmed'` and reminder not yet sent. Sends reminder email via SendGrid. Add `reminder_sent BOOLEAN DEFAULT FALSE` column to bookings table.
- Post-session: cron also marks bookings as `completed` when session end time has passed
- `ReviewModal.jsx` — star rating (1–5) + optional text. Appears on UserDashboard for completed sessions without a review.
- `/api/reviews` — POST a review. Validates booking belongs to this user, booking is completed, no existing review.
- After review submitted: recalculate `avg_rating` on `listener_profiles`

**Cron schedule:** `*/15 * * * *` (every 15 minutes)

**API contract:**
```
POST /api/reviews
Body: { booking_id, rating, comment }
Response: { review_id }
```

---

## Module 8 — Safety & Admin Panel

**Goal:** Users can report sessions. Admins can view reports and manage accounts.

**What to build:**
- `ReportModal.jsx` — "Report this session" button on past bookings. Dropdown for reason (inappropriate behaviour / no-show / other) + optional description.
- `/api/reports` — POST a report
- `AdminPanel.jsx` — protected by `role = 'admin'`. Tabs: Reports queue, All users, All bookings, Revenue summary
- Reports queue: shows open reports with booking details. Admin can mark as reviewed or resolved. Buttons to suspend a user.
- `/api/admin/reports` — GET all reports (admin only)
- `/api/admin/users/:id/suspend` — sets `is_verified = false`, blocks login
- Revenue summary: total bookings, total revenue, platform fees collected, listener payouts pending

**Middleware — `roleMiddleware.js`:**
```js
// requireRole('admin') — checks JWT decoded role against required role
// 403 if mismatch
```

**API contract:**
```
POST /api/reports                  Body: { booking_id, reason, description }
GET  /api/admin/reports            Admin only. Query: ?status=open
PUT  /api/admin/reports/:id        Body: { status: 'reviewed' | 'resolved' }
GET  /api/admin/users              Admin only
PUT  /api/admin/users/:id/suspend  Admin only
GET  /api/admin/revenue            Returns summary stats
```

---

## Prompt Templates for Claude

Use these exact prompts when building each module. Paste this full document first, then add the specific prompt.

---

**Starting prompt (use once at the beginning):**
```
I am building an emotional support booking platform. I've attached the full build plan document which contains the project overview, tech stack, folder structure, database schema, and all 8 modules with their API contracts and requirements. Please read the entire document carefully before writing any code.

Start with Module 1: Project Setup & Auth. Generate all the files needed for this module — both frontend (React/Vite) and backend (Node.js/Express). Follow the folder structure, tech stack, and API contracts exactly as specified. Use TailwindCSS for all styling with the design notes mentioned in Module 1.
```

---

**Continuing to the next module:**
```
Module [X] is complete and working. Now build Module [X+1]: [Module Name]. Refer to the build plan document for the full requirements, API contract, and what files to create. Follow the same folder structure and coding patterns from the previous module.
```

---

**Fixing an issue:**
```
I'm getting this error in Module [X]: [paste error]. Here is the relevant file: [paste file]. Fix this without changing the API contract or folder structure defined in the build plan.
```

---

**Adding a feature not in the plan:**
```
The base Module [X] is working. I want to add [feature]. Make sure it fits the existing folder structure, uses the same Supabase client setup, and follows the same Express route pattern as the other modules.
```

---

## Build Checklist

Use this to track progress:

- [ ] Module 1 — Project setup + Auth (signup, login, role selection)
- [ ] Module 2 — Listener profiles + availability grid
- [ ] Module 3 — Slot selection + platform choice (Meet/Zoom)
- [ ] Module 4 — Razorpay payment integration
- [ ] Module 5 — Google Calendar API + SendGrid email invites
- [ ] Module 6 — Booking confirmation page + dashboards
- [ ] Module 7 — Reminder emails (cron job) + post-session reviews
- [ ] Module 8 — Report system + admin panel

---

## Key Decisions & Constraints

- **No real-time chat or WebRTC in Phase 1.** All communication goes through email and external meeting links.
- **Google Calendar API is preferred** over Zoom API. It handles calendar invites, Meet links, and email notifications in one call.
- **Razorpay is the payment gateway** (India-first). For international users later, add Stripe as a second option.
- **Supabase handles auth and database.** Do not build a custom auth system.
- **All prices stored in paise** (smallest INR unit). Divide by 100 for display.
- **Listeners are not therapists.** The disclaimer must be shown at signup and in every email footer.
- **User privacy:** Only show listener the user's first name, never full name or email, in the booking notification.
- **Session duration is fixed per listener** (set in their profile). No mid-session extension in Phase 1.
- **Timezone:** Store all times in UTC in the database. Display in user's local timezone on frontend using `Intl.DateTimeFormat`.
