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
    const match = page.slug.match(/^(\d{1,2})/);
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
  // Читаем параметры из URL или localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace("#", "");
  
  let currentStatus = "all";
  let currentSearch = "";
  let currentSort = urlParams.get("sort") || localStorage.getItem("explorer-sort") || "route";
  let currentTagFilter = urlParams.get("tag") || localStorage.getItem("explorer-tag-filter") || null;
  let readyOnly = urlParams.get("ready") === "1" || localStorage.getItem("explorer-ready-only") === "true";
  let activePanel = hash.includes("stories") ? "stories" : hash.includes("issues") ? "issues" : "docs";
  
  // Сохраняем в localStorage
  if (urlParams.get("sort")) localStorage.setItem("explorer-sort", currentSort);
  if (urlParams.get("tag")) localStorage.setItem("explorer-tag-filter", currentTagFilter);
  if (urlParams.get("ready")) localStorage.setItem("explorer-ready-only", readyOnly ? "true" : "false");

  function renderDocs() {
    cardsContainer.innerHTML = "";
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
    
    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    const fragment = document.createDocumentFragment();
    for (const page of filtered) {
      const card = createCard(page);
      // Добавляем обработчики кликов на теги
      card.querySelectorAll(".tag-chip--clickable").forEach((chip) => {
        chip.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentTagFilter = currentTagFilter === chip.dataset.tag ? null : chip.dataset.tag;
          if (currentTagFilter) {
            localStorage.setItem("explorer-tag-filter", currentTagFilter);
          } else {
            localStorage.removeItem("explorer-tag-filter");
          }
          renderDocs();
          updateTagFilterUI();
        });
      });
      fragment.appendChild(card);
    }
    cardsContainer.appendChild(fragment);
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

  function setActivePanel(panel) {
    activePanel = panel;
    if (panel === "stories") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.remove("hidden");
      issuesPanel.classList.add("hidden");
      controls?.classList.add("hidden");
    } else if (panel === "issues") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.remove("hidden");
      controls?.classList.add("hidden");
    } else {
      docsPanel.classList.remove("hidden");
      storiesPanel.classList.add("hidden");
      issuesPanel.classList.add("hidden");
      controls?.classList.remove("hidden");
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
      renderDocs();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sortButtons.forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      currentSort = button.dataset.sort;
      localStorage.setItem("explorer-sort", currentSort);
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
    localStorage.setItem("explorer-ready-only", readyOnly ? "true" : "false");
    renderDocs();
  });
  const filtersGroup = document.querySelector(".filters");
  if (filtersGroup) {
    filtersGroup.parentNode.insertBefore(readyOnlyToggle, filtersGroup.nextSibling);
  }

  let searchTimeout;
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = value;
      renderDocs();
    }, 150);
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPanel = button.dataset.panel;
      if (!targetPanel || targetPanel === activePanel) return;
      setActivePanel(targetPanel);
      if (targetPanel === "issues") {
        renderIssues();
      }
    });
  });

  renderDocs();
  renderStories();
  setActivePanel("docs");
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
    breadcrumbCurrent.innerHTML = `
      <a href="../index.html#stories-panel">Stories</a>
      <span aria-hidden="true"> › </span>
      <span>${escapeHtml(entry.title || entry.slug)}</span>
    `;
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

