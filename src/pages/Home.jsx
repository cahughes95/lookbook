import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Rack from '../components/Rack'
import RackGrid from '../components/RackGrid'
import ViewToggle from '../components/ViewToggle'
import ItemDetail from '../components/ItemDetail'

export default function Home() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [view, setView] = useState('carousel')
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [activeItem, setActiveItem] = useState(null)
  const [userInitial, setUserInitial] = useState('?')

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (showScrollHint) {
      const timer = setTimeout(() => setShowScrollHint(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [showScrollHint])

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: vendor }, { data: prof }] = await Promise.all([
      supabase.from('vendors').select('id').eq('profile_id', user.id).single(),
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    ])

    setUserInitial((prof?.display_name?.[0] || user.email?.[0] || '?').toUpperCase())
    if (!vendor) return

    const { data } = await supabase
      .from('items')
      .select('*, collections(name)')
      .eq('vendor_id', vendor.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (data) {
      setItems(data)
      setActiveItem(data[0] ?? null)
    }
  }

  const handleArchived = () => {
    setSelectedItem(null)
    fetchItems()
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2 shrink-0">
        <h1 className="text-white/60 text-sm font-light tracking-[0.35em]">lookbook</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/manage"
            className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
          >
            manage
          </Link>
          <Link
            to="/archive"
            className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
          >
            archive
          </Link>
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={() => navigate('/vendor-settings')}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs tracking-wider"
          >
            {userInitial}
          </button>
        </div>
      </div>

      {/* The Rack */}
      {view === 'carousel' ? (
        <div className="shrink-0 pt-6 relative">
          {activeItem?.collections?.name && (
            <p className="text-center text-white/30 text-xs tracking-[0.25em] mb-3">
              {activeItem.collections.name}
            </p>
          )}
          <Rack items={items} onItemClick={setSelectedItem} onActiveItemChange={setActiveItem} />
          {showScrollHint && items.length > 0 && (
            <span className="absolute bottom-8 right-6 pointer-events-none text-white/20 text-[10px] tracking-[0.2em]">
              drag to browse
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <RackGrid items={items} onItemClick={setSelectedItem} />
        </div>
      )}

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail
            key="item-detail"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onArchived={handleArchived}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
