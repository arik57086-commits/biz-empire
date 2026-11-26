// =====================================================================
// СЕРВЕР КУБИТАЛА (Cloudflare Worker)
// Монеты, предметы, VIP и премиум меняет только он. Игроки шлют запросы
// со своим токеном входа Firebase, сервер проверяет и записывает в базу.
// Секреты (задаются в настройках Worker'а, в коде их нет):
//   SA        — JSON ключа сервисного аккаунта Firebase
//   BOT_TOKEN — токен Telegram-бота от @BotFather
// Необязательно: PREM_PRICE — цена премиум-пропуска в звёздах (по умолчанию 100)
// =====================================================================
const PID='biz-empire-2b4de';
const ADMINS=['E97EvVzBHbW8FJo7NF1wju3qfCV2']; // создатель; помощники — в config/site.admins
let CFG=null;
async function siteCfg(env){ if(!CFG||CFG.exp<Date.now()){ const c=await getDoc(env,'config/site'); CFG={admins:(c&&c.data.admins)||[],ny:!!(c&&c.data.ny),exp:Date.now()+60000}; } return CFG; }
async function isAdm(env,uid){ if(ADMINS.includes(uid)) return true; return (await siteCfg(env)).admins.includes(uid); }
const FS=`https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;
const DOCNAME=p=>`projects/${PID}/databases/(default)/documents/${p}`;
const ECO=['coins','items','vipUntil','prem','srv'];
class UErr extends Error{}            // ошибка, которую можно показать игроку
const fail=m=>{ throw new UErr(m); };

// ---------- время по Москве (как в игре) ----------
const mskDate=(d=new Date())=>new Date(d.getTime()+3*3600000);
const today=()=>mskDate().toISOString().slice(0,10);
const pad2=n=>String(n).padStart(2,'0');
const seasonKey=(d=new Date())=>{ const m=mskDate(d); return `sp_${m.getUTCFullYear()}_${pad2(m.getUTCMonth()+1)}`; };

// ---------- предметы игрока ----------
const newUid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const addItem=(a,id)=>{ (a.items=a.items||[]).push({uid:newUid(),id}); };
const hasItem=(a,id)=>(a.items||[]).some(x=>x.id===id);
const countItem=(a,id)=>(a.items||[]).filter(x=>x.id===id).length;
const isOwnable=c=>c.type==='prop'||c.type==='rail'||c.type==='util';
// забрать один экземпляр: сначала тот, что не надет на компанию
function takeItem(a,id){
  const used=new Set(Object.values(a.slots||{}));
  let k=(a.items||[]).findIndex(it=>it.id===id&&!used.has(it.uid)); if(k<0) k=(a.items||[]).findIndex(it=>it.id===id);
  if(k<0) return false; a.items.splice(k,1); return true;
}
const needItems=(a,ids)=>{ const n={}; ids.forEach(i=>n[i]=(n[i]||0)+1); for(const i in n) if(countItem(a,i)<n[i]) return item(i).n; return null; };

// ---------- Firestore: значения ----------
function toFS(v){
  if(v===null||v===undefined) return {nullValue:null};
  if(typeof v==='boolean') return {booleanValue:v};
  if(typeof v==='number') return Number.isInteger(v)&&Math.abs(v)<9e15?{integerValue:String(v)}:{doubleValue:v};
  if(typeof v==='string') return {stringValue:v};
  if(Array.isArray(v)) return {arrayValue:{values:v.map(toFS)}};
  const f={}; for(const k in v) if(v[k]!==undefined) f[k]=toFS(v[k]); return {mapValue:{fields:f}};
}
function fromFS(x){
  if(!x) return null;
  if('nullValue' in x) return null; if('booleanValue' in x) return x.booleanValue;
  if('integerValue' in x) return +x.integerValue; if('doubleValue' in x) return x.doubleValue;
  if('stringValue' in x) return x.stringValue; if('timestampValue' in x) return Date.parse(x.timestampValue);
  if('arrayValue' in x) return (x.arrayValue.values||[]).map(fromFS);
  if('mapValue' in x){ const o={}, f=x.mapValue.fields||{}; for(const k in f) o[k]=fromFS(f[k]); return o; }
  return null;
}
const fieldsOf=o=>{ const f={}; for(const k in o) if(o[k]!==undefined) f[k]=toFS(o[k]); return f; };
const objOf=doc=>{ const o={}, f=doc.fields||{}; for(const k in f) o[k]=fromFS(f[k]); return o; };

// ---------- Google: токен доступа сервисного аккаунта ----------
let ACCESS=null;
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64uStr=s=>b64u(new TextEncoder().encode(s));
function pemToBuf(pem){ const b=atob(pem.replace(/-----[^-]+-----/g,'').replace(/\s+/g,'')); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u.buffer; }
async function accessToken(env){
  if(ACCESS&&ACCESS.exp>Date.now()+60000) return ACCESS.token;
  const sa=JSON.parse(env.SA), now=Math.floor(Date.now()/1000);
  const head=b64uStr(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claim=b64uStr(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const key=await crypto.subtle.importKey('pkcs8',pemToBuf(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+claim)));
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${sig}`});
  const j=await r.json(); if(!j.access_token) throw new Error('google token: '+JSON.stringify(j));
  ACCESS={token:j.access_token,exp:Date.now()+(j.expires_in||3600)*1000}; return ACCESS.token;
}
async function gfetch(env,url,opt={}){
  const t=await accessToken(env);
  const r=await fetch(url,{...opt,headers:{'Content-Type':'application/json',Authorization:'Bearer '+t,...(opt.headers||{})}});
  if(r.status===404) return null;
  const j=await r.json(); if(!r.ok){ const e=new Error('firestore '+r.status+': '+(j.error&&j.error.message||'')); e.status=r.status; e.fsStatus=j.error&&j.error.status; throw e; }
  return j;
}
async function getDoc(env,path){ const d=await gfetch(env,`${FS}/${path}`); return d?{data:objOf(d),ut:d.updateTime}:null; }
async function query(env,coll,filters,limit=50){
  const where=filters.length===1?{fieldFilter:filters[0]}:{compositeFilter:{op:'AND',filters:filters.map(f=>({fieldFilter:f}))}};
  const r=await gfetch(env,`${FS}:runQuery`,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:coll}],where,limit}})});
  return (r||[]).filter(x=>x.document).map(x=>({id:x.document.name.split('/').pop(),data:objOf(x.document),ut:x.document.updateTime}));
}
const eq=(field,value)=>({field:{fieldPath:field},op:'EQUAL',value:toFS(value)});

