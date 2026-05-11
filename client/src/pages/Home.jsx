import { Link } from 'react-router-dom';

function Home() {
  return (
    <section className="mx-auto max-w-3xl text-center">
      <h1 className="text-4xl font-semibold text-slate-900">A calm space to feel heard.</h1>
      <p className="mt-4 text-lg text-slate-600">
        ChatMate helps you book one-to-one sessions with empathetic listeners.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link to="/browse" className="rounded-md border border-teal-300 px-5 py-3 font-medium text-teal-700">
          Browse listeners
        </Link>
        <Link to="/signup" className="rounded-md bg-[#2A9D8F] px-5 py-3 font-medium text-white">
          Start with signup
        </Link>
        <Link to="/login" className="rounded-md border border-slate-300 px-5 py-3 font-medium text-slate-700">
          I already have an account
        </Link>
      </div>
    </section>
  );
}

export default Home;
