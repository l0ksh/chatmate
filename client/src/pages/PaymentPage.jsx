import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

async function ensureRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentPage() {
  const navigate = useNavigate();
  const booking = useMemo(() => {
    const raw = sessionStorage.getItem('chatmate_booking_selection');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!booking) return;

    setProcessing(true);
    setError('');

    try {
      const scriptReady = await ensureRazorpayScript();
      if (!scriptReady) {
        setError('Razorpay script failed to load. Check internet connection and try again.');
        return;
      }

      const { data: orderData } = await api.post('/payments/create-order', {
        listener_id: booking.listener_id,
        slot_date: booking.slot_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        platform: booking.platform,
      });

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ChatMate',
        description: `Session with ${booking.listener_name}`,
        order_id: orderData.order_id,
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              booking_draft_id: orderData.booking_draft_id,
            });

            sessionStorage.removeItem('chatmate_booking_selection');
            navigate(`/booking-confirmation/${verifyData.booking_id}`);
          } catch (verifyError) {
            setError(
              verifyError.response?.data?.error ||
                'Payment succeeded but verification failed. Please contact support.',
            );
          }
        },
        prefill: {
          name: booking.listener_name,
        },
        theme: {
          color: '#2A9D8F',
        },
        modal: {
          ondismiss: () => {
            setError('Payment popup closed before completion.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Unable to start payment');
    } finally {
      setProcessing(false);
    }
  };

  if (!booking) {
    return (
      <section className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <p className="text-slate-700">No booking selection found.</p>
        <Link to="/browse" className="mt-4 inline-block text-sm text-teal-700 underline">
          Go back to browse listeners
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <h1 className="text-2xl font-semibold text-slate-900">Payment summary</h1>
      <p className="mt-3 text-slate-700">Listener: {booking.listener_name}</p>
      <p className="text-slate-700">
        Slot: {booking.slot_date} · {booking.start_time} - {booking.end_time}
      </p>
      <p className="text-slate-700">Platform: {booking.platform}</p>
      <p className="text-slate-700">Price: INR {booking.price_per_session}</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={handlePayment}
        disabled={processing}
        className="mt-5 rounded-md bg-[#2A9D8F] px-5 py-2 font-medium text-white disabled:opacity-70"
      >
        {processing ? 'Processing...' : 'Pay with Razorpay'}
      </button>
    </section>
  );
}

export default PaymentPage;
