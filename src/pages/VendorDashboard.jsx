import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ItemDetail from '../components/ItemDetail'
import AddItemButton from '../components/AddItemButton'
import AddItemModal from '../components/AddItemModal'
import ArchiveGrid from '../components/ArchiveGrid'

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

  const [postType, setPostType] = useState('general')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [locationId, setLocationId] = useState('')
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [vendor.id])

  const loadData = async () => {
    const [{ count }, { data: bulletins }, { data: locs }] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
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

    const row = {
      vendor_id: vendor.id,
      type: postType,
      body: body.trim(),
      image_url: imageUrl,
      location_id: (postType === 'appearing' && locationId) ? locationId : null,
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
      clearImage()
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

      {/* Compose */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
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
          {posts.map(post => (
            <div key={post.id} className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2">
              {TYPE_BADGES[post.type] && (
                <span className="inline-block text-[10px] tracking-[0.15em] text-white/40 bg-white/5 border border-white/8 rounded-full px-2.5 py-0.5">
                  {TYPE_BADGES[post.type]}
                </span>
              )}
              {post.body && <p className="text-white/45 text-sm tracking-wide leading-relaxed">{post.body}</p>}
              {post.image_url && <img src={post.image_url} alt="" className="rounded-lg max-h-48 object-cover" />}
              {post.locations?.name && <p className="text-white/25 text-[10px] tracking-[0.12em]">{post.locations.name}</p>}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-white/15 text-[10px] tracking-[0.15em]">{timeAgo(post.created_at)}</span>
                  <span className="text-white/12 text-[9px] tracking-wide">Reached {followerCount} followers</span>
                </div>
                <button onClick={() => handleDelete(post.id)} className="text-white/15 text-[10px] tracking-[0.15em] hover:text-red-400/50 transition-colors">delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTION TAB
// ══════════════════════════════════════════════════════════════════════════════
function CollectionTab({ vendor, onItemClick }) {
  const [items, setItems] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [vendor.id])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('vendor_id', vendor.id)
      .in('status', ['active', 'archived'])
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const handleItemAdded = () => {
    setShowAddModal(false)
    fetchItems()
  }

  return (
    <>
      <div className="pb-20">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-white/15 text-sm tracking-[0.3em]">no items yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 bg-[#0a0a0a]">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="relative aspect-square overflow-hidden bg-[#141414] block w-full"
              >
                <img
                  src={item.image_url}
                  alt=""
                  className={`w-full h-full object-cover ${item.status === 'archived' ? 'opacity-30' : ''}`}
                />
                {item.status === 'archived' && (
                  <div className="absolute inset-0 flex items-end justify-start p-2">
                    <span className="bg-black/80 text-white/40 text-[9px] tracking-[0.2em] px-2 py-0.5 rounded-full">archived</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <AddItemButton onClick={() => setShowAddModal(true)} />

      <AnimatePresence>
        {showAddModal && (
          <AddItemModal
            key="add-modal"
            onClose={() => setShowAddModal(false)}
            onAdded={handleItemAdded}
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

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('status', 'archived')
        .order('created_at', { ascending: false })
      if (data) setItems(data)
    }
    fetch()
  }, [vendor.id])

  return (
    <div className="pb-20">
      <ArchiveGrid items={items} onItemClick={onItemClick} />
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
            isArchived={selectedItem.status === 'archived'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
