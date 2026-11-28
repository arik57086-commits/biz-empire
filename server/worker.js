// Кубитал — сервер. Собрано автоматически: данные экономики из index.html + server.js
// ====== ДАННЫЕ ПОЛЯ ======
const GROUPS={brown:{c:'#8d6e63',h:500,n:'Еда'},lb:{c:'#29b6f6',h:500,n:'Сервисы'},pink:{c:'#ec407a',h:1000,n:'Мода'},orange:{c:'#fb8c00',h:1000,n:'Фастфуд'},red:{c:'#e53935',h:1500,n:'Развлечения'},yellow:{c:'#fbc02d',h:1500,n:'Связь'},green:{c:'#43a047',h:2000,n:'Технологии'},blue:{c:'#3949ab',h:2000,n:'Финансы'}};
const P=(name,ic,g,price)=>({type:'prop',name,ic,g,price});
const CH=()=>({type:'chance',name:'Шанс',ic:'❓'});
const RAIL=n=>({type:'rail',name:'Авиа «'+n+'»',ic:'✈️',price:2000});
const BASE_CELLS=[
 {type:'start',name:'Старт',ic:'🚀'},
 P('Пекарня «Батон»','🥖','brown',600), CH(), P('Кофейня «Зерно»','☕','brown',600),
 {type:'tax',name:'Налог на прибыль',ic:'💸',amount:2000}, RAIL('Север'),
 P('Почта «Голубь»','🕊️','lb',1000), CH(), P('Такси «Шашка»','🚕','lb',1000), P('Велопрокат «Педаль»','🚲','lb',1200),
 {type:'jail',name:'Тюрьма',ic:'🚔'},
 P('Ателье «Шик»','👗','pink',1400), {type:'util',name:'Энергосеть',ic:'⚡',price:1500}, P('Обувь «Шаг»','👟','pink',1400), P('Часы «Тик-Так»','⌚','pink',1600),
 RAIL('Восток'), P('Пиццерия «Сыр»','🍕','orange',1800), CH(), P('Бургерная «Гриль»','🍔','orange',1800), P('Суши «Вок»','🍣','orange',2000),
 {type:'casino',name:'Казино',ic:'🎰'},
 P('Кинотеатр «Кадр»','🎬','red',2200), CH(), P('Студия «Пиксель»','🎮','red',2200), P('Лейбл «Нота»','🎵','red',2400),
 RAIL('Юг'), P('Связь «Волна»','📶','yellow',2600), P('Облако «Пар»','☁️','yellow',2600), {type:'util',name:'Водоканал',ic:'💧',price:1500}, P('Соцсеть «Сова»','🦉','yellow',2800),
 {type:'gojail',name:'В тюрьму!',ic:'👮'},
 P('Автозавод «Мотор»','🚗','green',3000), P('Электро «Вольт»','🔋','green',3000), CH(), P('Космос «Орбита»','🛰️','green',3200),
 RAIL('Запад'), {type:'stock',name:'Фондовый рынок',ic:'📊'}, P('Биржа «Бык»','📈','blue',3500), {type:'tax',name:'Налог на роскошь',ic:'💎',amount:1000}, P('Банк «Злато»','🏦','blue',4000)
];
BASE_CELLS.forEach(c=>{ if(c.type==='prop'){ const b=Math.max(20,Math.round(c.price*0.07/10)*10); c.rent=[b,b*5,b*14,b*35,b*45,b*55]; c.house=GROUPS[c.g].h; } });
let CELLS=BASE_CELLS.slice();
const VIP_PLANS=[{days:7,price:25},{days:30,price:100}];
const isVip=a=>!!(a&&a.vipUntil>Date.now());
const vipDaysLeft=a=>Math.max(0,Math.ceil((((a&&a.vipUntil)||0)-Date.now())/86400000));
const VIP_FOREVER=Date.UTC(2100,0,1);
// ====== ПРЕДМЕТЫ ======
// Монеты 🪙 — только игровые. Получить их можно, только продав предметы на Маркете.
const RAR=[['Обычный','#29b6f6'],['Редкий','#43a047'],['Эпический','#8e24aa'],['Легендарный','#fb8c00'],['Уникальный','#e53935'],['Мифический','#ff2d95']];
const RAR_ALL=[0,1,2,3,4,5];
const TYPE_N={token:'Фишка',card:'Карточка',case:'Кейс',set:'Набор',key:'Ключ'};
const r2=n=>Math.round(n*100)/100;
const fmtC=n=>'🪙 '+(+n||0).toFixed(2);
const ITEMS=[
 {id:'tok_default',type:'token',n:'Классическая фишка',ic:'',r:0,val:0},
 {id:'tok_anchor',type:'token',n:'Фишка «Якорь»',ic:'⚓',r:0,val:1.2},
 {id:'tok_duck',type:'token',n:'Фишка «Утка»',ic:'🦆',r:0,val:1.4},
 {id:'tok_car',type:'token',n:'Фишка «Спорткар»',ic:'🏎️',r:0,val:1.6},
 {id:'tok_hat',type:'token',n:'Фишка «Цилиндр»',ic:'🎩',r:1,val:2.6},
 {id:'tok_cat',type:'token',n:'Фишка «Кот-инвестор»',ic:'🐱',r:1,val:3},
 {id:'tok_clover',type:'token',n:'Фишка «Клевер удачи»',ic:'🍀',r:1,val:3.8},
 {id:'tok_rocket',type:'token',n:'Фишка «Ракета»',ic:'🚀',r:2,val:5.5},
 {id:'tok_unicorn',type:'token',n:'Фишка «Единорог»',ic:'🦄',r:2,val:6.5},
 {id:'tok_diamond',type:'token',n:'Фишка «Бриллиант»',ic:'💎',r:2,val:7.5},
 {id:'tok_dragon',type:'token',n:'Фишка «Дракон»',ic:'🐉',r:3,val:14},
 {id:'tok_crown',type:'token',n:'Фишка «Корона»',ic:'👑',r:3,val:18},
 {id:'tok_phoenix',type:'token',n:'Фишка «Феникс»',ic:'🔥',r:4,val:38},
 {id:'tok_galaxy',type:'token',n:'Фишка «Галактика»',ic:'🌌',r:5,val:85},
 {id:'key',type:'key',n:'Ключ от кейса',ic:'🔑',r:1,val:3},
 // новогодние фишки (ny): только из кейса «Снегопад» и адвент-календаря
 {id:'tok_ny_tree',type:'token',n:'Фишка «Ёлка»',ic:'🎄',r:0,val:1.5,ny:1},
 {id:'tok_ny_snowman',type:'token',n:'Фишка «Снеговик»',ic:'⛄',r:1,val:3.5,ny:1},
 {id:'tok_ny_deer',type:'token',n:'Фишка «Олень»',ic:'🦌',r:2,val:8,ny:1},
 {id:'tok_ny_santa',type:'token',n:'Фишка «Дед Мороз»',ic:'🎅',r:3,val:16,ny:1},
 {id:'tok_ny_flake',type:'token',n:'Фишка «Снежинка»',ic:'❄️',r:4,val:40,ny:1},
 {id:'tok_ny_salute',type:'token',n:'Фишка «Салют»',ic:'🎆',r:5,val:90,ny:1}
];
// ====== КОЛЛЕКЦИИ КАРТОЧЕК ======
// Каждая коллекция связана с группой клеток поля. Карточка-бренд даёт бонус к аренде
// на ВСЕХ ваших компаниях этой группы (действует лучшая карточка коллекции).
// Бренды: [легендарный, эпический, редкий, редкий, обычный ×4]
const COLLECTIONS={
  brown:{n:'Еда',ic:'🥐',brands:['Starbucks','Nestlé','Danone','Kinder','Lay\'s','Pringles','Oreo','Milka','Coca-Cola','Pepsi','Ferrero','Red Bull']},
  lb:{n:'Сервисы',ic:'🛎️',brands:['Uber','Airbnb','DHL','FedEx','Booking','Glovo','Bolt','Lyft','Amazon','eBay','Expedia','Hilton']},
  pink:{n:'Мода',ic:'👗',brands:['Nike','Adidas','Puma','Lacoste','Zara','H&M','Uniqlo','Reebok','Gucci','New Balance','Louis Vuitton','Chanel']},
  orange:{n:'Фастфуд',ic:'🍔',brands:['McDonald\'s','KFC','Burger King','Subway','Pizza Hut','Domino\'s','Taco Bell','Wendy\'s','Dunkin\'','Popeyes','Chick-fil-A','Five Guys']},
  red:{n:'Развлечения',ic:'🎬',brands:['Netflix','Disney','Sony','Nintendo','Spotify','Twitch','Warner Bros.','Ubisoft','YouTube','TikTok','Marvel','Rockstar Games']},
  yellow:{n:'Связь',ic:'📱',brands:['Apple','Samsung','Google','Huawei','Xiaomi','Nokia','Motorola','Telegram','Vodafone','WhatsApp','Discord','Instagram']},
  green:{n:'Технологии',ic:'🔬',brands:['Tesla','Microsoft','NVIDIA','Intel','AMD','IBM','Dell','HP','Oracle','Lenovo','Adobe','SpaceX']},
  blue:{n:'Финансы',ic:'💰',brands:['Visa','Mastercard','PayPal','Goldman Sachs','Revolut','Klarna','Western Union','American Express','JPMorgan','Wise','Morgan Stanley','BlackRock']},
  rail:{n:'Авиалинии',ic:'✈️',c:'#607d8b',brands:['Emirates','Qatar Airways','Lufthansa','Turkish Airlines','Aeroflot','Ryanair','easyJet','Wizz Air','Delta','Southwest','Etihad','Singapore Airlines']},
  util:{n:'Энергетика',ic:'⚡',c:'#00897b',brands:['Shell','Siemens','BP','TotalEnergies','Chevron','ExxonMobil','Gazprom','Enel','Schneider Electric','Duracell','Vestas','Aramco']}
};
const BRAND_RARITY=[3,2,1,1,0,0,0,0,1,0,4,5]; // 9–10-й: редкий и обычный; 11-й — уникальный, 12-й — мифический
// фирменные цвета табличек [фон, текст] — только цвета и название, без логотипов
const BRAND_STYLE={
 'Starbucks':['#00704A','#fff'],'Nestlé':['#fff','#6b7b8c'],'Danone':['#0a3d91','#fff'],'Kinder':['#fff','#e2001a'],'Lay\'s':['#ffcc00','#d52b1e'],'Pringles':['#d22630','#fff'],'Oreo':['#0057a8','#fff'],'Milka':['#7d69ac','#fff'],
 'Uber':['#000','#fff'],'Airbnb':['#fff','#ff5a5f'],'DHL':['#ffcc00','#d40511'],'FedEx':['#fff','#4d148c'],'Booking':['#003580','#fff'],'Glovo':['#ffc244','#00a082'],'Bolt':['#34d186','#fff'],'Lyft':['#ff00bf','#fff'],
 'Nike':['#111','#fff'],'Adidas':['#fff','#000'],'Puma':['#fff','#111'],'Lacoste':['#fff','#004526'],'Zara':['#fff','#000'],'H&M':['#fff','#e50010'],'Uniqlo':['#ff0000','#fff'],'Reebok':['#fff','#cc0000'],
 'McDonald\'s':['#da291c','#ffc72c'],'KFC':['#a3080c','#fff'],'Burger King':['#f5ebdc','#d62300'],'Subway':['#008c15','#ffc600'],'Pizza Hut':['#fff','#ee3124'],'Domino\'s':['#006491','#fff'],'Taco Bell':['#702082','#fff'],'Wendy\'s':['#fff','#e2203d'],
 'Netflix':['#000','#e50914'],'Disney':['#113ccf','#fff'],'Sony':['#fff','#000'],'Nintendo':['#e60012','#fff'],'Spotify':['#191414','#1db954'],'Twitch':['#9146ff','#fff'],'Warner Bros.':['#0a4fa3','#fff'],'Ubisoft':['#000','#fff'],
 'Apple':['#f5f5f7','#1d1d1f'],'Samsung':['#1428a0','#fff'],'Google':['#fff','#4285f4'],'Huawei':['#fff','#cf0a2c'],'Xiaomi':['#ff6900','#fff'],'Nokia':['#fff','#124191'],'Motorola':['#001428','#fff'],'Telegram':['#2aabee','#fff'],
 'Tesla':['#fff','#cc0000'],'Microsoft':['#fff','#737373'],'NVIDIA':['#000','#76b900'],'Intel':['#0071c5','#fff'],'AMD':['#000','#fff'],'IBM':['#0f62fe','#fff'],'Dell':['#fff','#007db8'],'HP':['#0096d6','#fff'],
 'Visa':['#fff','#1a1f71'],'Mastercard':['#000','#f79e1b'],'PayPal':['#fff','#003087'],'Goldman Sachs':['#7399c6','#fff'],'Revolut':['#000','#fff'],'Klarna':['#ffb3c7','#000'],'Western Union':['#ffdd00','#000'],'American Express':['#006fcf','#fff'],
 'Emirates':['#fff','#d71921'],'Qatar Airways':['#5c0632','#fff'],'Lufthansa':['#05164d','#ffad00'],'Turkish Airlines':['#c70a0c','#fff'],'Aeroflot':['#02458d','#fff'],'Ryanair':['#073590','#f1c933'],'easyJet':['#ff6600','#fff'],'Wizz Air':['#c6007e','#fff'],
 'Coca-Cola':['#e61d2b','#fff'],'Pepsi':['#004b93','#fff'],'Amazon':['#232f3e','#ff9900'],'eBay':['#fff','#e53238'],'Gucci':['#fff','#1b1b1b'],'New Balance':['#fff','#cf0a2c'],
 'Dunkin\'':['#ff671f','#fff'],'Popeyes':['#f26522','#fff'],'YouTube':['#fff','#ff0000'],'TikTok':['#000','#fff'],'Vodafone':['#e60000','#fff'],'WhatsApp':['#25d366','#fff'],
 'Oracle':['#c74634','#fff'],'Lenovo':['#e2231a','#fff'],'JPMorgan':['#fff','#5b4636'],'Wise':['#9fe870','#163300'],'Delta':['#003268','#fff'],'Southwest':['#304cb2','#ffbf27'],
 'Schneider Electric':['#3dcd58','#fff'],'Duracell':['#000','#c9a14a'],
 'Etihad':['#bd8b13','#fff'],'Singapore Airlines':['#1d2f6f','#f5b335'],'Vestas':['#fff','#1e4c9a'],'Aramco':['#00a3e0','#fff'],'Ferrero':['#4a2511','#e8c46a'],'Red Bull':['#001b44','#db0a40'],'Expedia':['#ffc72c','#191e3b'],'Hilton':['#104c97','#fff'],'Louis Vuitton':['#5b3a1e','#e8d3a2'],'Chanel':['#000','#fff'],'Chick-fil-A':['#e51636','#fff'],'Five Guys':['#fff','#d21033'],'Marvel':['#ec1d24','#fff'],'Rockstar Games':['#fcaf17','#000'],'Discord':['#5865f2','#fff'],'Instagram':['#c13584','#fff'],'Adobe':['#fa0f00','#fff'],'SpaceX':['#000','#fff'],'Morgan Stanley':['#fff','#002b51'],'BlackRock':['#000','#fff'],
 'Shell':['#ffd500','#dd1d21'],'Siemens':['#fff','#009999'],'BP':['#fff','#009b3a'],'TotalEnergies':['#fff','#ed0000'],'Chevron':['#0054a4','#fff'],'ExxonMobil':['#fff','#ed1b2f'],'Gazprom':['#0079c2','#fff'],'Enel':['#fff','#008c5a']
};
// имя файла своей картинки в папке logos: «Nike» → logos/nike.png, «McDonald's» → logos/mcdonalds.png
const logoFile=n=>'logos/'+n.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'')+'.png';
// диапазоны по редкости: цена в монетах и бонус к аренде в %
const VAL_RANGE=[[0.1,1],[1,25],[25,50],[50,100],[100,200],[200,400]];
const BONUS_RANGE=[[1,5],[5,15],[15,25],[25,50],[50,65],[65,80]];
const collOf=c=>c.type==='prop'?c.g:c.type;   // ключ коллекции для клетки
const COLL_KEYS=Object.keys(COLLECTIONS);
// «дороговизна» коллекции: по средней цене её клеток на поле (0 — самая дешёвая, 1 — самая дорогая)
const collPrice=k=>{ const cs=BASE_CELLS.filter(c=>['prop','rail','util'].includes(c.type)&&collOf(c)===k); return cs.reduce((s,c)=>s+c.price,0)/cs.length; };
const CP=COLL_KEYS.map(collPrice), CPmin=Math.min(...CP), CPmax=Math.max(...CP);
COLL_KEYS.forEach((k,ki)=>{
  const cl=COLLECTIONS[k], t=(CP[ki]-CPmin)/(CPmax-CPmin);
  cl.brands.forEach((b,bi)=>{
    // первые 8 брендов считаются как раньше (чтобы цены старых карточек не менялись), новые — отдельно
    const r=BRAND_RARITY[bi], base=BRAND_RARITY.slice(0,8), same=bi<8?base.map((x,j)=>x===r?j:-1).filter(j=>j>=0):[bi,bi+100], pos=bi<8?(same.length>1?same.indexOf(bi)/(same.length-1):1):0.7;
    // место внутри диапазона редкости: дорогая коллекция и первый бренд — выше
    const f=same.length>1?(t+(1-pos))/2:t;
    const [v0,v1]=VAL_RANGE[r], [b0,b1]=BONUS_RANGE[r];
    const bonus=Math.round(b0+(b1-b0)*f);
    ITEMS.push({id:`card_${k}_${bi}`,type:'card',n:b,ic:cl.ic,r,val:r2(v0+(v1-v0)*f),col:k in GROUPS?GROUPS[k].c:cl.c,coll:k,bonus,
      desc:`Коллекция «${cl.n}». Наденьте на одну компанию этой коллекции — когда в игре она ваша, аренда за неё +${bonus}%.`});
  });
});
const CARDS=ITEMS.filter(x=>x.type==='card');
const TOKENS=ITEMS.filter(x=>x.type==='token'&&x.val&&!x.ny);
const NY_TOKENS=ITEMS.filter(x=>x.type==='token'&&x.ny);
let NY_ON=false; // новогоднее событие включено (config/site.ny) — меняет выпадение и задания
// odds — шанс редкости внутри (обычный, редкий, эпический, легендарный), %.
// Цена считается автоматически: в среднем открытие возвращает только 80% стоимости.
// названия наборов по коллекциям
const SET_NAMES={brown:'Гурман',lb:'Экспресс',pink:'Подиум',orange:'Драйв',red:'Премьера',yellow:'Сигнал',green:'Импульс',blue:'Капитал',rail:'Взлёт',util:'Вольт'};
const BOXES=[
 {id:'case_emp',type:'case',n:'Кейс «Отблеск»',ic:'✦',r:1,grad:'#ff9a8b,#ff6a88,#ff99ac',desc:'Открывается ключом 🔑. Внутри — фишка для игры.',odds:[60,28,10,1.6,0.32,0.08],pool:TOKENS},
 {id:'case_lux',type:'case',n:'Кейс «Сияние»',ic:'◆',r:2,grad:'#a18cd1,#fbc2eb,#8fd3f4',desc:'Открывается ключом 🔑. Только редкие фишки и лучше.',odds:[0,70,24,4.8,0.96,0.24],pool:TOKENS},
 {id:'case_coll',type:'case',n:'Кейс «Олимп»',ic:'♛',r:3,grad:'#f6d365,#fda085,#f093fb',desc:'Открывается ключом 🔑. Эпические и легендарные бренды из всех коллекций — и шанс на уникальный или мифический.',odds:[0,0,85,12,2.4,0.6],pool:CARDS},
 {id:'case_snow',type:'case',n:'Кейс «Снегопад»',ic:'❄',r:2,ny:1,grad:'#e3f6ff,#9fd8ff,#ffffff',desc:'Открывается ключом 🔑. Новогодние фишки: Ёлка, Снеговик, Олень, Дед Мороз — и редкие Снежинка и Салют.',odds:[50,30,14,4.5,1.2,0.3],pool:NY_TOKENS},
 {id:'set_start',type:'set',n:'Набор Prima',ic:'Ⅰ',r:0,emb:'#3b5bdb',desc:'Без ключа. Бренд из любой коллекции.',odds:[85,13,1.7,0.24,0.05,0.01],pool:CARDS},
 {id:'set_elite',type:'set',n:'Набор Aurum',ic:'Ⅱ',r:1,emb:'#c99700',desc:'Без ключа. Редкий бренд или лучше из любой коллекции.',odds:[0,85,12,2.4,0.48,0.12],pool:CARDS},
 ...Object.entries(COLLECTIONS).map(([k,cl])=>({id:'set_'+k,type:'set',n:`Набор «${SET_NAMES[k]}»`,ic:cl.ic,r:0,coll:k,emb:k in GROUPS?GROUPS[k].c:cl.c,
   desc:`Без ключа. Бренд из коллекции «${cl.n}».`,odds:[80,16,3.3,0.56,0.11,0.03],pool:CARDS.filter(x=>x.coll===k)}))
];
const RETURN_RATE=0.8;
BOXES.forEach(b=>{ b.pool=b.pool.map(x=>x.id); b.val=0; ITEMS.push(b); });
const item=id=>ITEMS.find(x=>x.id===id)||ITEMS[0];
// шанс каждого предмета в кейсе/наборе: шанс его редкости, поделённый поровну между предметами этой редкости
function contentsOf(box){
  const list=box.pool.map(item), present=RAR_ALL.filter(r=>box.odds[r]>0&&list.some(x=>x.r===r));
  const tot=present.reduce((s,r)=>s+box.odds[r],0);
  return list.map(x=>({x,chance:present.includes(x.r)?box.odds[x.r]/tot/list.filter(y=>y.r===x.r).length:0})).filter(e=>e.chance>0);
}
function pickFrom(box){ const c=contentsOf(box); let r=Math.random(); for(const e of c){ r-=e.chance; if(r<=0) return e.x; } return c[c.length-1].x; }
const openCost=box=>r2(box.val+(box.type==='case'?item('key').val:0));
function boxStats(box){ const c=contentsOf(box), cost=openCost(box);
  return {cost, ev:r2(c.reduce((s,e)=>s+e.chance*e.x.val,0)), win:c.reduce((s,e)=>s+(e.x.val>cost?e.chance:0),0)}; }
