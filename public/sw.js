const CACHE_NAME = 'ceylon-v1'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API请求使用网络优先策略
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功响应缓存副本
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
          return response
        })
        .catch(() => {
          // 网络失败时尝试使用缓存
          return caches.match(request)
        })
    )
    return
  }

  // 静态资源使用缓存优先策略
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // 返回缓存并后台更新
          fetch(request)
            .then((response) => {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response)
              })
            })
            .catch(() => {})
          return cached
        }

        // 未缓存则从网络获取
        return fetch(request).then((response) => {
          // 缓存响应
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
          return response
        })
      })
    )
  }
})

// 后台同步（用于离线提交的数据）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // 获取IndexedDB中待同步的数据并发送
  console.log('Background sync triggered')
}

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: data.url,
    })
  )
})

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data))
})
