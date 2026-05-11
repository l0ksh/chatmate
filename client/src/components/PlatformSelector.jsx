const platforms = [
  {
    id: 'google_meet',
    title: 'Google Meet',
    description: 'Auto-generated Meet link and calendar invite.',
  },
  {
    id: 'zoom',
    title: 'Zoom',
    description: 'Zoom meeting link (Module 5 integration pending).',
  },
];

function PlatformSelector({ selectedPlatform, onSelect }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {platforms.map((platform) => {
        const selected = selectedPlatform === platform.id;
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => onSelect(platform.id)}
            className={`rounded-xl border p-4 text-left ${
              selected
                ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600'
                : 'border-slate-300 bg-white'
            }`}
          >
            <p className="font-semibold text-slate-900">{platform.title}</p>
            <p className="mt-1 text-sm text-slate-600">{platform.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default PlatformSelector;
