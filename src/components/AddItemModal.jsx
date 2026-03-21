import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ─── Groq suggestion via Edge Function ───────────────────────────────────────
async function getAiSuggestion(imageBase64, mediaType, signal) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/groq-suggest`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ imageBase64, mediaType }),
      signal,
    }
  )
  if (!response.ok) throw new Error('AI suggestion failed')
  return response.json()
  // returns: { name, description, suggested_size, category, tags, brand, era, color, condition }
}

// ─── Compress image before sending to Groq ───────────────────────────────────
function compressImage(file, maxWidth = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return }
        console.log(`compressed image: ${(blob.size / 1024).toFixed(1)} KB`)
        resolve(blob)
      }, 'image/jpeg', 0.7)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }
    img.src = url
  })
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ─── Shimmer placeholder ──────────────────────────────────────────────────────
function Shimmer({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-white/5 rounded-lg ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// ─── Field toggle pill ────────────────────────────────────────────────────────
function TogglePill({ label, enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`text-[10px] tracking-[0.15em] px-2.5 py-1 rounded-full border transition-all ${
        enabled
          ? 'border-white/40 text-white/70 bg-white/8'
          : 'border-white/10 text-white/25 bg-transparent'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Tag list (delete only, no adding in v1) ─────────────────────────────────
function TagList({ tags, onChange }) {
  const removeTag = (tag) => onChange(tags.filter(t => t !== tag))
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 min-h-[44px]">
      {tags.length === 0 && (
        <span className="text-white/20 text-[11px] tracking-wide py-0.5">ai-generated tags will appear here</span>
      )}
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5 text-white/60 text-[11px] tracking-wide">
          {tag}
          <button onClick={() => removeTag(tag)} className="text-white/30 hover:text-white/60 transition-colors leading-none">×</button>
        </span>
      ))}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  'tops', 'bottoms', 'outerwear', 'dresses', 'shoes',
  'bags', 'jewelry', 'accessories', 'home', 'art', 'vintage', 'other'
]

const CONDITION_OPTIONS = ['new', 'excellent', 'good', 'fair']