// ---------- транзакция: читаем документы, меняем, записываем с проверкой «никто не менял» ----------
async function tx(env,fn){
  for(let attempt=0;attempt<6;attempt++){
    const reads={}, writes=[];
    const t={
      async get(path){ if(!(path in reads)){ const d=await getDoc(env,path); reads[path]=d; } const d=reads[path]; return d?structuredClone(d.data):null; },
      // записать только перечисленные поля (остальные поля документа не трогаем)
      update(path,data,fields){ writes.push({update:{name:DOCNAME(path),fields:fieldsOf(data)},updateMask:{fieldPaths:fields||Object.keys(data)},path}); },
      create(path,data){ writes.push({update:{name:DOCNAME(path),fields:fieldsOf(data)},currentDocument:{exists:false},path,created:1}); },
      del(path){ writes.push({delete:DOCNAME(path),path}); }
    };
    const res=await fn(t);
    if(!writes.length) return res;
    const body={writes:writes.map(w=>{ const {path,created,...rest}=w; if(!created&&path in reads) rest.currentDocument=reads[path]?{updateTime:reads[path].ut}:{exists:false}; return rest; })};
    try{ await gfetch(env,`${FS}:commit`,{method:'POST',body:JSON.stringify(body)}); return res; }
    catch(e){ if(e.status===409||e.fsStatus==='FAILED_PRECONDITION'||e.fsStatus==='ABORTED'){ await new Promise(r=>setTimeout(r,80+Math.random()*200)); continue; } throw e; }
  }
  fail('Сервер занят, попробуйте ещё раз');
}
const ecoOf=u=>({coins:r2(u.coins||0),items:u.items||[],vipUntil:u.vipUntil||0,prem:u.prem||{},srv:u.srv||{}});
const saveEco=(t,uid,u)=>t.update('users/'+uid,ecoOf(u),ECO);
async function getUser(t,uid){ const u=await t.get('users/'+uid); if(!u) fail('Профиль не найден'); u.srv=u.srv||{}; u.prem=u.prem||{}; u.items=u.items||[]; u.coins=r2(u.coins||0); return u; }
const pub=u=>({coins:r2(u.coins||0),items:u.items||[],vipUntil:u.vipUntil||0,prem:u.prem||{}});

