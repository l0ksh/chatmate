import { useState } from 'react';
import { api } from '../lib/api.js';

const REASONS = [
  { value: 'inappropriate_behaviour', label: 'Inappropriate behaviour' },
  { value: 'no_show', label: 'No-show' },
  { value: 'other', label: 'Other' },
];

function ReportModal({ bookingId, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/reports', {
        booking_id: bookingId,
        reason,
        description: description.trim() || undefined,
      });
      onSubmitted();
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Report this session</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your report will be reviewed by our team. False reports may result in action against your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide additional details..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-70"
            >
              {submitting ? 'Submitting...' : 'Submit report'}
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

export default ReportModal;
