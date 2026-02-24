import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function ItemDetail({ item, onClose, onArchived }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    await supabase
      .from('items')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', item.id)
    onArchived()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/95 z-30 flex flex-col"
    >
      {/* Close */}
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/70 text-2xl transition-colors"
        >
          ×
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center px-6 pb-4 min-h-0">
        <img
          src={item.image_url}
          alt=""
          className="max-w-full max-h-full object-contain rounded-sm"
          style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }}
        />
      </div>

      {/* Archive action */}
      <div className="px-6 pb-10 space-y-2">
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
