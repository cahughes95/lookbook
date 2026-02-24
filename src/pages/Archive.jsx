import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ArchiveGrid from '../components/ArchiveGrid'

export default function Archive() {
  const [items, setItems] = useState([])

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

      <ArchiveGrid items={items} />
    </div>
  )
}
