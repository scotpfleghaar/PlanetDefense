// Planet Defense — offline service worker.
// Bump the version whenever game files change so installed tablets pick up the update.
const VERSION = 'pd-v8';

const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/icon.svg',
  'src/style.css',
  'src/main.js',
  'src/core/Game.js',
  'src/core/GameLoop.js',
  'src/data/buildings.js',
  'src/data/enemies.js',
  'src/data/metaUpgrades.js',
  'src/data/ranks.js',
  'src/data/tuning.js',
  'src/data/upgrades.js',
  'src/data/waveArchetypes.js',
  'src/data/weapons.js',
  'src/entities/Boss.js',
  'src/entities/Building.js',
  'src/entities/Enemy.js',
  'src/entities/Player.js',
  'src/entities/Projectile.js',
  'src/render/Renderer.js',
  'src/render/cloudGL.js',
  'src/render/enemyRenderers.js',
  'src/render/noise.js',
  'src/render/shieldRenderer.js',
  'src/render/sprites.js',
  'src/render/turretLayout.js',
  'src/render/worldRenderers.js',
  'src/state/save.js',
  'src/systems/ParticleSystem.js',
  'src/systems/ShieldSystem.js',
  'src/systems/TruckSystem.js',
  'src/systems/WaveManager.js',
  'src/systems/WeatherSystem.js',
  'src/systems/combat.js',
  'src/ui/hud.js',
  'src/ui/metaShop.js',
  'src/ui/pauseOverlay.js',
  'src/ui/reportScreen.js',
  'src/ui/screens.js',
  'src/ui/titleScreen.js',
  'src/ui/upgradeModal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Google Fonts: cache-first, cached on first successful fetch so they work offline after.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached ||
        fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          return res;
        }).catch(() => new Response('', { status: 503 }))
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Same-origin: stale-while-revalidate — instant offline load, refreshes in background.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
