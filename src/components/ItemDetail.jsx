import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ─── Sliding toggle switch ─────────────────────────────────────────────────────
function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-5 rounded-full border border-white/15 flex items-center flex-shrink-0 transition-colors ${
        enabled ? 'bg-white/20' : 'bg-white/5'
      }`}
    >
      <span
        className="w-3.5 h-3.5 rounded-full bg-white"
        style={{
          transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ItemDetail({ item, onClose, onArchived, isArchived = false }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [visibility, setVisibility] = useState(null)
  const [visibilityLoading, setVisibilityLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editVisibility, setEditVisibility] = useState(null)

  // Local copy of item fields so view mode reflects saves without a parent refetch
  const [localItem, setLocalItem] = useState(item)

  useEffect(() => {
    const fetchVisibility = async () => {
      const { data } = await supabase
        .from('item_visibility_settings')
        .select('*')
        .eq('item_id', item.id)
        .single()

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

  const enterEditMode = () => {
    setEditForm({
      name: localItem.name ?? '',
      description: localItem.description ?? '',
      size: localItem.size ?? '',
      price: localItem.price != null ? String(localItem.price) : '',
      quantity_available: localItem.quantity_available ?? 1,
    })
    setEditVisibility({
      show_name: visibility?.show_name ?? true,
      show_description: visibility?.show_description ?? true,
      show_size: visibility?.show_size ?? true,
      show_price: visibility?.show_price ?? true,
      show_quantity: visibility?.show_quantity ?? false,
    })
    setIsEditing(true)
    setError('')
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const { error: itemErr } = await supabase
      .from('items')
      .update({
        name: editForm.name || null,
        description: editForm.description || null,
        size: editForm.size || null,
        price: editForm.price ? parseFloat(editForm.price) : null,
        quantity_available: editForm.quantity_available,
      })
      .eq('id', item.id)

    if (itemErr) {
      setError(itemErr.message)
      setSaving(false)
      return
    }

    const { error: visErr } = await supabase
      .from('item_visibility_settings')
      .upsert({ item_id: item.id, ...editVisibility }, { onConflict: 'item_id' })

    if (visErr) {
      setError(visErr.message)
      setSaving(false)
      return
    }

    // Reflect saved values in view mode without requiring a parent refetch
    setLocalItem(prev => ({
      ...prev,
      name: editForm.name || null,
      description: editForm.description || null,
      size: editForm.size || null,
      price: editForm.price ? parseFloat(editForm.price) : null,
      quantity_available: editForm.quantity_available,
    }))
    setVisibility(editVisibility)
    setIsEditing(false)
    setSaving(false)
  }

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

  const updateEdit = (key, value) => setEditForm(f => ({ ...f, [key]: value }))
  const toggleEditVis = (key) => setEditVisibility(v => ({ ...v, [key]: !v[key] }))

  // Check if any product fields are visible and populated
  const hasDetails =
    !visibilityLoading && (
      (visibility?.show_name && localItem.name) ||
      (visibility?.show_price && localItem.price) ||
      (visibility?.show_description && localItem.description) ||
      (visibility?.show_size && localItem.size) ||
      (visibility?.show_quantity && localItem.quantity_available != null)
    )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/95 z-30 flex flex-col overflow-y-auto overflow-x-hidden"
    >
      {/* Header — edit + close side by side */}
      <div className="flex justify-end items-center gap-2 px-4 pt-4 flex-shrink-0">
        {!isArchived && (
          <button
            onClick={isEditing ? cancelEdit : enterEditMode}
            className="text-white/30 hover:text-white/60 text-xs tracking-[0.2em] transition-colors px-2 py-2"
          >
            {isEditing ? 'cancel' : 'edit'}
          </button>
        )}
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
          src={localItem.image_url}
          alt={localItem.name || ''}
          className="max-w-full object-contain rounded-sm"
          style={{ maxHeight: '65vh', boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }}
        />
      </div>

      {/* ── VIEW MODE: product details ── */}
      {!isEditing && !visibilityLoading && hasDetails && (
        <div className="flex-shrink-0 px-6 pb-4 space-y-4">

          {(visibility?.show_name && localItem.name) || (visibility?.show_price && localItem.price) ? (
            <div className="flex items-start justify-between gap-4">
              {visibility?.show_name && localItem.name ? (
                <h2 className="text-white/80 text-base tracking-[0.1em] leading-snug flex-1">
                  {localItem.name}
                </h2>
              ) : <div className="flex-1" />}
              {visibility?.show_price && localItem.price ? (
                <span className="text-white/60 text-base tracking-[0.1em] flex-shrink-0">
                  ${parseFloat(localItem.price).toFixed(2)}
                </span>
              ) : null}
            </div>
          ) : null}

          {visibility?.show_description && localItem.description ? (
            <p className="text-white/40 text-sm tracking-wide leading-relaxed">
              {localItem.description}
            </p>
          ) : null}

          {(visibility?.show_size && localItem.size) || (visibility?.show_quantity && localItem.quantity_available != null) ? (
            <div className="flex items-center gap-6">
              {visibility?.show_size && localItem.size ? (
                <div>
                  <p className="text-white/20 text-[10px] tracking-[0.25em] mb-0.5">size</p>
                  <p className="text-white/50 text-sm tracking-[0.15em]">{localItem.size}</p>
                </div>
              ) : null}
              {visibility?.show_quantity && localItem.quantity_available != null ? (
                <div>
                  <p className="text-white/20 text-[10px] tracking-[0.25em] mb-0.5">available</p>
                  <p className="text-white/50 text-sm tracking-[0.15em]">{localItem.quantity_available}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="border-t border-white/5" />
        </div>
      )}

      {/* ── EDIT MODE: editable fields ── */}
      {isEditing && editForm && (
        <div className="flex-shrink-0 px-6 pb-4 space-y-4">

          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/30 text-[10px] tracking-[0.2em]">name</p>
              <ToggleSwitch enabled={editVisibility.show_name} onToggle={() => toggleEditVis('show_name')} />
            </div>
            <input
              value={editForm.name}
              onChange={e => updateEdit('name', e.target.value)}
              placeholder="item name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/30 text-[10px] tracking-[0.2em]">description</p>
              <ToggleSwitch enabled={editVisibility.show_description} onToggle={() => toggleEditVis('show_description')} />
            </div>
            <textarea
              value={editForm.description}
              onChange={e => updateEdit('description', e.target.value)}
              placeholder="describe the item..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20 resize-none"
            />
          </div>

          {/* Size + Price */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/30 text-[10px] tracking-[0.2em]">size</p>
                <ToggleSwitch enabled={editVisibility.show_size} onToggle={() => toggleEditVis('show_size')} />
              </div>
              <input
                value={editForm.size}
                onChange={e => updateEdit('size', e.target.value)}
                placeholder="M, 32x30..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/30 text-[10px] tracking-[0.2em]">price</p>
                <ToggleSwitch enabled={editVisibility.show_price} onToggle={() => toggleEditVis('show_price')} />
              </div>
              <input
                value={editForm.price}
                onChange={e => updateEdit('price', e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/30 text-[10px] tracking-[0.2em]">qty available</p>
              <ToggleSwitch enabled={editVisibility.show_quantity} onToggle={() => toggleEditVis('show_quantity')} />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateEdit('quantity_available', Math.max(1, editForm.quantity_available - 1))}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg hover:bg-white/10 transition-colors"
              >
                −
              </button>
              <span className="text-white/60 text-sm tracking-widest w-6 text-center">
                {editForm.quantity_available}
              </span>
              <button
                onClick={() => updateEdit('quantity_available', editForm.quantity_available + 1)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg hover:bg-white/10 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="border-t border-white/5" />
        </div>
      )}

      {/* ── BOTTOM ACTION AREA ── */}
      {!isArchived ? (
        <div className="flex-shrink-0 px-6 pb-10 space-y-2 mt-auto">
          {error && (
            <p className="text-red-400 text-xs text-center tracking-wide pb-1">{error}</p>
          )}
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-4 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all"
            >
              {saving ? 'saving...' : 'save changes'}
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="pb-10 mt-auto" />
      )}
    </motion.div>
  )
}
