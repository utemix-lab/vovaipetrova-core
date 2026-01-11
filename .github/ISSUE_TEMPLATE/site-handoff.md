---
name: Site Handoff
about: Передача данных и инсайтов между Think Tank (прототип) и статическим сайтом
title: '[Site Handoff] '
labels: 'protocol/handoff'
assignees: ''
body:
  - type: markdown
    attributes:
      value: |
        Используйте этот шаблон для передачи данных и инсайтов между прототипом Think Tank и статическим сайтом согласно [Site Handoff Protocol](docs/SITE_HANDOFF_PROTOCOL.md).
  - type: dropdown
    id: direction
    attributes:
      label: Направление передачи
      description: Выберите направление передачи данных
      options:
        - IN (от прототипа к сайту)
        - OUT (от сайта к прототипу)
        - Двусторонняя передача
    validations:
      required: true
  - type: textarea
    id: in_content_slices
    attributes:
      label: IN: Content Slices
      description: |
        Передача контент-срезов от прототипа к сайту:
        - `kb_glossary_lite.jsonl` — термины базы знаний
        - `stories_digests.jsonl` — месячные дайджесты Stories
      placeholder: |
        Пример:
        - Обновлён kb_glossary_lite.jsonl (добавлено 5 новых терминов)
        - Сгенерирован stories_digests.jsonl за январь 2026
      value: ''
    validations:
      required: false
  - type: textarea
    id: in_routes
    attributes:
      label: IN: Routes
      description: |
        Передача маршрутов с метаданными:
        - `static/routes.json` — маршруты с title, OG, in_sitemap
      placeholder: |
        Пример:
        - Добавлен новый маршрут /services/design
        - Обновлены OG-теги для маршрута /kb
      value: ''
    validations:
      required: false
  - type: textarea
    id: in_sitemap
    attributes:
      label: IN: Sitemap
      description: Обновления sitemap.xml для поисковиков
      placeholder: |
        Пример:
        - Добавлены новые страницы в sitemap.xml
        - Обновлены приоритеты для Stories
      value: ''
    validations:
      required: false
  - type: textarea
    id: in_og_meta
    attributes:
      label: IN: Open Graph метаданные
      description: OG-теги для социальных сетей
      placeholder: |
        Пример:
        - Добавлены OG-изображения для всех Stories
        - Обновлены описания для KB страниц
      value: ''
    validations:
      required: false
  - type: textarea
    id: in_styles_tokens
    attributes:
      label: IN: Styles Tokens
      description: |
        Дизайн-токены (цвета, отступы, типографика):
        - `static/tokens.json` — токены дизайн-системы
      placeholder: |
        Пример:
        - Обновлены цвета в tokens.json
        - Добавлены новые значения spacing
      value: ''
    validations:
      required: false
  - type: textarea
    id: in_components
    attributes:
      label: IN: UI Components
      description: |
        Документация компонентов:
        - `static/components.md` — описание компонентов с пропсами и состояниями
      placeholder: |
        Пример:
        - Добавлен новый компонент Card в components.md
        - Обновлены пропсы для компонента Nav
      value: ''
    validations:
      required: false
  - type: textarea
    id: out_ux_bottlenecks
    attributes:
      label: OUT: UX-узкие места
      description: Найденные проблемы взаимодействия на статическом сайте
      placeholder: |
        Пример:
        - Проблема: медленная загрузка Glossary Lite на мобильных устройствах
        - Решение: оптимизировать JSONL, добавить пагинацию
      value: ''
    validations:
      required: false
  - type: textarea
    id: out_ia_solutions
    attributes:
      label: OUT: Решения по информационной архитектуре (IA)
      description: Предложения по улучшению структуры и навигации
      placeholder: |
        Пример:
        - Предложение: добавить breadcrumbs на все страницы KB
        - Обоснование: улучшит навигацию и SEO
      value: ''
    validations:
      required: false
  - type: textarea
    id: out_adaptations
    attributes:
      label: OUT: Список адаптаций
      description: Необходимые изменения в прототипе для лучшей интеграции с сайтом
      placeholder: |
        Пример:
        - Добавить поддержку dark mode в tokens.json
        - Расширить компонент Card для поддержки изображений
      value: ''
    validations:
      required: false
  - type: textarea
    id: files_links
    attributes:
      label: Файлы и ссылки
      description: |
        Список переданных файлов или ссылок на PR/коммиты:
        - Ссылки на файлы в репозитории
        - Ссылки на PR (если передача через PR)
        - Ссылки на коммиты
      placeholder: |
        Пример:
        - `kb_glossary_lite.jsonl` (корень репозитория)
        - `prototype/data/stories_digests.jsonl`
        - PR #227: content-slices экспорт
      value: ''
    validations:
      required: true
  - type: checkboxes
    id: checklist
    attributes:
      label: Чек-лист
      description: Отметьте выполненные пункты
      options:
        - label: Направление передачи указано (IN/OUT)
          required: true
        - label: Указаны файлы или ссылки на передаваемые данные
          required: true
        - label: Для IN: указаны типы передаваемых данных (content slices, routes, tokens и т.д.)
          required: false
        - label: Для OUT: описаны проблемы/предложения с конкретикой
          required: false
        - label: Ссылки на файлы/PR/коммиты добавлены
          required: true
        - label: При необходимости добавлена метка `ia:breaking` (для breaking changes)
          required: false
  - type: textarea
    id: additional_context
    attributes:
      label: Дополнительный контекст
      description: Любая дополнительная информация, которая может быть полезна
      placeholder: |
        Пример:
        - Связанные Issues: #123, #456
        - Связанные RFC: RFC-001
        - Примечания: требуется обсуждение перед внедрением
      value: ''
    validations:
      required: false
---

## Резюме

<!-- Краткое описание передачи данных/инсайтов -->

## Направление передачи

**{{ direction }}**

{% if in_content_slices or in_routes or in_sitemap or in_og_meta or in_styles_tokens or in_components %}
## IN (от прототипа к сайту)

{% if in_content_slices %}
### Content Slices
{{ in_content_slices }}
{% endif %}

{% if in_routes %}
### Routes
{{ in_routes }}
{% endif %}

{% if in_sitemap %}
### Sitemap
{{ in_sitemap }}
{% endif %}

{% if in_og_meta %}
### Open Graph метаданные
{{ in_og_meta }}
{% endif %}

{% if in_styles_tokens %}
### Styles Tokens
{{ in_styles_tokens }}
{% endif %}

{% if in_components %}
### UI Components
{{ in_components }}
{% endif %}
{% endif %}

{% if out_ux_bottlenecks or out_ia_solutions or out_adaptations %}
## OUT (от сайта к прототипу)

{% if out_ux_bottlenecks %}
### UX-узкие места
{{ out_ux_bottlenecks }}
{% endif %}

{% if out_ia_solutions %}
### Решения по информационной архитектуре (IA)
{{ out_ia_solutions }}
{% endif %}

{% if out_adaptations %}
### Список адаптаций
{{ out_adaptations }}
{% endif %}
{% endif %}

## Файлы и ссылки

{{ files_links }}

## Чек-лист

{{ checklist }}

{% if additional_context %}
## Дополнительный контекст

{{ additional_context }}
{% endif %}

---

**Связано:** [Site Handoff Protocol](docs/SITE_HANDOFF_PROTOCOL.md)
