import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ArchiveGrid from '../components/ArchiveGrid'
import ItemDetail from '../components/ItemDetail'

export default function Archive() {
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    const fetchArchived = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('status', 'archived')
        .order('archived_at', { ascending: false })
      if (data) setItems(data)
    }
    fetchArchived()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="flex items-center gap-4 px-6 pt-5 pb-4">
        <Link
          to="/"
          className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
        >
          ← back
        </Link>
        <span className="text-white/60 text-sm font-light tracking-[0.35em]">archive</span>
      </div>

      <ArchiveGrid items={items} onItemClick={setSelectedItem} />

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail
            key="archive-item-detail"
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            isArchived={true}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
