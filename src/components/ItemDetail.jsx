import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function ItemDetail({ item, onClose, onArchived }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibility, setVisibility] = useState(null)
  const [visibilityLoading, setVisibilityLoading] = useState(true)

  useEffect(() => {
    const fetchVisibility = async () => {
      const { data } = await supabase
        .from('item_visibility_settings')
        .select('*')
        .eq('item_id', item.id)
        .single()

      // If no settings row exists, default to showing all fields
      setVisibility(data ?? {
        show_name: true,
        show_description: true,
        show_size: true,
        show_price: true,
        show_quantity: true,
      })
      setVisibilityLoading(false)
    }
    fetchVisibility()
  }, [item.id])

  const handleArchive = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    const { error: archiveError } = await supabase
      .from('items')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', item.id)
    if (archiveError) {
      setError(archiveError.message)
      setLoading(false)
      return
    }
    onArchived()
  }

  // Check if any product fields are visible and populated
  const hasDetails =
    !visibilityLoading && (
      (visibility?.show_name && item.name) ||
      (visibility?.show_price && item.price) ||
      (visibility?.show_description && item.description) ||
      (visibility?.show_size && item.size) ||
      (visibility?.show_quantity && item.quantity_available != null)
    )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/95 z-30 flex flex-col overflow-y-auto"
    >
      {/* Close */}
      <div className="flex justify-end px-4 pt-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/70 text-2xl transition-colors"
        >
          ×
        </button>
      </div>

      {/* Image */}
      <div className="flex-shrink-0 flex items-center justify-center px-6 pb-4" style={{ minHeight: '50vh' }}>
        <img
          src={item.image_url}
          alt={item.name || ''}
          className="max-w-full object-contain rounded-sm"
          style={{
            maxHeight: '65vh',
            boxShadow: '0 8px 48px rgba(0,0,0,0.8)'
          }}
        />
      </div>

      {/* Product details */}
      {!visibilityLoading && hasDetails && (
        <div className="flex-shrink-0 px-6 pb-4 space-y-4">

          {/* Name + Price row */}
          {(visibility?.show_name && item.name) || (visibility?.show_price && item.price) ? (
            <div className="flex items-start justify-between gap-4">
              {visibility?.show_name && item.name ? (
                <h2 className="text-white/80 text-base tracking-[0.1em] leading-snug flex-1">
                  {item.name}
                </h2>
              ) : <div className="flex-1" />}
              {visibility?.show_price && item.price ? (
                <span className="text-white/60 text-base tracking-[0.1em] flex-shrink-0">
                  ${parseFloat(item.price).toFixed(2)}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Description */}
          {visibility?.show_description && item.description ? (
            <p className="text-white/40 text-sm tracking-wide leading-relaxed">
              {item.description}
            </p>
          ) : null}

          {/* Size + Quantity row */}
          {(visibility?.show_size && item.size) || (visibility?.show_quantity && item.quantity_available != null) ? (
            <div className="flex items-center gap-6">
              {visibility?.show_size && item.size ? (
                <div>
                  <p className="text-white/20 text-[10px] tracking-[0.25em] mb-0.5">size</p>
                  <p className="text-white/50 text-sm tracking-[0.15em]">{item.size}</p>
                </div>
              ) : null}
              {visibility?.show_quantity && item.quantity_available != null ? (
                <div>
                  <p className="text-white/20 text-[10px] tracking-[0.25em] mb-0.5">available</p>
                  <p className="text-white/50 text-sm tracking-[0.15em]">{item.quantity_available}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Divider */}
          <div className="border-t border-white/5" />
        </div>
      )}

      {/* Archive action */}
      <div className="flex-shrink-0 px-6 pb-10 space-y-2 mt-auto">
        {error && (
          <p className="text-red-400 text-xs text-center tracking-wide pb-1">{error}</p>
        )}
        <button
          onClick={handleArchive}
          disabled={loading}
          className={`w-full py-4 rounded-xl text-xs tracking-[0.2em] transition-all duration-200 ${
            confirming
              ? 'bg-red-950/60 border border-red-700/40 text-red-400'
              : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/8 hover:text-white/60'
          }`}
        >
          {loading
            ? 'archiving...'
            : confirming
            ? 'confirm — mark as out of stock'
            : 'mark as out of stock'}
        </button>
        {confirming && (
          <button
            onClick={() => setConfirming(false)}
            className="w-full py-2 text-white/25 text-xs tracking-wide"
          >
            cancel
          </button>
        )}
      </div>
    </motion.div>
  )
}