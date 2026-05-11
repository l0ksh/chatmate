import express from 'express';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpay.js';
import { generateMeetingAndNotify } from '../services/meetingAndNotify.js';

const router = express.Router();

const PLATFORM_COMMISSION = Number(process.env.PLATFORM_COMMISSION || 0.35);

router.post('/create-order', authMiddleware, async (req, res) => {
  const { listener_id, slot_date, start_time, end_time, platform } = req.body;

  if (!listener_id || !slot_date || !start_time || !end_time || !platform) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['google_meet', 'zoom'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  const { data: listenerProfile, error: listenerError } = await supabase
    .from('listener_profiles')
    .select('price_per_session')
    .eq('user_id', listener_id)
    .single();

  if (listenerError || !listenerProfile) {
    return res.status(404).json({ error: 'Listener profile not found' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('listener_id', listener_id)
    .eq('slot_date', slot_date)
    .eq('start_time', start_time)
    .in('status', ['pending', 'confirmed'])
    .limit(1);

  if (existingError) {
    return res.status(500).json({ error: existingError.message });
  }

  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'Selected slot is no longer available' });
  }

  const amount = Number(listenerProfile.price_per_session) * 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid listener session amount' });
  }

  const bookingDraftId = crypto.randomUUID();

  let order;
  try {
    order = await createRazorpayOrder({
      amount,
      receipt: `chatmate_${bookingDraftId.slice(0, 18)}`,
      notes: {
        booking_draft_id: bookingDraftId,
        listener_id,
        user_id: req.user.id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }

  const { error: insertError } = await supabase.from('bookings').insert({
    id: bookingDraftId,
    user_id: req.user.id,
    listener_id,
    slot_date,
    start_time,
    end_time,
    platform,
    status: 'pending',
    payment_order_id: order.id,
    amount,
  });

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    booking_draft_id: bookingDraftId,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

router.post('/verify', authMiddleware, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_draft_id } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_draft_id) {
    return res.status(400).json({ error: 'Missing verification fields' });
  }

  const validSignature = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!validSignature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, user_id, amount, payment_order_id, status')
    .eq('id', booking_draft_id)
    .single();

  if (bookingError || !booking) {
    return res.status(404).json({ error: 'Booking draft not found' });
  }

  if (booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed to verify this booking' });
  }

  if (booking.payment_order_id !== razorpay_order_id) {
    return res.status(400).json({ error: 'Order mismatch for booking draft' });
  }

  const platformFee = Math.round(booking.amount * PLATFORM_COMMISSION);
  const listenerPayout = booking.amount - platformFee;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_id: razorpay_payment_id,
      platform_fee: platformFee,
      listener_payout: listenerPayout,
    })
    .eq('id', booking.id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  generateMeetingAndNotify(booking.id).catch((err) =>
    console.error('generateMeetingAndNotify failed:', err.message),
  );

  return res.json({ booking_id: booking.id, status: 'confirmed' });
});

router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
  const event = req.body?.event;
  const entity = req.body?.payload?.payment?.entity;

  if (!event || !entity) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  if (event === 'payment.failed') {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('payment_order_id', entity.order_id)
      .in('status', ['pending']);
  }

  if (event === 'refund.processed') {
    await supabase
      .from('bookings')
      .update({ status: 'refunded' })
      .eq('payment_id', entity.id);
  }

  return res.json({ ok: true });
});

export default router;
