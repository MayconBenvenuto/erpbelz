// Service Worker para cache de assets e offline capability
const CACHE_NAME = 'belz-erp-v1'
const API_CACHE_NAME = 'belz-erp-api-v1'

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/logo-belz.jpg',
  '/logo-belz-email.png'
]

// APIs que podem ser cacheadas
const CACHEABLE_APIS = [
  '/api/users',
  '/api/goals',
  '/api/clientes'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Cache para assets estáticos
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    )
    return
  }

  // Cache para APIs específicas
  if (url.pathname.startsWith('/api/')) {
    const isCacheableAPI = CACHEABLE_APIS.some(api => url.pathname.startsWith(api))
    
    if (isCacheableAPI && request.method === 'GET') {
      event.respondWith(
        caches.open(API_CACHE_NAME).then((cache) => {
          return cache.match(request).then((response) => {
            // Serve from cache first
            if (response) {
              // Update cache in background
              fetch(request).then((fetchResponse) => {
                if (fetchResponse.ok) {
                  cache.put(request, fetchResponse.clone())
                }
              })
              return response
            }
            
            // Fetch and cache
            return fetch(request).then((fetchResponse) => {
              if (fetchResponse.ok) {
                cache.put(request, fetchResponse.clone())
              }
              return fetchResponse
            })
          })
        })
      )
    }
  }
})