// цена каждого кейса/набора = средний выигрыш / 80% (для кейса — минус цена ключа, но не меньше 0.3)
BOXES.forEach(b=>{ const ev=contentsOf(b).reduce((s,e)=>s+e.chance*e.x.val,0), need=ev/RETURN_RATE;
  b.val=r2(b.type==='case'?Math.max(0.3,need-item('key').val):need); });
// что выпадает после матча: карточка 80%, набор коллекции 12%, «Старт» 4%, «Элита» 2%, кейс 2%
const DROP_BOX={id:'drop',type:'set',val:0,odds:[90,9,0.8,0.16,0.03,0.01],pool:CARDS.map(x=>x.id)};
const randOf=a=>a[Math.random()*a.length|0];
function pickDrop(){ const r=Math.random()*100;
  if(r<80) return pickFrom(DROP_BOX);
  if(r<92) return item('set_'+randOf(Object.keys(COLLECTIONS)));
  if(r<96) return item('set_start'); if(r<98) return item('set_elite');
  return item(randOf(['case_emp','case_lux','case_coll'])); }
// Таблица выпадения после матча, %: ничего 80 · обычная карточка 10 · кейс/набор 5 · редкая 4 · эпическая 0.8 · легендарная 0.2
const DROP_TABLE=[['none',80],['card0',10],['box',5],['card1',4],['card2',0.8],['card3',0.16],['card4',0.03],['card5',0.01]];
function rollDrop(guaranteed){
  const tab=guaranteed?DROP_TABLE.filter(x=>x[0]!=='none'):DROP_TABLE;
  const tot=tab.reduce((s,x)=>s+x[1],0); let r=Math.random()*tot, k=tab[tab.length-1][0];
  for(const [n,w] of tab){ r-=w; if(r<0){ k=n; break; } }
  if(k==='none') return null;
  if(k==='box'){ if(NY_ON&&Math.random()<0.35) return item('case_snow'); const b=Math.random();
    return b<0.6?item('set_'+randOf(COLL_KEYS)):b<0.8?item('set_start'):b<0.9?item('set_elite'):item(randOf(['case_emp','case_lux','case_coll'])); }
  return randOf(CARDS.filter(x=>x.r===+k.slice(4)));
}
// Надетые карточки: a.slots = {индекс клетки поля: uid предмета}. Карточка надевается на ОДНУ компанию своей коллекции
// и даёт бонус к аренде только этой компании (если в партии она ваша).
function cleanSlots(a){
  a.slots=a.slots||{};
  for(const k in a.slots){ const it=(a.items||[]).find(x=>x.uid===a.slots[k]), x=it&&item(it.id), c=BASE_CELLS[k];
    if(!x||x.type!=='card'||!c||x.coll!==collOf(c)) delete a.slots[k]; }
  return a.slots;
}
// бонусы аккаунта для партии: {индекс клетки: {pct, brand}}
function cardBonuses(a){ const b={}; if(!a) return b; const s=cleanSlots(a);
  for(const k in s){ const x=item(a.items.find(it=>it.uid===s[k]).id); b[k]={pct:x.bonus,brand:x.n}; }
  // полная коллекция: карточки надеты на ВСЕ компании коллекции — каждой ещё +SET_BONUS%
  for(const k of COLL_KEYS){ const cs=collCells(k); if(cs.length&&cs.every(i=>b[i])) cs.forEach(i=>{ b[i].pct+=SET_BONUS; b[i].set=1; }); }
  return b; }
