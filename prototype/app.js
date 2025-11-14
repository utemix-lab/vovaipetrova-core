const STATUS_META = {
  ready: { label: "ready", emoji: "🟢", className: "status-ready" },
  review: { label: "review", emoji: "🟡", className: "status-review" },
  draft: { label: "draft", emoji: "⚪", className: "status-draft" }
};

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
    summary.textContent =
      page.summary.length > 140
        ? `${page.summary.slice(0, 137).trim()}…`
        : page.summary;
    card.appendChild(summary);
  }

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
    summary.textContent = page.summary;
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

async function renderIndex() {
  const cardsContainer = document.getElementById("cards");
  const emptyState = document.getElementById("empty-state");
  const storiesContainer = document.getElementById("stories-list");
  const storiesEmpty = document.getElementById("stories-empty");
  const searchInput = document.getElementById("search-input");
  const filterButtons = Array.from(
    document.querySelectorAll(".filter-button")
  );
  const viewButtons = Array.from(document.querySelectorAll(".view-button"));
  const controls = document.querySelector(".controls");
  const docsPanel = document.getElementById("docs-panel");
  const storiesPanel = document.getElementById("stories-panel");

  const pages = await loadPages("data/pages.json");
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
  let currentStatus = "all";
  let currentSearch = "";
  let activePanel = "docs";

  function renderDocs() {
    cardsContainer.innerHTML = "";
    const filtered = docPages.filter(byStatus(currentStatus, currentSearch));
    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    const fragment = document.createDocumentFragment();
    for (const page of filtered) {
      fragment.appendChild(createCard(page));
    }
    cardsContainer.appendChild(fragment);
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

  function setActivePanel(panel) {
    activePanel = panel;
    if (panel === "stories") {
      docsPanel.classList.add("hidden");
      storiesPanel.classList.remove("hidden");
      controls?.classList.add("hidden");
    } else {
      docsPanel.classList.remove("hidden");
      storiesPanel.classList.add("hidden");
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
  document.getElementById("breadcrumb-current").textContent =
    entry.title || entry.slug;
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

