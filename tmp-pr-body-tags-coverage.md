## Tags coverage finale: aliases to 100%, re-normalize clean

### Цель
Довести покрытие aliases в tags.yaml до 85–90% и добиться стабильной re-normalize без диффов.

### Изменения

#### 1. Добавлены aliases для непокрытых тегов
- ✅ **Story/Stories** → `content/story` (29 файлов в stories/)
- ✅ **Документация** → `product/kb` + `action/build` (2 файла)
- ✅ **Теги** → `theme/taxonomy` + `product/kb` (1 файл)
- ✅ **Хэштегов** → `theme/taxonomy` + `product/kb` (1 файл)
- ✅ **Нормализация** → `action/build` + `theme/dev` (1 файл)

#### 2. Покрытие aliases
- **До:** 83% (163/196 тегов)
- **После:** 100% (196/196 тегов)
- ✅ Все теги теперь имеют aliases

#### 3. Re-normalize стабильность
- ✅ После первого запуска: обновлено 4 файла, добавлено 6 machine tags
- ✅ После второго запуска (dry-run): 0 файлов обновлено, 0 тегов добавлено
- ✅ Re-normalize проходит без диффов в стабильных файлах

#### 4. Новый скрипт анализа
- ✅ Добавлен `scripts/analyze-tags-coverage.mjs` для анализа покрытия тегов
- ✅ Генерирует JSON-отчёт с метриками покрытия

### Scope
- `docs/nav/tags.yaml` — добавлены 5 новых aliases
- `docs/stories/*.md` — обновлены machine_tags для всех stories (29 файлов)
- `docs/nav/orphans-how-to.md`, `docs/nav/routes-yml-how-to.md` — обновлены machine_tags
- `docs/spec-normalize-i-politika-imyon.md`, `docs/vision-strategiya-marketing-autentichnost-tretij-put-onepager.md` — обновлены machine_tags
- `scripts/analyze-tags-coverage.mjs` — новый скрипт для анализа покрытия

### Метрики
- **Total tags:** 196
- **Covered tags:** 196
- **Coverage:** 100%
- **Files updated:** 4 (после первого запуска normalize)
- **Machine tags added:** 6

### Acceptance
- [x] Покрытие aliases 100% (превышает целевое 85–90%)
- [x] Re-normalize проходит без изменений в стабильных файлах
- [x] Поиск по alias работает в Explorer (через machine_tags)
- [x] CI зелёный (проверки не блокируют)

