'use strict';
const CACHE='allinone-app-v145',base=new URL('./',self.location.href);
const xlsx='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const core=['./','./app-install.js?v=145','./supertonic-popup.js?v=139','./ebook-list.js?v=139','./ebook-tts-export.js?v=144','./ebook-page-speech.js?v=141','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png'].map(path=>new URL(path,base).href);
const allowed=new Set(core.map(url=>new URL(url).pathname));allowed.add(new URL('index.html',base).pathname);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(core);try{await cache.add(xlsx);}catch(_){}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('allinone-app-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);
 if(!(url.origin===base.origin&&allowed.has(url.pathname))&&url.href!==xlsx)return;
 // Only cache application files; helper calls, preferences and book data stay untouched.
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(request);if(response.ok){event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));return response;}const saved=await cache.match(request);return saved||response;}catch(error){const saved=await cache.match(request)||(request.mode==='navigate'?await cache.match(base.href):null);if(saved)return saved;throw error;}})());
});
