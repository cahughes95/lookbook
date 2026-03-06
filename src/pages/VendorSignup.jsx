import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function VendorSignup() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('invite') || ''
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState(null)
  const [codeError, setCodeError] = useState('')
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)

  // Form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [boothName, setBoothName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    validate()
  }, [])

  const validate = async () => {
    // Check if already logged in
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setAlreadyLoggedIn(true)
      setChecking(false)
      return
    }

    if (!code) {
      setCodeError('No invite code provided.')
      setChecking(false)
      return
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .select('*, vendors(id, profile_id, profiles(display_name))')
      .eq('code', code)
      .is('used_by', null)
      .single()

    if (error || !data) {
      setCodeError('This invite link is invalid or has already been used.')
    } else {
      setInvite(data)
    }
    setChecking(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Client-side handle validation
    const h = handle.trim().toLowerCase()
    if (!h || !/^[a-z0-9_]{3,30}$/.test(h)) {
      setError('Handle must be 3-30 characters: lowercase letters, numbers, underscores only.')
      setLoading(false)
      return
    }

    // 1. Create auth user
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // 2. Update profile with display name and handle
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), handle: h })
      .eq('id', userId)

    if (profileError) {
      setError(profileError.message.includes('unique')
        ? 'That handle is already taken.'
        : profileError.message)
      setLoading(false)
      return
    }

    // 3. Insert vendor row
    const invitingVendorId = invite.vendors?.id || invite.created_by
    const { error: vendorError } = await supabase
      .from('vendors')
      .insert({
        profile_id: userId,
        is_approved: true,
        invited_by: invitingVendorId,
        booth_name: boothName.trim() || null,
      })

    if (vendorError) {
      setError(vendorError.message)
      setLoading(false)
      return
    }

    // 4. Mark invite code as used
    await supabase
      .from('invite_codes')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('code', code)

    // 5. Decrement invites_remaining on the inviting vendor
    if (invitingVendorId) {
      const { data: inviter } = await supabase
        .from('vendors')
        .select('invites_remaining')
        .eq('id', invitingVendorId)
        .single()

      if (inviter && inviter.invites_remaining > 0) {
        await supabase
          .from('vendors')
          .update({ invites_remaining: inviter.invites_remaining - 1 })
          .eq('id', invitingVendorId)
      }
    }

    navigate('/manage', { replace: true })
  }

  const inviterName = invite?.vendors?.profiles?.display_name

  // ── Loading ────────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  // ── Already logged in ──────────────────────────────────────────────────────
  if (alreadyLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <h1 className="text-white text-3xl font-light tracking-[0.3em]">lookbook</h1>
          <p className="text-white/40 text-sm tracking-wide">
            You already have an account. Sign out first to use an invite link.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.reload()
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white/50 text-sm tracking-wider hover:border-white/20 hover:text-white/70 transition-all"
          >
            sign out
          </button>
        </div>
      </div>
    )
  }

  // ── Invalid code ───────────────────────────────────────────────────────────
  if (codeError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <h1 className="text-white text-3xl font-light tracking-[0.3em]">lookbook</h1>
          <p className="text-white/40 text-sm tracking-wide">{codeError}</p>
          <a
            href="/"
            className="block text-white/20 text-xs tracking-[0.2em] hover:text-white/40 transition-colors"
          >
            go home
          </a>
        </div>
      </div>
    )
  }

  // ── Signup form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <h1 className="text-white text-3xl font-light tracking-[0.3em] mb-4 text-center">
          lookbook
        </h1>
        <p className="text-white/25 text-xs tracking-[0.2em] text-center mb-2">
          vendor invite
        </p>
        {inviterName && (
          <p className="text-white/30 text-xs tracking-wide text-center mb-8">
            invited by {inviterName}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />
          <input
            type="text"
            placeholder="display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />
          <div>
            <input
              type="text"
              placeholder="handle"
              value={handle}
              onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              maxLength={30}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
            />
            <p className="text-white/15 text-[10px] tracking-wide px-1 mt-1">
              3-30 characters: lowercase letters, numbers, underscores
            </p>
          </div>
          <input
            type="text"
            placeholder="booth / vendor name (optional)"
            value={boothName}
            onChange={e => setBoothName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />

          {error && (
            <p className="text-red-400 text-xs tracking-wide px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg text-sm font-medium tracking-wider disabled:opacity-40 mt-2"
          >
            {loading ? '—' : 'create vendor account'}
          </button>
        </form>
      </div>
    </div>
  )
}
