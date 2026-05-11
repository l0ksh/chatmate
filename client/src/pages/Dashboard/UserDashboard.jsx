import { useAuth } from '../../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

function UserDashboard() {
  const { user } = useAuth();

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-3 text-slate-600">
        Signed in as <span className="font-medium">{user?.full_name}</span> ({user?.role}).
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Module 1 complete: auth and protected navigation are now active.
      </p>
      <div className="mt-4">
        <Link to="/browse" className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white">
          Browse listeners
        </Link>
      </div>
    </section>
  );
}

export default UserDashboard;
