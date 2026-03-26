'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { locales, type Locale } from '@/i18n/config'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'

interface AuthProviderProps {
  children: ReactNode
}

function isPublicPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (pathname === '/') return true
  if (locales.some((l) => pathname === `/${l}` || pathname === `/${l}/`)) return true
  if (/(^|\/)login(\/|$)/.test(pathname)) return true
  if (/(^|\/)register(\/|$)/.test(pathname)) return true
  if (/(^|\/)auth\/callback(\/|$)/.test(pathname)) return true
  if (/(^|\/)(blog|docs|pricing|cli-oauth|forgot-password|reset-password)(\/|$)/.test(pathname)) return true
  return false
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
    } else if (
      user &&
      (/(^|\/)login(\/|$)/.test(pathname ?? '') || /(^|\/)register(\/|$)/.test(pathname ?? ''))
    ) {
      router.push('/dashboard')
    }
  }, [pathname, router, user, loading])

  return (
    <>
      <AnalyticsTracker />
      {children}
    </>
  )
}
