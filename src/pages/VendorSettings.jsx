import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function VendorSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [vendor, setVendor] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [boothName, setBoothName] = useState('')
  const [bio, setBio] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Invites
  const [inviteCodes, setInviteCodes] = useState([])
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    setUser(u)

    const [{ data: prof }, { data: vend }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('vendors').select('*').eq('profile_id', u.id).single(),
    ])

    if (prof) {
      setProfile(prof)
      setDisplayName(prof.display_name || '')
      setHandle(prof.handle || '')
    }
    if (vend) {
      setVendor(vend)
      setBoothName(vend.booth_name || '')
      setBio(vend.bio || '')
      setInstagramHandle(vend.instagram_handle || '')
      setWebsiteUrl(vend.website_url || '')

      const { data: codes } = await supabase
        .from('invite_codes')
        .select('code, used_by, created_at')
        .eq('created_by', vend.id)
        .order('created_at', { ascending: false })
      setInviteCodes(codes ?? [])
    }
  }

  const resetForm = () => {
    setDisplayName(profile?.display_name || '')
    setHandle(profile?.handle || '')
    setBoothName(vendor?.booth_name || '')
    setBio(vendor?.bio || '')
    setInstagramHandle(vendor?.instagram_handle || '')
    setWebsiteUrl(vendor?.website_url || '')
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    // Validate handle
    const h = handle.trim().toLowerCase()
    if (h && !/^[a-z0-9_]{3,30}$/.test(h)) {
      setError('handle must be 3-30 characters: letters, numbers, underscores')
      setSaving(false)
      return
    }

    // Update profiles
    const profileUpdates = {}
    if (displayName.trim() !== (profile.display_name || '')) profileUpdates.display_name = displayName.trim() || null
    if (h !== (profile.handle || '')) profileUpdates.handle = h || null

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profErr } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
      if (profErr) {
        setError(profErr.message.includes('unique') ? 'that handle is already taken' : profErr.message)
        setSaving(false)
        return
      }
      setProfile(prev => ({ ...prev, ...profileUpdates }))
    }

    // Update vendors
    const vendorUpdates = {}
    if (boothName.trim() !== (vendor.booth_name || '')) vendorUpdates.booth_name = boothName.trim() || null
    if (bio.trim() !== (vendor.bio || '')) vendorUpdates.bio = bio.trim() || null
    if (instagramHandle.trim() !== (vendor.instagram_handle || '')) vendorUpdates.instagram_handle = instagramHandle.trim() || null
    if (websiteUrl.trim() !== (vendor.website_url || '')) vendorUpdates.website_url = websiteUrl.trim() || null

    if (Object.keys(vendorUpdates).length > 0) {
      const { error: vendErr } = await supabase
        .from('vendors')
        .update(vendorUpdates)
        .eq('id', vendor.id)
      if (vendErr) {
        setError(vendErr.message)
        setSaving(false)
        return
      }
      setVendor(prev => ({ ...prev, ...vendorUpdates }))
    }

    setEditing(false)
    setSaving(false)
  }

  const generateInvite = async () => {
    if (!vendor || vendor.invites_remaining <= 0) return
    setGeneratingInvite(true)

    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8)

    const { error } = await supabase
      .from('invite_codes')
      .insert({ code, created_by: vendor.id })

    if (!error) {
      await supabase
        .from('vendors')
        .update({ invites_remaining: vendor.invites_remaining - 1 })
        .eq('id', vendor.id)
      setVendor(prev => ({ ...prev, invites_remaining: prev.invites_remaining - 1 }))

      const { data: codes } = await supabase
        .from('invite_codes')
        .select('code, used_by, created_at')
        .eq('created_by', vendor.id)
        .order('created_at', { ascending: false })
      setInviteCodes(codes ?? [])
    }
    setGeneratingInvite(false)
  }

  const copyInviteLink = async (code) => {
    const url = `${window.location.origin}/signup?invite=${code}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const initial = (vendor?.booth_name?.[0] || profile?.display_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  if (!profile || !vendor) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/25"

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
        <span className="text-white/50 text-sm font-light tracking-[0.35em]">settings</span>
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
                className={inputClass}
              />
              <div>
                <input
                  value={handle}
                  onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="handle"
                  maxLength={30}
                  className={inputClass}
                />
                <p className="text-white/15 text-[10px] tracking-wide px-1 mt-1">
                  3-30 characters: lowercase letters, numbers, underscores
                </p>
              </div>
              <input
                value={boothName}
                onChange={e => setBoothName(e.target.value)}
                placeholder="booth / vendor name"
                className={inputClass}
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="bio"
                rows={3}
                className={`${inputClass} resize-none`}
              />
              <input
                value={instagramHandle}
                onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ''))}
                placeholder="instagram handle (without @)"
                className={inputClass}
              />
              <input
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="website url"
                className={inputClass}
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
                  onClick={() => { setEditing(false); resetForm() }}
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
              {vendor.booth_name && (
                <p className="text-white/30 text-xs tracking-wide mt-1">{vendor.booth_name}</p>
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

        {/* Read-only vendor details when not editing */}
        {!editing && (
          <div className="space-y-3">
            {vendor.bio && (
              <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                <p className="text-white/20 text-[10px] tracking-[0.2em] mb-1">bio</p>
                <p className="text-white/40 text-sm tracking-wide leading-relaxed">{vendor.bio}</p>
              </div>
            )}
            {vendor.instagram_handle && (
              <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                <p className="text-white/20 text-[10px] tracking-[0.2em] mb-1">instagram</p>
                <p className="text-white/40 text-sm tracking-wide">@{vendor.instagram_handle}</p>
              </div>
            )}
            {vendor.website_url && (
              <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                <p className="text-white/20 text-[10px] tracking-[0.2em] mb-1">website</p>
                <p className="text-white/40 text-sm tracking-wide">{vendor.website_url}</p>
              </div>
            )}
          </div>
        )}

        {/* Email (read-only) */}
        <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-white/20 text-[10px] tracking-[0.2em] mb-1">email</p>
          <p className="text-white/40 text-sm tracking-wide">{user?.email}</p>
        </div>

        {/* Invite section */}
        <div className="border-t border-white/5 pt-5">
          <h2 className="text-white/40 text-xs tracking-[0.25em] mb-3">invite a vendor</h2>
          <p className="text-white/20 text-[10px] tracking-wide mb-3">
            {vendor.invites_remaining > 0
              ? `${vendor.invites_remaining} invite${vendor.invites_remaining === 1 ? '' : 's'} remaining`
              : 'no invites remaining'}
          </p>

          {inviteCodes.filter(c => !c.used_by).length > 0 && (
            <div className="space-y-2 mb-3">
              {inviteCodes.filter(c => !c.used_by).map(c => (
                <div key={c.code} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/40 text-xs tracking-wide font-mono flex-1 truncate">
                    {window.location.origin}/signup?invite={c.code}
                  </span>
                  <button
                    onClick={() => copyInviteLink(c.code)}
                    className="text-white/30 text-[10px] tracking-[0.15em] hover:text-white/60 transition-colors flex-shrink-0"
                  >
                    {copiedCode === c.code ? 'copied' : 'copy'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {vendor.invites_remaining > 0 && (
            <button
              onClick={generateInvite}
              disabled={generatingInvite}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/50 text-xs tracking-[0.15em] hover:border-white/20 hover:text-white/70 disabled:opacity-40 transition-all"
            >
              {generatingInvite ? '—' : 'generate new invite'}
            </button>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-white/40 text-sm tracking-[0.2em] hover:border-white/20 hover:text-white/60 transition-all mb-8"
        >
          sign out
        </button>
      </div>
    </div>
  )
}
