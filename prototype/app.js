const STATUS_META = {
  ready: { label: "ready", emoji: "🟢", className: "status-ready" },
  review: { label: "review", emoji: "🟡", className: "status-review" },
  draft: { label: "draft", emoji: "⚪", className: "status-draft" }
};

const VIEW = document.body.dataset.view;
const LINK_MAP_CACHE = {};

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

function createCard(page, issueInfo) {
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
    summary.textContent =
      page.summary.length > 140
        ? `${page.summary.slice(0, 137).trim()}…`
        : page.summary;
    card.appendChild(summary);
  }

  const metrics = document.createElement("div");
  metrics.className = "card__metrics";
  const issuesTotal = issueInfo?.issues_total ?? 0;
  const scoreValue = issueInfo?.score ?? 0;

  const issuesBadge = document.createElement("span");
  issuesBadge.className = "metric-badge metric-badge--issues";
  issuesBadge.textContent = `Issues ${issuesTotal}`;
  metrics.appendChild(issuesBadge);

  const scoreBadge = document.createElement("span");
  scoreBadge.className = "metric-badge metric-badge--score";
  scoreBadge.textContent = `Score ${scoreValue}`;
  metrics.appendChild(scoreBadge);

  const counts = issueInfo?.issues || {};
  if (counts["internal-missing"] > 0) {
    const badge = document.createElement("span");
    badge.className = "metric-badge metric-badge--internal";
    badge.textContent = `Internal ${counts["internal-missing"]}`;
    metrics.appendChild(badge);
  }
  if (counts.service > 0) {
    const badge = document.createElement("span");
    badge.className = "metric-badge metric-badge--service";
    badge.textContent = `Service ${counts.service}`;
    metrics.appendChild(badge);
  }
  if (counts.external > 0) {
    const badge = document.createElement("span");
    badge.className = "metric-badge metric-badge--external";
    badge.textContent = `External ${counts.external}`;
    metrics.appendChild(badge);
  }
  card.appendChild(metrics);

  if (page.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "tag-list";
    for (const tag of page.tags) {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = tag;
      tags.appendChild(chip);
    }
    card.appendChild(tags);
  }

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

