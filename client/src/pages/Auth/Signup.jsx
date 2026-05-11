import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const disclaimerText =
  'This platform is not therapy. By signing up you agree to our terms.';

function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    agreed_to_disclaimer: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.agreed_to_disclaimer) {
      setError('You must agree to the disclaimer to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold">Create your ChatMate account</h2>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
          >
            <option value="user">User</option>
            <option value="listener">Listener</option>
          </select>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <input
            type="checkbox"
            name="agreed_to_disclaimer"
            checked={form.agreed_to_disclaimer}
            onChange={handleChange}
            className="mt-1"
          />
          <span className="text-sm text-slate-700">{disclaimerText}</span>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-[#2A9D8F] px-4 py-2 font-medium text-white disabled:opacity-70"
        >
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </div>
  );
}

export default Signup;
