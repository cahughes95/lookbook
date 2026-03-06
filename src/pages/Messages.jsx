import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Messages() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
      if (!authUser) { setLoading(false); return }

      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id, body, created_at, item_id, vendor_id,
          items(id, name, image_url),
          vendors(id, profiles(display_name))
        `)
        .eq('sender_id', authUser.id)
        .order('created_at', { ascending: true })

      // Group by item_id, keep message order within each thread
      const map = {}
      for (const msg of messages ?? []) {
        if (!map[msg.item_id]) {
          map[msg.item_id] = {
            itemId: msg.item_id,
            vendorId: msg.vendor_id,
            item: msg.items,
            vendorName: msg.vendors?.profiles?.display_name ?? 'vendor',
            messages: [],
          }
        }
        map[msg.item_id].messages.push(msg)
      }

      // Sort threads by most recent message
      const sorted = Object.values(map).sort((a, b) => {
        const aLast = a.messages.at(-1).created_at
        const bLast = b.messages.at(-1).created_at
        return new Date(bLast) - new Date(aLast)
      })
      setThreads(sorted)
      setLoading(false)
    }
    load()
  }, [])

  const sendReply = async (thread) => {
    if (!replyBody.trim() || !user) return
    setSending(true)
    const { data: msg } = await supabase
      .from('messages')
      .insert({
        item_id: thread.itemId,
        sender_id: user.id,
        vendor_id: thread.vendorId,
        body: replyBody.trim(),
      })
      .select('id, body, created_at')
      .single()

    if (msg) {
      setThreads(prev => prev.map(t =>
        t.itemId === thread.itemId
          ? { ...t, messages: [...t.messages, msg] }
          : t
      ))
      setReplyBody('')
    }
    setSending(false)
  }

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
      <div className="flex items-center gap-4 px-6 pt-5 pb-4">
        <Link
          to="/"
          className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
        >
          ← back
        </Link>
        <span className="text-white/60 text-sm font-light tracking-[0.35em]">messages</span>
      </div>

      {threads.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-white/15 text-sm tracking-[0.3em]">no messages yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {threads.map(thread => {
            const lastMsg = thread.messages.at(-1)
            const isExpanded = expandedItemId === thread.itemId

            return (
              <div key={thread.itemId}>
                {/* Thread row */}
                <button
                  onClick={() => setExpandedItemId(isExpanded ? null : thread.itemId)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors text-left"
                >
                  {/* Item thumbnail */}
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                    {thread.item?.image_url && (
                      <img
                        src={thread.item.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Thread info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-white/60 text-xs tracking-[0.15em] truncate">
                        {thread.vendorName}
                      </p>
                      <span className="text-white/20 text-[10px] tracking-wide flex-shrink-0">
                        {relativeTime(lastMsg.created_at)}
                      </span>
                    </div>
                    {thread.item?.name && (
                      <p className="text-white/35 text-[11px] tracking-[0.1em] truncate mb-1">
                        {thread.item.name}
                      </p>
                    )}
                    <p className="text-white/25 text-[11px] tracking-wide truncate">
                      {lastMsg.body}
                    </p>
                  </div>

                  <span className="text-white/20 text-xs flex-shrink-0 ml-1">
                    {isExpanded ? '↑' : '↓'}
                  </span>
                </button>

                {/* Expanded thread */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    {/* Message bubbles */}
                    <div className="space-y-2 mb-3">
                      {thread.messages.map(msg => (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[80%] bg-white/8 rounded-2xl rounded-tr-sm px-4 py-2.5">
                            <p className="text-white/60 text-sm tracking-wide leading-relaxed">
                              {msg.body}
                            </p>
                            <p className="text-white/20 text-[10px] tracking-wide mt-1 text-right">
                              {relativeTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply input */}
                    <div className="flex gap-2">
                      <input
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply(thread)}
                        placeholder="follow up..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/20"
                      />
                      <button
                        onClick={() => sendReply(thread)}
                        disabled={sending || !replyBody.trim()}
                        className="px-4 py-2.5 bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl text-[#141414] disabled:text-white/30 text-sm tracking-[0.15em] font-medium transition-all"
                      >
                        send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
