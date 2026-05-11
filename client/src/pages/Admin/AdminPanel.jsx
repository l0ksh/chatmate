import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'revenue', label: 'Revenue' },
];

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/admin/reports${params}`);
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/reports/${id}`, { status });
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update report');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['open', 'reviewed', 'resolved', ''].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === f ? 'bg-[#2A9D8F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-500">Loading reports...</p> : null}

      {!loading && reports.length === 0 ? (
        <p className="text-sm text-slate-500">No reports found.</p>
      ) : null}

      {reports.map((report) => (
        <div key={report.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                Reporter: {report.reporter?.full_name} ({report.reporter?.email})
              </p>
              <p className="text-sm text-slate-700">
                Reported: {report.reported_user?.full_name} ({report.reported_user?.email})
              </p>
              <p className="text-sm text-slate-600">Reason: {report.reason}</p>
              {report.booking ? (
                <p className="text-xs text-slate-500">
                  Booking: {report.booking.slot_date} {report.booking.start_time?.slice(0, 5)} -
                  {report.booking.end_time?.slice(0, 5)} · {report.booking.platform} ·
                  Booking status: {report.booking.status}
                </p>
              ) : null}
              <p className="text-xs text-slate-400">
                Filed: {new Date(report.created_at).toLocaleDateString()} · Status:{' '}
                <span className={
                  report.status === 'open' ? 'font-medium text-red-600' :
                  report.status === 'reviewed' ? 'font-medium text-yellow-600' :
                  'font-medium text-green-600'
                }>
                  {report.status}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {report.status === 'open' ? (
                <button
                  onClick={() => updateStatus(report.id, 'reviewed')}
                  className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Mark reviewed
                </button>
              ) : null}
              {report.status !== 'resolved' ? (
                <button
                  onClick={() => updateStatus(report.id, 'resolved')}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Resolve
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleSuspend = async (userId, isVerified) => {
    setActionMsg('');
    try {
      const endpoint = isVerified
        ? `/admin/users/${userId}/suspend`
        : `/admin/users/${userId}/unsuspend`;
      const { data } = await api.put(endpoint);
      setActionMsg(data.message);
      fetchUsers();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="space-y-4">
      {actionMsg ? <p className="text-sm text-teal-700">{actionMsg}</p> : null}
      {loading ? <p className="text-slate-500">Loading users...</p> : null}

      {!loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{u.full_name}</td>
                  <td className="px-3 py-2 text-slate-600">{u.email}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'listener' ? 'bg-teal-100 text-teal-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {u.is_verified ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="font-medium text-red-600">Suspended</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {u.role !== 'admin' ? (
                      <button
                        onClick={() => toggleSuspend(u.id, u.is_verified)}
                        className={`rounded-md px-3 py-1 text-xs font-medium text-white ${
                          u.is_verified ? 'bg-red-600' : 'bg-green-600'
                        }`}
                      >
                        {u.is_verified ? 'Suspend' : 'Unsuspend'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await api.get('/admin/bookings');
        setBookings(data.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="space-y-4">
      {loading ? <p className="text-slate-500">Loading bookings...</p> : null}

      {!loading && bookings.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings found.</p>
      ) : null}

      {!loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Listener</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{b.slot_date}</td>
                  <td className="px-3 py-2">{b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}</td>
                  <td className="px-3 py-2 text-slate-700">{b.user?.full_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{b.listener?.full_name || '—'}</td>
                  <td className="px-3 py-2">{b.platform === 'google_meet' ? 'G Meet' : 'Zoom'}</td>
                  <td className="px-3 py-2">INR {((b.amount || 0) / 100).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      b.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                      b.status === 'completed' ? 'bg-green-100 text-green-700' :
                      b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function RevenueTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const { data } = await api.get('/admin/revenue');
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (loading) return <p className="text-slate-500">Loading revenue data...</p>;
  if (!stats) return <p className="text-sm text-red-600">Failed to load revenue summary.</p>;

  const cards = [
    { label: 'Total bookings', value: stats.total_bookings },
    { label: 'Total revenue', value: `INR ${(stats.total_revenue / 100).toFixed(2)}` },
    { label: 'Platform fees', value: `INR ${(stats.platform_fees / 100).toFixed(2)}` },
    { label: 'Listener payouts', value: `INR ${(stats.listener_payouts / 100).toFixed(2)}` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">Admin Panel</h1>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-[#2A9D8F] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'reports' ? <ReportsTab /> : null}
      {activeTab === 'users' ? <UsersTab /> : null}
      {activeTab === 'bookings' ? <BookingsTab /> : null}
      {activeTab === 'revenue' ? <RevenueTab /> : null}
    </section>
  );
}

export default AdminPanel;
