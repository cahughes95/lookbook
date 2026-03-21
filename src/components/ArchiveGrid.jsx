import { useState } from 'react'

export default function ArchiveGrid({ items, onItemClick, onDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-white/15 text-xs tracking-[0.3em]">nothing archived yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-white/5 p-px">
      {items.map(item => (
        <div key={item.id} className="relative aspect-square overflow-hidden bg-[#0a0a0a]">
          <button
            onClick={() => onItemClick(item)}
            className="w-full h-full block"
          >
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover opacity-70"
            />
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
              className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center z-10"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="rgba(255,255,255,0.5)">
                <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
              </svg>
            </button>
          )}
          {openMenuId === item.id && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-9 right-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg z-20 min-w-[100px] py-1 shadow-lg">
              <button
                onClick={async () => { setDeleting(item.id); setOpenMenuId(null); await onDelete(item); setDeleting(null) }}
                disabled={deleting === item.id}
                className="w-full text-left text-red-400/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
