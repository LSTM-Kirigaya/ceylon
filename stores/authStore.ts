'use client'

import { create } from 'zustand'
import { Profile } from '@/types'

interface AuthState {
  user: { id: string; email?: string } | null
  profile: Profile | null
  loading: boolean
  setUser: (user: AuthState['user']) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    set({ user: null, profile: null })
  },
  refreshProfile: async () => {
    const { user } = get()
    if (!user) {
      set({ profile: null })
      return
    }
    const res = await fetch('/api/auth/session', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (data.profile) {
      set({ profile: data.profile as Profile })
    }
  },
}))
