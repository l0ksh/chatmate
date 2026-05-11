import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-2xl font-semibold text-[#2A9D8F]">
          ChatMate
        </Link>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-slate-600 hover:text-slate-900" to="/browse">
            Browse
          </Link>
          {user ? (
            <>
              {user.role === 'listener' ? (
                <Link className="text-sm text-slate-600 hover:text-slate-900" to="/dashboard/listener">
                  Listener Dashboard
                </Link>
              ) : (
                <Link className="text-sm text-slate-600 hover:text-slate-900" to="/dashboard">
                  Dashboard
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="text-sm text-slate-600 hover:text-slate-900" to="/login">
                Login
              </Link>
              <Link
                className="rounded-md bg-[#2A9D8F] px-3 py-2 text-sm font-medium text-white"
                to="/signup"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
