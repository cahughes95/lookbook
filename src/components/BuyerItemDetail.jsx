import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

export default function BuyerItemDetail({ item, onClose }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [visibility, setVisibility] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [thread, setThread] = useState([])
  const [messageBody, setMessageBody] = useState('')
  const [showDmInput, setShowDmInput] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [authModal, setAuthModal] = useState(null)
  const inputRef = useRef(null)

  // Initialise user + subscribe to auth changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
      if (user) loadUserData(user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch visibility settings
  useEffect(() => {
    supabase
      .from('item_visibility_settings')
      .select('*')
      .eq('item_id', item.id)
      .maybeSingle()
      .then(({ data }) => setVisibility(data ?? {
        show_name: true, show_description: true, show_size: true,
        show_price: true, show_quantity: false, show_condition: true,
        show_brand: true, show_era: true,
      }))
  }, [item.id])

  const loadUserData = async (user) => {
    const [{ data: saved }, { data: msgs }] = await Promise.all([
      supabase.from('saves').select('item_id')
        .eq('profile_id', user.id).eq('item_id', item.id).maybeSingle(),
      supabase.from('messages').select('id, body, created_at')
        .eq('item_id', item.id).eq('sender_id', user.id)
        .order('created_at', { ascending: true }),
    ])
    setIsSaved(!!saved)
    setThread(msgs ?? [])
  }

  // ── Save toggle ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!currentUser) {
      setAuthModal({
        hint: 'sign in to save this item',
        onSuccess: async (user) => {
          setCurrentUser(user)
          setAuthModal(null)
          await doSave(user)
        },
      })
      return
    }
    await doSave(currentUser)
  }

  const doSave = async (user) => {
    setSaveLoading(true)
    if (isSaved) {
      await supabase.from('saves').delete()
        .eq('profile_id', user.id).eq('item_id', item.id)
      setIsSaved(false)
    } else {
      await supabase.from('saves').insert({ profile_id: user.id, item_id: item.id })
      setIsSaved(true)
    }
    setSaveLoading(false)
  }

  // ── DM ───────────────────────────────────────────────────────────────────────
  const handleDmClick = () => {
    if (!currentUser) {
      setAuthModal({
        hint: 'sign in to message the vendor',
        onSuccess: async (user) => {
          setCurrentUser(user)
          setAuthModal(null)
          await loadUserData(user)
          setShowDmInput(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        },
      })
      return
    }
    setShowDmInput(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const sendMessage = async () => {
    if (!messageBody.trim() || !currentUser) return
    setSending(true)
    const { data: msg } = await supabase.from('messages').insert({
      item_id: item.id,
      sender_id: currentUser.id,
      vendor_id: item.vendor_id,
      body: messageBody.trim(),
    }).select('id, body, created_at').single()

    if (msg) {
      setThread(t => [...t, msg])
      setMessageBody('')
      setShowDmInput(false)
      setMessageSent(true)
    }
    setSending(false)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const vis = visibility
  const show = (key, value) => vis?.[key] && value

  const socialProof = [
    item.saves_count > 0 && `${item.saves_count} saved`,
    item.dms_count > 0 && `${item.dms_count} interested`,
  ].filter(Boolean).join(' · ')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-y-auto overflow-x-hidden"
    >
      {/* Close */}
      <div className="flex justify-end px-4 pt-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/70 text-2xl transition-colors"
        >
          ×
        </button>
      </div>

      {/* Image */}
      <div className="flex-shrink-0 flex items-center justify-center px-6 pb-4" style={{ minHeight: '45vh' }}>
        <img
          src={item.image_url}
          alt={item.name || ''}
          className="max-w-full object-contain rounded-sm"
          style={{ maxHeight: '60vh', boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }}
        />
      </div>

      {/* Product details */}
      <div className="flex-shrink-0 px-6 pb-2 space-y-3">
        {/* Name + price */}
        {(show('show_name', item.name) || show('show_price', item.price)) && (
          <div className="flex items-start justify-between gap-4">
            {show('show_name', item.name)
              ? <h2 className="text-white/80 text-base tracking-[0.1em] leading-snug flex-1">{item.name}</h2>
              : <div className="flex-1" />}
            {show('show_price', item.price) && (
              <span className="text-white/60 text-base tracking-[0.1em] flex-shrink-0">
                ${parseFloat(item.price).toFixed(2)}
              </span>
            )}
          </div>
        )}

        {show('show_description', item.description) && (
          <p className="text-white/40 text-sm tracking-wide leading-relaxed">{item.description}</p>
        )}

        {/* Meta pills: size, brand, era, category */}
        {(show('show_size', item.size) || show('show_brand', item.brand) ||
          show('show_era', item.era) || item.category) && (
          <div className="flex flex-wrap gap-2">
            {show('show_size', item.size) && (
              <span className="text-white/40 text-[11px] tracking-[0.15em] bg-white/5 border border-white/8 rounded-full px-3 py-1">
                {item.size}
              </span>
            )}
            {show('show_brand', item.brand) && (
              <span className="text-white/40 text-[11px] tracking-[0.15em] bg-white/5 border border-white/8 rounded-full px-3 py-1">
                {item.brand}
              </span>
            )}
            {show('show_era', item.era) && (
              <span className="text-white/40 text-[11px] tracking-[0.15em] bg-white/5 border border-white/8 rounded-full px-3 py-1">
                {item.era}
              </span>
            )}
            {item.category && (
              <span className="text-white/25 text-[11px] tracking-[0.15em] bg-white/3 border border-white/5 rounded-full px-3 py-1">
                {item.category}
              </span>
            )}
          </div>
        )}

        {/* Social proof */}
        {socialProof && (
          <p className="text-white/20 text-[11px] tracking-[0.15em]">{socialProof}</p>
        )}

        <div className="border-t border-white/5" />
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 px-6 pb-4 space-y-2 mt-auto">
        {/* Existing thread */}
        {thread.length > 0 && (
          <div className="bg-white/3 rounded-xl px-4 py-3 space-y-2 mb-3">
            <p className="text-white/20 text-[10px] tracking-[0.2em] mb-2">your messages</p>
            {thread.map(msg => (
              <p key={msg.id} className="text-white/50 text-xs tracking-wide leading-relaxed">
                {msg.body}
              </p>
            ))}
          </div>
        )}

        {/* DM input */}
        {showDmInput && (
          <div className="space-y-2 mb-2">
            <textarea
              ref={inputRef}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder="ask about this item..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={sendMessage}
                disabled={sending || !messageBody.trim()}
                className="flex-1 bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-3 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all"
              >
                {sending ? '—' : 'send'}
              </button>
              <button
                onClick={() => setShowDmInput(false)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs tracking-widest"
              >
                cancel
              </button>
            </div>
          </div>
        )}

        {/* Sent confirmation */}
        {messageSent && !showDmInput && (
          <p className="text-white/30 text-xs tracking-[0.2em] text-center pb-1">message sent</p>
        )}

        {/* Save + DM buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={`flex-1 py-3.5 rounded-xl text-sm tracking-[0.15em] border transition-all ${
              isSaved
                ? 'bg-white/10 border-white/20 text-white/60'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            {isSaved ? '♥ saved' : '♡ save'}
          </button>
          {!messageSent && thread.length === 0 && !showDmInput && (
            <button
              onClick={handleDmClick}
              className="flex-1 py-3.5 rounded-xl text-sm tracking-[0.15em] border bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 transition-all"
            >
              message
            </button>
          )}
        </div>
      </div>

      {/* Auth modal */}
      <AnimatePresence>
        {authModal && (
          <AuthModal
            key="buyer-auth"
            hint={authModal.hint}
            onClose={() => setAuthModal(null)}
            onSuccess={authModal.onSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
