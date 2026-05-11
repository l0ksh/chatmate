import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PlatformSelector from '../components/PlatformSelector.jsx';
import SlotPicker from '../components/SlotPicker.jsx';
import { api } from '../lib/api.js';

function BookSlot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listener, setListener] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('google_meet');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [listenerRes, slotsRes] = await Promise.all([
          api.get(`/listeners/${id}`),
          api.get(`/listeners/${id}/slot-grid`),
        ]);
        setListener(listenerRes.data.listener);
        setSlots(slotsRes.data.slots || []);
      } catch (apiError) {
        setError(apiError.response?.data?.error || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const selectedKey = useMemo(
    () => (selectedSlot ? `${selectedSlot.date}|${selectedSlot.start_time}` : ''),
    [selectedSlot],
  );

  const handleProceed = async () => {
    if (!selectedSlot) {
      setError('Please select a slot first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post('/bookings/check-slot', {
        listener_id: id,
        slot_date: selectedSlot.date,
        start_time: selectedSlot.start_time,
      });

      if (!data.available) {
        setSlots((prev) =>
          prev.map((slot) =>
            slot.date === selectedSlot.date && slot.start_time === selectedSlot.start_time
              ? { ...slot, available: false }
              : slot,
          ),
        );
        setSelectedSlot(null);
        setError('This slot was just booked. Please choose another one.');
        return;
      }

      const payload = {
        listener_id: id,
        listener_name: listener?.full_name || '',
        slot_date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        platform: selectedPlatform,
        price_per_session: listener?.price_per_session || 0,
      };

      sessionStorage.setItem('chatmate_booking_selection', JSON.stringify(payload));
      navigate('/payment');
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Could not proceed to payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500">Loading slots...</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Book a session</h1>
        <p className="mt-2 text-slate-600">
          {listener?.full_name} · INR {listener?.price_per_session}/session
        </p>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">1) Pick a slot</h2>
        <SlotPicker slots={slots} selectedKey={selectedKey} onSelect={setSelectedSlot} />
      </div>

      <div className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">2) Pick a platform</h2>
        <PlatformSelector selectedPlatform={selectedPlatform} onSelect={setSelectedPlatform} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleProceed}
        disabled={submitting}
        className="rounded-md bg-[#2A9D8F] px-5 py-3 font-medium text-white disabled:opacity-70"
      >
        {submitting ? 'Checking slot...' : 'Proceed to payment'}
      </button>
    </section>
  );
}

export default BookSlot;
