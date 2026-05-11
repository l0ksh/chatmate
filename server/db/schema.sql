CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'listener', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  agreed_to_disclaimer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listener_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  tags TEXT[],
  languages TEXT[],
  price_per_session INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 60,
  is_available BOOLEAN DEFAULT TRUE,
  total_sessions INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  listener_id UUID REFERENCES users(id),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_meet', 'zoom')),
  meeting_link TEXT,
  calendar_event_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  payment_id TEXT,
  payment_order_id TEXT,
  amount INTEGER NOT NULL,
  platform_fee INTEGER,
  listener_payout INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
