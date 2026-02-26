export default function RackGrid({ items, onItemClick }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-white/15 text-sm tracking-[0.3em]">your rack is empty</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 bg-[#0a0a0a]">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onItemClick(item)}
          className="aspect-square overflow-hidden bg-[#0a0a0a] block w-full"
        >
          <img
            src={item.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}