const SET_BONUS=5;
const collCells=k=>BASE_CELLS.map((c,i)=>isOwnable(c)&&collOf(c)===k?i:-1).filter(i=>i>=0);
// сколько коллекций собрано полностью: [{k, n надето, всего}]
const setProgress=a=>{ const s=cleanSlots(a); return COLL_KEYS.map(k=>{ const cs=collCells(k); return {k,on:cs.filter(i=>s[i]).length,all:cs.length}; }); };
// УЛУЧШЕНИЕ: 3 одинаковые карточки → с шансом одна карточка редкостью выше из той же коллекции.
// Шанс подобран так, чтобы в среднем возвращалось 80% стоимости (при неудаче остаётся 1 карточка из трёх).
const UPGRADE_N=3;
function upgradeInfo(x){
  if(x.type!=='card'||x.r>=5) return null;
  const next=CARDS.filter(c=>c.coll===x.coll&&c.r===x.r+1); if(!next.length) return null;
  const avg=next.reduce((s,c)=>s+c.val,0)/next.length;
  const p=Math.max(0.01,Math.min(0.95,(RETURN_RATE*UPGRADE_N-1)*x.val/(avg-x.val)));
  return {next,p};
}
// разложить карточки автоматически: в каждой коллекции самые сильные — на самые дорогие компании
function autoEquip(a){
  const slots={};
  const cards=(a.items||[]).map(it=>({it,x:item(it.id)})).filter(c=>c.x.type==='card').sort((p,q)=>q.x.bonus-p.x.bonus);
  for(const k of COLL_KEYS){
    const cells=BASE_CELLS.map((c,i)=>[c,i]).filter(([c])=>['prop','rail','util'].includes(c.type)&&collOf(c)===k).sort((p,q)=>q[0].price-p[0].price);
    const cs=cards.filter(c=>c.x.coll===k);
    cells.forEach(([c,i],n)=>{ if(cs[n]) slots[i]=cs[n].it.uid; });
  }
  a.slots=slots; return Object.keys(slots).length;
}
// на какие клетки надеты экземпляры карточки id
const slotsOf=(a,id)=>Object.keys(cleanSlots(a)).filter(k=>{ const it=a.items.find(x=>x.uid===a.slots[k]); return it&&it.id===id; }).map(Number);
const PASS=[[2,['xp',100],['key']],[5,['xp',150],['set_start']],[8,['key'],['key']],[12,['xp',200],['set_elite']],[16,['set_start'],['key']],[20,['xp',300],['case_lux']],[25,['key'],['set_elite']],[30,['set_start'],['key']],[40,['xp',500],['case_coll']],[50,['set_elite'],['set_elite']]];
const LOT_FEE=0.1, BANK_CARD=0.5, LOT_MAX=20, LOT_PRICE_MAX=100000;
const isLotItem=x=>!!x&&['card','case','set'].includes(x.type); // эти предметы продают только игроки
const bankPrice=x=>r2(x.val*(isLotItem(x)?BANK_CARD:0.9));
const lotNet=p=>r2(p*(1-LOT_FEE));
const MKT_N=3, MKT_MULT=2;
const mktPrice=x=>Math.max(1,Math.ceil(x.val*MKT_MULT*2)/2);
const WHEEL=[
  {t:'+100 XP',ic:'⭐',c:'#29b6f6',w:30,give:u=>{ u.xp+=100; }},
  {t:'Ключ от кейса',ic:'🔑',c:'#43a047',w:16,give:u=>addItem(u,'key')},
  {t:'+250 XP',ic:'🌟',c:'#5c6bc0',w:18,give:u=>{ u.xp+=250; }},
  {t:'Набор коллекции',ic:'📦',c:'#ff9800',w:14,give:u=>addItem(u,'set_'+randOf(COLL_KEYS))},
  {t:'+500 XP',ic:'💫',c:'#8e24aa',w:9,give:u=>{ u.xp+=500; }},
  {t:'Набор Prima',ic:'Ⅰ',c:'#3b5bdb',w:8,give:u=>addItem(u,'set_start')},
  {t:'Набор Aurum',ic:'Ⅱ',c:'#c99700',w:4,give:u=>addItem(u,'set_elite')},
  {t:'Эпическая карточка',ic:'💎',c:'#e53935',w:1,give:u=>{ const c=randOf(CARDS.filter(x=>x.r===2)); addItem(u,c.id); return c.n; }}
];
// адвент-календарь 1–31 декабря (новогоднее событие): одна награда в день
const ADVENT=[['xp',100],['key'],['xp',150],['tok_ny_tree'],['set_start'],['xp',200],['case_snow'],
  ['key'],['xp',150],['tok_ny_snowman'],['xp',200],['set_start'],['key'],['case_snow'],
  ['xp',250],['set_elite'],['key'],['xp',200],['tok_ny_deer'],['set_start'],['case_snow'],
  ['xp',300],['key'],['set_elite'],['case_snow'],['xp',300],['key'],['case_snow'],['set_elite'],['key'],['tok_ny_santa']];
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
const ECO=['coins','items','vipUntil','prem','srv','rating','matches','wins','lb'];
const SITE='https://arik57086-commits.github.io/biz-empire/';
class UErr extends Error{}            // ошибка, которую можно показать игроку
const fail=m=>{ throw new UErr(m); };