async function loadStats(basePath) {
  const response = await fetch(basePath);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить stats.json: ${response.status}`);
  }
  return response.json();
}

async function renderIndex() {
  const cardsContainer = document.getElementById("cards");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const filterButtons = Array.from(
    document.querySelectorAll(".filter-button")
  );
  const viewButtons = Array.from(
    document.querySelectorAll(".view-toggle__button")
  );
  const issuesPanel = document.getElementById("issues-panel");
  const issuesList = document.getElementById("issues-list");
  const topProblemsContainer = document.getElementById("top-problems");
  const filterReady = document.getElementById("filter-ready-issues");
  const filterInternal = document.getElementById("filter-internal-missing");
  const filterService = document.getElementById("filter-service");
  const filterExternal = document.getElementById("filter-external");

  const [allPages, stats] = await Promise.all([
    loadPages("data/pages.json"),
    loadStats("data/stats.json")
  ]);
  const visiblePages = allPages.filter((page) => page.service !== true);
  const pagesMap = new Map(allPages.map((page) => [page.slug, page]));
  const issueMap = new Map(
    (stats.issuesPerPage || []).map((issue) => [issue.slug, issue])
  );

  let currentStatus = "all";
  let currentSearch = "";
  let currentMode = "cards";
  const issueFilters = {
    ready: false,
    internal: false,
    service: false,
    external: false
  };

  function renderCards() {
    cardsContainer.innerHTML = "";
    const filtered = visiblePages.filter(byStatus(currentStatus, currentSearch));
    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    const fragment = document.createDocumentFragment();
    for (const page of filtered) {
      fragment.appendChild(createCard(page, issueMap.get(page.slug)));
    }
    cardsContainer.appendChild(fragment);
  }

  function applyIssueFilters(list) {
    return list.filter((item) => {
      if (
        issueFilters.ready &&
        !(item.status === "ready" && item.issues_total > 0)
      ) {
        return false;
      }
      if (issueFilters.internal && !(item.issues["internal-missing"] > 0)) {
        return false;
      }
      if (issueFilters.service && !(item.issues.service > 0)) {
        return false;
      }
      if (issueFilters.external && !(item.issues.external > 0)) {
        return false;
      }
      return true;
    });
  }

  function renderIssuesView() {
    const data = applyIssueFilters(stats.issuesPerPage || []);
    renderIssuesList(issuesList, data, pagesMap);
    renderTopProblems(
      topProblemsContainer,
      stats.topProblems?.length ? stats.topProblems : data.slice(0, 10),
      pagesMap
    );
  }

  function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    viewButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.viewMode === currentMode
      );
    });
    if (currentMode === "issues") {
      cardsContainer.classList.add("hidden");
      emptyState.classList.add("hidden");
      issuesPanel.classList.remove("hidden");
      renderIssuesView();
    } else {
      cardsContainer.classList.remove("hidden");
      issuesPanel.classList.add("hidden");
      renderCards();
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      currentStatus = button.dataset.status;
      renderCards();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchMode(button.dataset.viewMode);
    });
  });

  [filterReady, filterInternal, filterService, filterExternal].forEach(
    (checkbox) => {
      checkbox.addEventListener("change", () => {
        issueFilters.ready = filterReady.checked;
        issueFilters.internal = filterInternal.checked;
        issueFilters.service = filterService.checked;
        issueFilters.external = filterExternal.checked;
        renderIssuesView();
      });
    }
  );

  let searchTimeout;
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = value;
      renderCards();
    }, 150);
  });

  renderCards();
  renderIssuesView();
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

function renderIssuesList(container, items, pagesMap) {
  container.innerHTML = "";
  if (!items.length) {
    const stub = document.createElement("p");
    stub.textContent = "Нет карточек под выбранные фильтры.";
    container.appendChild(stub);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const page = pagesMap.get(item.slug);
    const row = document.createElement("article");
    row.className = "issue-row";

    const title = document.createElement("div");
    title.className = "issue-row__title";

    const link = document.createElement("a");
    link.href = `page/${item.slug}.html`;
    link.textContent = page?.title || item.slug;
    link.className = "card__title";
    title.appendChild(link);

    const badge = document.createElement("span");
    badge.className = "issue-row__score";
    badge.textContent = `Score ${item.score}`;
    title.appendChild(badge);
    row.appendChild(title);

    const status = document.createElement("span");
    applyStatusBadge(status, item.status);
    row.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "issue-row__meta";

    const total = document.createElement("span");
    total.className = "metric-badge metric-badge--issues";
    total.textContent = `Issues ${item.issues_total}`;
    meta.appendChild(total);

    if (item.issues["internal-missing"] > 0) {
      const badgeInternal = document.createElement("span");
      badgeInternal.className = "metric-badge metric-badge--internal";
      badgeInternal.textContent = `Internal ${item.issues["internal-missing"]}`;
      meta.appendChild(badgeInternal);
    }
    if (item.issues.service > 0) {
      const badgeService = document.createElement("span");
      badgeService.className = "metric-badge metric-badge--service";
      badgeService.textContent = `Service ${item.issues.service}`;
      meta.appendChild(badgeService);
    }
    if (item.issues.external > 0) {
      const badgeExternal = document.createElement("span");
      badgeExternal.className = "metric-badge metric-badge--external";
      badgeExternal.textContent = `External ${item.issues.external}`;
      meta.appendChild(badgeExternal);
    }
    row.appendChild(meta);

    if (page?.summary) {
      const summary = document.createElement("p");
      summary.className = "card__summary";
      summary.textContent =
        page.summary.length > 160
          ? `${page.summary.slice(0, 157).trim()}…`
          : page.summary;
      row.appendChild(summary);
    }

    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

function renderTopProblems(container, items, pagesMap) {
  container.innerHTML = "";
  if (!items.length) return;
  const title = document.createElement("h3");
  title.className = "issues-top__title";
  title.textContent = "Top problems";
  container.appendChild(title);

  const list = document.createElement("ol");
  items.slice(0, 10).forEach((item) => {
    const page = pagesMap.get(item.slug);
    const li = document.createElement("li");
    li.className = "issues-top__item";
    const link = document.createElement("a");
    link.href = `page/${item.slug}.html`;
    link.textContent = page?.title || item.slug;
    li.appendChild(link);

    const score = document.createElement("span");
    score.textContent = `Score ${item.score}`;
    li.appendChild(score);
    list.appendChild(li);
  });

  container.appendChild(list);
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
          const resolved =
            slugMap.get(replacement.toLowerCase()) ||
            linkMap.exact?.[replacement.toLowerCase()] ||
            replacement;
          if (resolved) return resolved;
        }
      } catch (error) {
        console.warn("⚠️  Invalid pattern in link-map:", pattern.match, error);
      }
    }
  }

  return null;
}

function rewriteInternalLinks(rootElement, pages, linkMap) {
  const slugMap = buildSlugReference(pages);

  rootElement.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    if (href.startsWith("#")) return;

    const [pathPart, hashPart] = href.split("#");
    const slug = findSlugForReference(slugMap, pathPart, linkMap);
    if (!slug) return;
    const hash = hashPart ? `#${hashPart}` : "";
    const target = `../page/${slug}.html${hash}`;
    anchor.setAttribute("href", target);
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
  document.getElementById("breadcrumb-current").textContent =
    entry.title || entry.slug;
  document.getElementById("page-heading").textContent =
    entry.title || entry.slug;
  document.getElementById("page-summary").textContent =
    entry.summary || "Описание отсутствует.";
  applyStatusBadge(document.getElementById("page-status"), entry.status);
  renderTags(document.getElementById("page-tags"), entry.tags);

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


