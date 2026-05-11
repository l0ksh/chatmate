import { Link } from 'react-router-dom';

function ListenerCard({ listener }) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
          {listener.full_name?.charAt(0) || 'L'}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{listener.full_name}</h3>
          <p className="text-sm text-slate-500">Rating {listener.avg_rating || 0}/5</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{listener.bio || 'Empathetic listener'}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(listener.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">INR {listener.price_per_session}/session</p>
        <Link
          to={`/listeners/${listener.id}`}
          className="rounded-md bg-[#2A9D8F] px-3 py-2 text-sm font-medium text-white"
        >
          Book a session
        </Link>
      </div>
    </article>
  );
}

export default ListenerCard;
