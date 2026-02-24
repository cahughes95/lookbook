import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Rack from '../components/Rack'
import AddItemButton from '../components/AddItemButton'
import AddItemModal from '../components/AddItemModal'
import ItemDetail from '../components/ItemDetail'

export default function Home() {
  const [items, setItems] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'in_stock')
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const handleItemAdded = () => {
    setShowAddModal(false)
    fetchItems()
  }

  const handleArchived = () => {
    setSelectedItem(null)
    fetchItems()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2 shrink-0">
        <h1 className="text-white/60 text-sm font-light tracking-[0.35em]">lookbook</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/archive"
            className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
          >
            archive
          </Link>
          <button
            onClick={handleSignOut}
            className="text-white/20 text-xs tracking-[0.2em] hover:text-white/50 transition-colors"
          >
            out
          </button>
        </div>
      </div>

      {/* The Rack */}
      <div className="flex-1 flex items-center min-h-0">
        <Rack items={items} onItemClick={setSelectedItem} />
      </div>

      {/* Floating add button */}
      <AddItemButton onClick={() => setShowAddModal(true)} />

      {/* Modals */}
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
          />
        )}
      </AnimatePresence>
    </div>
  )
}
