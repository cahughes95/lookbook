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
  return new Promise((resolve) => {
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
        console.log(`compressed image: ${(blob.size / 1024).toFixed(1)} KB`)
        resolve(blob)
      }, 'image/jpeg', 0.7)
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

// ─── Tag pill (editable) ──────────────────────────────────────────────────────
function TagList({ tags, onChange }) {
  const [inputVal, setInputVal] = useState('')

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag))

  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = inputVal.trim().toLowerCase().replace(/\s+/g, '-')
      if (val && !tags.includes(val)) onChange([...tags, val])
      setInputVal('')
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 min-h-[44px]">
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5 text-white/60 text-[11px] tracking-wide"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-white/30 hover:text-white/60 transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={addTag}
        placeholder={tags.length === 0 ? 'add tags...' : ''}
        className="bg-transparent text-white/60 text-[11px] tracking-wide focus:outline-none placeholder:text-white/20 min-w-[80px] flex-1"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AddItemModal({ onClose, onAdded }) {
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)
  const aiAbortRef = useRef(null)

  // step: 'pick' | 'form'
  const [step, setStep] = useState('pick')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  // Uploaded file state
  const [previewUrl, setPreviewUrl] = useState(null)
  const [storagePath, setStoragePath] = useState(null)
  const [publicUrl, setPublicUrl] = useState(null)

  // Collections
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewCollection, setShowNewCollection] = useState(false)

  // Vendor feature flags — controls which optional fields are shown
  const [featureFlags, setFeatureFlags] = useState({
    show_condition_field: false,
    show_brand_field: false,
    show_era_field: false,
    show_measurements_field: false,
    show_color_field: false,
    show_material_field: false,
    show_tags_field: false,
  })

  // Product form — core fields always shown
  const [form, setForm] = useState({
    name: '',
    description: '',
    size: '',
    price: '',
    // Optional fields — populated by AI in background, shown if flag enabled
    category: '',
    tags: [],
    brand: '',
    era: '',
    color: '',
    condition: '',
    material: '',
    measurements: '',
  })

  // Visibility toggles (what buyers see)
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

  // AI suggestion tracking
  const [aiSuggestion, setAiSuggestion] = useState(null)

  // Exit animation control
  const [isVisible, setIsVisible] = useState(true)
  const onExitRef = useRef(null)

  const handleClose = () => {
    if (uploading || saving) return
    onExitRef.current = onClose
    setIsVisible(false)
  }

  // Load collections and vendor feature flags on mount
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Look up vendor id first
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      if (!vendor) return

      // Load vendor's collections
      const { data: cols } = await supabase
        .from('collections')
        .select('id, name, collection_number')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
      if (cols) setCollections(cols)

      // Load vendor feature flags
      const { data: flags } = await supabase
        .from('vendor_feature_flags')
        .select('*')
        .eq('vendor_id', vendor.id)
        .single()
      if (flags) setFeatureFlags(flags)
    }
    loadData()
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      setPreviewUrl(URL.createObjectURL(file))

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl: url } } = supabase.storage
        .from('item-images')
        .getPublicUrl(path)

      setStoragePath(path)
      setPublicUrl(url)
      setStep('form')
      setUploading(false)

      // Fire AI suggestion in parallel — populates all fields including new ones
      aiAbortRef.current?.abort()
      const controller = new AbortController()
      aiAbortRef.current = controller
      setAiLoading(true)
      try {
        const compressed = await compressImage(file)
        const base64 = await blobToBase64(compressed)
        const suggestion = await getAiSuggestion(base64, 'image/jpeg', controller.signal)
        setAiSuggestion(suggestion)
        // Populate all fields from AI — optional ones stored silently even if not shown
        setForm(f => ({
          ...f,
          name: suggestion.name || '',
          description: suggestion.description || '',
          size: suggestion.suggested_size || '',
          category: suggestion.category || '',
          tags: Array.isArray(suggestion.tags) ? suggestion.tags : [],
          brand: suggestion.brand || '',
          era: suggestion.era || '',
          color: suggestion.color || '',
          condition: suggestion.condition || '',
        }))
      } catch (aiErr) {
        if (aiErr.name !== 'AbortError') {
          console.warn('AI suggestion failed silently:', aiErr)
        }
      } finally {
        setAiLoading(false)
      }
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedCollectionId && !newCollectionName.trim()) {
      setError(showNewCollection ? 'Enter a collection name' : 'Select a collection')
      return
    }
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Get vendor id
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      if (!vendor) throw new Error('Vendor profile not found')

      let collectionId = selectedCollectionId

      // Create new collection if needed
      if (showNewCollection && newCollectionName.trim()) {
        const nextNum = collections.reduce((m, c) => Math.max(m, c.collection_number ?? 0), 0) + 1
        const { data: newCol, error: colErr } = await supabase
          .from('collections')
          .insert({
            vendor_id: vendor.id,
            name: newCollectionName.trim(),
            is_published: true,
            collection_number: nextNum,
          })
          .select('id')
          .single()
        if (colErr) throw colErr
        collectionId = newCol.id
      }

      // Insert item — all AI fields saved regardless of whether they were shown
      const { data: item, error: itemErr } = await supabase
        .from('items')
        .insert({
          vendor_id: vendor.id,
          collection_id: collectionId,
          image_url: publicUrl,
          name: form.name || null,
          description: form.description || null,
          size: form.size || null,
          price: form.price ? parseFloat(form.price) : null,
          status: 'active',
          // AI-populated fields — always saved even if not shown in form
          category: form.category || null,
          tags: form.tags.length > 0 ? form.tags : [],
          brand: form.brand || null,
          era: form.era || null,
          color: form.color || null,
          condition: form.condition || null,
          material: form.material || null,
          measurements: form.measurements || null,
          category_reviewed: !!aiSuggestion,
          category_model: aiSuggestion ? 'llama-4-scout-17b-16e-instruct' : null,
        })
        .select('id')
        .single()
      if (itemErr) throw itemErr

      // Insert primary photo record
      const { data: photo, error: photoErr } = await supabase
        .from('item_photos')
        .insert({
          item_id: item.id,
          storage_path: storagePath,
          is_primary: true,
          sort_order: 0,
          ai_analyzed: !!aiSuggestion,
        })
        .select('id')
        .single()
      if (photoErr) throw photoErr

      // Insert visibility settings
      await supabase.from('item_visibility_settings').insert({
        item_id: item.id,
        ...visibility,
      })

      // Track full AI suggestion for prompt quality analysis
      if (aiSuggestion) {
        await supabase.from('item_ai_suggestions').insert({
          item_id: item.id,
          photo_id: photo.id,
          suggested_name: aiSuggestion.name,
          suggested_description: aiSuggestion.description,
          suggested_size: aiSuggestion.suggested_size,
          suggested_category: aiSuggestion.category || null,
          suggested_tags: Array.isArray(aiSuggestion.tags) ? aiSuggestion.tags : [],
          suggested_brand: aiSuggestion.brand || null,
          suggested_era: aiSuggestion.era || null,
          suggested_color: aiSuggestion.color || null,
          suggested_condition: aiSuggestion.condition || null,
          model_used: 'llama-4-scout-17b-16e-instruct',
          accepted_name: form.name === aiSuggestion.name,
          accepted_description: form.description === aiSuggestion.description,
          accepted_category: form.category === aiSuggestion.category,
          accepted_tags: JSON.stringify(form.tags) === JSON.stringify(aiSuggestion.tags),
        })
      }

      onExitRef.current = onAdded
      setIsVisible(false)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const updateField = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const toggleVisibility = (key) => setVisibility(v => ({ ...v, [key]: !v[key] }))

  const CATEGORY_OPTIONS = [
    'tops', 'bottoms', 'outerwear', 'dresses', 'shoes',
    'bags', 'jewelry', 'accessories', 'home', 'art', 'vintage', 'other'
  ]

  const CONDITION_OPTIONS = ['new', 'excellent', 'good', 'fair']

  return (
    <>
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
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
            className="fixed inset-0 bg-black/70 z-30"
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
            className="fixed bottom-0 left-0 right-0 bg-[#141414] rounded-t-2xl z-40 max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
          >
            <div className="px-6 pt-4 pb-6">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              {/* ── STEP 1: Pick photo ── */}
              {step === 'pick' && (
                <>
                  <p className="text-white/35 text-xs tracking-[0.25em] text-center mb-5">
                    add to rack
                  </p>
                  {error && (
                    <p className="text-red-400 text-xs text-center mb-4 tracking-wide">{error}</p>
                  )}
                  {uploading ? (
                    <div className="py-6 text-center">
                      <p className="text-white/40 text-sm tracking-widest">uploading...</p>
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
                </>
              )}

              {/* ── STEP 2: Product form ── */}
              {step === 'form' && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={() => {
                        aiAbortRef.current?.abort()
                        setStep('pick')
                        setAiLoading(false)
                        setAiSuggestion(null)
                        setForm({
                          name: '', description: '', size: '', price: '',
                          category: '', tags: [], brand: '', era: '',
                          color: '', condition: '', material: '', measurements: '',
                        })
                      }}
                      className="text-white/30 text-xs tracking-[0.15em] hover:text-white/60 transition-colors"
                    >
                      ← back
                    </button>
                    <p className="text-white/35 text-xs tracking-[0.25em]">new item</p>
                    <div className="w-10" />
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs text-center mb-4 tracking-wide">{error}</p>
                  )}

                  {/* Preview + AI badge */}
                  <div className="relative mb-5">
                    <img
                      src={previewUrl}
                      alt="item preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    {aiLoading && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-white/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-white/50 text-[10px] tracking-widest">analyzing...</span>
                      </div>
                    )}
                    {!aiLoading && aiSuggestion && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-3 py-1">
                        <span className="text-white/40 text-[10px] tracking-widest">✦ ai filled</span>
                      </div>
                    )}
                  </div>

                  {/* Collection picker */}
                  <div className="mb-4">
                    <p className="text-white/30 text-[10px] tracking-[0.2em] mb-2">collection</p>
                    {!showNewCollection ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedCollectionId}
                          onChange={e => setSelectedCollectionId(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide appearance-none focus:outline-none focus:border-white/25"
                        >
                          <option value="">select collection...</option>
                          {collections.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.collection_number ? `#${c.collection_number} — ` : ''}{c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const maxNum = collections.reduce((m, c) => Math.max(m, c.collection_number ?? 0), 0)
                            const next = String(maxNum + 1).padStart(2, '0')
                            setShowNewCollection(true)
                            setSelectedCollectionId('')
                            setNewCollectionName(`Collection ${next}`)
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 text-white/40 text-xs tracking-widest hover:bg-white/10 transition-colors"
                        >
                          + new
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={newCollectionName}
                          onChange={e => setNewCollectionName(e.target.value)}
                          placeholder="collection name..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                        />
                        <button
                          onClick={() => { setShowNewCollection(false); setNewCollectionName('') }}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 text-white/40 text-xs tracking-widest hover:bg-white/10 transition-colors"
                        >
                          cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── CORE FIELDS (always shown) ── */}

                  {/* Name */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">name</p>
                      <TogglePill
                        label="visible"
                        enabled={visibility.show_name}
                        onToggle={() => toggleVisibility('show_name')}
                      />
                    </div>
                    {aiLoading ? (
                      <Shimmer className="h-12" />
                    ) : (
                      <input
                        value={form.name}
                        onChange={e => updateField('name', e.target.value)}
                        placeholder="item name..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">description</p>
                      <TogglePill
                        label="visible"
                        enabled={visibility.show_description}
                        onToggle={() => toggleVisibility('show_description')}
                      />
                    </div>
                    {aiLoading ? (
                      <Shimmer className="h-20" />
                    ) : (
                      <textarea
                        value={form.description}
                        onChange={e => updateField('description', e.target.value)}
                        placeholder="describe the item..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20 resize-none"
                      />
                    )}
                  </div>

                  {/* Size + Price */}
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">size</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_size}
                          onToggle={() => toggleVisibility('show_size')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <input
                          value={form.size}
                          onChange={e => updateField('size', e.target.value)}
                          placeholder="M, 32x30..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">price</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_price}
                          onToggle={() => toggleVisibility('show_price')}
                        />
                      </div>
                      <input
                        value={form.price}
                        onChange={e => updateField('price', e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  {/* Category — always shown, AI picks it */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/30 text-[10px] tracking-[0.2em]">category</p>
                    </div>
                    {aiLoading ? (
                      <Shimmer className="h-12" />
                    ) : (
                      <select
                        value={form.category}
                        onChange={e => updateField('category', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide appearance-none focus:outline-none focus:border-white/25"
                      >
                        <option value="">select category...</option>
                        {CATEGORY_OPTIONS.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* ── OPTIONAL FIELDS (shown based on vendor feature flags) ── */}

                  {/* Tags — shown if flag enabled */}
                  {featureFlags.show_tags_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">tags</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_tags}
                          onToggle={() => toggleVisibility('show_tags')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <TagList
                          tags={form.tags}
                          onChange={tags => updateField('tags', tags)}
                        />
                      )}
                      <p className="text-white/20 text-[10px] tracking-wide mt-1.5">
                        press enter or comma to add a tag
                      </p>
                    </div>
                  )}

                  {/* Brand — shown if flag enabled */}
                  {featureFlags.show_brand_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">brand</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_brand}
                          onToggle={() => toggleVisibility('show_brand')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <input
                          value={form.brand}
                          onChange={e => updateField('brand', e.target.value)}
                          placeholder="brand name..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                        />
                      )}
                    </div>
                  )}

                  {/* Era — shown if flag enabled */}
                  {featureFlags.show_era_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">era</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_era}
                          onToggle={() => toggleVisibility('show_era')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <input
                          value={form.era}
                          onChange={e => updateField('era', e.target.value)}
                          placeholder="1970s, Y2K, Victorian..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                        />
                      )}
                    </div>
                  )}

                  {/* Condition — shown if flag enabled */}
                  {featureFlags.show_condition_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">condition</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_condition}
                          onToggle={() => toggleVisibility('show_condition')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <select
                          value={form.condition}
                          onChange={e => updateField('condition', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide appearance-none focus:outline-none focus:border-white/25"
                        >
                          <option value="">select condition...</option>
                          {CONDITION_OPTIONS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Color — shown if flag enabled */}
                  {featureFlags.show_color_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">color</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_color}
                          onToggle={() => toggleVisibility('show_color')}
                        />
                      </div>
                      {aiLoading ? (
                        <Shimmer className="h-12" />
                      ) : (
                        <input
                          value={form.color}
                          onChange={e => updateField('color', e.target.value)}
                          placeholder="indigo, cream, olive green..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                        />
                      )}
                    </div>
                  )}

                  {/* Material — shown if flag enabled */}
                  {featureFlags.show_material_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">material</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_material}
                          onToggle={() => toggleVisibility('show_material')}
                        />
                      </div>
                      <input
                        value={form.material}
                        onChange={e => updateField('material', e.target.value)}
                        placeholder="denim, linen, leather..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Measurements — shown if flag enabled */}
                  {featureFlags.show_measurements_field && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/30 text-[10px] tracking-[0.2em]">measurements</p>
                        <TogglePill
                          label="visible"
                          enabled={visibility.show_measurements}
                          onToggle={() => toggleVisibility('show_measurements')}
                        />
                      </div>
                      <input
                        value={form.measurements}
                        onChange={e => updateField('measurements', e.target.value)}
                        placeholder="chest 18in, length 26in..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-4 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all mt-2"
                  >
                    {saving ? 'saving...' : 'add to rack'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}