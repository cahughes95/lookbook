import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function BuyerProfile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ follows: 0, saves: 0 })
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      setUser(u)

      const [{ data: prof }, { count: followCount }, { count: saveCount }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', u.id).single(),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', u.id),
        supabase.from('saves').select('id', { count: 'exact', head: true }).eq('profile_id', u.id),
      ])

      if (prof) {
        setProfile(prof)
        setDisplayName(prof.display_name || '')
        setHandle(prof.handle || '')
      }
      setStats({ follows: followCount ?? 0, saves: saveCount ?? 0 })
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const updates = {}
    if (displayName !== (profile.display_name || '')) updates.display_name = displayName.trim() || null
    if (handle !== (profile.handle || '')) {
      const h = handle.trim().toLowerCase()
      if (h && !/^[a-z0-9_]{3,30}$/.test(h)) {
        setError('handle must be 3-30 characters: letters, numbers, underscores')
        setSaving(false)
        return
      }
      updates.handle = h || null
    }

    if (Object.keys(updates).length === 0) {
      setEditing(false)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message.includes('unique') ? 'that handle is already taken' : updateError.message)
    } else {
      setProfile(prev => ({ ...prev, ...updates }))
      setEditing(false)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const initial = (profile?.display_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  if (!profile) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-white/30 text-xs tracking-[0.2em] hover:text-white/60 transition-colors"
        >
          &larr; back
        </button>
        <span className="text-white/50 text-sm font-light tracking-[0.35em]">profile</span>
      </div>

      <div className="px-5 space-y-6">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center gap-3 pt-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-lg tracking-wider">
              {initial}
            </div>
          )}

          {editing ? (
            <div className="w-full max-w-xs space-y-3">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="display name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/25"
              />
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="handle"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/25"
              />
              {error && <p className="text-red-400 text-xs tracking-wide px-1">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-3 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all"
                >
                  {saving ? '—' : 'save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setDisplayName(profile.display_name || ''); setHandle(profile.handle || ''); setError('') }}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs tracking-widest"
                >
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white/70 text-base tracking-[0.1em]">{profile.display_name || 'no name set'}</p>
              {profile.handle && (
                <p className="text-white/25 text-xs tracking-[0.15em] mt-0.5">@{profile.handle}</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="text-white/20 text-[10px] tracking-[0.2em] mt-2 hover:text-white/40 transition-colors"
              >
                edit profile
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <p className="text-white/60 text-base tracking-wide">{stats.follows}</p>
            <p className="text-white/20 text-[10px] tracking-[0.2em]">following</p>
          </div>
          <div className="text-center">
            <p className="text-white/60 text-base tracking-wide">{stats.saves}</p>
            <p className="text-white/20 text-[10px] tracking-[0.2em]">saved</p>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-white/20 text-[10px] tracking-[0.2em] mb-1">email</p>
          <p className="text-white/40 text-sm tracking-wide">{user?.email}</p>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-white/40 text-sm tracking-[0.2em] hover:border-white/20 hover:text-white/60 transition-all"
        >
          sign out
        </button>
      </div>
    </div>
  )
}
