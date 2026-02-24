import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthGuard({ children }) {
  const [session, setSession] = useState(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) navigate('/login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) navigate('/login')
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (session === undefined) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full animate-ping" />
      </div>
    )
  }

  if (!session) return null

  return children
}
