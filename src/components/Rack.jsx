import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ItemCard from './ItemCard'

export default function Rack({ items, onItemClick }) {
  const scrollRef = useRef(null)

  // Map vertical wheel scroll → horizontal scroll (rack sliding feel)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (e) => {
      // Only intercept if the scroll is primarily vertical
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/15 text-sm tracking-[0.3em] font-light">
          your rack is empty
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-6 overflow-x-auto overflow-y-hidden h-full px-14 scrollbar-hide"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
        >
          <ItemCard item={item} onClick={() => onItemClick(item)} />
        </motion.div>
      ))}
      {/* Trailing padding so last card isn't flush with edge */}
      <div className="w-10 shrink-0" />
    </div>
  )
}
