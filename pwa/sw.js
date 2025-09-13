// Service Worker for XRPL Draxmh PWA
const CACHE_NAME = 'xrpl-draxmh-v1.0.0';
const STATIC_CACHE = 'xrpl-static-v1';
const DYNAMIC_CACHE = 'xrpl-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints to cache dynamically
const API_ENDPOINTS = [
  '/api/price',
  '/api/whales',
  '/api/alerts',
  '/api/security'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content and cache new requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static files
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', url.pathname);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for specific endpoints
    return getOfflineFallback(url.pathname);
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache new static files
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Provide offline fallbacks for API endpoints
function getOfflineFallback(pathname) {
  const offlineData = {
    '/api/price': {
      price: 'Offline',
      change: '0.00%',
      volume: 'N/A',
      timestamp: Date.now(),
      offline: true
    },
    '/api/whales': {
      whales: [],
      count: 0,
      offline: true,
      message: 'Whale data unavailable offline'
    },
    '/api/alerts': {
      alerts: [],
      count: 0,
      offline: true,
      message: 'Alerts unavailable offline'
    },
    '/api/security': {
      threats: [],
      status: 'unknown',
      offline: true,
      message: 'Security data unavailable offline'
    }
  };
  
  const data = offlineData[pathname] || { error: 'Offline', offline: true };
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...');
    
    // Sync critical data
    const endpoints = ['/api/price', '/api/whales', '/api/alerts'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(endpoint, response.clone());
        }
      } catch (error) {
        console.log('[SW] Failed to sync:', endpoint);
      }
    }
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New XRPL activity detected!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.title = data.title || 'XRPL Draxmh Alert';
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('XRPL Draxmh Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/#whales')
    );
  }
});