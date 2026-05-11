import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/reports', async (req, res) => {
  const statusFilter = req.query.status;

  let query = supabase
    .from('reports')
    .select(`
      id, reason, status, created_at,
      reporter:reporter_id(full_name, email),
      reported_user:reported_user_id(full_name, email),
      booking:booking_id(id, slot_date, start_time, end_time, platform, amount, status)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ reports: data || [] });
});

router.put('/reports/:id', async (req, res) => {
  const { status } = req.body;

  if (!status || !['reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'status must be "reviewed" or "resolved"' });
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', req.params.id)
    .select('id, status')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Report not found' });
  }

  return res.json({ report: data });
});

router.get('/users', async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_verified, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ users: data || [] });
});

router.put('/users/:id/suspend', async (req, res) => {
  const { data: user, error: findErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', req.params.id)
    .single();

  if (findErr || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot suspend an admin' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ is_verified: false })
    .eq('id', req.params.id)
    .select('id, email, full_name, is_verified')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ user: data, message: 'User suspended' });
});

router.put('/users/:id/unsuspend', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_verified: true })
    .eq('id', req.params.id)
    .select('id, email, full_name, is_verified')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: data, message: 'User unsuspended' });
});

router.get('/bookings', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, slot_date, start_time, end_time, platform,
      status, amount, platform_fee, listener_payout, created_at,
      user:user_id(full_name),
      listener:listener_id(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ bookings: data || [] });
});

router.get('/revenue', async (_req, res) => {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, amount, platform_fee, listener_payout, status');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const confirmed = (bookings || []).filter((b) =>
    ['confirmed', 'completed'].includes(b.status),
  );

  const totalBookings = confirmed.length;
  const totalRevenue = confirmed.reduce((s, b) => s + (b.amount || 0), 0);
  const platformFees = confirmed.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const listenerPayouts = confirmed.reduce((s, b) => s + (b.listener_payout || 0), 0);

  return res.json({
    total_bookings: totalBookings,
    total_revenue: totalRevenue,
    platform_fees: platformFees,
    listener_payouts: listenerPayouts,
  });
});

export default router;
