export default function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange('carousel')}
        className={`transition-colors ${
          view === 'carousel' ? 'text-white/80' : 'text-white/25 hover:text-white/50'
        }`}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
          <rect x="0" y="0" width="6" height="14" rx="1" opacity="0.5" />
          <rect x="6" y="0" width="6" height="14" rx="1" />
          <rect x="12" y="0" width="6" height="14" rx="1" opacity="0.5" />
        </svg>
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`transition-colors ${
          view === 'grid' ? 'text-white/80' : 'text-white/25 hover:text-white/50'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="0" width="6" height="6" rx="0.5" />
          <rect x="8" y="0" width="6" height="6" rx="0.5" />
          <rect x="0" y="8" width="6" height="6" rx="0.5" />
          <rect x="8" y="8" width="6" height="6" rx="0.5" />
        </svg>
      </button>
    </div>
  )
}
