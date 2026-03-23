'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

function isPublicPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (pathname === '/') return true
  const prefixes = ['/login', '/register', '/auth/callback'] as const
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const setUser = useAuthStore((s) => s.setUser)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    let cancelled = false

    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        if (cancelled) return
        setUser(data.user ?? null)
        setProfile(data.profile ?? null)
      } catch {
        if (!cancelled) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSession()

    const interval = setInterval(loadSession, 120_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [setUser, setProfile, setLoading])

  useEffect(() => {
    if (loading) return

    const isPublic = isPublicPathname(pathname)

    if (!user && !isPublic) {
      router.push('/login')
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.push('/dashboard')
    }
  }, [pathname, router, user, loading])

  return <>{children}</>
}
