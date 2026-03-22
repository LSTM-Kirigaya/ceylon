'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

/**
 * 客户端身份验证 Hook
 * 用于获取当前登录用户信息和会话状态
 */
export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // 初始化：获取当前会话
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 获取当前会话
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth init error:', error)
          setState(prev => ({ ...prev, isLoading: false }))
          return
        }

        setState({
          user: session?.user ?? null,
          session: session ?? null,
          isLoading: false,
          isAuthenticated: !!session,
        })
      } catch (err) {
        console.error('Auth init failed:', err)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          isLoading: false,
          isAuthenticated: !!session,
        })

        // 处理不同事件
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // 登录方法
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // 注册方法
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message, user: null }
      }

      return { success: true, error: null, user: data.user }
    } catch (err: any) {
      return { success: false, error: err.message, user: null }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // 登出方法
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // 重新发送验证邮件
  const resendVerificationEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resendVerificationEmail,
  }
}

/**
 * 受保护路由 Hook
 * 用于需要登录才能访问的页面
 */
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

/**
 * 游客路由 Hook
 * 用于已登录用户不能访问的页面（如登录页）
 */
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
