import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Rack from '../components/Rack'
import RackGrid from '../components/RackGrid'
import ViewToggle from '../components/ViewToggle'
import BuyerItemDetail from '../components/BuyerItemDetail'
import AuthModal from '../components/AuthModal'

export default function VendorPage() {
  const { handle } = useParams()

  const [vendor, setVendor] = useState(null)
  const [profile, setProfile] = useState(null)
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState(null)
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')
  const [view, setView] = useState('carousel')
  const [isFollowing, setIsFollowing] = useState(false)
  const [user, setUser] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [authModal, setAuthModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .eq('handle', handle)
        .single()
      if (!prof) { setNotFound(true); setLoading(false); return }

      const { data: vend } = await supabase
        .from('vendors')
        .select('id, bio, location, instagram_handle, booth_name, markets, is_approved')
        .eq('profile_id', prof.id)
        .single()
      if (!vend || !vend.is_approved) { setNotFound(true); setLoading(false); return }

      const [{ data: cols }, { count: itemCount }, { count: fCount }] = await Promise.all([
        supabase.from('collections').select('id, name, collection_number').eq('vendor_id', vend.id).eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('vendor_id', vend.id).eq('status', 'active'),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('vendor_id', vend.id),
      ])

      const owner = !!(authUser && authUser.id === prof.id)
      setIsOwner(owner)

      if (authUser && !owner) {
        const { data: follow } = await supabase.from('follows').select('follower_id').eq('follower_id', authUser.id).eq('vendor_id', vend.id).maybeSingle()
        setIsFollowing(!!follow)
      }

      const colList = cols ?? []
      setProfile(prof)
      setVendor(vend)
      setCollections(colList)
      setSelectedCollectionId(colList[0]?.id ?? null)
      setTotalCount(itemCount ?? 0)
      setFollowerCount(fCount ?? 0)
      setLoading(false)
    }
    load()
  }, [handle])

  useEffect(() => {
    if (!vendor || !selectedCollectionId) return
    const fetchItems = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('status', 'active')
        .eq('collection_id', selectedCollectionId)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
      setActiveCategory('all')
    }
    fetchItems()
  }, [vendor, selectedCollectionId])

  const doFollow = async (u) => {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', u.id).eq('vendor_id', vendor.id)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: u.id, vendor_id: vendor.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  const handleFollow = () => {
    if (!user) {
      setAuthModal({
        hint: 'sign in to follow this vendor',
        onSuccess: async (authUser) => {
          setAuthModal(null)
          await doFollow(authUser)
        },
      })
      return
    }
    doFollow(user)
  }

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]
  const displayItems = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)
  const initial = (profile?.display_name?.[0] || '?').toUpperCase()

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <p className="text-white/20 text-sm tracking-[0.3em]">vendor not found</p>
        <Link to="/" className="text-white/15 text-xs tracking-[0.2em] hover:text-white/40 transition-colors">&larr; home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-3 shrink-0">
        <Link to="/" className="text-white/40 text-sm font-light tracking-[0.35em] hover:text-white/60 transition-colors">lookbook</Link>
        <div className="flex items-center gap-4">
          {isOwner && (
            <Link to="/vendor" className="text-white/25 text-[10px] tracking-[0.15em] hover:text-white/45 transition-colors">
              dashboard &rarr;
            </Link>
          )}
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* Vendor identity */}
      <div className="px-6 pt-1 pb-5 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
                {initial}
              </div>
            )}
            <div>
              <h1 className="text-white/80 text-base tracking-[0.15em] font-light">
                {profile.display_name ?? handle}
              </h1>
              {vendor.booth_name && (
                <p className="text-white/25 text-xs tracking-[0.2em] mt-0.5">{vendor.booth_name}</p>
              )}
            </div>
          </div>
          {!isOwner && (
            <button
              onClick={handleFollow}
              className={`flex-shrink-0 text-[11px] tracking-[0.2em] px-4 py-1.5 rounded-full border transition-all ${
                isFollowing
                  ? 'border-white/15 text-white/35 bg-white/5'
                  : 'border-white/25 text-white/60 hover:border-white/40 hover:text-white/80'
              }`}
            >
              {isFollowing ? 'following' : 'follow'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-white/25 text-[11px] tracking-[0.12em]">{followerCount} follower{followerCount !== 1 ? 's' : ''}</span>
          {totalCount > 0 && (
            <span className="text-white/15 text-[11px] tracking-[0.12em]">{totalCount} items</span>
          )}
        </div>

        {vendor.bio && (
          <p className="text-white/35 text-xs tracking-wide leading-relaxed mb-3">{vendor.bio}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {vendor.location && (
            <span className="text-white/20 text-[11px] tracking-[0.12em]">{vendor.location}</span>
          )}
          {vendor.markets?.length > 0 && (
            <span className="text-white/20 text-[11px] tracking-[0.12em]">{vendor.markets.join(' · ')}</span>
          )}
          {vendor.instagram_handle && (
            <a href={`https://instagram.com/${vendor.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-white/20 text-[11px] tracking-[0.12em] hover:text-white/45 transition-colors">
              @{vendor.instagram_handle}
            </a>
          )}
        </div>
      </div>

      {/* Collection switcher */}
      {collections.length > 1 && (
        <div className="px-6 pb-4 shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                className={`flex-shrink-0 text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
                  selectedCollectionId === col.id
                    ? 'border-white/30 text-white/60 bg-white/5'
                    : 'border-white/10 text-white/25 hover:border-white/20'
                }`}
              >
                {col.collection_number ? `#${col.collection_number} — ${col.name}` : col.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      {categories.length > 1 && (
        <div className="px-6 pb-4 shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
                  activeCategory === cat
                    ? 'border-white/30 text-white/60 bg-white/5'
                    : 'border-white/10 text-white/25 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      {view === 'carousel' ? (
        <div className="shrink-0">
          <Rack items={displayItems} onItemClick={setSelectedItem} onActiveItemChange={() => {}} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <RackGrid items={displayItems} onItemClick={setSelectedItem} />
        </div>
      )}

      {/* Buyer item detail */}
      <AnimatePresence>
        {selectedItem && (
          <BuyerItemDetail
            key="buyer-item-detail"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AnimatePresence>
        {authModal && (
          <AuthModal
            key="follow-auth"
            hint={authModal.hint}
            onClose={() => setAuthModal(null)}
            onSuccess={authModal.onSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
