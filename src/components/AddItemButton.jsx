export default function AddItemButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 w-14 h-14 bg-white rounded-full flex items-center justify-center z-20 active:scale-90 transition-transform duration-100"
      style={{ boxShadow: '0 4px 24px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)' }}
      aria-label="Add item"
    >
      <span className="text-black text-3xl font-thin leading-none" style={{ marginTop: '-2px' }}>+</span>
    </button>
  )
}
