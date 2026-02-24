import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function AddItemModal({ onClose, onAdded }) {
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setProgress({ done: 0, total: files.length })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName)

        const { error: insertError } = await supabase
          .from('items')
          .insert({ vendor_id: user.id, image_url: publicUrl, status: 'in_stock' })

        if (insertError) throw insertError

        setProgress(p => ({ ...p, done: p.done + 1 }))
      }

      onAdded()
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={uploading ? undefined : onClose}
        className="fixed inset-0 bg-black/70 z-30"
      />

      {/* Bottom sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-[#141414] rounded-t-2xl z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
      >
        <div className="px-6 pt-4 pb-6">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

          <p className="text-white/35 text-xs tracking-[0.25em] text-center mb-5">
            add to rack
          </p>

          {error && (
            <p className="text-red-400 text-xs text-center mb-4 tracking-wide">{error}</p>
          )}

          {uploading ? (
            <div className="py-6 text-center">
              <p className="text-white/40 text-sm tracking-widest">
                {progress.total > 1
                  ? `uploading ${progress.done + 1} of ${progress.total}...`
                  : 'uploading...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 text-white/80 text-sm tracking-[0.15em] transition-colors"
              >
                take photo
              </button>
              <button
                onClick={() => uploadRef.current?.click()}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 text-white/80 text-sm tracking-[0.15em] transition-colors"
              >
                upload image
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
