const STATUS_META = {
  ready: { label: "ready", emoji: "🟢", className: "status-ready" },
  review: { label: "review", emoji: "🟡", className: "status-review" },
  draft: { label: "draft", emoji: "⚪", className: "status-draft" }
};

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

const VIEW = document.body.dataset.view;
const LINK_MAP_CACHE = {};

function isStoryPage(page) {
  if (!page) return false;
  if (page.collection === "stories") return true;
  const tags = Array.isArray(page.tags) ? page.tags : [];
  const machine = Array.isArray(page.machine_tags) ? page.machine_tags : [];
  return (
    tags.some((tag) => tag.toLowerCase() === "story") ||
    machine.some((tag) => tag.toLowerCase() === "content/story") ||
    (page.url && page.url.includes("/stories/"))
  );
}

function getStoryOrder(page) {
  if (!page) return null;
  if (typeof page.story_order === "number") return page.story_order;
  if (typeof page.story_order === "string" && page.story_order.trim()) {
    const parsed = Number(page.story_order);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (page.slug) {
    // Извлекаем номер эпизода из начала slug (001-, 002-, и т.д.)
    // Используем /^(\d{1,3})-/ для согласованности с generate-stories-index.mjs
    const match = page.slug.match(/^(\d{1,3})-/);
    if (match) return Number(match[1]);
  }
  return null;
}

function formatStoryOrder(page) {
  const order = getStoryOrder(page);
  if (typeof order === "number" && !Number.isNaN(order)) {
    return order.toString().padStart(2, "0");
  }
  return null;
}

/**
 * Правильная русская плюрализация для слова "история"
 * Правила: 1, 21, 31... → "история"; 2-4, 22-24... → "истории"; 0, 5-9, 10-20, 25-30... → "историй"
 * Особые случаи: 11-14 всегда используют "историй"
 */
function pluralizeStory(count) {
  if (count === 0) return 'историй';

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  // Особые случаи: 11-14 всегда используют "историй"
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'историй';
  }

  // 1, 21, 31, 41... → "история"
  if (lastDigit === 1) {
    return 'история';
  }

  // 2-4, 22-24, 32-34... → "истории"
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'истории';
  }

  // 0, 5-9, 10, 20, 25-30... → "историй"
  return 'историй';
}

function byStatus(status, searchTerm) {
  return (page) => {
    const matchesStatus =
      status === "all" ? true : page.status?.toLowerCase() === status;
    if (!matchesStatus) return false;
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      page.title.toLowerCase().includes(query) ||
      (page.summary && page.summary.toLowerCase().includes(query)) ||
      page.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  };
}

function createCard(page) {
  const card = document.createElement("article");
  card.className = "card";

  const titleLink = document.createElement("a");
  titleLink.className = "card__title";
  titleLink.href = `page/${page.slug}.html`;
  titleLink.textContent = page.title || page.slug;
  card.appendChild(titleLink);

  const status = document.createElement("span");
  const meta = STATUS_META[page.status] || STATUS_META.draft;
  status.className = `status-badge ${meta.className}`;
  status.textContent = `${meta.emoji} ${meta.label}`;
  card.appendChild(status);

  if (page.summary) {
    const summary = document.createElement("p");
    summary.className = "card__summary";
    const maxLength = 130;
    summary.textContent =
      page.summary.length > maxLength
        ? `${page.summary.slice(0, maxLength - 3).trim()}…`
        : page.summary;
    card.appendChild(summary);
  }

  if (page.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "tag-list";
    for (const tag of page.tags) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip tag-chip--clickable";
      chip.textContent = tag;
      chip.dataset.tag = tag;
      chip.setAttribute("aria-label", `Фильтр по тегу: ${tag}`);
      tags.appendChild(chip);
    }
    card.appendChild(tags);
  }

  return card;
}

function createStoryCard(page) {
  const card = document.createElement("article");
  card.className = "story-card";

  const meta = document.createElement("div");
  meta.className = "story-card__meta";

  const order = document.createElement("span");
  order.className = "story-card__episode";
  const numberText = formatStoryOrder(page);
  order.textContent = numberText ? `Эпизод ${numberText}` : "Эпизод";
  meta.appendChild(order);

  const status = document.createElement("span");
  applyStatusBadge(status, page.status);
  meta.appendChild(status);

  card.appendChild(meta);

  const titleLink = document.createElement("a");
  titleLink.className = "story-card__title";
  titleLink.href = `page/${page.slug}.html`;
  titleLink.textContent = page.title || page.slug;
  card.appendChild(titleLink);

  if (page.summary) {
    const summary = document.createElement("p");
    summary.className = "story-card__summary";
    const maxLength = 130;
    summary.textContent =
      page.summary.length > maxLength
        ? `${page.summary.slice(0, maxLength - 3).trim()}…`
        : page.summary;
    card.appendChild(summary);
  }

  const footer = document.createElement("div");
  footer.className = "story-card__footer";
  const link = document.createElement("a");
  link.className = "story-card__link";
  link.href = `page/${page.slug}.html`;
  link.textContent = "Читать эпизод";
  footer.appendChild(link);
  card.appendChild(footer);

  return card;
}

