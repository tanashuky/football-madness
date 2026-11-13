// Football Madness uygulamasi - cevrimdisi destek (Kariyer cihazda oynanir). Sayfa ve js icin once ag, yoksa onbellek;
// stil, ikon ve manifest icin once onbellek. CACHE adi yayin numarasiyla degisir (build.sh yazar): eski onbellek silinir.
const CACHE = 'fm-app-227e068c88';
const SHELL = ['./', './index.html', './style.css', './manifest.webmanifest', './js/main.js', '../icons/icon-192.png', '../icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('fm-app-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, CDN, fontlar: dokunulmaz
  const netFirst = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (netFirst) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
  } else {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
