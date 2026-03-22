'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

const PUBLIC_PATHS = ['/', '/login', '/register', '/auth/callback']

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setProfile, setLoading, refreshProfile } = useAuthStore()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
      
      setLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profile)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  // Redirect logic
  useEffect(() => {
    const { user, loading } = useAuthStore.getState()
    
    if (loading) return

    const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path))
    
    if (!user && !isPublicPath) {
      router.push('/login')
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.push('/dashboard')
    }
  }, [pathname, router])

  return <>{children}</>
}