// ---------- проверка входа: токен Firebase ----------
let JWKS=null;
async function verifyIdToken(tok){
  const [h,p,s]=(tok||'').split('.'); if(!s) fail('Нужно войти в аккаунт');
  const dec=x=>{ try{ return JSON.parse(atob(x.replace(/-/g,'+').replace(/_/g,'/'))); }catch(e){ fail('Неверный вход — войдите заново'); } };
  const head=dec(h), pl=dec(p), now=Date.now()/1000;
  if(pl.aud!==PID||pl.iss!=='https://securetoken.google.com/'+PID||!pl.sub||pl.exp<now||pl.iat>now+300) fail('Вход устарел — обновите страницу');
  if(!JWKS||JWKS.exp<Date.now()){ const r=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'); JWKS={keys:(await r.json()).keys,exp:Date.now()+3600000}; }
  const jwk=JWKS.keys.find(k=>k.kid===head.kid); if(!jwk) fail('Вход устарел — обновите страницу');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  let sig; try{ sig=Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)); }catch(e){ fail('Неверный вход — войдите заново'); }
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,new TextEncoder().encode(h+'.'+p))) fail('Неверный вход');
  return pl.sub;
}

// =====================================================================
// ДЕЙСТВИЯ ИГРОКОВ
// =====================================================================
const ACTIONS={
  // открыть кейс/набор
  async open(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id); if(!x||!x.pool||x.id!==b.id) fail('Это нельзя открыть');
    if(!hasItem(u,x.id)) fail('У вас нет этого предмета'); if(x.type==='case'&&!hasItem(u,'key')) fail('Нужен ключ 🔑');
    if(x.type==='case') takeItem(u,'key'); takeItem(u,x.id); const got=pickFrom(x); addItem(u,got.id); saveEco(t,uid,u); return {got:got.id,user:pub(u)}; }); },
  // купить у Маркета (ключи и фишки)
  async shop(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id); if(!x||x.id!==b.id||!x.val||isLotItem(x)||x.ny) fail('Маркет это не продаёт');
    if(u.coins<x.val) fail('Не хватает монет'); u.coins=r2(u.coins-x.val); addItem(u,x.id); saveEco(t,uid,u); return {user:pub(u)}; }); },
  // продать Банку/Маркету
  async bank(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id); if(!x||x.id!==b.id||!x.val) fail('Это нельзя продать');
    if(!takeItem(u,x.id)) fail('У вас нет этого предмета'); const price=bankPrice(x); u.coins=r2(u.coins+price); saveEco(t,uid,u); return {price,user:pub(u)}; }); },
  // купить VIP
  async vip(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), plan=VIP_PLANS.find(v=>v.days===+b.days); if(!plan) fail('Нет такого VIP');
    if(u.coins<plan.price) fail('Не хватает монет'); u.coins=r2(u.coins-plan.price); u.vipUntil=Math.max(Date.now(),u.vipUntil||0)+plan.days*86400000; saveEco(t,uid,u); return {user:pub(u)}; }); },
  // колесо удачи раз в день
  async wheel(env,uid){ return tx(env,async t=>{ const u=await getUser(t,uid); if(u.srv.wheelDay===today()) fail('Колесо уже крутили сегодня — приходите завтра');
    const tot=WHEEL.reduce((s,x)=>s+x.w,0); let r=Math.random()*tot, k=0; for(;k<WHEEL.length-1;k++){ r-=WHEEL[k].w; if(r<0) break; }
    const before=u.items.length, xp0=u.xp||0; const extra=WHEEL[k].give(u); u.srv.wheelDay=today(); saveEco(t,uid,u);
    return {k,extra:extra||null,xp:(u.xp||0)-xp0,user:pub(u)}; }); },
  // награда сезонного пропуска: f — бесплатный ряд, v — премиум
  async pass(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), k=seasonKey(), i=+b.i, row=b.row==='v'?'v':'f', lv=PASS[i]; if(!lv) fail('Нет такого уровня');
    if((u[k]||0)<lv[0]) fail('Не хватает очков сезона'); if(row==='v'&&!u.prem[k]) fail('Нижний ряд — с премиум-пропуском');
    const cl=u.srv.pass=u.srv.pass||{}; const got=cl[k]=cl[k]||{f:[],v:[]}; if(got[row].includes(i)) fail('Награда уже получена');
    got[row].push(i); const rw=lv[row==='f'?1:2]; if(rw[0]!=='xp') addItem(u,rw[0]); saveEco(t,uid,u); return {xp:rw[0]==='xp'?rw[1]:0,item:rw[0]!=='xp'?rw[0]:null,user:pub(u)}; }); },
  // адвент-календарь: 1–31 декабря, одна награда в день (только когда включено новогоднее событие)
  async advent(env,uid){ if(!(await siteCfg(env)).ny) fail('Новогоднее событие сейчас выключено');
    const m=mskDate(); if(m.getUTCMonth()!==11) fail('Календарь работает с 1 по 31 декабря'); const d=m.getUTCDate(), y=String(m.getUTCFullYear());
    return tx(env,async t=>{ const u=await getUser(t,uid); const adv=u.srv.adv=u.srv.adv||{}; const got=adv[y]=adv[y]||[]; if(got.includes(d)) fail('Подарок за сегодня уже открыт');
      got.push(d); const rw=ADVENT[d-1]; if(rw[0]!=='xp') addItem(u,rw[0]); saveEco(t,uid,u); return {day:d,xp:rw[0]==='xp'?rw[1]:0,item:rw[0]!=='xp'?rw[0]:null,user:pub(u)}; }); },
  // набор за 7 дней входа подряд — не чаще раза в 6 дней
  async login7(env,uid){ return tx(env,async t=>{ const u=await getUser(t,uid); if(u.srv.loginBox&&Date.now()-u.srv.loginBox<6*86400000) fail('Набор за вход уже получен');
    u.srv.loginBox=Date.now(); addItem(u,'set_start'); saveEco(t,uid,u); return {user:pub(u)}; }); },
  // улучшение: 3 одинаковые карточки → шанс на карточку редкостью выше
  async upgrade(env,uid,b){ return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id), inf=x&&upgradeInfo(x); if(!inf) fail('Эту карточку нельзя улучшить');
    if(countItem(u,x.id)<UPGRADE_N) fail(`Нужно ${UPGRADE_N} одинаковые карточки`);
    for(let k=0;k<UPGRADE_N;k++) takeItem(u,x.id); const ok=Math.random()<inf.p; let got=null;
    if(ok){ got=randOf(inf.next); addItem(u,got.id); } else addItem(u,x.id); saveEco(t,uid,u); return {ok,got:got&&got.id,user:pub(u)}; }); },
  // награда за матч по сети: сервер сам бросает выпадение, один раз на игрока за партию
  async reward(env,uid,b){ const rid=String(b.rid||''); if(!/^[A-Za-z0-9]{10,40}$/.test(rid)) fail('Нет такой партии'); NY_ON=(await siteCfg(env)).ny;
    return tx(env,async t=>{ const room=await t.get('rooms/'+rid); if(!room||room.status!=='over'||!room.state) fail('Партия ещё не закончилась');
      const st=JSON.parse(room.state), r=(st.results||[]).find(x=>x.uid===uid); if(!r) fail('Вы не играли в этой партии');
      if(await t.get(`claims/${rid}_${uid}`)) fail('Награда уже получена');
      const u=await getUser(t,uid); let drop=null;
      if(!r.noReward){ const ranked=st.mode==='ranked'; const it=rollDrop(ranked&&(u.vipUntil||0)>Date.now()); if(it){ drop=it.id; addItem(u,drop); } }
      t.create(`claims/${rid}_${uid}`,{uid,rid,drop,at:Date.now()}); saveEco(t,uid,u); return {drop,user:pub(u)}; }); },
  // подарить предмет другу — сразу переходит в его инвентарь
  async gift(env,uid,b){ const to=String(b.to||''), text=String(b.text||'').slice(0,120);
    return tx(env,async t=>{ const u=await getUser(t,uid); if(u.banned) fail('Вы заблокированы'); if(!(u.friends||[]).includes(to)||to===uid) fail('Дарить можно только друзьям');
      const x=item(b.id); if(!x||!x.val||!takeItem(u,x.id)) fail('У вас нет этого предмета'); const f=await getUser(t,to); addItem(f,x.id);
      saveEco(t,uid,u); saveEco(t,to,f); t.create('gifts/'+newUid(),{from:uid,fromName:u.name||'',to,item:x.id,text,at:Date.now(),done:true}); return {user:pub(u)}; }); },
  // ---- лоты Маркета ----
  async lotList(env,uid,b){ const price=r2(+b.price); if(!(price>=0.01&&price<=LOT_PRICE_MAX)) fail(`Цена — от 0.01 до ${LOT_PRICE_MAX}`);
    const mine=await query(env,'lots',[eq('seller',uid),eq('status','open')],LOT_MAX+1); if(mine.length>=LOT_MAX) fail(`Не больше ${LOT_MAX} лотов одновременно`);
    return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id); if(u.banned) fail('Вы заблокированы'); if(!isLotItem(x)||x.id!==b.id) fail('Это нельзя выставить');
      if(!takeItem(u,x.id)) fail('У вас нет этого предмета'); t.create('lots/'+newUid(),{seller:uid,sellerName:u.name||'',item:x.id,price,status:'open',created:Date.now()}); saveEco(t,uid,u); return {user:pub(u)}; }); },
  async lotBuy(env,uid,b){ const lid=String(b.lid||'');
    return tx(env,async t=>{ const l=await t.get('lots/'+lid); if(!l||l.status!=='open') fail('Этот лот уже купили'); if(l.seller===uid) fail('Это ваш лот');
      const u=await getUser(t,uid); if(u.coins<l.price) fail('Не хватает монет'); u.coins=r2(u.coins-l.price); addItem(u,l.item); saveEco(t,uid,u);
      if(!l.bank){ const s=await getUser(t,l.seller); s.coins=r2(s.coins+lotNet(l.price)); saveEco(t,l.seller,s);
        t.update('lots/'+lid,{status:'sold',buyer:uid,buyerName:u.name||'',soldAt:Date.now()}); }
      else t.del('lots/'+lid);
      return {item:l.item,price:l.price,seller:l.sellerName||'',user:pub(u)}; }); },
  async lotCancel(env,uid,b){ const lid=String(b.lid||'');
    return tx(env,async t=>{ const l=await t.get('lots/'+lid); if(!l||l.status!=='open') fail('Лот уже продан — монеты пришли'); if(l.seller!==uid) fail('Это не ваш лот');
      const u=await getUser(t,uid); addItem(u,l.item); saveEco(t,uid,u); t.del('lots/'+lid); return {user:pub(u)}; }); },
  // ---- заявки на покупку ----
  async orderPlace(env,uid,b){ const price=r2(+b.price); if(!(price>=0.01&&price<=LOT_PRICE_MAX)) fail(`Цена — от 0.01 до ${LOT_PRICE_MAX}`);
    const mine=await query(env,'orders',[eq('buyer',uid),eq('status','open')],11); if(mine.length>=10) fail('Не больше 10 заявок одновременно');
    return tx(env,async t=>{ const u=await getUser(t,uid), x=item(b.id); if(u.banned) fail('Вы заблокированы'); if(!isLotItem(x)||x.id!==b.id) fail('На это нельзя оставить заявку');
      if(u.coins<price) fail('Не хватает монет'); u.coins=r2(u.coins-price); t.create('orders/'+newUid(),{buyer:uid,buyerName:u.name||'',item:x.id,price,status:'open',at:Date.now()}); saveEco(t,uid,u); return {user:pub(u)}; }); },
  async orderFill(env,uid,b){ const oid=String(b.oid||'');
    return tx(env,async t=>{ const o=await t.get('orders/'+oid); if(!o||o.status!=='open') fail('Заявка уже неактуальна'); if(o.buyer===uid) fail('Это ваша заявка');
      const u=await getUser(t,uid); if(!takeItem(u,o.item)) fail('У вас нет этого предмета'); u.coins=r2(u.coins+lotNet(o.price)); saveEco(t,uid,u);
      const by=await getUser(t,o.buyer); addItem(by,o.item); saveEco(t,o.buyer,by);
      t.update('orders/'+oid,{status:'filled',seller:uid,sellerName:u.name||'',filledAt:Date.now()}); return {net:lotNet(o.price),user:pub(u)}; }); },
  async orderCancel(env,uid,b){ const oid=String(b.oid||'');
    return tx(env,async t=>{ const o=await t.get('orders/'+oid); if(!o||o.status!=='open') fail('Заявка уже исполнена'); if(o.buyer!==uid) fail('Это не ваша заявка');
      const u=await getUser(t,uid); u.coins=r2(u.coins+o.price); saveEco(t,uid,u); t.del('orders/'+oid); return {user:pub(u)}; }); },
  // ---- обмен предметами ----
  async offerSend(env,uid,b){ const give=(b.give||[]).map(String).slice(0,6), get=(b.get||[]).map(String).slice(0,6), coins=r2(Math.max(0,+b.coins||0)), to=String(b.to||'');
    if(!get.length) fail('Выберите, что хотите получить'); if(!give.length&&!coins) fail('Добавьте свои предметы или монеты'); if(to===uid) fail('Нельзя меняться с собой');
    return tx(env,async t=>{ const u=await getUser(t,uid); if(u.banned) fail('Вы заблокированы'); const a=await t.get('users/'+to); if(!a) fail('Игрок не найден');
      const miss=needItems(u,give); if(miss) fail(`У вас нет «${miss}»`); if(u.coins<coins) fail('Не хватает монет');
      give.forEach(i=>takeItem(u,i)); u.coins=r2(u.coins-coins); saveEco(t,uid,u);
      t.create('offers/'+newUid(),{from:uid,fromName:u.name||'',to,toName:a.name||'',give,get,coins,status:'open',at:Date.now()}); return {user:pub(u)}; }); },
  async offerAnswer(env,uid,b){ const oid=String(b.oid||''), ok=!!b.ok;
    return tx(env,async t=>{ const o=await t.get('offers/'+oid); if(!o||o.status!=='open') fail('Предложение уже неактуально'); if(o.to!==uid) fail('Это предложение не вам');
      const u=await getUser(t,uid), g=await getUser(t,o.from);
      if(ok){ const miss=needItems(u,o.get||[]); if(miss) fail(`У вас нет «${miss}» — обмен невозможен`);
        (o.get||[]).forEach(i=>{ takeItem(u,i); addItem(g,i); }); (o.give||[]).forEach(i=>addItem(u,i)); u.coins=r2(u.coins+(o.coins||0)); }
      else { (o.give||[]).forEach(i=>addItem(g,i)); g.coins=r2(g.coins+(o.coins||0)); }
      saveEco(t,uid,u); saveEco(t,o.from,g); t.update('offers/'+oid,{status:ok?'accepted':'declined',doneAt:Date.now()}); return {user:pub(u)}; }); },
  async offerCancel(env,uid,b){ const oid=String(b.oid||'');
    return tx(env,async t=>{ const o=await t.get('offers/'+oid); if(!o||o.status!=='open') fail('Предложение уже неактуально'); if(o.from!==uid) fail('Это не ваше предложение');
      const u=await getUser(t,uid); (o.give||[]).forEach(i=>addItem(u,i)); u.coins=r2(u.coins+(o.coins||0)); saveEco(t,uid,u); t.del('offers/'+oid); return {user:pub(u)}; }); },
  // ---- создатель: товары Маркета и правка игроков ----
  async stockFill(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const have={}; (await query(env,'lots',[eq('bank',true),eq('status','open')],1000)).forEach(l=>have[l.data.item]=(have[l.data.item]||0)+1);
    const todo=[]; ITEMS.filter(isLotItem).forEach(x=>{ for(let k=have[x.id]||0;k<MKT_N;k++) todo.push(x); });
    for(let i=0;i<todo.length;i+=400) await gfetch(env,`${FS}:commit`,{method:'POST',body:JSON.stringify({writes:todo.slice(i,i+400).map(x=>({update:{name:DOCNAME('lots/'+newUid()+i),fields:fieldsOf({seller:'bank',sellerName:'🏪 Маркет',item:x.id,price:mktPrice(x),status:'open',created:Date.now(),bank:true})}}))})});
    return {n:todo.length}; },
  async stockClear(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const L=await query(env,'lots',[eq('bank',true),eq('status','open')],1000);
    for(let i=0;i<L.length;i+=400) await gfetch(env,`${FS}:commit`,{method:'POST',body:JSON.stringify({writes:L.slice(i,i+400).map(l=>({delete:DOCNAME('lots/'+l.id)}))})});
    return {n:L.length}; },
  async admin(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников'); const who=String(b.uid||'');
    return tx(env,async t=>{ const u=await getUser(t,who);
      if(b.coins) u.coins=Math.max(0,r2(u.coins+(+b.coins)));
      if(b.item){ if(!ITEMS.some(x=>x.id===b.item)) fail('Нет такого предмета'); addItem(u,b.item); }
      if(b.vipDays!=null) u.vipUntil=+b.vipDays<0?0:+b.vipDays>=36500?VIP_FOREVER:Math.max(Date.now(),u.vipUntil||0)+(+b.vipDays)*86400000;
      if(b.prem) u.prem[seasonKey()]=true;
      saveEco(t,who,u); return {target:pub(u)}; }); }
};

