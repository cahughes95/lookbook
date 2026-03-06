import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

export default function BuyerAuthGuard({ children }) {
  const [session, setSession] = useState(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Loading
  if (session === undefined) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  // Not logged in — show AuthModal over a dark screen
  // Auth state change above will flip session → re-render shows children
  if (!session) {
    return (
      <div className="h-screen bg-[#0a0a0a]">
        <AnimatePresence>
          <AuthModal
            key="buyer-auth"
            hint="sign in to view your messages"
            onClose={() => navigate(-1)}
            onSuccess={() => {}} // onAuthStateChange handles the rest
          />
        </AnimatePresence>
      </div>
    )
  }

  return children
}
