# UI макет — шапка и первый экран (Static First)

### Цель

Быстрый статический прототип шапки и первого экрана с переключателем ролей и корзиной артефактов. Без сервера, со статическими файлами и заглушками.

---

### Структура файлов

```
/prototype
  index.html
  styles.css
  app.js
  data/
    roles.json
    menu.json
    services.json
    artifacts.json
  components/
    Header.js
    RoleSwitch.js
    NavBar.js
    SearchBar.js
    FavoritesButton.js
    ArtifactsButton.js
    ArtifactsDrawer.js
    ServiceCard.js
    Footer.js
  assets/
    logo.svg
    placeholders/*
```

### Компоненты и пропсы

- Header
    - props: logoSrc, menu, role, onRoleChange, artifactsCount, onOpenArtifacts, onOpenFavorites
    - состав: Logo, SearchBar, RoleSwitch, NavBar, FavoritesButton, ArtifactsButton
- RoleSwitch
    - props: value, options, onChange
    - options: [{id:"novice", label:"Новичок", icon:"👶"}, {id:"client", label:"Клиент", icon:"💼"}, {id:"dev", label:"Dev", icon:"🛠"}]
- NavBar
    - props: items, activeRoute, onNavigate
    - items: [{title:"База знаний", route:"/kb"}, …]
- SearchBar
    - props: placeholder, onQueryChange, onSubmit, suggestions
    - suggestionChip: {facet:"theme"|"action"|"tool", label:"Графика"}
- FavoritesButton
    - props: count, onClick
- ArtifactsButton
    - props: count, onClick
- ArtifactsDrawer
    - props: isOpen, items, onClose, onRemoveItem, onNoteChange, onGoToRequest
    - item: {id, type:"service"|"image"|"video"|"case", title, thumb, meta, note}
- ServiceCard
    - props: title, description, tags, onAddToArtifacts, onOpen
- Footer
    - props: links, copyright

### JSON‑заглушки

- roles.json

```json
[
  {"id":"novice","label":"Новичок","emoji":"👶","theme":"light","cta":["С чего начать","Примеры"]},
  {"id":"client","label":"Клиент","emoji":"💼","theme":"brand","cta":["Собрать заявку","Пакеты услуг"]},
  {"id":"dev","label":"Dev","emoji":"🛠","theme":"dark","cta":["Think Tank","Контент‑модель"]}
]
```

- menu.json

```json
[
  {"title":"База знаний","route":"/kb"},
  {"title":"Портфолио","route":"/portfolio"},
  {"title":"Услуги","route":"/services"},
  {"title":"Think Tank","route":"/think-tank"},
  {"title":"Описание","route":"/about"}
]
```

- services.json

```json
[
  {
    "id":"service-video",
    "title":"Видеопродакшн",
    "description":"Бриф → препродакшн → продакшн → пост → публикация",
    "tags":["#Видео","#Монтаж","#Моушн"],
    "machine_tags":["product/services","action/build","theme/graphics","tool/aftereffects"],
    "thumb":"/assets/placeholders/video.png"
  },
  {
    "id":"service-design",
    "title":"Дизайн",
    "description":"Айдентика и графдизайн: концепт → макеты → гайд",
    "tags":["#Дизайн","#Айдентика"],
    "machine_tags":["product/services","action/build","theme/graphics","tool/figma"],
    "thumb":"/assets/placeholders/design.png"
  },
  {
    "id":"service-cad3d",
    "title":"Проектирование (CAD/3D)",
    "description":"Эскиз → 3D/чертежи → визуализация → техпак",
    "tags":["#3D","#Проектирование"],
    "machine_tags":["product/services","action/build","theme/automation","tool/sketchup"],
    "thumb":"/assets/placeholders/cad3d.png"
  }
]
```

- artifacts.json

```json
{
  "items":[
    {"id":"service-video","type":"service","title":"Видеопродакшн","thumb":"/assets/placeholders/video.png","meta":"Услуга","note":""}
  ]
}
```

### index.html (каркас)

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Vova & Petrova — прототип</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <header id="app-header"></header>
  <main id="app-main">
    <section class="hero">
      <h1>Игровая навигация по ролям</h1>
      <p>Выберите роль и начните с быстрых маршрутов</p>
      <div id="hero-cta"></div>
    </section>
    <section class="services" id="services-grid"></section>
  </main>
  <aside id="artifacts-drawer" aria-hidden="true"></aside>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### styles.css — заметки

- Темы ролей: .theme-light, .theme-brand, .theme-dark
- Шапка в 2 строки, шторка .drawer справа 380–420px
- Сетка карточек .services-grid с авто‑колонками

### app.js — поведение

- Загрузка JSON (roles, menu, services, artifacts)
- Рендер Header, RoleSwitch, NavBar, Services grid
- LocalStorage для артефактов: add/remove, drawer open/close
- События:
    - onRoleChange(roleId) → document.body.dataset.role = roleId
    - onAddToArtifacts(item) → artifacts.push(item) → persist
    - onGoToRequest() → alert("Черновик заявки сформирован")

