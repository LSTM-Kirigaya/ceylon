'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type AuthUser = { id: string; email?: string }

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' })
      const data = await res.json()
      setState({
        user: data.user ?? null,
        isLoading: false,
        isAuthenticated: !!data.user,
      })
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { success: false, error: body.error || 'Login failed' }
      }
      await refresh()
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' }
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [refresh])

  const signUp = useCallback(async (email: string, password: string, displayName: string, inviteCode: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName, inviteCode }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { success: false, error: body.error || 'Sign up failed', user: null }
      }
      await refresh()
      return { success: true, error: null, user: body.user ?? null }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sign up failed',
        user: null,
      }
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      setState({ user: null, isLoading: false, isAuthenticated: false })
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Sign out failed' }
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const resendVerificationEmail = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'signup', email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { success: false, error: body.error || 'Resend failed' }
      }
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Resend failed' }
    }
  }, [])

  return {
    user: state.user,
    session: null,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    signIn,
    signUp,
    signOut,
    resendVerificationEmail,
  }
}

export function useRequireAuth(redirectTo: string = '/login') {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  return { isLoading, isAuthenticated }
}

export function useRequireGuest(redirectTo: string = '/dashboard') {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  return { isLoading, isAuthenticated }
}
