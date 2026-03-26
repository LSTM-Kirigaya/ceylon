'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOffline: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
}

/**
 * PWA Hook - 管理PWA安装和离线状态
 */
export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    deferredPrompt: null,
  })

  // 检测是否已安装
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      setState(prev => ({
        ...prev,
        isInstalled: isStandalone || isIOSStandalone,
      }))
    }

    checkInstalled()

    // 监听显示模式变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)

    return () => mediaQuery.removeEventListener('change', checkInstalled)
  }, [])

  // 监听安装提示
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setState(prev => ({
        ...prev,
        deferredPrompt: e,
        isInstallable: true,
      }))
    }

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        deferredPrompt: null,
        isInstallable: false,
        isInstalled: true,
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // 监听离线状态
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }))
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始状态
    setState(prev => ({ ...prev, isOffline: !navigator.onLine }))

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 安装PWA
  const install = useCallback(async () => {
    if (!state.deferredPrompt) return false

    await state.deferredPrompt.prompt()
    const { outcome } = await state.deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setState(prev => ({
        ...prev,
        deferredPrompt: null,
        isInstallable: false,
      }))
      return true
    }
    return false
  }, [state.deferredPrompt])

  return {
    ...state,
    install,
  }
}

/**
 * Service Worker 注册
 */
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Dev: prevent stale caches from SW during UI iteration.
    // We proactively unregister existing SW and clear Cache Storage.
    if (process.env.NODE_ENV !== 'production') {
      window.addEventListener('load', () => {
        void (async () => {
          try {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map((r) => r.unregister()))
          } catch {
            /* ignore */
          }
          try {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          } catch {
            /* ignore */
          }
        })()
      })
      return
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration.scope)

          // 检测更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 有新版本可用
                  console.log('New version available')
                }
              })
            }
          })
        })
        .catch(error => {
          console.log('SW registration failed:', error)
        })
    })
  }
}