// ─── Main component ───────────────────────────────────────────────────────────
export default function AddItemModal({ onClose, onAdded, initialFiles, onFilesConsumed, parentCameraRef }) {
  const uploadRef = useRef(null)
  const fallbackCameraRef = useRef(null)
  const cameraRef = parentCameraRef || fallbackCameraRef

  // Queue
  const [queue, setQueue] = useState([])
  const [reviewingId, setReviewingId] = useState(null)
  const [approvedCount, setApprovedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Shared state
  const [featureFlags, setFeatureFlags] = useState({
    show_condition_field: false,
    show_brand_field: false,
    show_era_field: false,
    show_measurements_field: false,
    show_color_field: false,
    show_material_field: false,
    show_tags_field: false,
  })
  const [visibility, setVisibility] = useState({
    show_name: true,
    show_description: true,
    show_size: true,
    show_price: true,
    show_quantity: false,
    show_condition: true,
    show_brand: true,
    show_era: true,
    show_measurements: false,
    show_color: true,
    show_material: true,
    show_tags: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Exit animation
  const [isVisible, setIsVisible] = useState(true)
  const onExitRef = useRef(null)

  // Load collections and vendor feature flags on mount
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      if (!vendor) return

      const { data: flags } = await supabase
        .from('vendor_feature_flags')
        .select('*')
        .eq('vendor_id', vendor.id)
        .single()
      if (flags) setFeatureFlags(flags)
    }
    loadData()
  }, [])

  // Process initial files passed from parent (e.g. camera capture)
  // Must watch initialFiles so camera-from-inside-modal works (modal already mounted)
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      ingestFiles(initialFiles)
      onFilesConsumed?.()
    }
  }, [initialFiles])

  // ─── Queue helpers ────────────────────────────────────────────────────────
  const updateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const processItem = async (queueItem) => {
    const id = queueItem.id
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const file = queueItem.file
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage.from('item-images').upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl: url } } = supabase.storage.from('item-images').getPublicUrl(path)

      setQueue(prev => prev.map(i => i.id === id ? { ...i, storagePath: path, publicUrl: url, status: 'analyzing' } : i))

      const compressed = await compressImage(file)
      const base64 = await blobToBase64(compressed)
      const suggestion = await getAiSuggestion(base64, 'image/jpeg')

      setQueue(prev => prev.map(i => i.id === id ? {
        ...i,
        status: 'ready',
        aiSuggestion: suggestion,
        form: {
          name: suggestion.name || '',
          description: suggestion.description || '',
          size: suggestion.suggested_size || '',
          price: '',
          category: suggestion.category || '',
          tags: Array.isArray(suggestion.tags) ? suggestion.tags : [],
          brand: suggestion.brand || '',
          era: suggestion.era || '',
          color: suggestion.color || '',
          condition: suggestion.condition || '',
          material: '',
          measurements: '',
        },
      } : i))
    } catch (err) {
      setQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'error', error: err.message } : i))
    }
  }

  const retryItem = (queueItem) => {
    updateQueueItem(queueItem.id, { status: 'uploading', error: null })
    processItem(queueItem)
  }

  // ─── File handling ────────────────────────────────────────────────────────
  const ingestFiles = (files) => {
    if (files.length === 0) return

    const newItems = files.map(file => ({
      id: self.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
      error: null,
      storagePath: null,
      publicUrl: null,
      aiSuggestion: null,
      form: { name: '', description: '', size: '', price: '', category: '', tags: [], brand: '', era: '', color: '', condition: '', material: '', measurements: '' },
    }))

    setQueue(prev => [...prev, ...newItems])
    setTotalCount(prev => prev + files.length)

    // Single photo (camera): go straight to review
    if (files.length === 1) {
      setReviewingId(newItems[0].id)
    }

    newItems.forEach(item => processItem(item))
  }

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    ingestFiles(files)
    // Reset file input AFTER reading files — deferred so mobile camera
    // doesn't invalidate the file reference mid-read
    const input = e.target
    requestAnimationFrame(() => { input.value = '' })
  }

  // ─── Form field helpers ───────────────────────────────────────────────────
  const reviewItem = queue.find(i => i.id === reviewingId)

  const updateItemField = (key, value) => {
    const item = queue.find(i => i.id === reviewingId)
    if (!item) return
    updateQueueItem(reviewingId, {
      form: { ...item.form, [key]: value }
    })
  }

  const toggleVisibility = (key) => setVisibility(v => ({ ...v, [key]: !v[key] }))

  // ─── Approve handler ─────────────────────────────────────────────────────
  const handleApprove = async () => {
    const item = queue.find(i => i.id === reviewingId)
    if (!item) return
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: vendor } = await supabase.from('vendors').select('id').eq('profile_id', user.id).single()
      if (!vendor) throw new Error('Vendor profile not found')

      const { data: dbItem, error: itemErr } = await supabase
        .from('items')
        .insert({
          vendor_id: vendor.id,
          collection_id: null,
          image_url: item.publicUrl,
          name: item.form.name || null,
          description: item.form.description || null,
          size: item.form.size || null,
          price: item.form.price ? parseFloat(item.form.price) : null,
          status: 'active',
          category: item.form.category || null,
          tags: item.form.tags.length > 0 ? item.form.tags : [],
          brand: item.form.brand || null,
          era: item.form.era || null,
          color: item.form.color || null,
          condition: item.form.condition || null,
          material: item.form.material || null,
          measurements: item.form.measurements || null,
          category_reviewed: !!item.aiSuggestion,
          category_model: item.aiSuggestion ? 'llama-4-scout-17b-16e-instruct' : null,
        })
        .select('id')
        .single()
      if (itemErr) throw itemErr

      const { data: photo, error: photoErr } = await supabase
        .from('item_photos')
        .insert({
          item_id: dbItem.id,
          storage_path: item.storagePath,
          is_primary: true,
          sort_order: 0,
          ai_analyzed: !!item.aiSuggestion,
        })
        .select('id')
        .single()
      if (photoErr) throw photoErr

      await supabase.from('item_visibility_settings').insert({ item_id: dbItem.id, ...visibility })

      if (item.aiSuggestion) {
        await supabase.from('item_ai_suggestions').insert({
          item_id: dbItem.id,
          photo_id: photo.id,
          suggested_name: item.aiSuggestion.name,
          suggested_description: item.aiSuggestion.description,
          suggested_size: item.aiSuggestion.suggested_size,
          suggested_category: item.aiSuggestion.category || null,
          suggested_tags: Array.isArray(item.aiSuggestion.tags) ? item.aiSuggestion.tags : [],
          suggested_brand: item.aiSuggestion.brand || null,
          suggested_era: item.aiSuggestion.era || null,
          suggested_color: item.aiSuggestion.color || null,
          suggested_condition: item.aiSuggestion.condition || null,
          model_used: 'llama-4-scout-17b-16e-instruct',
          accepted_name: item.form.name === item.aiSuggestion.name,
          accepted_description: item.form.description === item.aiSuggestion.description,
          accepted_category: item.form.category === item.aiSuggestion.category,
          accepted_tags: JSON.stringify(item.form.tags) === JSON.stringify(item.aiSuggestion.tags),
        })
      }

      setApprovedCount(prev => prev + 1)
      const remaining = queue.filter(i => i.id !== reviewingId)
      setQueue(remaining)

      const nextReady = remaining.find(i => i.status === 'ready')
      if (nextReady) {
        setReviewingId(nextReady.id)
      } else if (remaining.length === 0) {
        onExitRef.current = onAdded
        setIsVisible(false)
      } else {
        setReviewingId(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Close with warning ───────────────────────────────────────────────────
  const handleClose = () => {
    if (saving) return
    if (queue.length > 0) {
      if (!window.confirm('You have unapproved items. They will be lost if you close.')) return
    }
    onExitRef.current = onClose
    setIsVisible(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden upload input — camera input lives in parent to survive modal lifecycle */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <AnimatePresence onExitComplete={() => onExitRef.current?.()}>
        {/* Backdrop */}
        {isVisible && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 z-50"
          />
        )}

        {/* Sheet */}
        {isVisible && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 bg-[#141414] rounded-t-2xl z-50 max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
          >
            <div className="px-6 pt-4 pb-6">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              {/* ── PICK step — no items in queue, not reviewing ── */}
              {queue.length === 0 && !reviewingId ? (
                <>
                  <p className="text-white/35 text-xs tracking-[0.25em] text-center mb-5">
                    add to rack
                  </p>
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
                      upload images
                    </button>
                  </div>
                </>

              ) : reviewingId && reviewItem ? (
                /* ── REVIEW step ── */
                <>
                  <div className="flex items-center justify-between mb-5">
                    {queue.length > 1 ? (
                      <button
                        onClick={() => setReviewingId(null)}
                        className="text-white/30 text-xs tracking-[0.15em] hover:text-white/60 transition-colors"
                      >
                        ← queue
                      </button>
                    ) : (
                      <div className="w-10" />
                    )}
                    <p className="text-white/35 text-xs tracking-[0.25em]">{queue.length > 1 ? 'review item' : 'new item'}</p>
                    {totalCount > 1 ? (
                      <p className="text-white/25 text-[10px] tracking-[0.15em]">{approvedCount} of {totalCount}</p>
                    ) : (
                      <div className="w-10" />
                    )}
                  </div>

                  {error && <p className="text-red-400 text-xs text-center mb-4 tracking-wide">{error}</p>}

                  {/* Preview image — prefer publicUrl (survives tab suspension) over blob previewUrl */}
                  <div className="relative mb-5">
                    <img src={reviewItem.publicUrl || reviewItem.previewUrl} alt="item preview" className="w-full h-48 object-cover rounded-xl" />
                    {(reviewItem.status === 'uploading' || reviewItem.status === 'analyzing') && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-white/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-white/50 text-[10px] tracking-widest">
                          {reviewItem.status === 'uploading' ? 'uploading...' : 'analyzing...'}
                        </span>
                      </div>
                    )}
                    {reviewItem.status === 'ready' && reviewItem.aiSuggestion && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-3 py-1">
                        <span className="text-white/40 text-[10px] tracking-widest">&#10022; ai filled</span>
                      </div>
                    )}
                    {reviewItem.status === 'error' && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <span className="text-red-400/70 text-[10px] tracking-widest">failed</span>
                        <button onClick={() => retryItem(reviewItem)} className="text-white/40 text-[10px] tracking-wide underline">retry</button>
                      </div>
                    )}
                  </div>

                  {/* ── CORE FIELDS ── */}

                  {/* Name */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">name</p>
                      <TogglePill label="visible" enabled={visibility.show_name} onToggle={() => toggleVisibility('show_name')} />
                    </div>
                    <input
                      value={reviewItem.form.name}
                      onChange={e => updateItemField('name', e.target.value)}
                      placeholder="item name..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">description</p>
                      <TogglePill label="visible" enabled={visibility.show_description} onToggle={() => toggleVisibility('show_description')} />
                    </div>
                    <textarea
                      value={reviewItem.form.description}
                      onChange={e => updateItemField('description', e.target.value)}
                      placeholder="describe the item..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20 resize-none"
                    />
                  </div>

                  {/* Size + Price */}
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">size</p>
                        <TogglePill label="visible" enabled={visibility.show_size} onToggle={() => toggleVisibility('show_size')} />
                      </div>
                      <input
                        value={reviewItem.form.size}
                        onChange={e => updateItemField('size', e.target.value)}
                        placeholder="M, 32x30..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">price</p>
                        <TogglePill label="visible" enabled={visibility.show_price} onToggle={() => toggleVisibility('show_price')} />
                      </div>
                      <input
                        value={reviewItem.form.price}
                        onChange={e => updateItemField('price', e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">category</p>
                    </div>
                    <select
                      value={reviewItem.form.category}
                      onChange={e => updateItemField('category', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide appearance-none focus:outline-none focus:border-white/25"
                    >
                      <option value="">select category...</option>
                      {CATEGORY_OPTIONS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* ── OPTIONAL FIELDS (gated by feature flags) ── */}

                  {/* Tags */}
                  {featureFlags.show_tags_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">tags</p>
                        <TogglePill label="visible" enabled={visibility.show_tags} onToggle={() => toggleVisibility('show_tags')} />
                      </div>
                      <TagList
                        tags={reviewItem.form.tags}
                        onChange={tags => updateItemField('tags', tags)}
                      />
                    </div>
                  )}

                  {/* Brand */}
                  {featureFlags.show_brand_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">brand</p>
                        <TogglePill label="visible" enabled={visibility.show_brand} onToggle={() => toggleVisibility('show_brand')} />
                      </div>
                      <input
                        value={reviewItem.form.brand}
                        onChange={e => updateItemField('brand', e.target.value)}
                        placeholder="brand name..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Era */}
                  {featureFlags.show_era_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">era</p>
                        <TogglePill label="visible" enabled={visibility.show_era} onToggle={() => toggleVisibility('show_era')} />
                      </div>
                      <input
                        value={reviewItem.form.era}
                        onChange={e => updateItemField('era', e.target.value)}
                        placeholder="1970s, Y2K, Victorian..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Condition */}
                  {featureFlags.show_condition_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">condition</p>
                        <TogglePill label="visible" enabled={visibility.show_condition} onToggle={() => toggleVisibility('show_condition')} />
                      </div>
                      <select
                        value={reviewItem.form.condition}
                        onChange={e => updateItemField('condition', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide appearance-none focus:outline-none focus:border-white/25"
                      >
                        <option value="">select condition...</option>
                        {CONDITION_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Color */}
                  {featureFlags.show_color_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">color</p>
                        <TogglePill label="visible" enabled={visibility.show_color} onToggle={() => toggleVisibility('show_color')} />
                      </div>
                      <input
                        value={reviewItem.form.color}
                        onChange={e => updateItemField('color', e.target.value)}
                        placeholder="indigo, cream, olive green..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Material */}
                  {featureFlags.show_material_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">material</p>
                        <TogglePill label="visible" enabled={visibility.show_material} onToggle={() => toggleVisibility('show_material')} />
                      </div>
                      <input
                        value={reviewItem.form.material}
                        onChange={e => updateItemField('material', e.target.value)}
                        placeholder="denim, linen, leather..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Measurements */}
                  {featureFlags.show_measurements_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">measurements</p>
                        <TogglePill label="visible" enabled={visibility.show_measurements} onToggle={() => toggleVisibility('show_measurements')} />
                      </div>
                      <input
                        value={reviewItem.form.measurements}
                        onChange={e => updateItemField('measurements', e.target.value)}
                        placeholder="chest 18in, length 26in..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Approve button */}
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="w-full bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-4 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all mt-2"
                  >
                    {saving ? 'saving...' : 'approve'}
                  </button>

                  {/* Discard item */}
                  <button
                    onClick={() => {
                      const remaining = queue.filter(i => i.id !== reviewingId)
                      setQueue(remaining)
                      const nextReady = remaining.find(i => i.status === 'ready')
                      setReviewingId(nextReady?.id || null)
                    }}
                    className="w-full py-2 mt-1 text-white/20 text-xs tracking-[0.15em] hover:text-white/40 transition-colors"
                  >
                    discard item
                  </button>
                </>

              ) : (
                /* ── QUEUE step — thumbnails and progress ── */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/35 text-xs tracking-[0.25em]">upload queue</p>
                    <p className="text-white/25 text-[10px] tracking-[0.15em]">{approvedCount} of {totalCount} approved</p>
                  </div>

                  {error && <p className="text-red-400 text-xs text-center mb-4 tracking-wide">{error}</p>}

                  {/* Thumbnail grid */}
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {queue.map(item => (
                      <button
                        key={item.id}
                        onClick={() => item.status === 'ready' && setReviewingId(item.id)}
                        disabled={item.status !== 'ready'}
                        className="relative aspect-square rounded-lg overflow-hidden bg-[#141414]"
                      >
                        <img src={item.publicUrl || item.previewUrl} alt="" className="w-full h-full object-cover" />
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white/50 text-[10px] tracking-widest">uploading...</span>
                          </div>
                        )}
                        {item.status === 'analyzing' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
                          </div>
                        )}
                        {item.status === 'ready' && (
                          <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-green-500/80" />
                        )}
                        {item.status === 'error' && (
                          <div className="absolute inset-0 bg-red-950/50 flex flex-col items-center justify-center gap-1">
                            <span className="text-red-400/70 text-[10px] tracking-wide">failed</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); retryItem(item) }}
                              className="text-white/40 text-[10px] tracking-wide underline"
                            >
                              retry
                            </button>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Add more button */}
                  <button
                    onClick={() => uploadRef.current?.click()}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-white/40 text-xs tracking-[0.15em] transition-colors"
                  >
                    + add more images
                  </button>

                  {/* Done button — when only errors remain */}
                  {queue.every(i => i.status === 'error') && queue.length > 0 && (
                    <button
                      onClick={handleClose}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white/40 text-xs tracking-[0.15em] mt-2 transition-colors"
                    >
                      done
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
