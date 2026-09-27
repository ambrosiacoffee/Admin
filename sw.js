// Ambrosia Admin app — keeps the admin page on the phone so it opens instantly.
// Only this site's own files are cached. Orders, products and payments always
// come live from Firebase / the payment functions and are never stored here.
const CACHE = "ambrosia-admin-v4";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // Firebase, payments, fonts: straight to the network
  if (req.mode === "navigate") {
    // always try for the newest admin page first, so updates show up straight away
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("/index.html", copy)); return res; })
      .catch(() => caches.match("/index.html").then(r => r || new Response("<h2 style='font-family:sans-serif;padding:30px'>You're offline — connect to the internet and try again.</h2>", { headers: { "Content-Type": "text/html" } }))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
// tapping an order notification opens the app on the Orders tab
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.postMessage({ openTab: "orders" }); return c.focus(); } }
    return self.clients.openWindow("/?tab=orders");
  }));
});
