import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'

// ── Avatar Crop Modal ────────────────────────────────────────────────────────
function AvatarCropModal({ imageUrl, onSave, onCancel }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const CIRCLE = 240

  const onImgLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target
    const minDim = Math.min(w, h)
    const s = CIRCLE / minDim
    setScale(s)
    setImgSize({ w, h })
    setOffset({ x: -(w * s - CIRCLE) / 2, y: -(h * s - CIRCLE) / 2 })
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const sw = imgSize.w * scale
    const sh = imgSize.h * scale
    const nx = Math.min(0, Math.max(CIRCLE - sw, dragStart.current.ox + dx))
    const ny = Math.min(0, Math.max(CIRCLE - sh, dragStart.current.oy + dy))
    setOffset({ x: nx, y: ny })
  }, [dragging, imgSize, scale])

  const handlePointerUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const handleSave = () => {
    const canvas = document.createElement('canvas')
    const outputSize = 400
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      const srcX = -offset.x / scale
      const srcY = -offset.y / scale
      const srcSize = CIRCLE / scale
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize)

      const tryCompress = (q) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 500 * 1024 && q > 0.3) {
            tryCompress(q - 0.1)
          } else {
            onSave(blob)
          }
        }, 'image/jpeg', q)
      }
      tryCompress(0.85)
    }
    img.onerror = () => {
      console.error('Avatar crop: failed to load image for canvas')
      onSave(null)
    }
    img.src = imageUrl
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-white/50 text-xs tracking-[0.2em]">drag to reposition</p>

      <div
        className="relative overflow-hidden rounded-full"
        style={{ width: CIRCLE, height: CIRCLE, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={onImgLoad}
          className="absolute select-none"
          style={{
            width: imgSize.w * scale,
            height: imgSize.h * scale,
            left: offset.x,
            top: offset.y,
          }}
        />
        <div className="absolute inset-0 rounded-full border-2 border-white/30 pointer-events-none" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="bg-white/90 hover:bg-white rounded-xl px-6 py-2.5 text-[#141414] text-sm tracking-[0.15em] font-medium transition-all"
        >
          save
        </button>
        <button
          onClick={onCancel}
          className="bg-white/5 border border-white/10 rounded-xl px-6 py-2.5 text-white/40 text-sm tracking-[0.15em] transition-all"
        >
          cancel
        </button>
      </div>
    </div>
  )
}

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
  const [copiedQrLink, setCopiedQrLink] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [cropImage, setCropImage] = useState(null)
  const qrRef = useRef(null)
  const avatarInputRef = useRef(null)

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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropImage(URL.createObjectURL(file))
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleCropSave = async (blob) => {
    setCropImage(null)
    if (!blob || !user) return
    setAvatarUploading(true)
    setAvatarError('')

    const path = `${user.id}/avatar.jpg`
    const { error: upErr } = await supabase.storage.from('item-images').upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
    })

    if (upErr) {
      console.error('Avatar upload error:', upErr)
      setAvatarError('upload failed — try again')
      setAvatarUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(path)
    const avatarUrl = `${publicUrl}?t=${Date.now()}`
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)

    if (dbErr) {
      setAvatarError('failed to save — try again')
    } else {
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }))
    }
    setAvatarUploading(false)
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
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => avatarInputRef.current?.click()} className="relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-lg tracking-wider">
                {initial}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white/15 rounded-full flex items-center justify-center text-white/50 text-[10px]">+</div>
          </button>
          {avatarError && <p className="text-red-400/70 text-[10px] tracking-wide">{avatarError}</p>}

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

        {/* QR Code */}
        {profile.handle && (
          <div className="border-t border-white/5 pt-5">
            <h2 className="text-white/40 text-xs tracking-[0.25em] mb-4">your qr code</h2>
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4">
              <QRCodeCanvas
                ref={qrRef}
                value={`${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/v/${profile.handle}`}
                size={200}
                level="M"
                includeMargin={false}
              />
              <p className="text-[#141414]/50 text-xs tracking-wide">
                {(import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/^https?:\/\//, '')}/v/{profile.handle}
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const canvas = qrRef.current?.querySelector?.('canvas') || qrRef.current
                  if (!canvas) return
                  const url = canvas.toDataURL('image/png')
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `lookbook-${profile.handle}-qr.png`
                  a.click()
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/50 text-xs tracking-[0.15em] hover:border-white/20 hover:text-white/70 transition-all"
              >
                download qr
              </button>
              <button
                onClick={async () => {
                  const url = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/v/${profile.handle}`
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
                  setCopiedQrLink(true)
                  setTimeout(() => setCopiedQrLink(false), 2000)
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/50 text-xs tracking-[0.15em] hover:border-white/20 hover:text-white/70 transition-all"
              >
                {copiedQrLink ? 'copied!' : 'copy link'}
              </button>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-white/40 text-sm tracking-[0.2em] hover:border-white/20 hover:text-white/60 transition-all mb-8"
        >
          sign out
        </button>
      </div>

      {/* Crop modal */}
      {cropImage && (
        <AvatarCropModal
          imageUrl={cropImage}
          onSave={handleCropSave}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  )
}
