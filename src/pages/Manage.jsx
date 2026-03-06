import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import AddItemButton from '../components/AddItemButton'
import AddItemModal from '../components/AddItemModal'
import ItemDetail from '../components/ItemDetail'

export default function Manage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [userInitial, setUserInitial] = useState('?')

  useEffect(() => {
    fetchItems()
    fetchInitial()
  }, [])

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: v } = await supabase
      .from('vendors')
      .select('id')
      .eq('profile_id', user.id)
      .single()
    if (!v) return

    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('vendor_id', v.id)
      .in('status', ['active', 'archived'])
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const fetchInitial = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    setUserInitial((prof?.display_name?.[0] || user.email?.[0] || '?').toUpperCase())
  }

  const handleItemAdded = () => {
    setShowAddModal(false)
    fetchItems()
  }

  const handleArchived = () => {
    setSelectedItem(null)
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/rack"
            className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
          >
            &larr; rack
          </Link>
          <span className="text-white/60 text-sm font-light tracking-[0.35em]">manage</span>
        </div>
        <button
          onClick={() => navigate('/vendor-settings')}
          className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs tracking-wider"
        >
          {userInitial}
        </button>
      </div>

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-white/15 text-sm tracking-[0.3em]">no items yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 bg-[#0a0a0a]">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="relative aspect-square overflow-hidden bg-[#141414] block w-full"
            >
              <img
                src={item.image_url}
                alt=""
                className={`w-full h-full object-cover ${item.status === 'archived' ? 'opacity-30' : ''}`}
              />
              {item.status === 'archived' && (
                <div className="absolute inset-0 flex items-end justify-start p-2">
                  <span className="bg-black/80 text-white/40 text-[9px] tracking-[0.2em] px-2 py-0.5 rounded-full">
                    archived
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

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

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail
            key="item-detail"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onArchived={handleArchived}
            isArchived={selectedItem.status === 'archived'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
