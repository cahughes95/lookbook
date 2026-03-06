import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Rendered inside a parent <AnimatePresence> block.
// onSuccess(user) is called after sign-in or sign-up.
export default function AuthModal({ hint, onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  // Push the sheet above the software keyboard using the visualViewport API.
  // When the keyboard opens, visualViewport.height shrinks. The difference
  // between the layout viewport (window.innerHeight) and the visual viewport
  // is the keyboard height. We apply that as paddingBottom on the backdrop so
  // the flex items-end layout keeps the sheet above the keyboard.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    onSuccess(data.user)
  }

  return (
    // Backdrop doubles as flex positioner: bottom on mobile, center on desktop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4"
      style={{ paddingBottom: keyboardOffset, transition: 'padding-bottom 0.2s ease-out' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="w-full md:max-w-sm bg-[#141414] rounded-t-2xl md:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4">
          {/* Drag handle — mobile only */}
          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5 md:hidden" />

          {hint && (
            <p className="text-white/35 text-xs tracking-[0.25em] text-center mb-5">{hint}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/25"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wide focus:outline-none focus:border-white/25 placeholder:text-white/25"
            />
            {error && (
              <p className="text-red-400 text-xs tracking-wide px-1">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/90 hover:bg-white disabled:bg-white/20 rounded-xl py-3.5 text-[#141414] disabled:text-white/30 text-sm tracking-[0.2em] font-medium transition-all"
            >
              {loading ? '—' : isSignUp ? 'create account' : 'sign in'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="w-full mt-4 text-white/25 text-xs tracking-wide text-center hover:text-white/40 transition-colors"
          >
            {isSignUp ? 'have an account? sign in' : 'no account? sign up'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
