import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import ItemDetail from '../components/ItemDetail'
import AddItemButton from '../components/AddItemButton'
import AddItemModal from '../components/AddItemModal'
import ArchiveGrid from '../components/ArchiveGrid'
import Rack from '../components/Rack'
import ViewToggle from '../components/ViewToggle'
import CategoryPills from '../components/CategoryPills'

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const TYPE_BADGES = {
  appearing: 'Appearing',
  new_stock: 'New Stock',
  sneak_peek: 'Sneak Peek',
}

const POST_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'appearing', label: 'Appearing' },
  { value: 'new_stock', label: 'New Stock' },
  { value: 'sneak_peek', label: 'Sneak Peek' },
]

// ── Bottom Nav Icons ─────────────────────────────────────────────────────────
function BulletinIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function CollectionIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function ArchiveIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function VendorBottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { key: 'bulletin', label: 'Bulletin', icon: BulletinIcon },
    { key: 'collection', label: 'Collection', icon: CollectionIcon },
    { key: 'archive', label: 'Archive', icon: ArchiveIcon },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center h-14">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => onTabChange(tab.key)} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon active={active} />
              <span className={`text-[9px] tracking-[0.15em] ${active ? 'text-white/70' : 'text-white/25'}`}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BULLETIN TAB
// ══════════════════════════════════════════════════════════════════════════════
function BulletinTab({ vendor }) {
  const [posts, setPosts] = useState(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [locations, setLocations] = useState([])

  const [composeOpen, setComposeOpen] = useState(false)
  const [postType, setPostType] = useState('general')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [locationId, setLocationId] = useState('')
  const [expiryDuration, setExpiryDuration] = useState('none')
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef(null)

  const EXPIRY_OPTIONS = [
    { value: 'none', label: 'No expiry' },
    { value: '24h', label: '24 hours' },
    { value: '3d', label: '3 days' },
    { value: '7d', label: '7 days' },
  ]

  useEffect(() => {
    loadData()
  }, [vendor.id])

  const loadData = async () => {
    const [{ count }, { data: bulletins }, { data: locs }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
      supabase.from('bulletins').select('*, locations(name)').eq('vendor_id', vendor.id).order('created_at', { ascending: false }),
      supabase.from('vendor_locations').select('*, locations(id, name)').eq('vendor_id', vendor.id),
    ])
    setFollowerCount(count ?? 0)
    setPosts(bulletins ?? [])
    setLocations(locs ?? [])
  }

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePost = async () => {
    if (!body.trim()) return
    setPosting(true)

    let imageUrl = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${vendor.id}/bulletin-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('item-images').upload(path, imageFile)
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(path)
        imageUrl = publicUrl
      }
    }

    let expiresAt = null
    if (expiryDuration !== 'none') {
      const ms = expiryDuration === '24h' ? 24*60*60*1000 : expiryDuration === '3d' ? 3*24*60*60*1000 : 7*24*60*60*1000
      expiresAt = new Date(Date.now() + ms).toISOString()
    }

    const row = {
      vendor_id: vendor.id,
      type: postType,
      body: body.trim(),
      image_url: imageUrl,
      location_id: (postType === 'appearing' && locationId) ? locationId : null,
      expires_at: expiresAt,
    }

    const { data: newPost, error } = await supabase
      .from('bulletins')
      .insert(row)
      .select('*, locations(name)')
      .single()

    if (!error && newPost) {
      setPosts(prev => [newPost, ...(prev ?? [])])
      setBody('')
      setPostType('general')
      setLocationId('')
      setExpiryDuration('none')
      clearImage()
      setComposeOpen(false)
    }
    setPosting(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('bulletins').delete().eq('id', id)
    setPosts(prev => (prev ?? []).filter(p => p.id !== id))
  }

  const postCount = posts?.length ?? 0

  return (
    <div className="px-5 pb-20 space-y-4">
      {/* Stats bar */}
      <div className="flex gap-6 py-2">
        <div className="text-center">
          <p className="text-white/60 text-sm tracking-wide">{followerCount}</p>
          <p className="text-white/20 text-[9px] tracking-[0.2em]">followers</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm tracking-wide">{postCount}</p>
          <p className="text-white/20 text-[9px] tracking-[0.2em]">posts</p>
        </div>
      </div>

      {/* Compose toggle / area */}
      <AnimatePresence>
        {composeOpen ? (
          <motion.div
            key="compose"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {POST_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setPostType(t.value)}
                      className={`flex-shrink-0 text-[10px] tracking-[0.12em] px-2.5 py-1 rounded-full border transition-all ${
                        postType === t.value
                          ? 'border-white/30 text-white/60 bg-white/5'
                          : 'border-white/8 text-white/25 hover:border-white/15'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setComposeOpen(false); setBody(''); setPostType('general'); setLocationId(''); setExpiryDuration('none'); clearImage() }}
                  className="text-white/20 text-xs ml-3 hover:text-white/40 transition-colors flex-shrink-0"
                >
                  &times;
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value.slice(0, 280))}
                  placeholder="what's happening..."
                  rows={3}
                  className="w-full bg-transparent text-white/70 text-sm tracking-wide leading-relaxed focus:outline-none placeholder:text-white/15 resize-none"
                />
                <span className={`absolute bottom-0 right-0 text-[9px] tracking-wide ${body.length > 260 ? 'text-red-400/60' : 'text-white/15'}`}>
                  {280 - body.length}
                </span>
              </div>

              {postType === 'appearing' && locations.length > 0 && (
                <select
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/60 text-xs tracking-wide focus:outline-none focus:border-white/25"
                >
                  <option value="">select location...</option>
                  {locations.map(vl => (
                    <option key={vl.locations?.id || vl.id} value={vl.locations?.id || vl.location_id}>
                      {vl.locations?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              )}

              {/* Expiry selector */}
              <div>
                <p className="text-white/20 text-[10px] tracking-[0.15em] mb-1.5">keep active for</p>
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {EXPIRY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExpiryDuration(opt.value)}
                      className={`flex-shrink-0 text-[10px] tracking-[0.12em] px-2.5 py-1 rounded-full border transition-all ${
                        expiryDuration === opt.value
                          ? 'border-white/30 text-white/60 bg-white/5'
                          : 'border-white/8 text-white/25 hover:border-white/15'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="" className="h-20 rounded-lg object-cover" />
                  <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/80 rounded-full text-white/50 text-xs flex items-center justify-center">&times;</button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="text-white/20 text-[10px] tracking-[0.15em] hover:text-white/40 transition-colors">+ image</button>
                </div>
                <button
                  onClick={handlePost}
                  disabled={posting || !body.trim()}
                  className="bg-white/90 hover:bg-white disabled:bg-white/20 rounded-full px-4 py-1.5 text-[#141414] disabled:text-white/30 text-[11px] tracking-[0.15em] font-medium transition-all"
                >
                  {posting ? '...' : 'post'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setComposeOpen(true)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white/40 text-[11px] tracking-[0.2em] hover:border-white/20 hover:text-white/60 transition-all flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            create new bulletin
          </button>
        )}
      </AnimatePresence>

      {/* Past posts */}
      {posts === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white/5 rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-white/15 text-xs tracking-[0.2em]">no posts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const isExpired = post.expires_at && new Date(post.expires_at) < new Date()
            let expiryLabel = null
            if (post.expires_at) {
              if (isExpired) {
                expiryLabel = 'Expired'
              } else {
                const hoursLeft = Math.max(0, (new Date(post.expires_at) - new Date()) / (1000 * 60 * 60))
                expiryLabel = hoursLeft < 24
                  ? `Expires in ${Math.ceil(hoursLeft)}h`
                  : `Expires in ${Math.ceil(hoursLeft / 24)}d`
              }
            }
            return (
              <div key={post.id} className={`bg-white/3 border border-white/5 rounded-xl p-4 space-y-2 ${isExpired ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  {TYPE_BADGES[post.type] && (
                    <span className="inline-block text-[10px] tracking-[0.15em] text-white/40 bg-white/5 border border-white/8 rounded-full px-2.5 py-0.5">
                      {TYPE_BADGES[post.type]}
                    </span>
                  )}
                  {expiryLabel && (
                    <span className={`text-[9px] tracking-[0.12em] ${isExpired ? 'text-white/25' : 'text-white/20'}`}>
                      {expiryLabel}
                    </span>
                  )}
                </div>
                {post.body && <p className="text-white/45 text-sm tracking-wide leading-relaxed">{post.body}</p>}
                {post.image_url && <img src={post.image_url} alt="" className="rounded-lg max-h-48 object-cover" />}
                {post.locations?.name && <p className="text-white/25 text-[10px] tracking-[0.12em]">{post.locations.name}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white/15 text-[10px] tracking-[0.15em]">{timeAgo(post.created_at)}</span>
                    <span className="text-white/12 text-[9px] tracking-wide">Reached {followerCount} followers</span>
                    {(post.likes_count > 0 || post.comments_count > 0) && (
                      <span className="text-white/15 text-[9px] tracking-wide">
                        {post.likes_count > 0 && `♥ ${post.likes_count}`}
                        {post.likes_count > 0 && post.comments_count > 0 && ' · '}
                        {post.comments_count > 0 && `💬 ${post.comments_count}`}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(post.id)} className="text-white/15 text-[10px] tracking-[0.15em] hover:text-red-400/50 transition-colors">delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SORTABLE ITEM CARD (dnd-kit)
// ══════════════════════════════════════════════════════════════════════════════
function ItemCardContent({ item, onItemClick, openMenuId, setOpenMenuId, handleMarkSold, handleArchive, handleDelete, actionLoading }) {
  return (
    <>
      <button onClick={() => onItemClick(item)} className="w-full h-full block">
        <img
          src={item.image_url}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
          onContextMenu={e => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
        className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-7 h-7 flex items-center justify-center z-10"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.6)">
          <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
        </svg>
      </button>
      {openMenuId === item.id && (
        <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg z-20 min-w-[120px] py-1 shadow-lg">
          <button onClick={() => handleMarkSold(item)} disabled={actionLoading === item.id} className="w-full text-left text-white/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 transition-colors disabled:opacity-40">Mark as Sold</button>
          <button onClick={() => handleArchive(item)} disabled={actionLoading === item.id} className="w-full text-left text-white/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 transition-colors disabled:opacity-40">Archive</button>
          <button onClick={() => handleDelete(item)} disabled={actionLoading === item.id} className="w-full text-left text-red-400/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-40">Delete</button>
        </div>
      )}
    </>
  )
}

function SortableItemCard({ item, isBeingDragged, ...cardProps }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
        opacity: isBeingDragged ? 0 : 1,
        zIndex: isBeingDragged ? 0 : undefined,
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: 'transform',
      }}
      onContextMenu={e => e.preventDefault()}
      {...attributes}
      {...listeners}
      className="relative aspect-square overflow-hidden bg-[#141414] cursor-grab active:cursor-grabbing touch-manipulation"
    >
      <ItemCardContent item={item} {...cardProps} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTION TAB
// ══════════════════════════════════════════════════════════════════════════════
function CollectionTab({ vendor, onItemClick }) {
  const [items, setItems] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [view, setView] = useState('grid')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [pendingFiles, setPendingFiles] = useState(null)
  const cameraRef = useRef(null)

  useEffect(() => {
    fetchItems()
  }, [vendor.id])

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return
    const handleClick = () => setOpenMenuId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuId])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('vendor_id', vendor.id)
      .in('status', ['active', 'sold'])
      .order('position', { ascending: true, nullsFirst: false })
    if (data) setItems(data)
  }

  const handleItemAdded = () => {
    setShowAddModal(false)
    fetchItems()
  }

  const handleMarkSold = async (item) => {
    setActionLoading(item.id)
    await supabase
      .from('items')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .eq('id', item.id)
    setOpenMenuId(null)
    await fetchItems()
    setActionLoading(null)
  }

  const handleArchive = async (item) => {
    setActionLoading(item.id)
    await supabase
      .from('items')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', item.id)
    setOpenMenuId(null)
    await fetchItems()
    setActionLoading(null)
  }

  const handleDelete = async (item) => {
    setActionLoading(item.id)
    try {
      if (item.image_url) {
        const match = item.image_url.match(/\/item-images\/(.+)$/)
        if (match) {
          await supabase.storage.from('item-images').remove([match[1]])
        }
      }
      // Delete child rows before the item (FK constraints)
      await Promise.all([
        supabase.from('item_ai_suggestions').delete().eq('item_id', item.id),
        supabase.from('item_visibility_settings').delete().eq('item_id', item.id),
        supabase.from('item_photos').delete().eq('item_id', item.id),
        supabase.from('saves').delete().eq('item_id', item.id),
      ])
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id)
      if (deleteError) {
        console.error('Delete failed:', deleteError)
        throw deleteError
      }
      setOpenMenuId(null)
      await fetchItems()
    } catch (err) {
      console.error('handleDelete error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const activeItems = items.filter(i => i.status === 'active')
  const soldItems = items.filter(i => i.status === 'sold')
  const sortedItems = [...activeItems, ...soldItems]
  const displayItems = activeCategory === 'all' ? sortedItems : sortedItems.filter(i => i.category === activeCategory)

  // dnd-kit reorder
  const [activeDragId, setActiveDragId] = useState(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event) => setActiveDragId(event.active.id)

  const handleDragEnd = async (event) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeItems.findIndex(i => i.id === active.id)
    const newIndex = activeItems.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(activeItems, oldIndex, newIndex)
    setItems([...reordered, ...items.filter(i => i.status === 'sold')])
    const updates = reordered.map((item, index) =>
      supabase.from('items').update({ position: index }).eq('id', item.id)
    )
    await Promise.all(updates)
  }

  const activeDragItem = activeDragId ? activeItems.find(i => i.id === activeDragId) : null

  return (
    <>
      {/* Category pills + View toggle */}
      <div className="px-6 pb-3 flex flex-col gap-3">
        <CategoryPills items={items} activeCategory={activeCategory} onChange={setActiveCategory} />
        <div className="flex justify-end">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="pb-20">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-white/15 text-sm tracking-[0.3em]">no items yet</p>
          </div>
        ) : view === 'grid' ? (
          <div className="bg-[#0a0a0a]">
            {activeCategory === 'all' ? (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeItems.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
                      {activeItems.map(item => (
                        <SortableItemCard
                          key={item.id}
                          item={item}
                          isBeingDragged={activeDragId === item.id}
                          onItemClick={onItemClick}
                          openMenuId={openMenuId}
                          setOpenMenuId={setOpenMenuId}
                          handleMarkSold={handleMarkSold}
                          handleArchive={handleArchive}
                          handleDelete={handleDelete}
                          actionLoading={actionLoading}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
                    {activeDragItem ? (
                      <div
                        className="relative aspect-square overflow-hidden bg-[#141414] shadow-2xl"
                        style={{ transform: 'scale(1.05)' }}
                      >
                        <img src={activeDragItem.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
                {soldItems.length > 0 && (
                  <div className="opacity-70">
                    <div className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/25 text-[10px] tracking-[0.25em]">{soldItems.length} sold</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
                      {soldItems.map(item => (
                        <div key={item.id} className="relative aspect-square overflow-hidden bg-[#141414]">
                          <button onClick={() => onItemClick(item)} className="w-full h-full block">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          </button>
                          <div className="absolute inset-0 bg-black/55 pointer-events-none" />
                          <div className="absolute top-5 left-[-32px] w-32 bg-white/90 text-[#141414] text-[10px] font-semibold tracking-[0.25em] text-center py-1.5 rotate-[-45deg] pointer-events-none z-10">
                            SOLD
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
                            className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-7 h-7 flex items-center justify-center z-10"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.6)">
                              <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                            </svg>
                          </button>
                          {openMenuId === item.id && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg z-20 min-w-[120px] py-1 shadow-lg">
                              <button onClick={() => handleArchive(item)} disabled={actionLoading === item.id} className="w-full text-left text-white/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 transition-colors disabled:opacity-40">Archive</button>
                              <button onClick={() => handleDelete(item)} disabled={actionLoading === item.id} className="w-full text-left text-red-400/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-40">Delete</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
                {displayItems.map(item => (
                  <div key={item.id} className="relative aspect-square overflow-hidden bg-[#141414]">
                    <button onClick={() => onItemClick(item)} className="w-full h-full block">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                    {item.status === 'sold' && (
                      <>
                        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
                        <div className="absolute top-5 left-[-32px] w-32 bg-white/90 text-[#141414] text-[10px] font-semibold tracking-[0.25em] text-center py-1.5 rotate-[-45deg] pointer-events-none z-10">
                          SOLD
                        </div>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
                      className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-7 h-7 flex items-center justify-center z-10"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.6)">
                        <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                      </svg>
                    </button>
                    {openMenuId === item.id && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg z-20 min-w-[120px] py-1 shadow-lg">
                        {item.status === 'active' && (
                          <button onClick={() => handleMarkSold(item)} disabled={actionLoading === item.id} className="w-full text-left text-white/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 transition-colors disabled:opacity-40">Mark as Sold</button>
                        )}
                        <button onClick={() => handleArchive(item)} disabled={actionLoading === item.id} className="w-full text-left text-white/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 transition-colors disabled:opacity-40">Archive</button>
                        <button onClick={() => handleDelete(item)} disabled={actionLoading === item.id} className="w-full text-left text-red-400/60 text-[11px] tracking-[0.12em] px-3 py-2 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-40">Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Rack items={displayItems} onItemClick={onItemClick} onActiveItemChange={() => {}} />
        )}
      </div>

      <AddItemButton onClick={() => setShowAddModal(true)} />

      {/* Camera input lives outside modal so it survives modal unmount/remount */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length === 0) return
          setPendingFiles(files)
          setShowAddModal(true)
          requestAnimationFrame(() => { e.target.value = '' })
        }}
      />

      <AnimatePresence>
        {showAddModal && (
          <AddItemModal
            key="add-modal"
            onClose={() => setShowAddModal(false)}
            onAdded={handleItemAdded}
            initialFiles={pendingFiles}
            onFilesConsumed={() => setPendingFiles(null)}
            parentCameraRef={cameraRef}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCHIVE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ArchiveTab({ vendor, onItemClick }) {
  const [items, setItems] = useState([])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('status', 'archived')
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  useEffect(() => { fetchItems() }, [vendor.id])

  const handleDelete = async (item) => {
    if (item.image_url) {
      const match = item.image_url.match(/\/item-images\/(.+)$/)
      if (match) {
        await supabase.storage.from('item-images').remove([match[1]])
      }
    }
    await Promise.all([
      supabase.from('item_ai_suggestions').delete().eq('item_id', item.id),
      supabase.from('item_visibility_settings').delete().eq('item_id', item.id),
      supabase.from('item_photos').delete().eq('item_id', item.id),
      supabase.from('saves').delete().eq('item_id', item.id),
    ])
    await supabase.from('items').delete().eq('id', item.id)
    await fetchItems()
  }

  return (
    <div className="pb-20">
      <ArchiveGrid items={items} onItemClick={onItemClick} onDelete={handleDelete} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function VendorDashboard() {
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('collection')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { navigate('/login', { replace: true }); return }
      setUser(u)

      const [{ data: prof }, { data: vend }] = await Promise.all([
        supabase.from('profiles').select('id, handle, display_name, avatar_url').eq('id', u.id).single(),
        supabase.from('vendors').select('*').eq('profile_id', u.id).single(),
      ])

      if (!vend?.is_approved) { navigate('/home', { replace: true }); return }
      if (!prof?.handle) { navigate('/vendor-settings', { replace: true }); return }

      setProfile(prof)
      setVendor(vend)
      setLoading(false)
    }
    load()
  }, [])

  const userInitial = (profile?.display_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-3 shrink-0">
        <div>
          <h1 className="text-white/50 text-sm font-light tracking-[0.35em]">lookbook</h1>
          <p className="text-white/20 text-[10px] tracking-[0.25em] mt-0.5">{activeTab}</p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.handle && (
            <Link
              to={`/v/${profile.handle}`}
              className="text-white/20 text-[10px] tracking-[0.15em] hover:text-white/40 transition-colors"
            >
              storefront &rarr;
            </Link>
          )}
          <button
            onClick={() => navigate('/vendor-settings')}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs tracking-wider"
          >
            {userInitial}
          </button>
        </div>
      </div>

      {/* Vendor identity bar */}
      <div className="px-6 pb-4 flex items-center gap-3">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
            {userInitial}
          </div>
        )}
        <div>
          <p className="text-white/70 text-sm tracking-[0.1em]">{profile.display_name}</p>
          {vendor.booth_name && (
            <p className="text-white/25 text-[10px] tracking-[0.15em]">{vendor.booth_name}</p>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'bulletin' && <BulletinTab vendor={vendor} />}
      {activeTab === 'collection' && <CollectionTab vendor={vendor} onItemClick={setSelectedItem} />}
      {activeTab === 'archive' && <ArchiveTab vendor={vendor} onItemClick={setSelectedItem} />}

      <VendorBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Item detail overlay */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetail
            key="vendor-item-detail"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onArchived={() => setSelectedItem(null)}
            onSold={() => setSelectedItem(null)}
            onDeleted={() => setSelectedItem(null)}
            isArchived={selectedItem.status === 'archived'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