async function loadPages(basePath) {
  const response = await fetch(basePath);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить pages.json: ${response.status}`);
  }
  const data = await response.json();
  return data.sort((a, b) =>
    (a.title || a.slug).localeCompare(b.title || b.slug, "ru")
  );
}

async function loadRoutes(basePath) {
  try {
    const response = await fetch(basePath);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️  Failed to load routes:', error.message);
    return { routes: [] };
  }
}

function buildRouteMap(routes) {
  const map = new Map();
  routes.routes.forEach(route => {
    route.entries.forEach(entry => {
      if (entry.status === 'ok') {
        map.set(entry.slug, {
          path: route.path,
          title: route.title,
          order: routes.routes.indexOf(route)
        });
      }
    });
  });
  return map;
}

function sortByRoute(pages, routeMap) {
  return pages.sort((a, b) => {
    const routeA = routeMap.get(a.slug);
    const routeB = routeMap.get(b.slug);

    if (!routeA && !routeB) {
      return (a.title || a.slug).localeCompare(b.title || b.slug, "ru");
    }
    if (!routeA) return 1;
    if (!routeB) return -1;

    if (routeA.order !== routeB.order) {
      return routeA.order - routeB.order;
    }

    return (a.title || a.slug).localeCompare(b.title || b.slug, "ru");
  });
}

function sortByStatus(pages) {
  const statusOrder = { ready: 0, review: 1, draft: 2 };
  return pages.sort((a, b) => {
    const statusA = statusOrder[a.status] ?? 3;
    const statusB = statusOrder[b.status] ?? 3;
    if (statusA !== statusB) return statusA - statusB;
    return (a.title || a.slug).localeCompare(b.title || b.slug, "ru");
  });
}

async function renderIndex() {
  const cardsContainer = document.getElementById("cards");
  const emptyState = document.getElementById("empty-state");
  const storiesContainer = document.getElementById("stories-list");
  const storiesEmpty = document.getElementById("stories-empty");
  const issuesContainer = document.getElementById("issues-list");
  const issuesEmpty = document.getElementById("issues-empty");
  const orphansContainer = document.getElementById("orphans-list");
  const orphansEmpty = document.getElementById("orphans-empty");
  const unresolvedTermsContainer = document.getElementById("unresolved-terms-list");
  const unresolvedTermsEmpty = document.getElementById("unresolved-terms-empty");
  const searchInput = document.getElementById("search-input");
  const filterButtons = Array.from(
    document.querySelectorAll(".filter-button")
  );
  const sortButtons = Array.from(
    document.querySelectorAll(".sort-button")
  );
  const viewButtons = Array.from(document.querySelectorAll(".view-button"));
  const controls = document.querySelector(".controls");
  const docsPanel = document.getElementById("docs-panel");
  const storiesPanel = document.getElementById("stories-panel");
  const issuesPanel = document.getElementById("issues-panel");
  const orphansPanel = document.getElementById("orphans-panel");
  const unresolvedTermsPanel = document.getElementById("unresolved-terms-panel");
  const kbIndexPanel = document.getElementById("kb-index-panel");
  const kbIndexLetters = document.getElementById("kb-index-letters");
  const kbIndexContent = document.getElementById("kb-index-content");
  const kbIndexEmpty = document.getElementById("kb-index-empty");
  const storiesIndexPanel = document.getElementById("stories-index-panel");
  const storiesIndexGroups = document.getElementById("stories-index-groups");
  const storiesIndexContent = document.getElementById("stories-index-content");
  const storiesIndexEmpty = document.getElementById("stories-index-empty");

  const [pages, routes] = await Promise.all([
    loadPages("data/pages.json"),
    loadRoutes("data/routes.json")
  ]);
  const routeMap = buildRouteMap(routes);

  const visiblePages = pages.filter((page) => page.service !== true);
  const storyPages = visiblePages
    .filter(isStoryPage)
    .sort((a, b) => {
      const orderA = getStoryOrder(a) ?? 999;
      const orderB = getStoryOrder(b) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || a.slug).localeCompare(b.title || b.slug, "ru");
    });
  const docPages = visiblePages.filter((page) => !isStoryPage(page));

  // Проверяем, находимся ли мы на странице тега (через hash #tags/<tag>)
  const hash = window.location.hash.replace("#", "");
  const hashMatch = hash.match(/^tags\/(.+)$/);
  const tagFromHash = hashMatch ? decodeURIComponent(hashMatch[1]) : null;
  const hashWithoutTag = hash.replace(/^tags\/.+$/, "");

  // Читаем параметры из URL или localStorage
  const urlParams = new URLSearchParams(window.location.search);

  let currentStatus = urlParams.get("status") || localStorage.getItem("explorer-status") || "all";
  let currentSearch = urlParams.get("search") || "";
  let currentSort = urlParams.get("sort") || localStorage.getItem("explorer-sort") || "route";
  let currentTagFilter = tagFromHash || urlParams.get("tag") || localStorage.getItem("explorer-tag-filter") || null;
  let readyOnly = urlParams.get("ready") === "1" || localStorage.getItem("explorer-ready-only") === "true";
  let currentPage = parseInt(urlParams.get("page")) || 1;
  const ITEMS_PER_PAGE = 30; // Количество элементов на странице
  let activePanel = hashWithoutTag.includes("stories-index") ? "stories-index" : hashWithoutTag.includes("stories") ? "stories" : hashWithoutTag.includes("issues") ? "issues" : hashWithoutTag.includes("orphans") ? "orphans" : hashWithoutTag.includes("unresolved-terms") ? "unresolved-terms" : hashWithoutTag.includes("diagnostics") ? "diagnostics" : hashWithoutTag.includes("kb-index") ? "kb-index" : "docs";

  // Сбрасываем страницу при изменении фильтров (кроме явного указания page в URL)
  if (!urlParams.get("page")) {
    currentPage = 1;
  }

  // Сохраняем в localStorage
  if (urlParams.get("status")) localStorage.setItem("explorer-status", currentStatus);
  if (urlParams.get("sort")) localStorage.setItem("explorer-sort", currentSort);
  if (urlParams.get("tag") || tagFromHash) localStorage.setItem("explorer-tag-filter", currentTagFilter);
  if (urlParams.get("ready")) localStorage.setItem("explorer-ready-only", readyOnly ? "true" : "false");

  // Функция для обновления URL без перезагрузки страницы
  function updateURL() {
    const params = new URLSearchParams();

    if (currentStatus !== "all") {
      params.set("status", currentStatus);
    }
    if (currentSort !== "route") {
      params.set("sort", currentSort);
    }
    // Тег храним в hash, а не в query параметрах
    if (readyOnly) {
      params.set("ready", "1");
    }
    if (currentSearch) {
      params.set("search", encodeURIComponent(currentSearch));
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }

    // Формируем hash: приоритет тега, затем панель
    let newHash = "";
    if (currentTagFilter) {
      newHash = `tags/${encodeURIComponent(currentTagFilter)}`;
    } else if (activePanel !== "docs") {
      newHash = activePanel; // stories, issues, orphans, unresolved-terms, kb-index, stories-index
    }

    const queryString = params.toString();
    const newURL = queryString
      ? `${window.location.pathname}?${queryString}${newHash ? `#${newHash}` : ""}`
      : `${window.location.pathname}${newHash ? `#${newHash}` : ""}`;

    window.history.pushState({}, "", newURL);
  }

  // Функция для копирования текущего URL
  function copyCurrentURL() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // Визуальная обратная связь
      const button = document.getElementById("copy-link-button");
      if (button) {
        const originalText = button.textContent;
        button.textContent = "Скопировано!";
        button.style.opacity = "0.7";
        setTimeout(() => {
          button.textContent = originalText;
          button.style.opacity = "1";
        }, 2000);
      }
    }).catch((err) => {
      console.warn("Не удалось скопировать URL:", err);
    });
  }

  function renderDocs() {
    cardsContainer.innerHTML = "";
    const paginationContainer = document.getElementById("pagination");
    const tagFilterInfo = document.getElementById("tag-filter-info");
    const tagFilterName = document.getElementById("tag-filter-name");
    const tagFilterClear = document.getElementById("tag-filter-clear");

    let filtered = docPages.filter(byStatus(currentStatus, currentSearch));

    // Фильтр "Ready only"
    if (readyOnly) {
      filtered = filtered.filter((page) => page.status === "ready");
    }

    // Фильтр по тегу
    if (currentTagFilter) {
      filtered = filtered.filter((page) =>
        page.tags?.some((tag) => tag.toLowerCase() === currentTagFilter.toLowerCase())
      );
    }

    // Применяем сортировку
    if (currentSort === "route") {
      filtered = sortByRoute([...filtered], routeMap);
    } else {
      filtered = sortByStatus([...filtered]);
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Сбрасываем страницу, если она больше общего количества страниц
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
      updateURL();
    }

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      cardsContainer.innerHTML = "";
      paginationContainer.classList.add("hidden");
      tagFilterInfo.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Показываем информацию о фильтре по тегу
    if (currentTagFilter) {
      tagFilterInfo.classList.remove("hidden");
      tagFilterName.textContent = currentTagFilter;
      tagFilterClear.onclick = () => {
        currentTagFilter = null;
        localStorage.removeItem("explorer-tag-filter");
        currentPage = 1; // Сбрасываем на первую страницу при снятии фильтра
        updateURL();
        renderDocs();
        updateTagFilterUI();
      };
    } else {
      tagFilterInfo.classList.add("hidden");
    }

    // Пагинация: берём только элементы для текущей страницы
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();
    for (const page of paginatedItems) {
      const card = createCard(page);
      // Добавляем обработчики кликов на теги
      card.querySelectorAll(".tag-chip--clickable").forEach((chip) => {
        chip.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tagValue = chip.dataset.tag;
          // При клике на тег переключаем фильтр или убираем его
          if (currentTagFilter === tagValue) {
            currentTagFilter = null;
            localStorage.removeItem("explorer-tag-filter");
          } else {
            currentTagFilter = tagValue;
            localStorage.setItem("explorer-tag-filter", currentTagFilter);
          }
          currentPage = 1; // Сбрасываем на первую страницу при изменении фильтра
          updateURL();
          renderDocs();
          updateTagFilterUI();
        });
      });
      fragment.appendChild(card);
    }
    cardsContainer.appendChild(fragment);

    // Рендерим пагинацию
    if (totalPages > 1) {
      renderPagination(paginationContainer, currentPage, totalPages, totalItems);
      paginationContainer.classList.remove("hidden");
    } else {
      paginationContainer.classList.add("hidden");
    }
  }

  function renderPagination(container, currentPage, totalPages, totalItems) {
    container.innerHTML = "";

    const info = document.createElement("div");
    info.className = "pagination-info";
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    info.textContent = `Показано ${startItem}–${endItem} из ${totalItems}`;
    container.appendChild(info);

    const nav = document.createElement("nav");
    nav.className = "pagination-nav";
    nav.setAttribute("aria-label", "Навигация по страницам");

    // Кнопка "Предыдущая"
    const prevButton = document.createElement("button");
    prevButton.className = "pagination-button";
    prevButton.textContent = "← Предыдущая";
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        updateURL();
        renderDocs();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    nav.appendChild(prevButton);

    // Номера страниц
    const pageNumbers = document.createElement("div");
    pageNumbers.className = "pagination-numbers";

    // Показываем максимум 7 страниц вокруг текущей
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, currentPage + 3);

    // Если в начале, показываем больше справа
    if (currentPage <= 4) {
      endPage = Math.min(totalPages, 7);
    }
    // Если в конце, показываем больше слева
    if (currentPage >= totalPages - 3) {
      startPage = Math.max(1, totalPages - 6);
    }

    // Первая страница
    if (startPage > 1) {
      const firstBtn = createPageButton(1, currentPage);
      pageNumbers.appendChild(firstBtn);
      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "…";
        pageNumbers.appendChild(ellipsis);
      }
    }

    // Страницы в диапазоне
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.appendChild(createPageButton(i, currentPage));
    }

    // Последняя страница
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "…";
        pageNumbers.appendChild(ellipsis);
      }
      const lastBtn = createPageButton(totalPages, currentPage);
      pageNumbers.appendChild(lastBtn);
    }

    nav.appendChild(pageNumbers);

    // Кнопка "Следующая"
    const nextButton = document.createElement("button");
    nextButton.className = "pagination-button";
    nextButton.textContent = "Следующая →";
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateURL();
        renderDocs();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    nav.appendChild(nextButton);

    container.appendChild(nav);
  }

  function createPageButton(pageNum, currentPage) {
    const button = document.createElement("button");
    button.className = "pagination-number";
    if (pageNum === currentPage) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }
    button.textContent = pageNum.toString();
    button.onclick = () => {
      currentPage = pageNum;
      updateURL();
      renderDocs();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    return button;
  }

  function updateTagFilterUI() {
    document.querySelectorAll(".tag-chip--clickable").forEach((chip) => {
      chip.classList.toggle(
        "tag-chip--active",
        currentTagFilter && chip.dataset.tag.toLowerCase() === currentTagFilter.toLowerCase()
      );
    });
  }

  function renderStories() {
    storiesContainer.innerHTML = "";
    if (!storyPages.length) {
      storiesEmpty.classList.remove("hidden");
      return;
    }
    storiesEmpty.classList.add("hidden");
    const fragment = document.createDocumentFragment();
    storyPages.forEach((story) => fragment.appendChild(createStoryCard(story)));
    storiesContainer.appendChild(fragment);
  }

  async function renderIssues() {
    issuesContainer.innerHTML = "";
    try {
      const response = await fetch("data/stats.json");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const stats = await response.json();

      if (!stats.topProblems || stats.topProblems.length === 0) {
        issuesEmpty.classList.remove("hidden");
        return;
      }
      issuesEmpty.classList.add("hidden");

      const fragment = document.createDocumentFragment();
      stats.topProblems.forEach((problem) => {
        const card = document.createElement("article");
        card.className = "card card--issue";

        const titleLink = document.createElement("a");
        titleLink.className = "card__title";
        titleLink.href = `page/${problem.slug}.html`;
        titleLink.textContent = problem.title || problem.slug;
        card.appendChild(titleLink);

        const meta = document.createElement("div");
        meta.className = "card__meta";
        meta.innerHTML = `
          <span class="issue-score">Score: ${problem.score}</span>
          <span class="issue-count">Issues: ${problem.issues_total}</span>
        `;
        card.appendChild(meta);

        const details = document.createElement("div");
        details.className = "issue-details";
        if (problem.issues_internal_missing > 0) {
          details.innerHTML += `<span class="issue-badge issue-badge--internal">Internal missing: ${problem.issues_internal_missing}</span>`;
        }
        if (problem.issues_service > 0) {
          details.innerHTML += `<span class="issue-badge issue-badge--service">Service: ${problem.issues_service}</span>`;
        }
        if (problem.issues_unknown > 0) {
          details.innerHTML += `<span class="issue-badge issue-badge--unknown">Unknown: ${problem.issues_unknown}</span>`;
        }
        card.appendChild(details);

        fragment.appendChild(card);
      });
      issuesContainer.appendChild(fragment);
    } catch (error) {
      console.warn("⚠️  Failed to load issues:", error.message);
      issuesEmpty.classList.remove("hidden");
    }
  }

  async function renderOrphans() {
    orphansContainer.innerHTML = "";
    try {
      const response = await fetch("data/orphans.json");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const orphansData = await response.json();

      if (!orphansData.orphans || orphansData.orphans.length === 0) {
        orphansEmpty.classList.remove("hidden");
        return;
      }
      orphansEmpty.classList.add("hidden");

      const fragment = document.createDocumentFragment();
      orphansData.orphans.forEach((orphan) => {
        const card = createCard({
          slug: orphan.slug,
          title: orphan.title,
          status: orphan.status,
          url: orphan.url,
          summary: null,
          tags: []
        });
        fragment.appendChild(card);
      });
      orphansContainer.appendChild(fragment);
    } catch (error) {
      console.warn("⚠️  Failed to load orphans:", error.message);
      orphansEmpty.classList.remove("hidden");
    }
  }

  async function renderDiagnostics() {
    if (!diagnosticsDashboard) return;
    
    diagnosticsDashboard.innerHTML = "";
    
    try {
      const [statsResponse, pagesResponse, orphansResponse] = await Promise.all([
        fetch("data/stats.json").catch(() => null),
        fetch("data/pages.json").catch(() => null),
        fetch("data/orphans.json").catch(() => null)
      ]);
      
      const stats = statsResponse?.ok ? await statsResponse.json() : null;
      const pages = pagesResponse?.ok ? await pagesResponse.json() : null;
      const orphans = orphansResponse?.ok ? await orphansResponse.json() : null;
      
      if (!stats) {
        if (diagnosticsEmpty) diagnosticsEmpty.classList.remove("hidden");
        return;
      }
      
      if (diagnosticsEmpty) diagnosticsEmpty.classList.add("hidden");
      
      // Основные метрики
      const metricsSection = document.createElement("div");
      metricsSection.className = "diagnostics-metrics";
      
      const totals = stats.totals || {};
      const statuses = totals.statuses || {};
      
      metricsSection.innerHTML = `
        <h2 class="diagnostics-section-title">📊 Основные метрики</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${totals.pages || 0}</div>
            <div class="metric-label">Всего страниц</div>
          </div>
          <div class="metric-card metric-card--ready">
            <div class="metric-value">${statuses.ready || 0}</div>
            <div class="metric-label">Ready</div>
          </div>
          <div class="metric-card metric-card--review">
            <div class="metric-value">${statuses.review || 0}</div>
            <div class="metric-label">Review</div>
          </div>
          <div class="metric-card metric-card--draft">
            <div class="metric-value">${statuses.draft || 0}</div>
            <div class="metric-label">Draft</div>
          </div>
        </div>
      `;
      
      diagnosticsDashboard.appendChild(metricsSection);
      
      // Проблемы и issues
      const issuesSection = document.createElement("div");
      issuesSection.className = "diagnostics-issues";
      
      const issuesTotal = totals.issues_total || 0;
      const issuesBreakdown = {
        internal: totals.issues_internal_missing || 0,
        service: totals.issues_service || 0,
        external: totals.issues_external || 0,
        unknown: totals.issues_unknown || 0
      };
      
      issuesSection.innerHTML = `
        <h2 class="diagnostics-section-title">🔍 Проблемы со ссылками</h2>
        <div class="metrics-grid">
          <div class="metric-card metric-card--issues">
            <div class="metric-value">${issuesTotal}</div>
            <div class="metric-label">Всего проблем</div>
          </div>
          ${issuesBreakdown.internal > 0 ? `
          <div class="metric-card metric-card--warning">
            <div class="metric-value">${issuesBreakdown.internal}</div>
            <div class="metric-label">Internal missing</div>
          </div>
          ` : ''}
          ${issuesBreakdown.service > 0 ? `
          <div class="metric-card metric-card--warning">
            <div class="metric-value">${issuesBreakdown.service}</div>
            <div class="metric-label">Service links</div>
          </div>
          ` : ''}
          ${issuesBreakdown.external > 0 ? `
          <div class="metric-card">
            <div class="metric-value">${issuesBreakdown.external}</div>
            <div class="metric-label">External</div>
          </div>
          ` : ''}
          ${issuesBreakdown.unknown > 0 ? `
          <div class="metric-card metric-card--warning">
            <div class="metric-value">${issuesBreakdown.unknown}</div>
            <div class="metric-label">Unknown</div>
          </div>
          ` : ''}
        </div>
      `;
      
      diagnosticsDashboard.appendChild(issuesSection);
      
      // Сиротские страницы
      if (orphans && orphans.orphans && orphans.orphans.length > 0) {
        const orphansSection = document.createElement("div");
        orphansSection.className = "diagnostics-orphans";
        
        orphansSection.innerHTML = `
          <h2 class="diagnostics-section-title">📄 Сиротские страницы</h2>
          <div class="metric-card metric-card--warning">
            <div class="metric-value">${orphans.orphans.length}</div>
            <div class="metric-label">Страниц без маршрутов</div>
          </div>
        `;
        
        diagnosticsDashboard.appendChild(orphansSection);
      }
      
      // Статистика по статусам (процент ready)
      if (totals.pages > 0) {
        const readyPercent = Math.round((statuses.ready / totals.pages) * 100);
        const progressSection = document.createElement("div");
        progressSection.className = "diagnostics-progress";
        
        progressSection.innerHTML = `
          <h2 class="diagnostics-section-title">📈 Прогресс готовности</h2>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${readyPercent}%"></div>
          </div>
          <div class="progress-text">${readyPercent}% страниц в статусе Ready</div>
        `;
        
        diagnosticsDashboard.appendChild(progressSection);
      }
      
      // Информация о генерации
      if (stats.generatedAt) {
        const infoSection = document.createElement("div");
        infoSection.className = "diagnostics-info";
        
        const generatedDate = new Date(stats.generatedAt);
        const formattedDate = generatedDate.toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        infoSection.innerHTML = `
          <div class="diagnostics-meta">
            <span>Обновлено: ${formattedDate}</span>
            ${stats.version ? `<span>Версия: ${stats.version}</span>` : ''}
          </div>
        `;
        
        diagnosticsDashboard.appendChild(infoSection);
      }
      
    } catch (error) {
      console.warn("⚠️  Failed to load diagnostics:", error.message);
      if (diagnosticsEmpty) diagnosticsEmpty.classList.remove("hidden");
    }
  }

  async function renderUnresolvedTerms() {
    unresolvedTermsContainer.innerHTML = "";
    try {
      const response = await fetch("data/candidates_kb.json");
      if (!response.ok) {
        if (response.status === 404) {
          unresolvedTermsEmpty.classList.remove("hidden");
          return;
        }
        throw new Error(`status ${response.status}`);
      }
      const candidatesData = await response.json();

      if (!candidatesData.candidates || candidatesData.candidates.length === 0) {
        unresolvedTermsEmpty.classList.remove("hidden");
        return;
      }
      unresolvedTermsEmpty.classList.add("hidden");

      // Загружаем список существующих терминов KB для фильтрации
      const kbPages = pages.filter(page =>
        (page.machine_tags || []).some(tag => tag.startsWith('product/kb'))
      );
      const existingSlugs = new Set(kbPages.map(page => page.slug));

      // Фильтруем только те термины, которых еще нет в KB
      const unresolved = candidatesData.candidates.filter(candidate =>
        !existingSlugs.has(candidate.slug)
      );

      if (unresolved.length === 0) {
        unresolvedTermsEmpty.classList.remove("hidden");
        return;
      }
      unresolvedTermsEmpty.classList.add("hidden");

      const fragment = document.createDocumentFragment();
      unresolved.forEach((candidate) => {
        const card = document.createElement("div");
        card.className = "card";

        const title = document.createElement("h3");
        title.className = "card__title";
        title.textContent = candidate.term;
        card.appendChild(title);

        const details = document.createElement("div");
        details.className = "card__details";
        details.innerHTML = `
          <span class="term-slug">Slug: <code>${candidate.slug}</code></span>
          <span class="term-frequency">Частота: ${candidate.frequency}</span>
          ${candidate.issue_url ? `<a href="${candidate.issue_url}" target="_blank" class="term-issue-link">Issue →</a>` : ''}
        `;
        card.appendChild(details);

        if (candidate.contexts && candidate.contexts.length > 0) {
          const context = document.createElement("div");
          context.className = "card__summary";
          context.innerHTML = `<p><em>${candidate.contexts[0].substring(0, 150)}${candidate.contexts[0].length > 150 ? '...' : ''}</em></p>`;
          card.appendChild(context);
        }

        if (candidate.files && candidate.files.length > 0) {
          const files = document.createElement("div");
          files.className = "card__meta";
          files.innerHTML = `<small>Файлы: ${candidate.files.slice(0, 2).map(f => `<code>${f.split('/').pop()}</code>`).join(', ')}${candidate.files.length > 2 ? '...' : ''}</small>`;
          card.appendChild(files);
        }

        fragment.appendChild(card);
      });
      unresolvedTermsContainer.appendChild(fragment);
    } catch (error) {
      console.warn("⚠️  Failed to load unresolved terms:", error.message);
      unresolvedTermsEmpty.classList.remove("hidden");
    }
  }

  function setActivePanel(panel) {
    activePanel = panel;
    const storiesBanner = document.getElementById("stories-banner");
    if (panel === "stories") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.remove("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "issues") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.remove("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "orphans") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.remove("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "unresolved-terms") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.remove("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "diagnostics") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.remove("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "kb-index") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.remove("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else if (panel === "stories-index") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.remove("hidden");
      controls?.classList.add("hidden");
      if (storiesBanner) storiesBanner.classList.add("hidden");
    } else {
      docsPanel.classList.remove("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      orphansPanel.classList.add("hidden");
      if (unresolvedTermsPanel) unresolvedTermsPanel.classList.add("hidden");
      if (diagnosticsPanel) diagnosticsPanel.classList.add("hidden");
      if (kbIndexPanel) kbIndexPanel.classList.add("hidden");
      if (storiesIndexPanel) storiesIndexPanel.classList.add("hidden");
      controls?.classList.remove("hidden");
      if (storiesBanner) storiesBanner.classList.remove("hidden");
    }
    viewButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.panel === panel);
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      currentStatus = button.dataset.status;
      currentPage = 1; // Сбрасываем на первую страницу при изменении фильтра
      localStorage.setItem("explorer-status", currentStatus);
      updateURL();
      renderDocs();
    });
  });

  // Восстанавливаем активную кнопку фильтра
  const activeFilterButton = filterButtons.find((btn) => btn.dataset.status === currentStatus);
  if (activeFilterButton) {
    filterButtons.forEach((btn) => btn.classList.remove("is-active"));
    activeFilterButton.classList.add("is-active");
  }

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sortButtons.forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      currentSort = button.dataset.sort;
      currentPage = 1; // Сбрасываем на первую страницу при изменении сортировки
      localStorage.setItem("explorer-sort", currentSort);
      updateURL();
      renderDocs();
    });
  });

  // Восстанавливаем активную кнопку сортировки
  const activeSortButton = sortButtons.find((btn) => btn.dataset.sort === currentSort);
  if (activeSortButton) {
    sortButtons.forEach((btn) => btn.classList.remove("is-active"));
    activeSortButton.classList.add("is-active");
  }

  // Toggle "Ready only"
  const readyOnlyToggle = document.createElement("label");
  readyOnlyToggle.className = "ready-only-toggle";
  readyOnlyToggle.innerHTML = `
    <input type="checkbox" ${readyOnly ? "checked" : ""} />
    <span>Ready only</span>
  `;
  const checkbox = readyOnlyToggle.querySelector("input");
  checkbox.addEventListener("change", (e) => {
    readyOnly = e.target.checked;
    currentPage = 1; // Сбрасываем на первую страницу при изменении фильтра Ready only
    localStorage.setItem("explorer-ready-only", readyOnly ? "true" : "false");
    updateURL();
    renderDocs();
  });

  // Добавляем tooltip для Ready only
  readyOnlyToggle.title = "Показать только страницы со статусом ready";
  const filtersGroup = document.querySelector(".filters");
  if (filtersGroup) {
    filtersGroup.parentNode.insertBefore(readyOnlyToggle, filtersGroup.nextSibling);
  }

  // Добавляем кнопку "Copy link"
  const copyLinkButton = document.createElement("button");
  copyLinkButton.id = "copy-link-button";
  copyLinkButton.type = "button";
  copyLinkButton.className = "copy-link-button";
  copyLinkButton.textContent = "Copy link";
  copyLinkButton.title = "Скопировать ссылку с текущими фильтрами";
  copyLinkButton.addEventListener("click", copyCurrentURL);
  const controlsContainer = document.querySelector(".controls");
  if (controlsContainer) {
    controlsContainer.appendChild(copyLinkButton);
  }

  // Если мы на странице тега, добавляем breadcrumbs и заголовок
  if (tagFromHash) {
    const content = document.querySelector(".content");
    if (content && !content.querySelector(".breadcrumbs")) {
      const breadcrumbs = document.createElement("nav");
      breadcrumbs.className = "breadcrumbs";
      breadcrumbs.setAttribute("aria-label", "Навигационная цепочка");
      const baseURL = `${window.location.pathname}${window.location.search}`;
      breadcrumbs.innerHTML = `
        <a href="${baseURL}" class="breadcrumbs__link">Главная</a>
        <span class="breadcrumbs__separator">→</span>
        <span class="breadcrumbs__current">Тег: ${escapeHtml(tagFromHash)}</span>
      `;
      content.insertBefore(breadcrumbs, content.firstChild);

      // Обновляем заголовок страницы
      document.title = `Тег: ${tagFromHash} — Vova & Petrova Docs`;
    }
  }

  // Восстанавливаем значение поиска из URL
  if (currentSearch) {
    searchInput.value = currentSearch;
  }

  // Обработчик поиска
  let searchTimeout;
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = value;
      currentPage = 1; // Сбрасываем на первую страницу при изменении поиска
      updateURL();
      renderDocs();
    }, 150);
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPanel = button.dataset.panel;
      if (!targetPanel || targetPanel === activePanel) return;
      setActivePanel(targetPanel);
      updateURL();
      if (targetPanel === "issues") {
        renderIssues();
      } else if (targetPanel === "orphans") {
        renderOrphans();
      } else if (targetPanel === "unresolved-terms") {
        renderUnresolvedTerms();
      } else if (targetPanel === "diagnostics") {
        renderDiagnostics();
      } else if (targetPanel === "kb-index") {
        renderKBIndex().catch((error) => {
          console.error("Failed to render KB index:", error);
        });
      } else if (targetPanel === "stories-index") {
        renderStoriesIndex().catch((error) => {
          console.error("Failed to render Stories index:", error);
        });
      }
    });
  });

  // Баннер Stories теперь информационный, без кнопки

  async function renderKBIndex() {
    if (!kbIndexLetters || !kbIndexContent) return;

    kbIndexLetters.innerHTML = "";
    kbIndexContent.innerHTML = "";

    try {
      const response = await fetch("data/kb-index.json");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const kbIndex = await response.json();

      if (!kbIndex.letters || kbIndex.letters.length === 0) {
        if (kbIndexEmpty) kbIndexEmpty.classList.remove("hidden");
        return;
      }
      if (kbIndexEmpty) kbIndexEmpty.classList.add("hidden");

      // Рендерим навигацию по буквам
      const lettersFragment = document.createDocumentFragment();
      kbIndex.letters.forEach(letter => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "kb-index-letter";
        button.textContent = letter;
        button.dataset.letter = letter;
        button.addEventListener("click", () => {
          // Убираем активность с других кнопок
          kbIndexLetters.querySelectorAll(".kb-index-letter").forEach(btn => {
            btn.classList.remove("is-active");
          });
          button.classList.add("is-active");

          // Показываем страницы для выбранной буквы
          renderKBIndexLetter(letter, kbIndex.index[letter]);
        });
        lettersFragment.appendChild(button);
      });
      kbIndexLetters.appendChild(lettersFragment);

      // По умолчанию показываем первую букву
      if (kbIndex.letters.length > 0) {
        const firstLetter = kbIndex.letters[0];
        const firstButton = kbIndexLetters.querySelector(`[data-letter="${firstLetter}"]`);
        if (firstButton) {
          firstButton.classList.add("is-active");
          renderKBIndexLetter(firstLetter, kbIndex.index[firstLetter]);
        }
      }
    } catch (error) {
      console.warn("⚠️  Failed to load KB index:", error.message);
      if (kbIndexEmpty) kbIndexEmpty.classList.remove("hidden");
    }
  }

  function renderKBIndexLetter(letter, pages) {
    if (!kbIndexContent) return;

    kbIndexContent.innerHTML = "";

    const heading = document.createElement("h2");
    heading.className = "kb-index-letter-heading";
    heading.textContent = `Буква "${letter}" (${pages.length} страниц)`;
    kbIndexContent.appendChild(heading);

    const fragment = document.createDocumentFragment();
    pages.forEach(page => {
      const card = createCard({
        slug: page.slug,
        title: page.title,
        status: page.status,
        url: page.url,
        summary: page.summary,
        tags: []
      });
      fragment.appendChild(card);
    });
    kbIndexContent.appendChild(fragment);
  }

  async function renderStoriesIndex() {
    if (!storiesIndexGroups || !storiesIndexContent) return;

    storiesIndexGroups.innerHTML = "";
    storiesIndexContent.innerHTML = "";

    try {
      const response = await fetch("data/stories-index.json");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const storiesIndex = await response.json();

      if (!storiesIndex.groups || storiesIndex.groups.length === 0) {
        if (storiesIndexEmpty) storiesIndexEmpty.classList.remove("hidden");
        return;
      }
      if (storiesIndexEmpty) storiesIndexEmpty.classList.add("hidden");

      // Рендерим навигацию по группам
      const groupsFragment = document.createDocumentFragment();
      storiesIndex.groups.forEach(group => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stories-index-group";
        // Форматируем название группы
        let groupLabel = group;
        if (group.match(/^\d{4}-\d{2}$/)) {
          // Группа по дате (YYYY-MM)
          const [year, month] = group.split('-');
          const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                             'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
          const monthName = monthNames[parseInt(month) - 1] || month;
          groupLabel = `${monthName} ${year}`;
        } else if (group.startsWith('episodes-')) {
          // Группа по batch'ам эпизодов
          const match = group.match(/episodes-(\d+)-(\d+)/);
          if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            groupLabel = `Эпизоды ${start}-${end}`;
          }
        } else if (group === 'other') {
          groupLabel = 'Прочее';
        }
        button.textContent = groupLabel;
        button.dataset.group = group;
        button.addEventListener("click", () => {
          // Убираем активность с других кнопок
          storiesIndexGroups.querySelectorAll(".stories-index-group").forEach(btn => {
            btn.classList.remove("is-active");
          });
          button.classList.add("is-active");

          // Показываем истории для выбранной группы
          renderStoriesIndexGroup(group, storiesIndex.index[group]);
        });
        groupsFragment.appendChild(button);
      });
      storiesIndexGroups.appendChild(groupsFragment);

      // По умолчанию показываем первую группу
      if (storiesIndex.groups.length > 0) {
        const firstGroup = storiesIndex.groups[0];
        const firstButton = storiesIndexGroups.querySelector(`[data-group="${firstGroup}"]`);
        if (firstButton) {
          firstButton.classList.add("is-active");
          renderStoriesIndexGroup(firstGroup, storiesIndex.index[firstGroup]);
        }
      }
    } catch (error) {
      console.warn("⚠️  Failed to load Stories index:", error.message);
      if (storiesIndexEmpty) storiesIndexEmpty.classList.remove("hidden");
    }
  }

  function renderStoriesIndexGroup(group, stories) {
    if (!storiesIndexContent) return;

    storiesIndexContent.innerHTML = "";

    // Форматируем заголовок группы
    let groupHeading = group;
    if (group.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = group.split('-');
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      const monthName = monthNames[parseInt(month) - 1] || month;
      groupHeading = `${monthName} ${year}`;
    } else if (group.startsWith('episodes-')) {
      const match = group.match(/episodes-(\d+)-(\d+)/);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        groupHeading = `Эпизоды ${start}-${end}`;
      }
    } else if (group === 'other') {
      groupHeading = 'Прочее';
    }

    const heading = document.createElement("h2");
    heading.className = "stories-index-group-heading";
    heading.textContent = `${groupHeading} (${stories.length} ${pluralizeStory(stories.length)})`;
    storiesIndexContent.appendChild(heading);

    const fragment = document.createDocumentFragment();
    stories.forEach(story => {
      const card = createStoryCard({
        slug: story.slug,
        title: story.title,
        status: story.status,
        url: story.url,
        summary: story.summary,
        story_order: story.story_order,
        story_type: story.story_type
      });
      fragment.appendChild(card);
    });
    storiesIndexContent.appendChild(fragment);
  }

  renderDocs();
  renderStories();
  setActivePanel(activePanel);
  if (activePanel === "orphans") {
    renderOrphans();
  } else if (activePanel === "unresolved-terms") {
    renderUnresolvedTerms();
  } else if (activePanel === "kb-index") {
    renderKBIndex().catch((error) => {
      console.error("Failed to render KB index:", error);
    });
  } else if (activePanel === "stories-index") {
    renderStoriesIndex().catch((error) => {
      console.error("Failed to render Stories index:", error);
    });
  }
}

function applyStatusBadge(element, status) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  element.className = `status-badge ${meta.className}`;
  element.textContent = `${meta.emoji} ${meta.label}`;
}

function renderTags(container, tags) {
  container.innerHTML = "";
  if (!tags || tags.length === 0) {
    container.textContent = "Без тегов";
    return;
  }
  const fragment = document.createDocumentFragment();
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;
    fragment.appendChild(chip);
  });
  container.appendChild(fragment);
}

function buildSlugReference(pages) {
  const map = new Map();
  pages.forEach((page) => {
    const slug = page.slug;
    const variants = new Set([
      page.url.replace(/^\.\//, ""),
      page.url.replace(/^\.\//, "").replace(/^docs\//, ""),
      `${slug}`,
      `${slug}.md`
    ]);
    variants.forEach((item) => map.set(item.toLowerCase(), slug));
  });
  return map;
}

function normalizeReferenceCandidates(reference) {
  const queue = [];
  const seen = new Set();
  const addCandidate = (value) => {
    if (!value) return;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    queue.push(normalized);
  };

  const base = reference
    .replace(/^(\.\/)+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^docs\//, "");

  addCandidate(base);
  if (base.endsWith(".md")) {
    addCandidate(base.replace(/\.md$/i, ""));
  }
  const withoutHashMd = base.replace(/-[0-9a-f]{6,}\.md$/i, ".md");
  addCandidate(withoutHashMd);
  if (withoutHashMd.endsWith(".md")) {
    addCandidate(withoutHashMd.replace(/\.md$/i, ""));
  }
  addCandidate(base.replace(/-[0-9a-f]{6,}$/i, ""));

  return queue;
}

function findSlugForReference(slugMap, reference, linkMap) {
  const queue = normalizeReferenceCandidates(reference);

  for (const candidate of queue) {
    const slug = slugMap.get(candidate);
    if (slug) return slug;
  }

  if (linkMap?.exact) {
    for (const candidate of queue) {
      const mapped =
        linkMap.exact[candidate] ||
        linkMap.exact[`docs/${candidate}`] ||
        linkMap.exact[`${candidate}.md`];
      if (mapped) return mapped;
    }
  }

  if (Array.isArray(linkMap?.patterns)) {
    for (const pattern of linkMap.patterns) {
      if (!pattern?.match) continue;
      try {
        const regex = new RegExp(pattern.match, "i");
        for (const candidate of queue) {
          if (!regex.test(candidate)) continue;
          const replacement =
            pattern.replacement != null
              ? candidate.replace(regex, pattern.replacement)
              : candidate.replace(regex, "");
          return replacement;
        }
      } catch (error) {
        console.warn("⚠️  Invalid pattern in link-map:", pattern.match, error);
      }
    }
  }

  return null;
}

function addLinkChip(anchor, kind, label, tooltip) {
  const chip = document.createElement("span");
  chip.className = `link-chip link-chip--${kind}`;
  chip.textContent = label;
  if (tooltip) chip.title = tooltip;
  anchor.insertAdjacentElement("afterend", chip);
}

function markExternal(anchor) {
  anchor.dataset.linkKind = "external";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  addLinkChip(anchor, "external", "external");
}

function markUnknown(anchor, href) {
  anchor.dataset.linkKind = "unknown";
  addLinkChip(anchor, "unknown", "не сопоставлено", href);
}

function markService(anchor) {
  anchor.dataset.linkKind = "service";
  addLinkChip(anchor, "service", "service");
}

function isExternalHref(href) {
  if (!href) return false;
  const lower = href.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("/") ||
    lower.endsWith(".csv")
  );
}

function rewriteInternalLinks(rootElement, pages, linkMap) {
  const slugMap = buildSlugReference(pages);
  const pageMap = new Map(pages.map((page) => [page.slug, page]));

  rootElement.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("mailto:")) return;
    if (href.startsWith("#")) return;

    if (isExternalHref(href)) {
      markExternal(anchor);
      return;
    }

    const [pathPart, hashPart] = href.split("#");
    const slug = findSlugForReference(slugMap, pathPart, linkMap);
    if (!slug) {
      markUnknown(anchor, href);
      return;
    }
    const hash = hashPart ? `#${hashPart}` : "";
    const target = `../page/${slug}.html${hash}`;
    anchor.setAttribute("href", target);

    const targetPage = pageMap.get(slug);
    if (targetPage?.service) {
      markService(anchor);
    }
  });
}

