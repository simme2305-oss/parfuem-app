// Service Worker der Galerie: macht Sammlung, Sprüh-Seite und Bilder offline verfügbar.
// Nach Änderungen an dieser Datei VERSION erhöhen, damit alte Caches verschwinden.
const VERSION = "duft-v2";
const KERN = [
  "./",
  "index.html",
  "spray.html",
  "einstellungen.html",
  "manifest.json",
  "data/duefte.json",
  "js/gemeinsam.js",
  "js/flakons.js",
  "js/einstellungen.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];
// Entwicklungswerkzeuge nie aus dem Cache liefern
const NIE_CACHEN = ["preview.html", "scriptable-shim.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(KERN);
    // Bilder der Sammlung vorab laden – ein fehlendes Bild bricht die Installation nicht ab
    try {
      const duefte = await (await fetch("data/duefte.json", { cache: "no-cache" })).json();
      await Promise.allSettled(duefte.filter(d => d.bild).map(d => cache.add(d.bild)));
    } catch (_) { /* offline installiert – Bilder kommen später */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== VERSION) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const schrift = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const imBereich = url.href.startsWith(self.registration.scope);
  if (!imBereich && !schrift) return;                                  // z. B. Open-Meteo, ../scriptable/
  if (NIE_CACHEN.some(datei => url.pathname.endsWith(datei))) return;

  if (schrift || request.destination === "image") {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(netzZuerst(request));                            // HTML, JSON, JS: Änderungen sofort sichtbar
  }
});

async function netzZuerst(request) {
  const cache = await caches.open(VERSION);
  // ohne Query speichern, sonst landet jede spray.html?id=…-Variante einzeln im Cache
  const schluessel = new URL(request.url);
  schluessel.search = "";
  try {
    const antwort = await fetch(request);
    if (antwort.ok) cache.put(schluessel.href, antwort.clone());
    return antwort;
  } catch (fehler) {
    const treffer = await cache.match(request, { ignoreSearch: true });
    if (treffer) return treffer;
    throw fehler;
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(VERSION);
  const treffer = await cache.match(event.request);
  const netz = fetch(event.request).then(antwort => {
    if (antwort.ok || antwort.type === "opaque") cache.put(event.request, antwort.clone());
    return antwort;
  }).catch(() => null);
  event.waitUntil(netz);
  return treffer || (await netz) || Response.error();
}
