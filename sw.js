// Кубитал: фоновый помощник — нужен, чтобы игру можно было установить как приложение
// и показывать уведомления «Ваш ход». Страница всегда берётся свежая из сети (обновления приходят сразу),
// а если сети нет — показывается последняя сохранённая копия.
const CACHE='kubital-v1';
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./icon-192.png','./icon-512.png','./manifest.json']).catch(()=>{}))); });
self.addEventListener('activate',e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url); if(u.origin!==location.origin) return; // Firebase и прочее — напрямую
  e.respondWith(fetch(r).then(res=>{ if(res.ok&&(r.mode==='navigate'||u.pathname.endsWith('.png'))){ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(r.mode==='navigate'?'./':r,cp)); } return res; })
    .catch(()=>caches.match(r.mode==='navigate'?'./':r)));
});
// нажатие на уведомление — открыть игру
self.addEventListener('notificationclick',e=>{ e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{ for(const c of l){ if('focus' in c) return c.focus(); } return self.clients.openWindow('./'); })); });
