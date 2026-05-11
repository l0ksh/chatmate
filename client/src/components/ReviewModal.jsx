import { useState } from 'react';
import { api } from '../lib/api.js';

function ReviewModal({ bookingId, listenerName, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/reviews', {
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      onSubmitted();
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">
          Review your session with {listenerName}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Rating</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`h-10 w-10 rounded-md text-lg ${
                    star <= rating
                      ? 'bg-yellow-400 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {star}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Comment (optional)
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-[#2A9D8F] px-4 py-2 font-medium text-white disabled:opacity-70"
            >
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
