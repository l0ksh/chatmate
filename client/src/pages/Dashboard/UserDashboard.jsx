import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import ReviewModal from '../../components/ReviewModal.jsx';
import ReportModal from '../../components/ReportModal.jsx';

function BookingRow({ booking, onReviewClick, onReportClick }) {
  const platformLabel = booking.platform === 'google_meet' ? 'Google Meet' : 'Zoom';
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-slate-900">
          {booking.listener?.full_name || 'Listener'}
        </p>
        <p className="text-sm text-slate-600">
          {booking.slot_date} · {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)} UTC
        </p>
        <p className="text-xs text-slate-500">
          {platformLabel} · INR {(booking.amount / 100).toFixed(2)} ·{' '}
          <span className={booking.status === 'confirmed' ? 'text-teal-700' : 'text-slate-500'}>
            {booking.status}
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        {isUpcoming && booking.meeting_link ? (
          <a
            href={booking.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-[#2A9D8F] px-3 py-2 text-xs font-medium text-white"
          >
            Join session
          </a>
        ) : null}
        {booking.status === 'completed' && !booking.has_review ? (
          <button
            onClick={() => onReviewClick(booking)}
            className="rounded-md bg-yellow-500 px-3 py-2 text-xs font-medium text-white"
          >
            Leave a review
          </button>
        ) : null}
        {booking.has_review ? (
          <span className="rounded-md bg-slate-200 px-3 py-2 text-xs text-slate-600">
            Reviewed
          </span>
        ) : null}
        {['completed', 'confirmed'].includes(booking.status) ? (
          <button
            onClick={() => onReportClick(booking)}
            className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-600"
          >
            Report
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UserDashboard() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      const upcomingList = data.upcoming || [];
      const pastList = data.past || [];

      const completedIds = pastList
        .filter((b) => b.status === 'completed')
        .map((b) => b.id);

      const reviewStatuses = {};
      await Promise.all(
        completedIds.map(async (id) => {
          try {
            const { data: reviewData } = await api.get(`/reviews/booking/${id}`);
            reviewStatuses[id] = !!reviewData.review;
          } catch {
            reviewStatuses[id] = false;
          }
        }),
      );

      setUpcoming(upcomingList);
      setPast(
        pastList.map((b) => ({
          ...b,
          has_review: reviewStatuses[b.id] || false,
        })),
      );
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleReviewSubmitted = () => {
    setReviewTarget(null);
    setLoading(true);
    fetchBookings();
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Welcome back, <span className="font-medium">{user?.full_name}</span>
          </p>
        </div>
        <Link to="/browse" className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white">
          Browse listeners
        </Link>
      </div>

      {loading ? <p className="text-slate-500">Loading your bookings...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length > 0
                ? upcoming.map((b) => <BookingRow key={b.id} booking={b} onReviewClick={setReviewTarget} onReportClick={setReportTarget} />)
                : <p className="text-sm text-slate-500">No upcoming sessions.</p>}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Past sessions</h2>
            <div className="mt-4 space-y-3">
              {past.length > 0
                ? past.map((b) => <BookingRow key={b.id} booking={b} onReviewClick={setReviewTarget} onReportClick={setReportTarget} />)
                : <p className="text-sm text-slate-500">No past sessions yet.</p>}
            </div>
          </div>
        </>
      ) : null}

      {reviewTarget ? (
        <ReviewModal
          bookingId={reviewTarget.id}
          listenerName={reviewTarget.listener?.full_name || 'Listener'}
          onClose={() => setReviewTarget(null)}
          onSubmitted={handleReviewSubmitted}
        />
      ) : null}

      {reportTarget ? (
        <ReportModal
          bookingId={reportTarget.id}
          onClose={() => setReportTarget(null)}
          onSubmitted={() => {
            setReportTarget(null);
            alert('Report submitted. Our team will review it.');
          }}
        />
      ) : null}
    </section>
  );
}

export default UserDashboard;