function resolveMarkdownUrl(relativePath) {
  const host = window.location.hostname;
  const isGithubPages = host.endsWith("github.io");
  if (isGithubPages) {
    return `https://raw.githubusercontent.com/utemix-lab/vovaipetrova-core/main/${relativePath}`;
  }
  return `../${relativePath}`;
}

async function loadLinkMap(path) {
  if (LINK_MAP_CACHE[path]) return LINK_MAP_CACHE[path];
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    const normalized = {
      exact: data?.exact || {},
      patterns: Array.isArray(data?.patterns) ? data.patterns : []
    };
    LINK_MAP_CACHE[path] = normalized;
    return normalized;
  } catch (error) {
    console.warn("⚠️  Failed to load link map:", error.message);
    const fallback = { exact: {}, patterns: [] };
    LINK_MAP_CACHE[path] = fallback;
    return fallback;
  }
}

async function renderPage() {
  const slug = window.__PAGE_SLUG__;
  if (!slug) {
    document.getElementById("page-content").textContent =
      "Не указан slug страницы.";
    return;
  }

  const pages = await loadPages("../data/pages.json");
  const entry = pages.find((page) => page.slug === slug);
  if (!entry) {
    document.getElementById("page-content").textContent =
      "Страница не найдена.";
    return;
  }

  document.title = `Документ — ${entry.title || entry.slug}`;

  // Настройка кнопки "Back to list" с сохранением сортировки и фильтров
  const backToList = document.getElementById("back-to-list");
  if (backToList) {
    const sort = localStorage.getItem("explorer-sort") || "route";
    const readyOnly = localStorage.getItem("explorer-ready-only") === "true";
    const tagFilter = localStorage.getItem("explorer-tag-filter");
    const panel = isStoryPage(entry) ? "stories" : "docs";

    let href = `../index.html#${panel}-panel`;
    const params = new URLSearchParams();
    if (sort !== "route") params.set("sort", sort);
    if (readyOnly) params.set("ready", "1");
    if (tagFilter) params.set("tag", tagFilter);
    if (params.toString()) href += `?${params.toString()}`;

    backToList.href = href;
  }

  const breadcrumbCurrent = document.getElementById("breadcrumb-current");
  if (isStoryPage(entry)) {
    let breadcrumbHTML = `<a href="../index.html#stories-panel">Stories</a>`;

    // Если есть series_id, добавляем навигацию по серии
    if (entry.series_id) {
      const seriesStories = pages.filter(page =>
        isStoryPage(page) &&
        page.series_id === entry.series_id &&
        page.slug !== entry.slug
      ).sort((a, b) => {
        const orderA = getStoryOrder(a) ?? 999;
        const orderB = getStoryOrder(b) ?? 999;
        return orderA - orderB;
      });

      if (seriesStories.length > 0) {
        breadcrumbHTML += `<span aria-hidden="true"> › </span>`;
        breadcrumbHTML += `<a href="../index.html#stories-panel?series=${encodeURIComponent(entry.series_id)}">Серия: ${escapeHtml(entry.series_id)}</a>`;
      }
    }

    breadcrumbHTML += `<span aria-hidden="true"> › </span>`;
    breadcrumbHTML += `<span>${escapeHtml(entry.title || entry.slug)}</span>`;
    breadcrumbCurrent.innerHTML = breadcrumbHTML;
  } else {
    breadcrumbCurrent.textContent = entry.title || entry.slug;
  }
  document.getElementById("page-heading").textContent =
    entry.title || entry.slug;
  document.getElementById("page-summary").textContent =
    entry.summary || "Описание отсутствует.";
  applyStatusBadge(document.getElementById("page-status"), entry.status);
  renderTags(document.getElementById("page-tags"), entry.tags);

  const storyBanner = document.getElementById("story-banner");
  if (storyBanner) {
    if (isStoryPage(entry)) {
      const label = storyBanner.querySelector(".story-banner__label");
      const numberText = formatStoryOrder(entry);
      label.textContent = numberText
        ? `Stories · эпизод ${numberText}`
        : "Stories";
      storyBanner.classList.remove("hidden");
    } else {
      storyBanner.classList.add("hidden");
    }
  }

  const markdownPath = resolveMarkdownUrl(entry.url);
  const linkMap = await loadLinkMap("../data/link-map.json");
  const response = await fetch(markdownPath);
  if (!response.ok) {
    document.getElementById("page-content").textContent =
      "Не удалось загрузить markdown.";
    return;
  }
  const markdown = await response.text();
  marked.setOptions({
    mangle: false,
    headerIds: true,
    langPrefix: "language-"
  });
  const content = markdown.replace(/^---[\s\S]*?---/, "").trim();
  const html = marked.parse(content);
  const article = document.getElementById("page-content");
  article.innerHTML = html;
  rewriteInternalLinks(article, pages, linkMap);

  const headings = article.querySelectorAll("h2, h3");
  const relatedSection = Array.from(headings).find((node) =>
    node.textContent.trim().toLowerCase().startsWith("связано с")
  );
  if (relatedSection) {
    const relatedBlock = document.getElementById("related-block");
    const relatedTarget = document.getElementById("related-content");
    const list =
      relatedSection.nextElementSibling?.cloneNode(true) ??
      document.createElement("p");
    relatedTarget.innerHTML = "";
    relatedTarget.appendChild(list);
    rewriteInternalLinks(relatedTarget, pages, linkMap);
    relatedBlock.classList.remove("hidden");
  }

  // Навигация по серии (другие эпизоды с тем же series_id)
  if (isStoryPage(entry) && entry.series_id) {
    const seriesStories = pages.filter(page =>
      isStoryPage(page) &&
      page.series_id === entry.series_id &&
      page.slug !== entry.slug
    ).sort((a, b) => {
      const orderA = getStoryOrder(a) ?? 999;
      const orderB = getStoryOrder(b) ?? 999;
      return orderA - orderB;
    });

    if (seriesStories.length > 0) {
      const seriesBlock = document.getElementById("series-block");
      const seriesContent = document.getElementById("series-content");
      if (seriesBlock && seriesContent) {
        const list = document.createElement("ul");
        list.className = "series-list";

        seriesStories.forEach(story => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `../page/${story.slug}.html`;
          link.textContent = story.title || story.slug;
          if (story.story_order) {
            const orderText = formatStoryOrder(story);
            link.textContent = `${orderText ? `Эпизод ${orderText}: ` : ''}${link.textContent}`;
          }
          item.appendChild(link);
          list.appendChild(item);
        });

        seriesContent.innerHTML = "";
        seriesContent.appendChild(list);
        seriesBlock.classList.remove("hidden");
      }
    }
  }

  // Навигация по related_stories
  if (isStoryPage(entry) && entry.related_stories && Array.isArray(entry.related_stories) && entry.related_stories.length > 0) {
    const relatedStoriesList = entry.related_stories
      .map(ref => {
        // ref может быть slug или полный путь
        const slug = ref.includes('/') ? ref.split('/').pop().replace('.md', '') : ref;
        return pages.find(page => page.slug === slug || page.url === ref);
      })
      .filter(Boolean);

    if (relatedStoriesList.length > 0) {
      const relatedStoriesBlock = document.getElementById("related-stories-block");
      const relatedStoriesContent = document.getElementById("related-stories-content");
      if (relatedStoriesBlock && relatedStoriesContent) {
        const list = document.createElement("ul");
        list.className = "related-stories-list";

        relatedStoriesList.forEach(story => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `../page/${story.slug}.html`;
          link.textContent = story.title || story.slug;
          item.appendChild(link);
          list.appendChild(item);
        });

        relatedStoriesContent.innerHTML = "";
        relatedStoriesContent.appendChild(list);
        relatedStoriesBlock.classList.remove("hidden");
      }
    }
  }

  // Загружаем и отображаем backlinks
  try {
    const backlinksResponse = await fetch("../data/backlinks.json");
    if (backlinksResponse.ok) {
      const backlinks = await backlinksResponse.json();
      const pageBacklinks = backlinks[slug.toLowerCase()];
      if (pageBacklinks && pageBacklinks.length > 0) {
        const backlinksBlock = document.getElementById("backlinks-block");
        const backlinksContent = document.getElementById("backlinks-content");
        const list = document.createElement("ul");
        list.className = "backlinks-list";

        pageBacklinks.forEach(backlink => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `../page/${backlink.slug}.html`;
          link.textContent = backlink.title;
          item.appendChild(link);
          list.appendChild(item);
        });

        backlinksContent.innerHTML = "";
        backlinksContent.appendChild(list);
        backlinksBlock.classList.remove("hidden");
      }
    }
  } catch (error) {
    console.warn("Failed to load backlinks:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (VIEW === "index") {
    renderIndex().catch((error) => {
      console.error(error);
      const container = document.getElementById("cards");
      container.innerHTML = `<p>Ошибка загрузки данных: ${error.message}</p>`;
    });
  } else if (VIEW === "page") {
    renderPage().catch((error) => {
      console.error(error);
      const article = document.getElementById("page-content");
      article.textContent = `Ошибка загрузки страницы: ${error.message}`;
    });
  }
});

