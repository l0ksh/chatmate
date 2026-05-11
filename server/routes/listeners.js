import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

const START_HOUR = 8;
const END_HOUR = 22;

function timeToMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
}

function addDays(date, days) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function buildSlotsForDate(dateString, weeklySlots) {
  return weeklySlots
    .map((slot) => ({
      date: dateString,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
    }))
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

async function getNextSevenDaysOpenSlots(listenerId) {
  const slotGrid = await getNextSevenDaysSlotGrid(listenerId);
  return slotGrid.filter((slot) => slot.available);
}

async function getNextSevenDaysSlotGrid(listenerId) {
  const today = new Date();
  const fromDate = toDateString(today);
  const toDate = toDateString(addDays(today, 6));

  const [availabilityResult, bookingsResult] = await Promise.all([
    supabase
      .from('availability_slots')
      .select('day_of_week, start_time, end_time')
      .eq('listener_id', listenerId)
      .eq('is_active', true),
    supabase
      .from('bookings')
      .select('slot_date, start_time')
      .eq('listener_id', listenerId)
      .in('status', ['pending', 'confirmed'])
      .gte('slot_date', fromDate)
      .lte('slot_date', toDate),
  ]);

  if (availabilityResult.error) {
    throw new Error(availabilityResult.error.message);
  }

  if (bookingsResult.error && !bookingsResult.error.message.includes('relation "bookings" does not exist')) {
    throw new Error(bookingsResult.error.message);
  }

  const weeklyByDay = new Map();
  for (const slot of availabilityResult.data || []) {
    const daySlots = weeklyByDay.get(slot.day_of_week) || [];
    daySlots.push(slot);
    weeklyByDay.set(slot.day_of_week, daySlots);
  }

  const blocked = new Set(
    (bookingsResult.data || []).map(
      (booking) => `${booking.slot_date}|${booking.start_time.slice(0, 5)}`,
    ),
  );

  const slotGrid = [];
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(today, index);
    const dayOfWeek = date.getDay();
    const weeklySlots = weeklyByDay.get(dayOfWeek) || [];
    const dateString = toDateString(date);
    const slotsForDate = buildSlotsForDate(dateString, weeklySlots);

    for (const slot of slotsForDate) {
      const key = `${slot.date}|${slot.start_time}`;
      slotGrid.push({
        ...slot,
        available: !blocked.has(key),
      });
    }
  }

  return slotGrid;
}

router.get('/', async (req, res) => {
  const { tag, lang, maxPrice, availableToday } = req.query;
  const today = new Date().getDay();

  let query = supabase
    .from('listener_profiles')
    .select(
      `
      bio,
      tags,
      languages,
      price_per_session,
      session_duration,
      is_available,
      total_sessions,
      avg_rating,
      users!inner(id, full_name, avatar_url, role)
    `,
    )
    .eq('is_available', true)
    .eq('users.role', 'listener');

  if (tag) query = query.contains('tags', [tag]);
  if (lang) query = query.contains('languages', [lang]);
  if (maxPrice) query = query.lte('price_per_session', Number(maxPrice));

  const { data, error } = await query.order('avg_rating', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  let listeners = (data || []).map((item) => ({
    id: item.users.id,
    full_name: item.users.full_name,
    avatar_url: item.users.avatar_url,
    bio: item.bio,
    tags: item.tags || [],
    languages: item.languages || [],
    price_per_session: item.price_per_session,
    session_duration: item.session_duration,
    avg_rating: item.avg_rating,
    total_sessions: item.total_sessions,
    is_available: item.is_available,
  }));

  if (availableToday === 'true') {
    const { data: todaySlots, error: slotsError } = await supabase
      .from('availability_slots')
      .select('listener_id')
      .eq('day_of_week', today)
      .eq('is_active', true);

    if (slotsError) {
      return res.status(500).json({ error: slotsError.message });
    }

    const availableIds = new Set((todaySlots || []).map((item) => item.listener_id));
    listeners = listeners.filter((listener) => availableIds.has(listener.id));
  }

  return res.json({ listeners });
});

router.get('/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'listener') {
    return res.status(403).json({ error: 'Only listeners can access this route' });
  }

  const { data, error } = await supabase
    .from('listener_profiles')
    .select('bio, tags, languages, price_per_session, session_duration, is_available')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    profile: data || {
      bio: '',
      tags: [],
      languages: [],
      price_per_session: 0,
      session_duration: 60,
      is_available: true,
    },
  });
});

