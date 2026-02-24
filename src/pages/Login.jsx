import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (!data.session) {
        // Email confirmation required
        setMessage('Check your email to confirm your account, then sign in.')
        setIsSignUp(false)
        setLoading(false)
      } else {
        navigate('/')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <h1 className="text-white text-3xl font-light tracking-[0.3em] mb-12 text-center">
          lookbook
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-white/25 text-sm tracking-wide"
          />

          {error && (
            <p className="text-red-400 text-xs tracking-wide px-1">{error}</p>
          )}
          {message && (
            <p className="text-green-400 text-xs tracking-wide px-1">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg text-sm font-medium tracking-wider disabled:opacity-40 mt-2"
          >
            {loading ? '—' : isSignUp ? 'create account' : 'sign in'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
          className="w-full mt-6 text-white/25 text-xs tracking-wide text-center hover:text-white/40 transition-colors"
        >
          {isSignUp ? 'already have an account? sign in' : "don't have an account? sign up"}
        </button>
      </div>
    </div>
  )
}
