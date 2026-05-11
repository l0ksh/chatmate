import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { booking_id, reason, description } = req.body;

  if (!booking_id || !reason) {
    return res.status(400).json({ error: 'booking_id and reason are required' });
  }

  const allowedReasons = ['inappropriate_behaviour', 'no_show', 'other'];
  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of: ${allowedReasons.join(', ')}` });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, user_id, listener_id')
    .eq('id', booking_id)
    .single();

  if (bookingErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.user_id !== req.user.id && booking.listener_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only report bookings you participated in' });
  }

  const reportedUserId = booking.user_id === req.user.id ? booking.listener_id : booking.user_id;

  const { data: report, error: insertErr } = await supabase
    .from('reports')
    .insert({
      reporter_id: req.user.id,
      reported_user_id: reportedUserId,
      booking_id,
      reason: description ? `${reason}: ${description}` : reason,
    })
    .select('id, created_at')
    .single();

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message });
  }

  return res.status(201).json({ report_id: report.id });
});

export default router;
