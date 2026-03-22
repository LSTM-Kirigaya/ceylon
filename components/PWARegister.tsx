'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/hooks/usePWA'

/**
 * PWA 注册组件
 * 在客户端注册 Service Worker
 */
export function PWARegister() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
