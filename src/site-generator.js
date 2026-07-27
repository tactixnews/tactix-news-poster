import fs from "fs";
import path from "path";

const DOCS_DIR = "./docs";
const DATA_FILE = path.join(DOCS_DIR, "data", "articles.json");
const NAV_CATEGORIES = ["News", "Tutorial", "Tips & Trick"];
const SITE_URL = "https://tactixnews.github.io/tactix-news-poster";

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadArticles() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveArticles(articles) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2));
}

function categorySlug(category) {
  return slugify(category) + ".html";
}

function masthead(activePath = "") {
  return `
<header class="masthead">
  <div class="masthead-top">
    <a href="${activePath}index.html" class="logo">
      <img src="${activePath}images/tx-mark.png" alt="TACTIX">
      <span class="logo-wordmark">TACTIX</span>
    </a>
    <span class="tagline">Understanding the strategy behind every game</span>
  </div>
  <nav class="masthead-nav">
    ${NAV_CATEGORIES.map(c => `<a href="${activePath}${categorySlug(c)}">${escapeHtml(c)}</a>`).join("\n    ")}
  </nav>
</header>`;
}

function footer() {
  return `
<footer>
  TACTIX &mdash; Global gaming media. Tabletop, TTRPG, Strategy.
</footer>`;
}

function baseLayout({ title, activePath, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${activePath}style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
</head>
<body>
${masthead(activePath)}
${bodyHtml}
${footer()}
</body>
</html>`;
}

function articleCard(article, activePath) {
  return `
<a class="card" href="${activePath}articles/${article.slug}.html">
  <div class="card-image" style="background-image:url('${activePath}images/${article.image}')"></div>
  <div class="card-body">
    <span class="category-tag">${escapeHtml(article.category)}</span>
    <h3>${escapeHtml(article.headline)}</h3>
    <p class="excerpt">${escapeHtml(article.excerpt)}</p>
    <p class="date">${article.date}</p>
  </div>
</a>`;
}

function buildHomepage(articles) {
  const [featured, ...rest] = articles;
  const heroHtml = featured
    ? `
<section class="hero" style="background-image:url('images/${featured.image}')">
  <div class="hero-scrim">
    <span class="category-tag">${escapeHtml(featured.category)}</span>
    <h1><a href="articles/${featured.slug}.html">${escapeHtml(featured.headline)}</a></h1>
    <p class="excerpt">${escapeHtml(featured.excerpt)}</p>
  </div>
</section>`
    : "";

  const gridHtml = `
<h2 class="section-label">Latest</h2>
<div class="grid">
  ${rest.map(a => articleCard(a, "")).join("\n  ")}
</div>`;

  return baseLayout({
    title: "TACTIX — Understanding the strategy behind every game",
    activePath: "",
    bodyHtml: heroHtml + gridHtml
  });
}

function buildCategoryPage(category, articles) {
  const filtered = articles.filter(a => a.category === category);

  const bodyHtml = filtered.length
    ? `
<h2 class="section-label">${escapeHtml(category)}</h2>
<div class="grid">
  ${filtered.map(a => articleCard(a, "")).join("\n  ")}
</div>`
    : `
<h2 class="section-label">${escapeHtml(category)}</h2>
<p style="margin: 0 5vw 60px; opacity: 0.6;">No ${escapeHtml(category.toLowerCase())} articles yet — check back soon.</p>`;

  return baseLayout({
    title: `${category} — TACTIX`,
    activePath: "",
    bodyHtml
  });
}

function buildSitemap(articles) {
  const staticUrls = ["", ...NAV_CATEGORIES.map(categorySlug)];
  const articleUrls = articles.map(a => `articles/${a.slug}.html`);
  const allUrls = [...staticUrls, ...articleUrls];

  const urlEntries = allUrls
    .map(u => `  <url><loc>${SITE_URL}/${u}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

function buildArticlePage(article) {
  const bodyHtml = `
<article class="article-wrap">
  <span class="category-tag">${escapeHtml(article.category)}</span>
  <img class="article-hero-image" src="../images/${article.image}" alt="${escapeHtml(article.headline)}">
  <h1>${escapeHtml(article.headline)}</h1>
  <p class="article-meta">${article.date}</p>
  <div class="article-body">
    ${article.body
      .split("\n")
      .filter(p => p.trim())
      .map(p => `<p>${escapeHtml(p.trim())}</p>`)
      .join("\n    ")}
  </div>
  <div class="cta-block">
    Get free miniatures &mdash; <a href="${article.ctaUrl}" target="_blank" rel="noopener">${escapeHtml(article.ctaLabel)}</a>
  </div>
  ${article.sourceUrl ? `<p class="source-link">Source: <a href="${article.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(article.sourceUrl)}</a></p>` : ""}
</article>`;

  return baseLayout({
    title: `${article.headline} — TACTIX`,
    activePath: "../",
    bodyHtml
  });
}

/**
 * Adds a new article to the site: saves the branded image, writes the
 * article page, rebuilds the homepage, updates the data store.
 *
 * @param {object} story - from research.js
 * @param {Buffer} imageBuffer - final composited PNG from compose.js
 * @param {string} articleBody - long-form text from write-article.js
 * @param {{name: string, url: string}} storeLink - from store-links.js
 */
export function publishArticle(story, imageBuffer, articleBody, storeLink) {
  const slug = `${slugify(story.headline)}-${Date.now()}`;
  const imageFilename = `${slug}.jpg`;
  const date = new Date().toISOString().slice(0, 10);

  fs.mkdirSync(path.join(DOCS_DIR, "images"), { recursive: true });
  fs.mkdirSync(path.join(DOCS_DIR, "articles"), { recursive: true });
  fs.writeFileSync(path.join(DOCS_DIR, "images", imageFilename), imageBuffer);

  const article = {
    slug,
    headline: story.headline,
    category: story.category,
    excerpt: story.summary,
    body: articleBody,
    image: imageFilename,
    date,
    sourceUrl: story.sourceUrl,
    ctaLabel: `Get free ${storeLink.name.toLowerCase()} minis`,
    ctaUrl: storeLink.url
  };

  const articles = loadArticles();
  articles.unshift(article); // newest first
  saveArticles(articles);

  fs.writeFileSync(path.join(DOCS_DIR, "articles", `${slug}.html`), buildArticlePage(article));
  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), buildHomepage(articles));

  // Regenerate every nav category page so links never 404 or dead-end,
  // even for a category with zero articles yet.
  for (const category of NAV_CATEGORIES) {
    fs.writeFileSync(path.join(DOCS_DIR, categorySlug(category)), buildCategoryPage(category, articles));
  }

  fs.writeFileSync(path.join(DOCS_DIR, "sitemap.xml"), buildSitemap(articles));

  return article;
}
