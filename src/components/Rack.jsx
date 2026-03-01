import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import ItemCard from './ItemCard'

// Spring config — used only after release, not during drag
const SPRING = { stiffness: 120, damping: 18, mass: 1.2 }

const WHEEL_THRESHOLD = 80

export default function Rack({ items, onItemClick, onActiveItemChange }) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Responsive card sizing
  const [cardSize, setCardSize] = useState({ w: 260, h: 347, stride: 288 })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      let w, h
      if (vw < 640) {
        w = Math.round(vw * 0.72)
        h = Math.round(w * (4 / 3))
      } else {
        h = Math.round(vh * 0.72)
        w = Math.round(h * 0.75)
      }
      setCardSize({ h, w, stride: w + 28 })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  const strideRef = useRef(cardSize.stride)
  useEffect(() => { strideRef.current = cardSize.stride }, [cardSize.stride])

  // Single MotionValue — set() directly during drag for 1:1 tracking,
  // animate() with spring physics only after release.
  const displayOffset = useMotionValue(0)

  const activeIndexRef = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)
  const wheelAccum = useRef(0)
  const containerRef = useRef(null)

  const count = items.length

  // Update active dot every frame as displayOffset changes (during drag AND spring settle)
  useMotionValueEvent(displayOffset, 'change', (v) => {
    const nearest = Math.round(-v / strideRef.current)
    const clamped = Math.max(0, Math.min(count - 1, nearest))
    if (clamped !== activeIndexRef.current) {
      setActiveIndex(clamped)
      activeIndexRef.current = clamped
      onActiveItemChange?.(items[clamped])
    }
  })

  const snapToIndex = useCallback(
    (index, initialVelocity = 0) => {
      const clamped = Math.max(0, Math.min(count - 1, index))
      animate(displayOffset, -clamped * strideRef.current, {
        type: 'spring',
        ...SPRING,
        velocity: initialVelocity,
      })
    },
    [count, displayOffset]
  )

  // --- Pointer drag (mouse + touch) ---
  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    isDraggingRef.current = true
    dragStartX.current = e.clientX
    dragStartOffset.current = displayOffset.get()
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [displayOffset])

  const onPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    // 1:1 — no spring, no delay
    displayOffset.set(dragStartOffset.current + (e.clientX - dragStartX.current))
  }, [displayOffset])

  const onPointerUp = useCallback((e) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const stride = strideRef.current
    const velocity = displayOffset.getVelocity() // px/s

    if (e.pointerType === 'touch') {
      // Mobile: long smooth coast — no snapping, no centering.
      // High friction constant = more travel distance.
      // Duration scales with throw speed so the slowdown is always visible.
      // Bezier [0.15, 0, 0, 1] mimics iOS scroll inertia: full speed at release,
      // progressively and visibly losing speed all the way to a gentle stop.
      const naturalStop = displayOffset.get() + velocity * 0.4
      const clamped = Math.max(-(count - 1) * stride, Math.min(0, naturalStop))
      const duration = Math.min(2.0, Math.max(0.5, Math.abs(velocity) / 1500))
      animate(displayOffset, clamped, {
        type: 'tween',
        ease: [0.15, 0, 0, 1],
        duration,
      })
    } else {
      // Desktop: snap to nearest card with spring physics (unchanged)
      const fractionalIndex = -displayOffset.get() / stride
      const velocityBias = Math.max(-2, Math.min(2, -(velocity * 0.04) / stride))
      snapToIndex(Math.round(fractionalIndex + velocityBias), velocity * 0.15)
    }
  }, [count, displayOffset, snapToIndex])

  const onPointerCancel = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    snapToIndex(Math.round(-displayOffset.get() / strideRef.current))
  }, [displayOffset, snapToIndex])

  // --- Mouse wheel ---
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      wheelAccum.current += delta
      if (Math.abs(wheelAccum.current) >= WHEEL_THRESHOLD) {
        const direction = wheelAccum.current > 0 ? 1 : -1
        wheelAccum.current = 0
        snapToIndex(activeIndexRef.current + direction)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [count, snapToIndex])

  // --- Keyboard navigation ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') snapToIndex(activeIndexRef.current - 1)
      else if (e.key === 'ArrowRight') snapToIndex(activeIndexRef.current + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [snapToIndex])

  // --- Tap vs drag discrimination ---
  const onCardClick = useCallback((item, index) => {
    const travelled = Math.abs(displayOffset.get() - dragStartOffset.current)
    if (travelled > 8) return
    if (index === activeIndex) {
      onItemClick(item)
    } else {
      snapToIndex(index)
    }
  }, [activeIndex, displayOffset, onItemClick, snapToIndex])

  const onMouseDown = () => { if (containerRef.current) containerRef.current.style.cursor = 'grabbing' }
  const onMouseUp = () => { if (containerRef.current) containerRef.current.style.cursor = 'grab' }

  // --- Empty state ---
  if (count === 0) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <p className="text-white/15 text-sm tracking-[0.3em] font-light">
          your rack is empty
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      // No h-full, no items-center — container is only as tall as its content,
      // so cards sit immediately below the header with no vertical centering gap.
      className="w-full select-none overflow-hidden"
      style={{ cursor: 'grab', touchAction: 'pan-y' }}
      onPointerDown={(e) => { onMouseDown(); onPointerDown(e) }}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => { onMouseUp(); onPointerUp(e) }}
      onPointerCancel={(e) => { onMouseUp(); onPointerCancel(e) }}
    >
      {/* Card track — horizontally centered, top-aligned */}
      <div className="flex justify-center pt-2">
        <motion.div
          className="relative"
          style={{ x: displayOffset, width: 0, height: cardSize.h }}
        >
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              index={index}
              springOffset={displayOffset}
              cardCenterX={index * cardSize.stride}
              cardW={cardSize.w}
              cardH={cardSize.h}
              stride={cardSize.stride}
              onClick={() => onCardClick(item, index)}
            />
          ))}
        </motion.div>
      </div>

      {/* Pill dot indicators — flow naturally below cards, no absolute positioning */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-4 pointer-events-none">
          {items.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                background: i === activeIndex
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
