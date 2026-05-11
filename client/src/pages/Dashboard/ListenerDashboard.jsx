import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildHourSlots() {
  const slots = [];
  for (let hour = 8; hour < 22; hour += 1) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const end = `${String(hour + 1).padStart(2, '0')}:00`;
    slots.push({ start, end, label: `${start} - ${end}` });
  }
  return slots;
}

function SessionRow({ booking }) {
  const platformLabel = booking.platform === 'google_meet' ? 'Google Meet' : 'Zoom';
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-slate-900">{booking.user_first_name || 'User'}</p>
        <p className="text-sm text-slate-600">
          {booking.slot_date} · {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)} UTC
        </p>
        <p className="text-xs text-slate-500">
          {platformLabel} · Earnings: INR {((booking.listener_payout || 0) / 100).toFixed(2)} ·{' '}
          <span className={booking.status === 'confirmed' ? 'text-teal-700' : 'text-slate-500'}>
            {booking.status}
          </span>
        </p>
      </div>
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
    </div>
  );
}

function ListenerDashboard() {
  const hourSlots = useMemo(() => buildHourSlots(), []);
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    bio: '',
    tags: [],
    languages: [],
    price_per_session: 0,
    session_duration: 60,
  });
  const [tagsInput, setTagsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, availabilityRes, bookingsRes] = await Promise.all([
          api.get('/listeners/profile'),
          api.get('/listeners/availability'),
          api.get('/bookings/listener'),
        ]);

        const profileData = profileRes.data.profile;
        setProfile(profileData);
        setTagsInput((profileData.tags || []).join(', '));
        setLanguagesInput((profileData.languages || []).join(', '));

        const slotSet = new Set(
          (availabilityRes.data.slots || []).map(
            (slot) => `${slot.day_of_week}|${slot.start_time.slice(0, 5)}|${slot.end_time.slice(0, 5)}`,
          ),
        );
        setSelectedSlots(slotSet);

        setUpcoming(bookingsRes.data.upcoming || []);
        setPast(bookingsRes.data.past || []);
        setMonthEarnings(bookingsRes.data.month_earnings || 0);
      } catch (apiError) {
        setError(apiError.response?.data?.error || 'Failed to load listener dashboard');
      }
    };

    fetchData();
  }, []);

  const toggleSlot = (dayIndex, slot) => {
    const key = `${dayIndex}|${slot.start}|${slot.end}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');
    try {
      const payload = {
        ...profile,
        tags: tagsInput.split(',').map((item) => item.trim()).filter(Boolean),
        languages: languagesInput.split(',').map((item) => item.trim()).filter(Boolean),
      };
      const { data } = await api.put('/listeners/profile', payload);
      setProfile(data.profile);
      setStatus('Profile saved');
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Failed to save profile');
    }
  };

  const handleAvailabilitySave = async () => {
    setStatus('');
    setError('');
    try {
      const slots = Array.from(selectedSlots).map((value) => {
        const [day_of_week, start_time, end_time] = value.split('|');
        return { day_of_week: Number(day_of_week), start_time, end_time };
      });
      await api.post('/listeners/availability', { slots });
      setStatus('Availability saved');
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Failed to save availability');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Availability' },
    { id: 'sessions', label: 'Sessions' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Listener dashboard</h1>
        <div className="rounded-lg bg-white p-1 ring-1 ring-slate-200">
          <span className="text-sm font-medium text-slate-600">
            This month: INR {(monthEarnings / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-[#2A9D8F] text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <>
          <form
            onSubmit={handleProfileSubmit}
            className="grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:grid-cols-2"
          >
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Bio</span>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tags (comma separated)</span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Languages (comma separated)</span>
              <input
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Price per session (INR)</span>
              <input
                type="number"
                min="0"
                value={profile.price_per_session}
                onChange={(e) => setProfile((prev) => ({ ...prev, price_per_session: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Session duration (minutes)</span>
              <input
                type="number"
                min="15"
                step="15"
                value={profile.session_duration}
                onChange={(e) => setProfile((prev) => ({ ...prev, session_duration: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
              />
            </label>
            <button
              type="submit"
              className="md:col-span-2 w-full rounded-md bg-[#2A9D8F] px-4 py-2 font-medium text-white"
            >
              Save profile
            </button>
          </form>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Weekly availability</h2>
              <button
                onClick={handleAvailabilitySave}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Save availability
              </button>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[960px] grid-cols-7 gap-3">
                {dayLabels.map((dayLabel, dayIndex) => (
                  <div key={dayLabel} className="space-y-2 rounded-lg bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-700">{dayLabel}</h3>
                    {hourSlots.map((slot) => {
                      const key = `${dayIndex}|${slot.start}|${slot.end}`;
                      const selected = selectedSlots.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleSlot(dayIndex, slot)}
                          className={`w-full rounded-md border px-2 py-1 text-xs ${
                            selected
                              ? 'border-teal-600 bg-teal-500 text-white'
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length > 0
                ? upcoming.map((b) => <SessionRow key={b.id} booking={b} />)
                : <p className="text-sm text-slate-500">No upcoming sessions.</p>}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Past sessions</h2>
            <div className="mt-4 space-y-3">
              {past.length > 0
                ? past.map((b) => <SessionRow key={b.id} booking={b} />)
                : <p className="text-sm text-slate-500">No past sessions yet.</p>}
            </div>
          </div>
        </>
      )}

      {status ? <p className="text-sm text-teal-700">{status}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

export default ListenerDashboard;
