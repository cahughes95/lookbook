export default function ArchiveGrid({ items, onItemClick }) {
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
        <button
          key={item.id}
          onClick={() => onItemClick(item)}
          className="aspect-square overflow-hidden bg-[#0a0a0a] block w-full"
        >
          <img
            src={item.image_url}
            alt=""
            className="w-full h-full object-cover opacity-70"
          />
        </button>
      ))}
    </div>
  )
}
