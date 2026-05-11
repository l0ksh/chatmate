import { Link, useParams } from 'react-router-dom';

function BookingConfirmation() {
  const { id } = useParams();

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-2xl font-semibold text-slate-900">Booking confirmed!</h1>
      <p className="mt-3 text-slate-700">
        Your payment was successful and your booking is now confirmed.
      </p>
      <p className="mt-2 text-sm text-slate-500">Booking ID: {id}</p>
      <p className="mt-4 text-sm text-slate-500">
        Meeting link and email confirmations will be fully integrated in Module 5.
      </p>
      <Link to="/dashboard" className="mt-5 inline-block rounded-md bg-[#2A9D8F] px-4 py-2 text-white">
        Go to dashboard
      </Link>
    </section>
  );
}

export default BookingConfirmation;
