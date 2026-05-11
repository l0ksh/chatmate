function SlotPicker({ slots, selectedKey, onSelect }) {
  if (!slots.length) {
    return <p className="text-sm text-slate-500">No slots in the next 7 days.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((slot) => {
        const key = `${slot.date}|${slot.start_time}`;
        const selected = key === selectedKey;
        const available = slot.available !== false;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(slot)}
            disabled={!available}
            className={`rounded-md border px-3 py-2 text-left text-sm ${
              !available
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : selected
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            <p className="font-medium">{slot.date}</p>
            <p>
              {slot.start_time} - {slot.end_time}
            </p>
            {!available ? <p className="mt-1 text-xs">Booked</p> : null}
          </button>
        );
      })}
    </div>
  );
}

export default SlotPicker;
