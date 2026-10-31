// Offline mínimo: los ficheros de la app en caché; data.json siempre de red con caché de respaldo.
const V = "subastas-v2", FICHEROS = ["./", "index.html", "app.js", "estilo.css", "manifest.json", "icono.svg", "icono-192.png", "icono-512.png", "icono-180.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(FICHEROS))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x))))));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.endsWith("data.json")) {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put("data.json", c)); return r; }).catch(() => caches.match("data.json")));
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
