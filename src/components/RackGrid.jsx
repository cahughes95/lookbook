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
          className="relative aspect-square overflow-hidden bg-[#0a0a0a] block w-full"
        >
          <img
            src={item.image_url}
            alt=""
            className="w-full h-full object-cover will-change-transform"
            draggable={false}
          />
          {item.status === 'sold' && (
            <>
              <div className="absolute inset-0 bg-black/55 pointer-events-none" />
              <div className="absolute top-5 left-[-32px] w-32 bg-white/90 text-[#141414] text-[10px] font-semibold tracking-[0.25em] text-center py-1.5 rotate-[-45deg] pointer-events-none z-10">
                SOLD
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  )
}
