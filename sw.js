// Football Madness - cevrimdisi destek (Kariyer cihazda oynanir). Strateji: sayfa icin once ag, yoksa onbellek;
// vendor ve ikonlar icin once onbellek. Her yayinda CACHE adi degismez; sayfa agdan geldikce onbellek tazelenir.
const CACHE = 'fm-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './vendor/lottie.min.js', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, CDN vb. dokunulmaz
  if (url.pathname.includes('/app/')) return; // uretim istemcisinin kendi service worker'i var (app/sw.js)
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('studio.html');
  if (isPage) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