// =====================================================================
// TELEGRAM-БОТ: премиум-пропуск за звёзды
// =====================================================================
const tg=(env,method,body)=>fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
const premPrice=env=>Math.max(1,+(env.PREM_PRICE||100));
async function tgSecret(env){ const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('kubital:'+env.BOT_TOKEN)); return [...new Uint8Array(h)].slice(0,16).map(b=>b.toString(16).padStart(2,'0')).join(''); }
const monthName=k=>{ const [,y,m]=k.split('_'); return ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'][+m-1]+' '+y; };
async function onTelegram(env,upd){
  if(upd.pre_checkout_query){ const q=upd.pre_checkout_query, [kind,uid,k]=String(q.invoice_payload||'').split(':');
    const ok=kind==='prem'&&k===seasonKey()&&!!(await getDoc(env,'users/'+uid));
    await tg(env,'answerPreCheckoutQuery',ok?{pre_checkout_query_id:q.id,ok:true}:{pre_checkout_query_id:q.id,ok:false,error_message:'Сезон сменился — откройте игру и нажмите «Купить премиум» ещё раз'});
    return; }
  const m=upd.message; if(!m) return;
  if(m.successful_payment){ const sp=m.successful_payment, [kind,uid,k]=String(sp.invoice_payload||'').split(':'); if(kind!=='prem') return;
    const charge=sp.telegram_payment_charge_id;
    await tx(env,async t=>{ if(await t.get('payments/'+charge)) return; const u=await getUser(t,uid); u.prem[k]=true; saveEco(t,uid,u);
      t.create('payments/'+charge,{uid,season:k,stars:sp.total_amount,tg:m.from&&m.from.id||0,at:Date.now()}); });
    await tg(env,'sendMessage',{chat_id:m.chat.id,text:`✅ Премиум-пропуск на ${monthName(k)} открыт! Вернитесь в игру — нижний ряд наград сезонного пропуска теперь ваш.`});
    return; }
  const text=String(m.text||'');
  if(text.startsWith('/start')){ const uid=text.split(' ')[1]||'';
    if(!/^[A-Za-z0-9]{20,40}$/.test(uid)||!(await getDoc(env,'users/'+uid))){
      await tg(env,'sendMessage',{chat_id:m.chat.id,text:'👋 Это бот игры «Кубитал». Чтобы купить премиум-пропуск, откройте игру → страница «Игры» → «Сезонный пропуск» → «⭐ Купить премиум».'}); return; }
    const u=(await getDoc(env,'users/'+uid)).data, k=seasonKey();
    if(u.prem&&u.prem[k]){ await tg(env,'sendMessage',{chat_id:m.chat.id,text:`У ${u.name||'вас'} уже есть премиум-пропуск на ${monthName(k)} ✅`}); return; }
    await tg(env,'sendInvoice',{chat_id:m.chat.id,title:`Премиум-пропуск · ${monthName(k)}`,
      description:`Аккаунт «${u.name||''}» (@${u.nick||''}). Открывает нижний ряд наград сезонного пропуска до конца месяца: ключи, наборы, кейсы. Монеты и награды — только игровые.`,
      payload:`prem:${uid}:${k}`,provider_token:'',currency:'XTR',prices:[{label:'Премиум-пропуск',amount:premPrice(env)}]});
    return; }
  if(text.startsWith('/help')||text.startsWith('/paysupport')) await tg(env,'sendMessage',{chat_id:m.chat.id,text:'Если оплата прошла, а пропуск не открылся, — напишите создателю игры в личные сообщения на сайте Кубитала и укажите время оплаты.'});
}

// =====================================================================
// ВХОД ЗАПРОСОВ
// =====================================================================
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json; charset=utf-8',...CORS}});
let BOTINFO=null;
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(req.method==='OPTIONS') return new Response(null,{headers:CORS});
    try{
      if(url.pathname==='/tg'&&req.method==='POST'){
        if(req.headers.get('X-Telegram-Bot-Api-Secret-Token')!==await tgSecret(env)) return new Response('forbidden',{status:403});
        await onTelegram(env,await req.json()); return new Response('ok'); }
      if(url.pathname==='/setup'){ // подключить бота к серверу (можно открыть ещё раз — ничего не сломается)
        const r=await tg(env,'setWebhook',{url:`${url.origin}/tg`,secret_token:await tgSecret(env),allowed_updates:['message','pre_checkout_query']});
        await tg(env,'setMyCommands',{commands:[{command:'start',description:'Начать'},{command:'paysupport',description:'Помощь с оплатой'}]});
        return json({webhook:r.ok,info:r.description}); }
      if(url.pathname==='/info'){ if(!BOTINFO){ const r=await tg(env,'getMe',{}); BOTINFO=r.ok?r.result.username:null; } return json({ok:true,bot:BOTINFO,price:premPrice(env),season:seasonKey()}); }
      const m=url.pathname.match(/^\/api\/(\w+)$/);
      if(m&&req.method==='POST'){
        const act=ACTIONS[m[1]]; if(!act) return json({error:'Нет такого действия'},404);
        const uid=await verifyIdToken((req.headers.get('Authorization')||'').replace(/^Bearer /,''));
        const body=await req.json().catch(()=>({}));
        return json(await act(env,uid,body)||{});
      }
      return json({ok:true,name:'Кубитал — сервер'});
    }catch(e){
      if(e instanceof UErr) return json({error:e.message},400);
      console.error(e); return json({error:'Ошибка сервера: '+(e.message||e)},500);
    }
  }
};
