import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { booking_id, rating, comment } = req.body;

  if (!booking_id || !rating) {
    return res.status(400).json({ error: 'booking_id and rating are required' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, user_id, listener_id, status')
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the session user can leave a review' });
  }

  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Can only review completed sessions' });
  }

  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', booking_id)
    .limit(1);

  if (existingReview && existingReview.length > 0) {
    return res.status(409).json({ error: 'A review already exists for this booking' });
  }

  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      reviewer_id: req.user.id,
      listener_id: booking.listener_id,
      rating,
      comment: comment || null,
    })
    .select('id, rating, comment, created_at')
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  try {
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('listener_id', booking.listener_id);

    if (allReviews && allReviews.length > 0) {
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = (sum / allReviews.length).toFixed(1);

      await supabase
        .from('listener_profiles')
        .update({ avg_rating: Number(avg), total_sessions: allReviews.length })
        .eq('user_id', booking.listener_id);
    }
  } catch (ratingError) {
    console.error('Failed to update avg_rating:', ratingError.message);
  }

  return res.status(201).json({ review_id: review.id });
});

router.get('/booking/:bookingId', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('booking_id', req.params.bookingId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ review: data || null });
});

export default router;