// ---------- время по Москве (как в игре) ----------
const mskDate=(d=new Date())=>new Date(d.getTime()+3*3600000);
const today=()=>mskDate().toISOString().slice(0,10);
const pad2=n=>String(n).padStart(2,'0');
const seasonKey=(d=new Date())=>{ const m=mskDate(d); return `sp_${m.getUTCFullYear()}_${pad2(m.getUTCMonth()+1)}`; };
// неделя и турниры — как в игре (по Москве)
const weekKey=(d=new Date())=>{ const m=mskDate(d), t=new Date(Date.UTC(m.getUTCFullYear(),m.getUTCMonth(),m.getUTCDate())); const day=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day);
  const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1)); return t.getUTCFullYear()+'-'+Math.ceil(((t-y0)/86400000+1)/7); };
const weekendKey=()=>'wt_'+weekKey().replace('-','_');
const isWeekendMsk=()=>[0,6].includes(mskDate().getUTCDay());
const nyTourKeyS=()=>{ const m=mskDate(); return 'nyt_'+(m.getUTCMonth()===11?m.getUTCFullYear()+1:m.getUTCFullYear()); };
const nyTourOnS=()=>{ const m=mskDate(), mo=m.getUTCMonth(), d=m.getUTCDate(); return (mo===11&&d===31)||(mo===0&&d===1); };
const lbAddS=(u,k,v)=>{ u.lb=u.lb||{}; u.lb[k]=(u.lb[k]||u[k]||0)+v; };
// счётчики для статистики создателя: stats/d_ГГГГ-ММ-ДД (необязательные — ошибка не мешает игре)
async function bump(env,fields){ try{ await gfetch(env,`${FS}:commit`,{method:'POST',body:JSON.stringify({writes:[{transform:{document:DOCNAME('stats/d_'+today()),fieldTransforms:Object.entries(fields).map(([f,v])=>({fieldPath:f,increment:Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}}))}}]})}); }catch(e){ console.error('bump',e); } }

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
const ecoOf=u=>({coins:r2(u.coins||0),items:u.items||[],vipUntil:u.vipUntil||0,prem:u.prem||{},srv:u.srv||{},rating:u.rating==null?1000:u.rating,matches:u.matches||0,wins:u.wins||0,lb:u.lb||{}});
const saveEco=(t,uid,u)=>t.update('users/'+uid,ecoOf(u),ECO);
async function getUser(t,uid){ const u=await t.get('users/'+uid); if(!u) fail('Профиль не найден'); u.srv=u.srv||{}; u.prem=u.prem||{}; u.lb=u.lb||{}; u.items=u.items||[]; u.coins=r2(u.coins||0); return u; }
const pub=u=>({coins:r2(u.coins||0),items:u.items||[],vipUntil:u.vipUntil||0,prem:u.prem||{},rating:u.rating==null?1000:u.rating,matches:u.matches||0,wins:u.wins||0,lb:u.lb||{}});

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
    if(x.type==='case') takeItem(u,'key'); takeItem(u,x.id); const got=pickFrom(x); addItem(u,got.id); saveEco(t,uid,u); return {got:got.id,user:pub(u)}; }).then(async res=>{ await bump(env,{opens:1}); return res; }); },
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
    if(((u.lb&&u.lb[k])||u[k]||0)<lv[0]) fail('Не хватает очков сезона'); if(row==='v'&&!u.prem[k]) fail('Нижний ряд — с премиум-пропуском');
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
    const raw=await gfetch(env,`${FS}/rooms/${rid}`), born=raw&&raw.createTime?Date.parse(raw.createTime):0; // время создания комнаты ставит сама база — подделать нельзя
    return tx(env,async t=>{ const room=await t.get('rooms/'+rid); if(!room||room.status!=='over'||!room.state) fail('Партия ещё не закончилась');
      const st=JSON.parse(room.state), r=(st.results||[]).find(x=>x.uid===uid); if(!r) fail('Вы не играли в этой партии');
      if(await t.get(`claims/${rid}_${uid}`)) fail('Награда уже получена');
      // проверка, что матч правда был: игроки из комнаты, партия шла не меньше 4 минут и было достаточно ходов
      const humans=(st.players||[]).filter(p=>p.uid&&!p.bot).length, uids=room.uids||[];
      const real=humans>=2&&(st.results||[]).every(x=>uids.includes(x.uid))&&(st.players||[]).every(p=>!p.uid||uids.includes(p.uid))
        &&(st.turnNo||0)>=humans*3&&born&&Date.now()-born>=4*60000;
      if(!real){ t.create(`claims/${rid}_${uid}`,{uid,rid,drop:null,short:true,at:Date.now()}); return {drop:null,short:true}; }
      const u=await getUser(t,uid); let drop=null; const ranked=st.mode==='ranked', win=!!r.win&&!r.noReward;
      if(!r.noReward){ const it=rollDrop(ranked&&(u.vipUntil||0)>Date.now()); if(it){ drop=it.id; addItem(u,drop); } }
      // итоги матча считает сервер: матчи, победы, рейтинг, очки сезона/турниров/режимов
      u.matches=(u.matches||0)+1; if(win) u.wins=(u.wins||0)+1;
      if(ranked) u.rating=Math.max(0,(u.rating==null?1000:u.rating)+(win?25:-15));
      if(!r.noReward){ lbAddS(u,seasonKey(),win?3:1); if(win&&st.mode) lbAddS(u,'mw_'+st.mode,1);
        if(isWeekendMsk()) lbAddS(u,weekendKey(),win?3:1);
        if(NY_ON&&nyTourOnS()) lbAddS(u,nyTourKeyS(),win?3:1); }
      // «Приведи друга»: после 3 матчей новичка оба получают кейс «Сияние» и ключ
      let refGift=false;
      if(u.srv.ref&&!u.srv.refDone&&u.matches>=3){ const f=await t.get('users/'+u.srv.ref);
        if(f){ f.srv=f.srv||{}; f.items=f.items||[]; addItem(f,'case_lux'); addItem(f,'key'); f.srv.refCount=(f.srv.refCount||0)+1; f.prem=f.prem||{}; f.lb=f.lb||{}; saveEco(t,u.srv.ref,f); }
        addItem(u,'case_lux'); addItem(u,'key'); u.srv.refDone=true; refGift=true; }
      t.create(`claims/${rid}_${uid}`,{uid,rid,drop,at:Date.now()}); saveEco(t,uid,u); return {drop,refGift,user:pub(u)}; }).then(async res=>{ await bump(env,{matches:1}); return res; }); },
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
      return {item:l.item,price:l.price,seller:l.sellerName||'',user:pub(u)}; }).then(async res=>{ await bump(env,{sales:1,salesCoins:res.price}); return res; }); },
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
  // ---- промокоды: создатель создаёт, игрок вводит один раз ----
  async promoCreate(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const code=String(b.code||'').toUpperCase().trim(); if(!/^[A-Z0-9]{3,20}$/.test(code)) fail('Код — 3–20 латинских букв или цифр');
    const items=(b.items||[]).map(String).filter(id=>ITEMS.some(x=>x.id===id&&x.id!=='tok_default')).slice(0,6), coins=Math.max(0,Math.min(1000,r2(+b.coins||0))), xp=Math.max(0,Math.min(5000,Math.floor(+b.xp||0)));
    const max=Math.max(1,Math.min(100000,Math.floor(+b.max||1))), days=Math.max(1,Math.min(365,Math.floor(+b.days||30)));
    if(!items.length&&!coins&&!xp) fail('Добавьте награду: предмет, монеты или опыт');
    return tx(env,async t=>{ if(await t.get('promos/'+code)) fail('Такой код уже есть'); t.create('promos/'+code,{code,items,coins,xp,max,used:0,until:Date.now()+days*86400000,by:uid,created:Date.now()}); return {code}; }); },
  async promoDelete(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников'); const code=String(b.code||'').toUpperCase();
    return tx(env,async t=>{ if(!await t.get('promos/'+code)) fail('Нет такого кода'); t.del('promos/'+code); return {code}; }); },
  async promoUse(env,uid,b){ const code=String(b.code||'').toUpperCase().trim(); if(!/^[A-Z0-9]{3,20}$/.test(code)) fail('Нет такого промокода');
    const res=await tx(env,async t=>{ const p=await t.get('promos/'+code); if(!p) fail('Нет такого промокода'); if(p.until<Date.now()) fail('Срок промокода закончился'); if((p.used||0)>=p.max) fail('Промокод уже использовали все');
      const u=await getUser(t,uid); const used=u.srv.promos=u.srv.promos||[]; if(used.includes(code)) fail('Вы уже вводили этот промокод');
      used.push(code); (p.items||[]).forEach(id=>addItem(u,id)); u.coins=r2(u.coins+(p.coins||0)); saveEco(t,uid,u); t.update('promos/'+code,{used:(p.used||0)+1},['used']);
      return {items:p.items||[],coins:p.coins||0,xp:p.xp||0,user:pub(u)}; });
    await bump(env,{promos:1}); return res; },
  // ---- «Приведи друга»: новичок (аккаунт младше 7 дней) один раз указывает ник того, кто его позвал ----
  async refSet(env,uid,b){ const nick=String(b.nick||'').toLowerCase().replace(/^@/,'').trim(); if(!/^[a-z0-9_]{3,16}$/.test(nick)) fail('Нет игрока с таким ником');
    const n=await getDoc(env,'nicks/'+nick); if(!n||!n.data.uid) fail('Нет игрока с таким ником'); const ref=n.data.uid; if(ref===uid) fail('Нельзя указать себя');
    return tx(env,async t=>{ const u=await getUser(t,uid); if(u.srv.ref) fail('Вы уже указали, кто вас позвал'); if(u.created&&Date.now()-u.created>7*86400000) fail('Указать друга можно только в первые 7 дней');
      if((u.matches||0)>=3) fail('Указать друга можно до 3-го матча'); u.srv.ref=ref; u.srv.refName=nick; saveEco(t,uid,u); return {ref:nick,user:pub(u)}; }); },
  // ---- статистика для создателя: счётчики за 14 дней ----
  async stats(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const days=[]; for(let k=0;k<14;k++){ const d=new Date(mskDate().getTime()-k*86400000).toISOString().slice(0,10); const s=await getDoc(env,'stats/d_'+d); days.push({d,...((s&&s.data)||{})}); }
    return {days}; },
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
      saveEco(t,who,u); return {target:pub(u)}; }); },
  // ---- Telegram: привязать чат к аккаунту (одноразовый код в ссылке t.me/бот?start=L…) ----
  async tgLink(env,uid){ const code=(newUid()+newUid()).replace(/[^a-z0-9]/g,'').slice(0,24);
    await tx(env,async t=>{ t.create('tglink/'+code,{uid,exp:Date.now()+20*60000}); return 1; });
    return {code,bot:await botName(env)}; },
  async tgOff(env,uid){ return tx(env,async t=>{ const u=await getUser(t,uid); delete u.srv.tg; saveEco(t,uid,u); return {ok:true}; }); },
  // «Твой ход»: ведущий партии зовёт в Telegram игрока, который не в игре (не чаще раза в 3 минуты)
  async ping(env,uid,b){ const rid=String(b.rid||''), to=String(b.to||''); if(!/^[A-Za-z0-9]{10,40}$/.test(rid)||!to||to===uid) fail('Нет такой партии');
    const room=await getDoc(env,'rooms/'+rid); if(!room||room.data.status!=='playing') fail('Партия не идёт');
    if(room.data.host!==uid||!(room.data.uids||[]).includes(to)) fail('Звать может только ведущий партии');
    const chat=await tx(env,async t=>{ const u=await getUser(t,to); const g=u.srv.tg; if(!g||!g.chat) return null; if(g.last&&Date.now()-g.last<180000) return null;
      g.last=Date.now(); saveEco(t,to,u); return g.chat; });
    if(!chat) return {sent:false};
    const r=await tg(env,'sendMessage',{chat_id:chat,text:`🎲 Твой ход в Кубитале! ${room.data.hostName||'Соперники'} и остальные ждут — у тебя 90 секунд, потом ход сделается сам.`,reply_markup:{inline_keyboard:[[{text:'🎲 Вернуться в игру',web_app:{url:SITE}}]]}});
    return {sent:!!r.ok}; },
  // ---- рассылка создателя всем, кто писал боту (по 25 за вызов; next — с кого продолжать) ----
  async broadcast(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const text=String(b.text||'').trim().slice(0,1500); if(!text) fail('Напишите текст рассылки');
    const sq={from:[{collectionId:'tgchats'}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:25};
    if(b.after) sq.startAt={values:[{referenceValue:DOCNAME('tgchats/'+String(b.after).replace(/[^0-9-]/g,''))}],before:false};
    const r=await gfetch(env,`${FS}:runQuery`,{method:'POST',body:JSON.stringify({structuredQuery:sq})});
    const L=(r||[]).filter(x=>x.document).map(x=>({id:x.document.name.split('/').pop(),data:objOf(x.document)}));
    const res=await Promise.all(L.map(c=>tg(env,'sendMessage',{chat_id:c.data.chat,text:'📣 '+text,reply_markup:{inline_keyboard:[[{text:'🎲 Играть',web_app:{url:SITE}}]]}}).catch(()=>({ok:false}))));
    return {sent:res.filter(x=>x.ok).length,fail:res.filter(x=>!x.ok).length,next:L.length===25?L[L.length-1].id:null}; },
  async tgCount(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    const r=await gfetch(env,`${FS}:runAggregationQuery`,{method:'POST',body:JSON.stringify({structuredAggregationQuery:{structuredQuery:{from:[{collectionId:'tgchats'}]},aggregations:[{alias:'n',count:{}}]}})});
    return {n:+(((r||[])[0]||{}).result||{aggregateFields:{n:{integerValue:0}}}).aggregateFields.n.integerValue||0}; },
  // ---- ТУРНИР на 8: хранится в config/site.tour, менять его может только сервер ----
  async tourCreate(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников'); const name=String(b.name||'').trim().slice(0,40)||'Турнир';
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}; if(c.tour&&['reg','play'].includes(c.tour.status)) fail('Турнир уже идёт — сначала завершите или отмените его');
      const tour={id:newUid(),name,status:'reg',players:[],groups:{},rooms:{},win:{},created:Date.now()}; t.update('config/site',{tour},['tour']); return {tour}; }); },
  async tourJoin(env,uid,b){ return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour; if(!tr||tr.status!=='reg') fail('Регистрация закрыта');
      const u=await getUser(t,uid); if(u.banned) fail('Вы заблокированы');
      if(b.leave){ tr.players=tr.players.filter(p=>p.uid!==uid); }
      else { if(tr.players.some(p=>p.uid===uid)) fail('Вы уже участвуете'); if(tr.players.length>=TOUR_MAX) fail('Мест нет — уже 8 участников'); tr.players.push({uid,name:String(u.name||'Игрок').slice(0,30)}); }
      t.update('config/site',{tour:tr},['tour']); return {n:tr.players.length}; }); },
  async tourStart(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour; if(!tr||tr.status!=='reg') fail('Нет турнира с открытой регистрацией');
      const P=tr.players.map(p=>p.uid).sort(()=>Math.random()-0.5); if(P.length<2) fail('Нужно хотя бы 2 участника');
      if(P.length>=5){ const h=Math.ceil(P.length/2); tr.groups={s0:P.slice(0,h),s1:P.slice(h)}; } else tr.groups={f:P};
      tr.status='play'; tr.rooms={}; tr.win={}; tr.started=Date.now(); t.update('config/site',{tour:tr},['tour']); return {tour:tr}; }); },
  async tourCancel(env,uid){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников');
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour; if(!tr) fail('Турнира нет'); tr.status=tr.status==='done'?'closed':'cancel'; t.update('config/site',{tour:tr},['tour']); return {ok:true}; }); },
  // хозяин группы сообщает, в какой комнате играет его группа
  async tourRoom(env,uid,b){ const stage=String(b.stage||''), rid=String(b.rid||''); const room=await getDoc(env,'rooms/'+rid);
    if(!room||room.data.host!==uid||!room.data.tour||room.data.tour.stage!==stage) fail('Нет такой комнаты');
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour; if(!tr||tr.status!=='play'||room.data.tour.id!==tr.id) fail('Турнир не идёт');
      const g=tr.groups[stage]; if(!g||g[0]!==uid) fail('Комнату создаёт первый игрок группы'); if(tr.win[stage]) fail('Эта игра уже сыграна');
      tr.rooms[stage]=rid; t.update('config/site',{tour:tr},['tour']); return {ok:true}; }); },
  // итог игры турнира: победитель проходит дальше (вызывает любой участник после конца партии)
  async tourResult(env,uid,b){ const rid=String(b.rid||''); const room=await getDoc(env,'rooms/'+rid); if(!room||room.data.status!=='over'||!room.data.state||!room.data.tour) fail('Партия не закончилась');
    const st=JSON.parse(room.data.state), w=st.players&&st.players[st.winner]; if(!w||!w.uid) fail('Нет победителя');
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour, stage=room.data.tour.stage; if(!tr||tr.status!=='play'||room.data.tour.id!==tr.id) fail('Турнир не идёт');
      const g=tr.groups[stage]; if(!g||!g.includes(w.uid)||!g.includes(uid)||tr.rooms[stage]!==rid) fail('Это не игра турнира'); if(tr.win[stage]) return {done:true};
      return tourAdvance(t,tr,stage,w.uid); }); },
  // создатель может сам назначить победителя игры (если кто-то не пришёл)
  async tourWin(env,uid,b){ if(!await isAdm(env,uid)) fail('Только для создателя и помощников'); const stage=String(b.stage||''), w=String(b.uid||'');
    return tx(env,async t=>{ const c=(await t.get('config/site'))||{}, tr=c.tour; if(!tr||tr.status!=='play') fail('Турнир не идёт');
      const g=tr.groups[stage]; if(!g||!g.includes(w)) fail('Этого игрока нет в группе'); if(tr.win[stage]) fail('Победитель уже есть');
      return tourAdvance(t,tr,stage,w); }); }
};
const TOUR_MAX=8;
async function tourAdvance(t,tr,stage,w){
  tr.win[stage]=w;
  if(stage!=='f'&&tr.win.s0&&tr.win.s1) tr.groups.f=[tr.win.s0,tr.win.s1];
  if(stage==='f'){ tr.status='done'; tr.champ=w; tr.ended=Date.now();
    const u=await getUser(t,w); addItem(u,'case_lux'); addItem(u,'key'); addItem(u,'key'); saveEco(t,w,u);
    const second=(tr.groups.f||[]).find(x=>x!==w); if(second){ const s=await getUser(t,second); addItem(s,'key'); saveEco(t,second,s); } }
  t.update('config/site',{tour:tr},['tour']); return {tour:tr};
}
async function botName(env){ if(!BOTINFO){ const r=await tg(env,'getMe',{}); BOTINFO=r.ok?r.result.username:null; } return BOTINFO; }
// записать документ целиком без проверок (для списка чатов бота)
async function upsert(env,path,data){ try{ await gfetch(env,`${FS}:commit`,{method:'POST',body:JSON.stringify({writes:[{update:{name:DOCNAME(path),fields:fieldsOf(data)}}]})}); }catch(e){ console.error('upsert',e); } }

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
    await bump(env,{prem:1,stars:sp.total_amount||0});
    await tg(env,'sendMessage',{chat_id:m.chat.id,text:`✅ Премиум-пропуск на ${monthName(k)} открыт! Вернитесь в игру — нижний ряд наград сезонного пропуска теперь ваш.`,reply_markup:{inline_keyboard:[[{text:'🎲 Открыть игру',web_app:{url:SITE}}]]}});
    return; }
  const text=String(m.text||'');
  if(m.chat&&m.chat.type==='private') await upsert(env,'tgchats/'+m.chat.id,{chat:m.chat.id,at:Date.now()}); // для рассылки создателя
  // привязка уведомлений «твой ход»: /start L<код из игры>
  const lm=text.match(/^\/start L([a-z0-9]{8,30})$/);
  if(lm){ const who=await tx(env,async t=>{ const l=await t.get('tglink/'+lm[1]); if(!l||l.exp<Date.now()) return null;
      const u=await getUser(t,l.uid); u.srv.tg={chat:m.chat.id,at:Date.now()}; saveEco(t,l.uid,u); t.del('tglink/'+lm[1]); return u.name||'игрок'; });
    await tg(env,'sendMessage',{chat_id:m.chat.id,text:who?`🔔 Готово, ${who}! Когда в игре по сети настанет твой ход, а тебя не будет в игре, я напишу сюда.`:'Ссылка устарела — нажмите «🔔 Уведомления в Telegram» в игре ещё раз.',reply_markup:{inline_keyboard:[[{text:'🎲 Играть',web_app:{url:SITE}}]]}});
    return; }
  if(text.startsWith('/start')){ const uid=text.split(' ')[1]||'';
    if(!/^[A-Za-z0-9]{20,40}$/.test(uid)||!(await getDoc(env,'users/'+uid))){
      await tg(env,'sendMessage',{chat_id:m.chat.id,text:'👋 Это бот игры «Кубитал» — экономическая игра с друзьями. Нажмите «🎲 Играть», чтобы открыть игру прямо в Telegram.\n\nПремиум-пропуск покупается из игры: «Игры» → «Сезонный пропуск» → «⭐ Купить премиум».',reply_markup:{inline_keyboard:[[{text:'🎲 Играть',web_app:{url:SITE}}]]}}); return; }
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
        await tg(env,'setChatMenuButton',{menu_button:{type:'web_app',text:'🎲 Играть',web_app:{url:SITE}}});
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
