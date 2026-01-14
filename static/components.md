# Components — минимальные контракты

Список целевых компонентов статического сайта с пропсами и состояниями. Все компоненты реализованы в прототипе (`/prototype`) и могут быть использованы как референс.

## Nav (Навигация)

Основная навигация сайта с активным маршрутом.

### Props

```typescript
{
  items: Array<{
    title: string;
    route: string;
  }>;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
}
```

### States

- **Default:** обычное состояние ссылок
- **Active:** активный маршрут (класс `.active`)

### Примеры

- **Прототип:** [`prototype/index.html`](../prototype/index.html) — навигация в шапке (через view-toggle)
- **Реализация:** [`prototype/app.js`](../prototype/app.js) — функция `renderNav()` (если есть)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.nav`, `.nav a.active`

---

## Card (Карточка)

Карточка для отображения документа/страницы с заголовком, статусом, описанием и тегами.

### Props

```typescript
{
  title: string;
  slug: string;
  summary?: string;
  status?: "ready" | "review" | "draft";
  tags?: string[];
  url?: string;
}
```

### States

- **Default:** обычная карточка
- **Hover:** эффект при наведении (поднятие, тень)
- **Focus:** фокус на ссылке внутри карточки

### Примеры

- **Прототип:** [`prototype/index.html`](../prototype/index.html) — секция `#cards`
- **Реализация:** [`prototype/app.js`](../prototype/app.js) — функция `createCard(page)` (строки 97-140)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.card`, `.card__title`, `.card__summary`

---

## TagList (Список тегов)

Список кликабельных тегов для фильтрации контента.

### Props

```typescript
{
  tags: string[];
  activeTag?: string;
  onClick?: (tag: string) => void;
}
```

### States

- **Default:** обычные теги
- **Active:** активный тег (для фильтрации)
- **Hover:** эффект при наведении

### Примеры

- **Прототип:** [`prototype/index.html`](../prototype/index.html) — теги внутри карточек
- **Реализация:** [`prototype/app.js`](../prototype/app.js) — создание `tag-list` внутри `createCard()` (строки 124-137)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.tag-list`, `.tag-chip`, `.tag-chip--clickable`
- **Страница:** [`prototype/page/think-tank-kompaktnoe-yadro.html`](../prototype/page/think-tank-kompaktnoe-yadro.html) — теги в метаданных страницы

---

## Breadcrumbs (Хлебные крошки)

Навигационная цепочка для отображения текущего местоположения на сайте.

### Props

```typescript
{
  items: Array<{
    label: string;
    url?: string;
  }>;
  current: string;
}
```

### States

- **Default:** обычное отображение
- **Last item:** текущая страница (не ссылка)

### Примеры

- **Прототип:** [`prototype/page/think-tank-kompaktnoe-yadro.html`](../prototype/page/think-tank-kompaktnoe-yadro.html) — breadcrumbs в шапке страницы
- **Реализация:** [`prototype/app.js`](../prototype/app.js) — создание breadcrumbs (строки 1315-1325)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.breadcrumbs`, `.breadcrumbs__link`, `.breadcrumbs__separator`, `.breadcrumbs__current`

---

## Hero (Герой-секция)

Главная секция страницы с заголовком, описанием и призывом к действию.

### Props

```typescript
{
  title: string;
  description?: string;
  cta?: Array<{
    label: string;
    url: string;
    variant?: "primary" | "secondary";
  }>;
}
```

### States

- **Default:** обычное отображение
- **With CTA:** с кнопками призыва к действию

### Примеры

- **Прототип:** [`prototype/index.html`](../prototype/index.html) — секция `.hero` (если есть)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.hero`, `.hero h1`, `.hero-cta`, `.btn`, `.btn.primary`

---

## Footer (Подвал)

Подвал сайта с информацией и ссылками.

### Props

```typescript
{
  text?: string;
  links?: Array<{
    label: string;
    url: string;
  }>;
}
```

### States

- **Default:** обычное отображение

### Примеры

- **Прототип:** [`prototype/index.html`](../prototype/index.html) — `.site-footer` (строка 189)
- **Стили:** [`prototype/styles.css`](../prototype/styles.css) — `.site-footer`

---

## Общие принципы

- **Static First:** все компоненты работают без серверной логики
- **Accessibility:** использование семантических HTML-элементов и ARIA-атрибутов
- **Токены:** использование значений из [`tokens.json`](./tokens.json) для цветов, отступов, радиусов
- **Адаптивность:** компоненты адаптируются под мобильные устройства через media queries

---

## Связано с

- [Site Handoff Protocol](../docs/SITE_HANDOFF_PROTOCOL.md) — протокол передачи данных Think Tank ↔ Static Site
- [tokens.json](./tokens.json) — дизайн-токены для стилизации компонентов
- [routes.json](./routes.json) — маршруты сайта для навигации
