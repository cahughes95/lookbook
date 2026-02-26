import { useTransform, motion } from 'framer-motion'

/**
 * ItemCard renders a single card in the Rack carousel.
 *
 * Props:
 *   item         — the item object ({ id, image_url, ... })
 *   index        — this card's index in the items array
 *   springOffset — Framer Motion MotionValue: the current x offset of the track
 *   cardCenterX  — pixel x position of this card's center within the track
 *   cardW        — card width in px
 *   cardH        — card height in px
 *   stride       — distance between card centers (cardW + gap)
 *   onClick      — click/tap handler
 */
export default function ItemCard({
  item,
  index,
  springOffset,
  cardCenterX,
  cardW,
  cardH,
  stride,
  onClick,
}) {
  // Distance of this card from the viewport center, in card-widths.
  // When springOffset = -(index * stride), this card is centered → distance = 0.
  // We derive distance as: -(springOffset + cardCenterX) / stride
  // Positive distance → card is to the right of center
  // Negative distance → card is to the left of center
  const distance = useTransform(springOffset, (offset) => {
    return (offset + cardCenterX) / stride
  })

  // Scale: center = 1.0, one card away = 0.85, further = stays ~0.82
  const scale = useTransform(distance, [-1.5, -1, 0, 1, 1.5], [0.82, 0.85, 1.0, 0.85, 0.82])

  // Opacity: fade out cards beyond ~1.5 away
  const opacity = useTransform(distance, [-2, -1.5, -0.5, 0, 0.5, 1.5, 2], [0, 0.6, 0.75, 1, 0.75, 0.6, 0])

  // Z-index: center card on top — approximate with scale as proxy
  // (motion doesn't animate zIndex, we use a derived inline style)
  const zIndex = useTransform(distance, (d) => {
    const absD = Math.abs(d)
    if (absD < 0.3) return 30
    if (absD < 0.8) return 20
    if (absD < 1.3) return 10
    return 5
  })

  // Box shadow: stronger on center card
  const boxShadow = useTransform(distance, (d) => {
    const absD = Math.abs(d)
    if (absD < 0.3) {
      return '0 24px 64px rgba(0,0,0,0.85), 0 4px 16px rgba(0,0,0,0.6)'
    }
    return '0 8px 24px rgba(0,0,0,0.5)'
  })

  return (
    <motion.div
      onClick={onClick}
      className="absolute cursor-pointer"
      style={{
        width: cardW,
        height: cardH,
        // Position card so its center is at cardCenterX along the track
        left: cardCenterX - cardW / 2,
        top: '50%',
        translateY: '-50%',
        scale,
        opacity,
        zIndex,
      }}
    >
      <motion.div
        className="w-full h-full rounded-sm overflow-hidden"
        style={{
          boxShadow,
        }}
      >
        <img
          src={item.image_url}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      </motion.div>
    </motion.div>
  )
}
