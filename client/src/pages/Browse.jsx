import { useEffect, useState } from 'react';
import ListenerCard from '../components/ListenerCard.jsx';
import { api } from '../lib/api.js';

function Browse() {
  const [filters, setFilters] = useState({
    tag: '',
    lang: '',
    maxPrice: '',
    availableToday: false,
  });
  const [listeners, setListeners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListeners = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (filters.tag.trim()) params.tag = filters.tag.trim();
        if (filters.lang.trim()) params.lang = filters.lang.trim();
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.availableToday) params.availableToday = 'true';

        const { data } = await api.get('/listeners', { params });
        setListeners(data.listeners || []);
      } catch (apiError) {
        setError(apiError.response?.data?.error || 'Failed to load listeners');
      } finally {
        setLoading(false);
      }
    };

    fetchListeners();
  }, [filters]);

  return (
    <section>
      <h1 className="text-3xl font-semibold text-slate-900">Browse listeners</h1>
      <p className="mt-2 text-slate-600">Find someone who matches your language, topic, and budget.</p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 md:grid-cols-4">
        <input
          placeholder="Tag (anxiety)"
          value={filters.tag}
          onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
        />
        <input
          placeholder="Language (Hindi)"
          value={filters.lang}
          onChange={(event) => setFilters((prev) => ({ ...prev, lang: event.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
        />
        <input
          type="number"
          min="0"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#2A9D8F] focus:ring"
        />
        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.availableToday}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, availableToday: event.target.checked }))
            }
          />
          Available today
        </label>
      </div>

      {loading ? <p className="mt-6 text-slate-500">Loading listeners...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listeners.map((listener) => (
            <ListenerCard key={listener.id} listener={listener} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default Browse;
