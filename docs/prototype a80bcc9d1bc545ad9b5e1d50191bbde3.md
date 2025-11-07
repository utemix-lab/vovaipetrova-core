---
title: prototype
slug: prototype-a80bcc
summary: '# prototype'
tags: []
machine_tags: []
---
# prototype

### Статический прототип UI

<aside>
✅

Памятка: перед пушем

</aside>

- [ ]  Скопировать/обновить файлы в репозитории по тем же путям: prototype/index.html, styles.css, app.js, data/*.json, assets/placeholders/*.png
- [ ]  Проверить, что .github/workflows/pages.yml на месте и триггер — вручную (workflow_dispatch)
- [ ]  Сделать commit и push в main
- [ ]  В GitHub → Actions запустить «Deploy Pages (prototype)» вручную
- [ ]  Открыть ссылку из Settings → Pages и проверить сценарии

<aside>
🕒

Последние обновления файлов

</aside>

- index.html — обновлено: November 4, 2025
- styles.css — обновлено: November 4, 2025
- app.js — обновлено: November 4, 2025
- data/roles.json — обновлено: November 4, 2025
- data/menu.json — обновлено: November 4, 2025
- data/services.json — обновлено: November 4, 2025

<aside>
ℹ️

Примечание

</aside>

- Это «место правды». Любые правки сначала в этой странице, затем перенос в репозиторий.
- Если вносил(а) изменения в репозитории, пометь их здесь, чтобы сохранить синхронизацию.

Зеркало папки /prototype для синхронизации с репозиторием. Скопируй эти файлы в репозиторий в папку prototype/.

---

### index.html

```html

```

<!doctype html>

<html lang="ru">

<head>

<meta charset="utf-8">

<meta name="viewport" content="width=device-width,initial-scale=1">

<title>Vova & Petrova — прототип</title>

<link rel="stylesheet" href="./styles.css">

</head>

<body class="theme-light" data-role="novice">

<header id="app-header"></header>

<main id="app-main">

<section class="hero">

<h1>Игровая навигация по ролям</h1>

<p>Выберите роль и начните с быстрых маршрутов</p>

<div id="hero-cta"></div>

</section>

<section class="services">

<h2>Услуги</h2>

<div id="services-grid" class="services-grid"></div>

</section>

</main>

<aside id="artifacts-drawer" class="drawer" aria-hidden="true"></aside>

<script type="module" src="./app.js"></script>

</body>

</html>

```
---
### styles.css
```

:root{--bg:#0b0b0c;--fg:#eaeaea;--muted:#a0a0a0;--brand:#4fd1c5}

body{margin:0;font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto;background:#111;color:#eee}

.theme-light{background:#0f1115;color:#e6e6e6}

.theme-brand{background:#0d1313;color:#e6fffb}

.theme-dark{background:#0b0b0c;color:#ddd}

header{position:sticky;top:0;background:rgba(20,22,28,.8);backdrop-filter:saturate(140%) blur(8px);border-bottom:1px solid #222}

header .row{display:flex;align-items:center;gap:16px;padding:10px 16px}

.logo{font-weight:700;letter-spacing:.4px}

.search{flex:1}

.search input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a2a;background:#15171d;color:#eee}

.roles{display:flex;gap:8px}

.role{padding:6px 10px;border-radius:8px;border:1px solid #2a2a2a;background:#14161c;color:#ddd;cursor:pointer}

.role.active{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand) inset}

.nav{display:flex;gap:14px;padding:6px 16px;border-top:1px solid #1c1c1c}

.nav a{color:#ccc;text-decoration:none;padding:6px 8px;border-radius:6px}

.nav a.active{background:#1b1f2a;color:#fff}

.hero{padding:32px 16px 8px}

.hero h1{margin:0 0 6px}

.hero-cta{display:flex;gap:8px;margin-top:8px}

.btn{padding:8px 12px;border-radius:8px;border:1px solid #2a2a2a;background:#14161c;color:#ddd;cursor:pointer}

.btn.primary{border-color:var(--brand);color:#0a1010;background:#0e1414}

.services{padding:8px 16px 24px}

.services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}

.card{border:1px solid #252525;border-radius:12px;background:#14161c;padding:12px;display:flex;flex-direction:column;gap:8px}

.card h3{margin:0 0 4px;font-size:16px}

.tags{display:flex;flex-wrap:wrap;gap:6px}

.tag{font-size:12px;color:#9ad5cf;background:#0e1414;border:1px solid #1f3a37;border-radius:999px;padding:2px 8px}

.card .row{display:flex;gap:8px}

.drawer{position:fixed;top:0;right:-420px;width:380px;max-width:90vw;height:100vh;background:#101319;border-left:1px solid #232323;box-shadow:-8px 0 24px rgba(0,0,0,.35);transition:right .25s ease;display:flex;flex-direction:column}

.[drawer.open](http://drawer.open){right:0}

.drawer header{border-bottom:1px solid #202020;background:#12161f}

.drawer .body{padding:12px;display:flex;flex-direction:column;gap:10px;overflow:auto}

.item{display:flex;gap:10px;border:1px solid #242424;border-radius:10px;padding:8px;background:#141820}

.item img{width:56px;height:56px;border-radius:8px;object-fit:cover;background:#0e1218}

.item .meta{flex:1}

.note{width:100%;padding:6px 8px;border-radius:8px;border:1px solid #2a2a2a;background:#0f131a;color:#ddd}

.drawer .footer{margin-top:auto;padding:12px;border-top:1px solid #202020;display:flex;gap:8px}

@media(max-width:720px){.nav{overflow:auto}}

```
---
### app.js
```

async function loadJSON(path){const r=await fetch(path);return r.json()}

const els={header:document.getElementById('app-header'),heroCta:document.getElementById('hero-cta'),servicesGrid:document.getElementById('services-grid'),drawer:document.getElementById('artifacts-drawer')};

let state={role:'novice',roles:[],menu:[],services:[],artifacts:{items:[]}};

function h(tag,attrs={},...kids){const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{})){if(k==='class')el.className=v;else if(k.startsWith('on')&&typeof v==='function')el.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='href'){el.setAttribute('href',v);el.role='link';el.tabIndex=0;}else el.setAttribute(k,v);}for(const kid of kids)el.append(kid);return el}

function renderHeader(){const role=state.role;const rolesRow=h('div',{class:'roles'},...[state.roles.map](http://state.roles.map)(r=>h('button',{class:'role'+([r.id](http://r.id)===role?' active':''),onClick:()=>setRole([r.id](http://r.id))},`${r.emoji} ${r.label}`)));const search=h('div',{class:'search'},h('input',{placeholder:'Поиск по темам, действиям, технологиям…'}));const top=h('div',{class:'row'},h('div',{class:'logo'},'V&P'),search,rolesRow,h('button',{class:'btn',onClick:toggleDrawer},`🧺 Артефакты ${state.artifacts.items.length}`));const nav=h('nav',{class:'nav'},...[state.menu.map](http://state.menu.map)(i=>h('a',{href:i.route,class:i.route==='/services'&&role==='client'?'active':''},i.title)));els.header.replaceChildren(top,nav)}

function renderHero(){const r=state.roles.find(x=>[x.id](http://x.id)===state.role);const ctas=(r?.cta||[]).map((label,i)=>h('button',{class:'btn'+(i===0?' primary':'')},label));const wrap=h('div',{class:'hero-cta'},...ctas);els.heroCta.replaceChildren(wrap)}

function renderServices(){els.servicesGrid.replaceChildren(...[state.services.map](http://state.services.map)(s=>{const tags=h('div',{class:'tags'},...(s.tags||[]).map(t=>h('span',{class:'tag'},t)));return h('div',{class:'card'},h('img',{src:s.thumb,alt:s.title,style:'width:100%;height:120px;object-fit:cover;border-radius:8px;background:#0b0f15'}),h('h3',{},s.title),h('p',{style:'margin:0;color:#bbb'},s.description),tags,h('div',{class:'row'},h('button',{class:'btn',onClick:()=>addArtifact(s)},'Добавить в артефакты'),h('button',{class:'btn'},'Подробнее')))}))}

function renderDrawer(){const head=h('header',{},h('div',{class:'row'},h('strong',{},'Артефакты'),h('span',{style:'flex:1'},''),h('button',{class:'btn',onClick:toggleDrawer},'Закрыть')));const body=h('div',{class:'body'},...[state.artifacts.items.map](http://state.artifacts.items.map)(it=>h('div',{class:'item'},h('img',{src:it.thumb,alt:it.title}),h('div',{class:'meta'},h('div',{},it.title),h('div',{style:'color:#9aa'},it.meta||'')),h('div',{style:'width:100%'},h('textarea',{class:'note',placeholder:'Заметка к артефакту',oninput:e=>{it.note=[e.target](http://e.target).value;saveArtifacts();}},it.note||'')),h('button',{class:'btn',onClick:()=>removeArtifact([it.id](http://it.id))},'Удалить'))));const footer=h('div',{class:'footer'},h('button',{class:'btn primary',onClick:()=>alert('Черновик заявки сформирован')},'Сформировать черновик заявки'));els.drawer.replaceChildren(head,body,footer)}

function addArtifact(svc){if(state.artifacts.items.find(x=>[x.id](http://x.id)===[svc.id](http://svc.id)))return;state.artifacts.items.push({id:[svc.id](http://svc.id),type:'service',title:svc.title,thumb:svc.thumb,meta:'Услуга',note:''});saveArtifacts();renderHeader();renderDrawer();if(!els.drawer.classList.contains('open'))toggleDrawer()}

function removeArtifact(id){state.artifacts.items=state.artifacts.items.filter(x=>[x.id](http://x.id)!==id);saveArtifacts();renderHeader();renderDrawer()}

function toggleDrawer(){els.drawer.classList.toggle('open');els.drawer.setAttribute('aria-hidden',els.drawer.classList.contains('open')?'false':'true')}

function setRole(roleId){state.role=roleId;document.body.dataset.role=roleId;const theme=state.roles.find(r=>[r.id](http://r.id)===roleId)?.theme;document.body.className=theme==='dark'?'theme-dark':(theme==='brand'?'theme-brand':'theme-light');renderHeader();renderHero()}

function saveArtifacts(){localStorage.setItem('vp_artifacts',JSON.stringify(state.artifacts))}

function loadArtifacts(){try{state.artifacts=JSON.parse(localStorage.getItem('vp_artifacts'))||{items:[]}}catch{state.artifacts={items:[]}}}

async function init(){const [roles,menu,services]=await Promise.all([loadJSON('./data/roles.json'),loadJSON('./data/menu.json'),loadJSON('./data/services.json')]);state.roles=roles;[state.menu](http://state.menu)=menu;[state.services](http://state.services)=services;loadArtifacts();renderHeader();renderHero();renderServices();renderDrawer()}init();

```
---
### data/roles.json
```

[

{"id":"novice","label":"Новичок","emoji":"👶","theme":"light","cta":["С чего начать","Примеры"]},

{"id":"client","label":"Клиент","emoji":"💼","theme":"brand","cta":["Собрать заявку","Пакеты услуг"]},

{"id":"dev","label":"Dev","emoji":"🛠","theme":"dark","cta":["Think Tank","Контент‑модель"]}

]

```
---
### data/menu.json
```

[

{"title":"База знаний","route":"/kb"},

{"title":"Портфолио","route":"/portfolio"},

{"title":"Услуги","route":"/services"},

{"title":"Think Tank","route":"/think-tank"},

{"title":"Описание","route":"/about"}

]

```
---
### data/services.json
```

[

{

"id":"service-video",

"title":"Видеопродакшн",

"description":"Бриф → препродакшн → продакшн → пост → публикация",

"tags":["#Видео","#Монтаж","#Моушн"],

"machine_tags":["product/services","action/build","theme/graphics","tool/aftereffects"],

"thumb":"./assets/placeholders/video.png"

},

{

"id":"service-design",

"title":"Дизайн",

"description":"Айдентика и графдизайн: концепт → макеты → гайд",

"tags":["#Дизайн","#Айдентика"],

"machine_tags":["product/services","action/build","theme/graphics","tool/figma"],

"thumb":"./assets/placeholders/design.png"

},

{

"id":"service-cad3d",

"title":"Проектирование (CAD/3D)",

"description":"Эскиз → 3D/чертежи → визуализация → техпак",

"tags":["#3D","#Проектирование"],

"machine_tags":["product/services","action/build","theme/automation","tool/sketchup"],

"thumb":"./assets/placeholders/cad3d.png"

}

]

```
---
### assets/placeholders
- Заглушки можно сгенерировать локально (см. скрипт на странице <mention-page url="[https://www.notion.so/0b7377b4b3dc4b6ba237a19156c3a518">UI](https://www.notion.so/0b7377b4b3dc4b6ba237a19156c3a518">UI) макет — шапка и первый экран (Static First)</mention-page>) или положить любые 3 png: video.png, design.png, cad3d.png.
---
Связано: <mention-page url="[https://www.notion.so/0b7377b4b3dc4b6ba237a19156c3a518">UI](https://www.notion.so/0b7377b4b3dc4b6ba237a19156c3a518">UI) макет — шапка и первый экран (Static First)</mention-page>, <mention-page url="[https://www.notion.so/98c47949f1244855b37edba741b2ada9">README](https://www.notion.so/98c47949f1244855b37edba741b2ada9">README) (черновик) для корня GitHub</mention-page>
```