### Сценарии для проверки UX

- Переключить роль Клиент → меню «Услуги» впереди, CTA «Собрать заявку»
- Добавить «Видеопродакшн» в артефакты → счётчик вырос, шторка показывает элемент
- Открыть шторку, добавить заметку → «Сформировать черновик заявки»
- Поиск: «монтаж» → чипы фасетов (Действие: build, Тема: graphics)

### Чек‑лист запуска локально

### Готовый скрипт: сгенерировать /prototype локально (bash, macOS/Linux)

```bash
mkdir -p prototype/{data,assets/placeholders}
cat > prototype/index.html <<'HTML'
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
HTML

cat > prototype/styles.css <<'CSS'
:root{--bg:#0b0b0c;--fg:#eaeaea;--muted:#a0a0a0;--brand:#4fd1c5}
body{margin:0;font:16px/1.4 system-ui, -apple-system, Segoe UI, Roboto;background:#111;color:#eee}
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
CSS

cat > prototype/app.js <<'JS'
async function loadJSON(path){const r=await fetch(path);return r.json()}
const els = {
  header: document.getElementById('app-header'),
  heroCta: document.getElementById('hero-cta'),
  servicesGrid: document.getElementById('services-grid'),
  drawer: document.getElementById('artifacts-drawer'),
};
let state = {role:'novice', roles:[], menu:[], services:[], artifacts:{items:[]}};

function h(tag, attrs={}, ...kids){
  const el = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(k==='class') el.className=v;
    else if(k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if(k==='href'){ el.setAttribute('href', v); el.role='link'; el.tabIndex=0;}
    else el.setAttribute(k,v);
  }
  for(const kid of kids) el.append(kid);
  return el;
}

function renderHeader(){
  const role = state.role;
  const roleDef = state.roles.find(r=>[r.id](http://r.id)===role) || state.roles[0];
  const rolesRow = h('div',{class:'roles'},
    ...[state.roles.map](http://state.roles.map)(r=>h('button',{class:'role'+([r.id](http://r.id)===role?' active':''), onClick:()=>setRole([r.id](http://r.id))}, `${r.emoji} ${r.label}`))
  );
  const search = h('div',{class:'search'}, h('input',{placeholder:'Поиск по темам, действиям, технологиям…'}));
  const top = h('div',{class:'row'},
    h('div',{class:'logo'},'V&P'),
    search,
    rolesRow,
    h('button',{class:'btn', onClick:toggleDrawer}, `🧺 Артефакты ${state.artifacts.items.length}`)
  );
  const nav = h('nav',{class:'nav'},
    ...[state.menu.map](http://state.menu.map)(i=>h('a',{href:i.route, class: i.route==='/services' && role==='client' ? 'active':''}, i.title))
  );
  els.header.replaceChildren(top, nav);
}

function renderHero(){
  const r = state.roles.find(x=>[x.id](http://x.id)===state.role);
  const ctas = (r?.cta||[]).map((label,i)=>h('button',{class:'btn'+(i===0?' primary':'' )},label));
  const wrap = h('div',{class:'hero-cta'}, ...ctas);
  els.heroCta.replaceChildren(wrap);
}

function renderServices(){
  els.servicesGrid.replaceChildren(...[state.services.map](http://state.services.map)(s=>{
    const tags = h('div',{class:'tags'}, ...(s.tags||[]).map(t=>h('span',{class:'tag'},t)));
    return h('div',{class:'card'},
      h('img',{src:s.thumb, alt:s.title, style:'width:100%;height:120px;object-fit:cover;border-radius:8px;background:#0b0f15'}),
      h('h3',{}, s.title),
      h('p',{style:'margin:0;color:#bbb'}, s.description),
      tags,
      h('div',{class:'row'},
        h('button',{class:'btn',onClick:()=>addArtifact(s)},'Добавить в артефакты'),
        h('button',{class:'btn'},'Подробнее')
      )
    )
  }));
}

function renderDrawer(){
  const head = h('header',{}, h('div',{class:'row'}, h('strong',{},'Артефакты'), h('span',{style:'flex:1'},''), h('button',{class:'btn',onClick:toggleDrawer},'Закрыть')));
  const body = h('div',{class:'body'},
    ...[state.artifacts.items.map](http://state.artifacts.items.map)(it=>{
      return h('div',{class:'item'},
        h('img',{src:it.thumb, alt:it.title}),
        h('div',{class:'meta'},
          h('div',{}, it.title),
          h('div',{style:'color:#9aa'}, it.meta||'')
        ),
        h('div',{style:'width:100%'},
          h('textarea',{class:'note',placeholder:'Заметка к артефакту', oninput:e=>{it.note=[e.target](http://e.target).value; saveArtifacts();}}, it.note||'')
        ),
        h('button',{class:'btn',onClick:()=>removeArtifact([it.id](http://it.id))},'Удалить')
      )
    })
  );
  const footer = h('div',{class:'footer'},
    h('button',{class:'btn primary',onClick:()=>alert('Черновик заявки сформирован')},'Сформировать черновик заявки')
  );
  els.drawer.replaceChildren(head, body, footer);
}

function addArtifact(svc){
  if(state.artifacts.items.find(x=>[x.id](http://x.id)===[svc.id](http://svc.id))) return;
  state.artifacts.items.push({id:[svc.id](http://svc.id),type:'service',title:svc.title,thumb:svc.thumb,meta:'Услуга',note:''});
  saveArtifacts();
  renderHeader(); renderDrawer();
  if(!els.drawer.classList.contains('open')) toggleDrawer();
}

function removeArtifact(id){
  state.artifacts.items = state.artifacts.items.filter(x=>[x.id](http://x.id)!==id);
  saveArtifacts(); renderHeader(); renderDrawer();
}

function toggleDrawer(){
  els.drawer.classList.toggle('open');
  els.drawer.setAttribute('aria-hidden', els.drawer.classList.contains('open')?'false':'true');
}

function setRole(roleId){
  state.role = roleId;
  document.body.dataset.role = roleId;
  document.body.className = (state.roles.find(r=>[r.id](http://r.id)===roleId)?.theme==='dark')?'theme-dark':(state.roles.find(r=>[r.id](http://r.id)===roleId)?.theme==='brand'?'theme-brand':'theme-light');
  renderHeader(); renderHero();
}

function saveArtifacts(){ localStorage.setItem('vp_artifacts', JSON.stringify(state.artifacts)); }
function loadArtifacts(){ try{ state.artifacts = JSON.parse(localStorage.getItem('vp_artifacts'))||{items:[]} }catch{ state.artifacts={items:[]} } }

async function init(){
  const [roles, menu, services] = await Promise.all([
    loadJSON('./data/roles.json'),
    loadJSON('./data/menu.json'),
    loadJSON('./data/services.json'),
  ]);
  state.roles = roles; [state.menu](http://state.menu) = menu; [state.services](http://state.services) = services;
  loadArtifacts();
  renderHeader(); renderHero(); renderServices(); renderDrawer();
}
init();
JS

cat > prototype/data/roles.json <<'JSON'
[
  {"id":"novice","label":"Новичок","emoji":"👶","theme":"light","cta":["С чего начать","Примеры"]},
  {"id":"client","label":"Клиент","emoji":"💼","theme":"brand","cta":["Собрать заявку","Пакеты услуг"]},
  {"id":"dev","label":"Dev","emoji":"🛠","theme":"dark","cta":["Think Tank","Контент‑модель"]}
]
JSON

cat > prototype/data/menu.json <<'JSON'
[
  {"title":"База знаний","route":"/kb"},
  {"title":"Портфолио","route":"/portfolio"},
  {"title":"Услуги","route":"/services"},
  {"title":"Think Tank","route":"/think-tank"},
  {"title":"Описание","route":"/about"}
]
JSON

cat > prototype/data/services.json <<'JSON'
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
JSON

# Заглушки картинок через Python (если установлен Pillow)
python3 - <<'PY' 2>/dev/null || python - <<'PY'
from PIL import Image
import os
os.makedirs('prototype/assets/placeholders', exist_ok=True)
colors = {'video':(40,80,120),'design':(80,120,60),'cad3d':(120,80,40)}
for name, rgb in colors.items():
    img = [Image.new](http://Image.new)('RGB',(600,360),rgb)
    [img.save](http://img.save)(f'prototype/assets/placeholders/{name}.png')
print("Placeholders created.")
PY

echo "Готово. Откройте prototype/index.html в браузере. Если JSON не грузится по [file://](file://) — запустите локальный сервер: python3 -m http.server 8080 в папке prototype."
```

### Примечания для Windows (PowerShell)

- Создайте папки и index.html по образцу выше.
- Содержимое styles.css, app.js и JSON‑файлов можно скопировать из этого раздела.
- Если нужно — подготовлю PowerShell-скрипт генерации placeholders.
- Создать папку /prototype и положить файлы
- Открыть index.html в браузере или запустить простой http‑server
- Проверить сценарии и визуал ролей

---

### Связано с…

- [Артефакты — корзина и заявка (MVP)](%D0%90%D1%80%D1%82%D0%B5%D1%84%D0%B0%D0%BA%D1%82%D1%8B%20%E2%80%94%20%D0%BA%D0%BE%D1%80%D0%B7%D0%B8%D0%BD%D0%B0%20%D0%B8%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B0%20(MVP)%20721d156e169a445da062d65dd834e105.md)
- [Индекс сайта](%D0%98%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0%201223735913f445fb9792e4dde3787d96.md)
- [Навигация (пользовательская)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F)%202ba5dd285a3643f788773751f6d24184.md)
- [Навигация (техническая)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F)%20103c222189b04e90a7529840e9faf9dc.md)