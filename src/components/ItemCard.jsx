export default function ItemCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="shrink-0 cursor-pointer select-none"
      style={{ width: '220px', height: '300px' }}
    >
      <div
        className="w-full h-full rounded-sm overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
        style={{
          boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        <img
          src={item.image_url}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  )
}
