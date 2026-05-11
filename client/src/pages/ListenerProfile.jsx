import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

function groupByDate(slots) {
  return slots.reduce((acc, slot) => {
    const list = acc.get(slot.date) || [];
    list.push(slot);
    acc.set(slot.date, list);
    return acc;
  }, new Map());
}

function ListenerProfile() {
  const { id } = useParams();
  const [listener, setListener] = useState(null);
  const [openSlots, setOpenSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListener = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/listeners/${id}`);
        setListener(data.listener);
        setOpenSlots(data.open_slots || []);
      } catch (apiError) {
        setError(apiError.response?.data?.error || 'Failed to load listener profile');
      } finally {
        setLoading(false);
      }
    };

    fetchListener();
  }, [id]);

  if (loading) {
    return <p className="text-slate-500">Loading listener profile...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!listener) {
    return <p className="text-slate-500">Listener not found.</p>;
  }

  const slotsByDate = groupByDate(openSlots);

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">{listener.full_name}</h1>
        <p className="mt-3 text-slate-600">{listener.bio || 'Empathetic listener'}</p>
        <p className="mt-4 text-sm font-medium text-slate-700">
          INR {listener.price_per_session}/session · {listener.session_duration} mins
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(listener.tags || []).map((tag) => (
            <span key={tag} className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Available slots (next 7 days)</h2>
        <div className="mt-4 space-y-3">
          {Array.from(slotsByDate.entries()).map(([date, slots]) => (
            <div key={date}>
              <p className="font-medium text-slate-700">{date}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <span
                    key={`${date}-${slot.start_time}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  >
                    {slot.start_time} - {slot.end_time}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {openSlots.length === 0 ? (
            <p className="text-sm text-slate-500">No open slots available right now.</p>
          ) : null}
        </div>

        <Link
          to={`/book/${listener.id}`}
          className="mt-6 inline-block rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white"
        >
          Book a session
        </Link>
      </div>
    </section>
  );
}

export default ListenerProfile;
