import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        setBooking(data.booking);
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) {
    return <p className="text-slate-500">Loading booking details...</p>;
  }

  if (!booking) {
    return (
      <section className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <p className="text-slate-700">Booking not found.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-teal-700 underline">
          Go to dashboard
        </Link>
      </section>
    );
  }

  const platformLabel = booking.platform === 'google_meet' ? 'Google Meet' : 'Zoom';

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl text-teal-600">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Booking confirmed!</h1>
        <p className="mt-2 text-slate-600">
          Your session with <span className="font-medium">{booking.listener?.full_name}</span> is all set.
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Date</span>
          <span className="font-medium">{booking.slot_date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Time</span>
          <span className="font-medium">{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)} UTC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Platform</span>
          <span className="font-medium">{platformLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Amount paid</span>
          <span className="font-medium">INR {(booking.amount / 100).toFixed(2)}</span>
        </div>

        {booking.meeting_link ? (
          <a
            href={booking.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-md bg-[#2A9D8F] px-4 py-3 text-center font-medium text-white"
          >
            Join session
          </a>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Meeting link will be available shortly.</p>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        Confirmation emails have been sent to both you and the listener.
      </p>

      <div className="text-center">
        <Link to="/dashboard" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}

export default BookingConfirmation;
