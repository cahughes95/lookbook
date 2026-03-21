export default function CategoryPills({ items, activeCategory, onChange }) {
  const categories = ['all', ...[...new Set(items.map(i => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))]

  if (categories.length <= 1) return null

  return (
    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`flex-shrink-0 text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
            activeCategory === cat
              ? 'bg-white/90 text-[#141414] border-white/90'
              : 'bg-transparent text-white/50 border-white/10 hover:border-white/20'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
