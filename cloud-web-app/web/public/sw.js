/**
 * Aethel Engine - Service Worker
 * 
 * Provides offline capability, intelligent caching, and background sync.
 * This is a production-grade service worker following Workbox patterns.
 * 
 * @version 2.0.0
 * @author Aethel Engine Team
 */

const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `aethel-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aethel-dynamic-${CACHE_VERSION}`;
const API_CACHE = `aethel-api-${CACHE_VERSION}`;
const ASSET_CACHE = `aethel-assets-${CACHE_VERSION}`;

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Arquivos estáticos que devem estar sempre disponíveis offline
  staticAssets: [
    '/',
    '/offline',
    '/manifest.json',
    '/favicon.svg',
    '/aethel-logo.svg',
  ],
  
  // Padrões de URL para diferentes estratégias de cache
  cacheStrategies: {
    // Network first - APIs críticas que precisam de dados frescos
    networkFirst: [
      '/api/workspace/',
      '/api/projects/',
      '/api/files/',
    ],
    // Cache first - Assets que raramente mudam
    cacheFirst: [
      '/locales/',
      '/_next/static/',
      '/assets/',
      '.woff2',
      '.woff',
      '.ttf',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.svg',
      '.ico',
    ],
    // Stale while revalidate - Boa UX com dados relativamente frescos
    staleWhileRevalidate: [
      '/api/user/',
      '/api/settings/',
      '/api/templates/',
    ],
    // Network only - Nunca cachear
    networkOnly: [
      '/api/auth/',
      '/api/ai/',
      '/api/terminal/',
      '/api/dap/',
      '/api/lsp/',
    ],
  },
  
  // Limites de cache
  limits: {
    dynamicCacheMax: 100,
    apiCacheMax: 50,
    assetCacheMax: 200,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  },
};

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(CONFIG.staticAssets);
      })
      .then(() => {
        console.log('[SW] Static assets cached, skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('aethel-') && 
                     !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Tomar controle de todas as páginas imediatamente
      self.clients.claim(),
    ])
  );
});

// ============================================================================
// FETCH STRATEGY HANDLERS
// ============================================================================

/**
 * Network First Strategy
 * Tenta rede primeiro, fallback para cache
 */
async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Network failed, serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Se for uma navegação, retornar página offline
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

/**
 * Cache First Strategy
 * Tenta cache primeiro, fallback para rede
 */
async function cacheFirst(request, cacheName = ASSET_CACHE) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Retorna cache imediatamente enquanto busca atualização
 */
async function staleWhileRevalidate(request, cacheName = API_CACHE) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn('[SW] Background fetch failed:', error);
      return null;
    });
  
  return cachedResponse || fetchPromise;
}

/**
 * Network Only Strategy
 * Apenas rede, sem cache
 */
async function networkOnly(request) {
  return fetch(request);
}

// ============================================================================
// REQUEST ROUTING
// ============================================================================

/**
 * Determina a estratégia de cache baseada na URL
 */
function getStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Network Only - APIs em tempo real
  for (const pattern of CONFIG.cacheStrategies.networkOnly) {
    if (pathname.includes(pattern)) {
      return 'networkOnly';
    }
  }
  
  // Cache First - Assets estáticos
  for (const pattern of CONFIG.cacheStrategies.cacheFirst) {
    if (pathname.includes(pattern) || pathname.endsWith(pattern)) {
      return 'cacheFirst';
    }
  }
  
  // Network First - APIs críticas
  for (const pattern of CONFIG.cacheStrategies.networkFirst) {
    if (pathname.includes(pattern)) {
      return 'networkFirst';
    }
  }
  
  // Stale While Revalidate - APIs menos críticas
  for (const pattern of CONFIG.cacheStrategies.staleWhileRevalidate) {
    if (pathname.includes(pattern)) {
      return 'staleWhileRevalidate';
    }
  }
  
  // Default para navegação: Network First
  if (request.mode === 'navigate') {
    return 'networkFirst';
  }
  
  // Default para outros: Stale While Revalidate
  return 'staleWhileRevalidate';
}

// ============================================================================
// FETCH EVENT HANDLER
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorar requests não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Ignorar extensões de desenvolvimento
  if (request.url.includes('chrome-extension://') || 
      request.url.includes('devtools://')) {
    return;
  }
  
  // Ignorar WebSockets
  if (request.url.includes('/ws') || request.headers.get('Upgrade') === 'websocket') {
    return;
  }
  
  const strategy = getStrategy(request);
  
  switch (strategy) {
    case 'networkOnly':
      event.respondWith(networkOnly(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(fetch(request));
  }
});

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-workspace') {
    event.waitUntil(syncWorkspaceChanges());
  }
  
  if (event.tag === 'sync-project') {
    event.waitUntil(syncProjectChanges());
  }
});

async function syncWorkspaceChanges() {
  // Sincronizar alterações pendentes do workspace
  const pending = await getPendingChanges('workspace');
  
  for (const change of pending) {
    try {
      await fetch('/api/workspace/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      await removePendingChange('workspace', change.id);
    } catch (error) {
      console.error('[SW] Failed to sync workspace change:', error);
    }
  }
}

async function syncProjectChanges() {
  // Sincronizar alterações pendentes do projeto
  const pending = await getPendingChanges('project');
  
  for (const change of pending) {
    try {
      await fetch('/api/projects/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      await removePendingChange('project', change.id);
    } catch (error) {
      console.error('[SW] Failed to sync project change:', error);
    }
  }
}

// IndexedDB helpers para pending changes
async function getPendingChanges(store) {
  // Implementação simplificada - em produção usar IndexedDB
  return [];
}

async function removePendingChange(store, id) {
  // Implementação simplificada - em produção usar IndexedDB
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Aethel Engine notification',
    icon: '/aethel-logo.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Aethel Engine', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Caso contrário, abrir nova janela
        return self.clients.openWindow(url);
      })
  );
});

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE)
          .then((cache) => cache.addAll(payload.urls))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      );
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// ============================================================================
// PERIODIC BACKGROUND SYNC (experimental)
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch('/api/version');
    const { version } = await response.json();
    
    if (version !== CACHE_VERSION) {
      // Notificar cliente sobre atualização disponível
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          payload: { version },
        });
      });
    }
  } catch (error) {
    console.warn('[SW] Failed to check for updates:', error);
  }
}

console.log('[SW] Service Worker loaded - Version:', CACHE_VERSION);
