import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.post('/check-slot', authMiddleware, async (req, res) => {
  const { listener_id, slot_date, start_time } = req.body;

  if (!listener_id || !slot_date || !start_time) {
    return res.status(400).json({ error: 'listener_id, slot_date and start_time are required' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('listener_id', listener_id)
    .eq('slot_date', slot_date)
    .eq('start_time', start_time)
    .in('status', ['pending', 'confirmed'])
    .limit(1);

  if (error && !error.message.includes('relation "bookings" does not exist')) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ available: !data || data.length === 0 });
});

router.get('/my', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, slot_date, start_time, end_time, platform,
      meeting_link, status, amount, created_at,
      listener:listener_id(full_name, avatar_url)
    `)
    .eq('user_id', req.user.id)
    .order('slot_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const now = new Date();
  const upcoming = [];
  const past = [];

  for (const booking of data || []) {
    const sessionEnd = new Date(`${booking.slot_date}T${booking.end_time}Z`);
    if (sessionEnd > now && ['pending', 'confirmed'].includes(booking.status)) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  }

  return res.json({ upcoming, past });
});

router.get('/listener', authMiddleware, async (req, res) => {
  if (req.user.role !== 'listener') {
    return res.status(403).json({ error: 'Only listeners can access this route' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, slot_date, start_time, end_time, platform,
      meeting_link, status, amount, listener_payout, created_at,
      user:user_id(full_name)
    `)
    .eq('listener_id', req.user.id)
    .order('slot_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const now = new Date();
  const upcoming = [];
  const past = [];
  let monthEarnings = 0;

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const booking of data || []) {
    const sessionEnd = new Date(`${booking.slot_date}T${booking.end_time}Z`);

    if (booking.user) {
      booking.user_first_name = booking.user.full_name.split(' ')[0];
      delete booking.user;
    }

    if (sessionEnd > now && ['pending', 'confirmed'].includes(booking.status)) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }

    const bookingDate = new Date(booking.slot_date);
    if (
      bookingDate.getMonth() === currentMonth &&
      bookingDate.getFullYear() === currentYear &&
      booking.status === 'confirmed' &&
      booking.listener_payout
    ) {
      monthEarnings += booking.listener_payout;
    }
  }

  return res.json({ upcoming, past, month_earnings: monthEarnings });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, slot_date, start_time, end_time, platform,
      meeting_link, calendar_event_id, status, amount,
      platform_fee, listener_payout, payment_id, created_at,
      user:user_id(full_name, email),
      listener:listener_id(full_name, avatar_url)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (data.user_id !== req.user.id && data.listener_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view this booking' });
  }

  return res.json({ booking: data });
});

export default router;