router.put('/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'listener') {
    return res.status(403).json({ error: 'Only listeners can update this profile' });
  }

  const { bio, tags, languages, price_per_session, session_duration } = req.body;

  if (!Array.isArray(tags) || !Array.isArray(languages)) {
    return res.status(400).json({ error: 'tags and languages must be arrays' });
  }

  if (Number(price_per_session) < 0 || Number(session_duration) <= 0) {
    return res.status(400).json({ error: 'Invalid price or session duration' });
  }

  const payload = {
    user_id: req.user.id,
    bio: bio || '',
    tags,
    languages,
    price_per_session: Number(price_per_session),
    session_duration: Number(session_duration),
    is_available: true,
  };

  const { data, error } = await supabase
    .from('listener_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('bio, tags, languages, price_per_session, session_duration, is_available')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ profile: data });
});

router.get('/availability', authMiddleware, async (req, res) => {
  if (req.user.role !== 'listener') {
    return res.status(403).json({ error: 'Only listeners can view availability' });
  }

  const { data, error } = await supabase
    .from('availability_slots')
    .select('id, day_of_week, start_time, end_time, is_active')
    .eq('listener_id', req.user.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ slots: data || [] });
});

router.post('/availability', authMiddleware, async (req, res) => {
  if (req.user.role !== 'listener') {
    return res.status(403).json({ error: 'Only listeners can update availability' });
  }

  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'slots must be an array' });
  }

  const normalized = slots.map((slot) => ({
    listener_id: req.user.id,
    day_of_week: Number(slot.day_of_week),
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_active: true,
  }));

  for (const slot of normalized) {
    const startMinutes = timeToMinutes(slot.start_time);
    const endMinutes = timeToMinutes(slot.end_time);
    if (
      !Number.isInteger(slot.day_of_week) ||
      slot.day_of_week < 0 ||
      slot.day_of_week > 6 ||
      startMinutes >= endMinutes ||
      startMinutes < START_HOUR * 60 ||
      endMinutes > END_HOUR * 60
    ) {
      return res.status(400).json({ error: 'Invalid availability slot provided' });
    }
  }

  const { error: clearError } = await supabase
    .from('availability_slots')
    .delete()
    .eq('listener_id', req.user.id);

  if (clearError) {
    return res.status(500).json({ error: clearError.message });
  }

  if (normalized.length > 0) {
    const { error: insertError } = await supabase
      .from('availability_slots')
      .insert(normalized);

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
  }

  return res.json({ slots: normalized });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data: profile, error } = await supabase
    .from('listener_profiles')
    .select(
      `
      bio,
      tags,
      languages,
      price_per_session,
      session_duration,
      is_available,
      avg_rating,
      total_sessions,
      users!inner(id, full_name, avatar_url, role)
    `,
    )
    .eq('user_id', id)
    .eq('users.role', 'listener')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!profile) {
    return res.status(404).json({ error: 'Listener not found' });
  }

  try {
    const openSlots = await getNextSevenDaysOpenSlots(id);

    return res.json({
      listener: {
        id: profile.users.id,
        full_name: profile.users.full_name,
        avatar_url: profile.users.avatar_url,
        bio: profile.bio,
        tags: profile.tags || [],
        languages: profile.languages || [],
        price_per_session: profile.price_per_session,
        session_duration: profile.session_duration,
        is_available: profile.is_available,
        avg_rating: profile.avg_rating,
        total_sessions: profile.total_sessions,
      },
      open_slots: openSlots,
    });
  } catch (slotError) {
    return res.status(500).json({ error: slotError.message });
  }
});

router.get('/:id/open-slots', async (req, res) => {
  try {
    const openSlots = await getNextSevenDaysOpenSlots(req.params.id);
    return res.json({ slots: openSlots });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id/slot-grid', async (req, res) => {
  try {
    const slotGrid = await getNextSevenDaysSlotGrid(req.params.id);
    return res.json({ slots: slotGrid });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
