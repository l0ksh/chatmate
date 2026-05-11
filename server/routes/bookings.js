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

export default router;
