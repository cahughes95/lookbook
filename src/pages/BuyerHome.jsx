import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import BuyerItemDetail from '../components/BuyerItemDetail'
import AuthModal from '../components/AuthModal'

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
  appearing: '\u{1F4CD} Appearing',
  new_stock: '\u{1F195} New Stock',
  sneak_peek: '\u{1F4F8} Sneak Peek',
}

const POP_COLORS = ['#7A9BA8', '#8FAF7A', '#D4A96A', '#D4622A']
const POP_LABELS = ['Chill', 'Popular', 'Very Popular', 'Iconic']

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />
}

// ── Bottom Nav ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'bulletin', label: 'Bulletin', icon: BulletinIcon },
  { key: 'collections', label: 'Collections', icon: CollectionsIcon },
  { key: 'explore', label: 'Explore', icon: ExploreIcon },
  { key: 'saved', label: 'Saved', icon: SavedIcon },
]

function BulletinIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CollectionsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function ExploreIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function SavedIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'rgba(255,255,255,0.8)' : 'none'} stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center h-14">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon active={active} />
              <span className={`text-[9px] tracking-[0.15em] ${active ? 'text-white/70' : 'text-white/25'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────
function Header({ sectionName, user }) {
  const navigate = useNavigate()
  const initial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h1 className="text-white/50 text-sm font-light tracking-[0.35em]">lookbook</h1>
          <p className="text-white/20 text-[10px] tracking-[0.25em] mt-0.5">{sectionName}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs tracking-wider"
        >
          {initial}
        </button>
      </div>
    </header>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BULLETIN TAB
// ══════════════════════════════════════════════════════════════════════════════
function BulletinTab({ user }) {
  const [posts, setPosts] = useState(null)
  const [readIds, setReadIds] = useState(new Set())

  useEffect(() => {
    if (!user) return
    supabase
      .from('bulletin_feed')
      .select('*')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        console.log('[BulletinTab] raw bulletin_feed:', data?.slice(0, 3))
        setPosts(data ?? [])
      })
  }, [user])

  const markRead = (id) => {
    setReadIds(prev => new Set([...prev, id]))
  }

  if (posts === null) {
    return (
      <div className="space-y-4 px-5">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/20 text-sm tracking-[0.2em]">no posts yet</p>
        <p className="text-white/12 text-xs tracking-wide">follow vendors to see their updates here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-5">
      {posts.map(post => {
        const isUnread = !readIds.has(post.id)
        return (
          <div
            key={post.id}
            className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2"
            onClick={() => markRead(post.id)}
          >
            {/* Vendor row */}
            <div className="flex items-center gap-3">
              {(post.vendor_avatar_url || post.avatar_url) ? (
                <img src={post.vendor_avatar_url || post.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs tracking-[0.1em] truncate">{post.vendor_display_name || post.display_name}</span>
                  <span className="text-white/20 text-[10px] tracking-[0.1em] truncate">@{post.vendor_handle || post.handle}</span>
                </div>
              </div>
              {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />}
            </div>

            {/* Type badge */}
            {TYPE_BADGES[post.post_type] && (
              <span className="inline-block text-[10px] tracking-[0.15em] text-white/40 bg-white/5 border border-white/8 rounded-full px-2.5 py-0.5">
                {TYPE_BADGES[post.post_type]}
              </span>
            )}

            {/* Body */}
            {post.body && (
              <p className="text-white/45 text-sm tracking-wide leading-relaxed">{post.body}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-white/15 text-[10px] tracking-[0.15em]">{timeAgo(post.created_at)}</span>
              <div className="flex gap-3">
                <button className="text-white/20 text-[10px] tracking-[0.15em] hover:text-white/40 transition-colors">save</button>
                <button className="text-white/20 text-[10px] tracking-[0.15em] hover:text-white/40 transition-colors">share</button>
                <a
                  href={`/v/${post.vendor_handle || post.handle}`}
                  className="text-white/20 text-[10px] tracking-[0.15em] hover:text-white/40 transition-colors"
                >
                  visit shop
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
function CollectionsTab({ user, onItemClick }) {
  const [vendorGroups, setVendorGroups] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('followed_vendor_items')
      .select('*')
      .eq('follower_id', user.id)
      .then(({ data }) => {
        if (!data) { setVendorGroups([]); return }
        console.log('[CollectionsTab] raw followed_vendor_items:', data.slice(0, 3))
        // Group items by vendor
        const grouped = {}
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        for (const row of data) {
          const vid = row.vendor_id
          if (!grouped[vid]) {
            grouped[vid] = {
              vendor_id: vid,
              handle: row.vendor_handle,
              display_name: row.vendor_display_name || row.display_name,
              avatar_url: row.vendor_avatar_url || row.avatar_url,
              items: [],
              newCount: 0,
            }
          }
          grouped[vid].items.push(row)
          if (row.created_at >= sevenDaysAgo) grouped[vid].newCount++
        }
        setVendorGroups(Object.values(grouped))
      })
  }, [user])

  if (vendorGroups === null) {
    return (
      <div className="space-y-6 px-5">
        {[1, 2].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2">
              {[1, 2, 3].map(j => <Skeleton key={j} className="w-28 h-36 flex-shrink-0" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (vendorGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/20 text-sm tracking-[0.2em]">no collections yet</p>
        <p className="text-white/12 text-xs tracking-wide">follow vendors to see their items here</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {vendorGroups.map(group => (
        <div key={group.vendor_id}>
          {/* Vendor header */}
          <div className="flex items-center gap-3 px-5 mb-3">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-xs tracking-[0.1em] truncate">{group.display_name}</span>
                {group.newCount > 0 && (
                  <span className="text-[10px] tracking-[0.1em] text-white/40 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">
                    +{group.newCount} new
                  </span>
                )}
              </div>
              <span className="text-white/20 text-[10px] tracking-[0.1em]">@{group.handle}</span>
            </div>
            <a
              href={`/v/${group.handle}`}
              className="text-white/25 text-[10px] tracking-[0.15em] hover:text-white/45 transition-colors flex-shrink-0"
            >
              See all {group.items.length} &rarr;
            </a>
          </div>

          {/* Horizontal item scroll */}
          <div
            className="flex gap-2 overflow-x-auto pl-5 pr-2 pb-2"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {group.items.map(item => (
              <button
                key={item.item_id || item.id}
                onClick={() => onItemClick(item)}
                className="flex-shrink-0 w-28 space-y-1.5"
              >
                <div className="w-28 h-36 rounded-lg overflow-hidden bg-white/5">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                {item.name && (
                  <p className="text-white/40 text-[10px] tracking-wide truncate">{item.name}</p>
                )}
                {item.price && (
                  <p className="text-white/30 text-[10px] tracking-wide">${parseFloat(item.price).toFixed(0)}</p>
                )}
              </button>
            ))}

            {/* Ghost "View all" card */}
            <a
              href={`/v/${group.handle}`}
              className="flex-shrink-0 w-28 h-36 rounded-lg bg-white/3 border border-white/5 flex items-center justify-center"
            >
              <span className="text-white/20 text-[10px] tracking-[0.15em]">View all</span>
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLORE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ExploreTab({ user }) {
  const [subTab, setSubTab] = useState('local')

  return (
    <div>
      {/* Sub-tab toggle */}
      <div className="flex gap-2 px-5 mb-4">
        <button
          onClick={() => setSubTab('local')}
          className={`text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
            subTab === 'local'
              ? 'border-white/30 text-white/60 bg-white/5'
              : 'border-white/10 text-white/25 hover:border-white/20'
          }`}
        >
          Local
        </button>
        <button
          onClick={() => setSubTab('hot')}
          className={`text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
            subTab === 'hot'
              ? 'border-white/30 text-white/60 bg-white/5'
              : 'border-white/10 text-white/25 hover:border-white/20'
          }`}
        >
          Hot Right Now
        </button>
      </div>

      {subTab === 'local' ? <LocalMap /> : <HotVendors user={user} />}
    </div>
  )
}

// ── Local Map ────────────────────────────────────────────────────────────────
function LocalMap() {
  const [pins, setPins] = useState(null)
  const [selectedPin, setSelectedPin] = useState(null)
  const mapRef = useRef(null)
  const [MapComponents, setMapComponents] = useState(null)

  // Lazy-load leaflet to avoid SSR/bundling issues
  useEffect(() => {
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L, RL]) => {
      setMapComponents({ L: L.default || L, RL })
    })
  }, [])

  useEffect(() => {
    supabase
      .from('location_map_pins')
      .select('*')
      .then(({ data }) => setPins(data ?? []))
  }, [])

  if (!MapComponents || pins === null) {
    return <Skeleton className="mx-5 h-[60vh]" />
  }

  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/20 text-sm tracking-[0.2em]">no locations yet</p>
        <p className="text-white/12 text-xs tracking-wide">check back soon for local spots</p>
      </div>
    )
  }

  const { RL, L } = MapComponents
  const { MapContainer, TileLayer, CircleMarker, useMap } = RL

  // Center on average of all pins
  const avgLat = pins.reduce((s, p) => s + (p.lat || 0), 0) / pins.length
  const avgLng = pins.reduce((s, p) => s + (p.lng || 0), 0) / pins.length

  const getRadius = (count) => {
    if (count >= 10) return 14
    if (count >= 5) return 11
    if (count >= 2) return 9
    return 7
  }

  return (
    <div className="mx-5 rounded-xl overflow-hidden relative" style={{ height: '60vh' }}>
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {pins.map(pin => (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={getRadius(pin.vendor_count || 1)}
            pathOptions={{
              color: pin.location_type === 'market' ? '#D4A96A' : '#7A9BA8',
              fillColor: pin.location_type === 'market' ? '#D4A96A' : '#7A9BA8',
              fillOpacity: 0.7,
              weight: pin.location_type === 'market' ? 2 : 1,
            }}
            eventHandlers={{
              click: () => setSelectedPin(pin),
            }}
          />
        ))}
      </MapContainer>

      {/* Bottom popup card */}
      <AnimatePresence>
        {selectedPin && (
          <PinPopup pin={selectedPin} onClose={() => setSelectedPin(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function PinPopup({ pin, onClose }) {
  const isMarket = pin.location_type === 'market'
  const popLevel = pin.pop_level || 1

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#141414] border-t border-white/10 rounded-t-xl p-4 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-white/30 text-[10px] tracking-[0.2em]">
            {isMarket ? 'Flea Market' : 'Thrift Store'}
          </span>
          <h3 className="text-white/70 text-sm tracking-[0.1em] mt-0.5">{pin.name}</h3>
        </div>
        <button onClick={onClose} className="text-white/25 hover:text-white/50 text-lg transition-colors">&times;</button>
      </div>

      {pin.address && <p className="text-white/30 text-[10px] tracking-wide">{pin.address}</p>}
      {pin.description && <p className="text-white/35 text-xs tracking-wide leading-relaxed">{pin.description}</p>}
      {pin.hours && <p className="text-white/25 text-[10px] tracking-wide">{pin.hours}</p>}

      {isMarket && pin.next_date && (
        <p className="text-[#D4A96A] text-[10px] tracking-[0.15em]">Next: {pin.next_date}</p>
      )}

      {/* Popularity dots */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map(level => (
          <div
            key={level}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: level <= popLevel ? POP_COLORS[popLevel - 1] : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
        <span className="text-white/25 text-[9px] tracking-[0.15em] ml-1">{POP_LABELS[popLevel - 1]}</span>
      </div>

      {isMarket && pin.vendor_count > 0 && (
        <p className="text-white/20 text-[10px] tracking-[0.15em]">{pin.vendor_count} vendors</p>
      )}

      <button className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/50 text-[11px] tracking-[0.2em] hover:border-white/20 hover:text-white/70 transition-all mt-1">
        {isMarket ? `See ${pin.vendor_count || ''} vendors` : 'Visit shop'} &rarr;
      </button>
    </div>
  )
}

// ── Hot Right Now ────────────────────────────────────────────────────────────
function HotVendors({ user }) {
  const [vendors, setVendors] = useState(null)
  const [followState, setFollowState] = useState({})
  const [authModal, setAuthModal] = useState(null)

  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    supabase
      .from('items')
      .select('vendor_id, saves_count, created_at, vendors(id, profile_id, profiles(display_name, handle, avatar_url))')
      .eq('status', 'active')
      .gte('created_at', sevenDaysAgo)
      .order('saves_count', { ascending: false })
      .then(({ data }) => {
        if (!data) { setVendors([]); return }

        // Aggregate by vendor
        const agg = {}
        for (const item of data) {
          const v = item.vendors
          if (!v) continue
          const vid = v.id
          if (!agg[vid]) {
            agg[vid] = {
              vendor_id: vid,
              profile_id: v.profile_id,
              display_name: v.profiles?.display_name,
              handle: v.profiles?.handle,
              avatar_url: v.profiles?.avatar_url,
              totalSaves: 0,
              newItems: 0,
            }
          }
          agg[vid].totalSaves += (item.saves_count || 0)
          agg[vid].newItems++
        }

        const sorted = Object.values(agg).sort((a, b) => b.totalSaves - a.totalSaves)
        setVendors(sorted)
      })

    // Load current follows
    if (user) {
      supabase
        .from('follows')
        .select('vendor_id')
        .eq('follower_id', user.id)
        .then(({ data }) => {
          const map = {}
          for (const f of (data ?? [])) map[f.vendor_id] = true
          setFollowState(map)
        })
    }
  }, [user])

  const toggleFollow = async (vendorId) => {
    if (!user) {
      setAuthModal({
        hint: 'sign in to follow vendors',
        onSuccess: async (authUser) => {
          setAuthModal(null)
          await doToggle(vendorId, authUser)
        },
      })
      return
    }
    await doToggle(vendorId, user)
  }

  const doToggle = async (vendorId, u) => {
    if (followState[vendorId]) {
      await supabase.from('follows').delete().eq('follower_id', u.id).eq('vendor_id', vendorId)
      setFollowState(prev => ({ ...prev, [vendorId]: false }))
    } else {
      await supabase.from('follows').insert({ follower_id: u.id, vendor_id: vendorId })
      setFollowState(prev => ({ ...prev, [vendorId]: true }))
    }
  }

  if (vendors === null) {
    return (
      <div className="space-y-3 px-5">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/20 text-sm tracking-[0.2em]">nothing trending yet</p>
        <p className="text-white/12 text-xs tracking-wide">check back later</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2 px-5">
        {vendors.map((v, i) => {
          const rank = i + 1
          const isFollowing = !!followState[v.vendor_id]

          return (
            <div key={v.vendor_id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl p-3">
              <span className={`text-base font-light tracking-wider w-6 text-center flex-shrink-0 ${rank === 1 ? 'text-[#D4A96A]' : 'text-white/20'}`}>
                {rank}
              </span>
              {v.avatar_url ? (
                <img src={v.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {v.handle ? (
                  <a href={`/v/${v.handle}`} className="text-white/60 text-xs tracking-[0.1em] truncate block hover:text-white/80 transition-colors">
                    {v.display_name || v.handle}
                  </a>
                ) : (
                  <span className="text-white/60 text-xs tracking-[0.1em] truncate block">{v.display_name}</span>
                )}
                <div className="flex gap-2 mt-0.5">
                  <span className="text-white/20 text-[10px] tracking-wide">{v.totalSaves} saves</span>
                  <span className="text-white/15 text-[10px] tracking-wide">{v.newItems} new</span>
                </div>
              </div>
              <button
                onClick={() => toggleFollow(v.vendor_id)}
                className={`flex-shrink-0 text-[10px] tracking-[0.15em] px-3 py-1 rounded-full border transition-all ${
                  isFollowing
                    ? 'border-white/15 text-white/35 bg-white/5'
                    : 'border-white/25 text-white/60 hover:border-white/40 hover:text-white/80'
                }`}
              >
                {isFollowing ? 'following' : 'follow'}
              </button>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {authModal && (
          <AuthModal
            key="hot-auth"
            hint={authModal.hint}
            onClose={() => setAuthModal(null)}
            onSuccess={authModal.onSuccess}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SAVED TAB
// ══════════════════════════════════════════════════════════════════════════════
function SavedTab({ user, onItemClick }) {
  const [saves, setSaves] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('saves')
      .select('*, items(*, vendors(*, profiles(*)))')
      .eq('profile_id', user.id)
      .then(({ data }) => setSaves(data ?? []))
  }, [user])

  if (saves === null) {
    return (
      <div className="grid grid-cols-3 gap-0.5 px-5">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
      </div>
    )
  }

  if (saves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/20 text-sm tracking-[0.2em]">no saved items</p>
        <p className="text-white/12 text-xs tracking-wide">tap the heart on items you like to save them</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 px-5">
      {saves.map(save => {
        const item = save.items
        if (!item) return null
        const vendor = item.vendors
        return (
          <button
            key={save.item_id}
            onClick={() => onItemClick(item)}
            className="aspect-[3/4] overflow-hidden bg-white/3 rounded-lg relative group"
          >
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              {item.name && (
                <p className="text-white/70 text-[10px] tracking-wide truncate">{item.name}</p>
              )}
              <div className="flex items-center justify-between mt-0.5">
                {item.price && (
                  <span className="text-white/50 text-[10px] tracking-wide">${parseFloat(item.price).toFixed(0)}</span>
                )}
                {vendor?.profiles?.display_name && (
                  <span className="text-white/25 text-[9px] tracking-wide truncate">{vendor.profiles.display_name}</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function BuyerHome() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('bulletin')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const sectionNames = {
    bulletin: 'bulletin',
    collections: 'collections',
    explore: 'explore',
    saved: 'saved',
  }

  const handleItemClick = (item) => {
    // Normalize item shape — views may use item_id vs id
    const normalized = { ...item, id: item.id || item.item_id }
    setSelectedItem(normalized)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header sectionName={sectionNames[activeTab]} user={user} />

      {/* Content area — padded for fixed header + bottom nav */}
      <div className="pt-[72px] pb-[72px]">
        {activeTab === 'bulletin' && <BulletinTab user={user} />}
        {activeTab === 'collections' && <CollectionsTab user={user} onItemClick={handleItemClick} />}
        {activeTab === 'explore' && <ExploreTab user={user} />}
        {activeTab === 'saved' && <SavedTab user={user} onItemClick={handleItemClick} />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Item detail overlay */}
      <AnimatePresence>
        {selectedItem && (
          <BuyerItemDetail
            key="buyer-home-item"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
