import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

export default function RootRedirect() {
  const [checking, setChecking] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    resolve()
  }, [])

  const resolve = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setChecking(false)
      setShowAuth(true)
      return
    }
    await routeUser(session.user)
  }

  const routeUser = async (user) => {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, is_approved')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (vendor?.is_approved) {
      navigate('/vendor', { replace: true })
    } else {
      navigate('/home', { replace: true })
    }
  }

  const handleAuthSuccess = async (user) => {
    setShowAuth(false)
    setChecking(true)
    await routeUser(user)
  }

  if (checking) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
      <h1 className="text-white/40 text-lg font-light tracking-[0.4em]">lookbook</h1>
      <p className="text-white/15 text-xs tracking-[0.2em]">sign in to continue</p>

      <AnimatePresence>
        {showAuth && (
          <AuthModal
            key="root-auth"
            hint="sign in or create an account"
            onClose={() => {}}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
