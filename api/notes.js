import { readFileSync, existsSync } from "fs";
import { join } from "path";

const POSTS_PATH = join(process.cwd(), "assets", "data", "posts.json");

function loadPosts() {
  if (!existsSync(POSTS_PATH)) return [];
  return JSON.parse(readFileSync(POSTS_PATH, "utf-8"));
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessage(msg) {
  if (!msg) return "";
  // Convert newlines to <br> and wrap paragraphs
  return msg
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

export default function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) {
    return res.status(404).send("Not found");
  }

  const posts = loadPosts();
  const post = posts.find((p) => p.id === slug);

  if (!post) {
    return res.status(404).send("Not found");
  }

  const title = post.title || "Flow's Table";
  const description = (post.message || post.story || "").substring(0, 160).replace(/\n/g, " ");
  const canonicalUrl = `https://flowstable.vercel.app/notes/${post.id}`;
  const datePublished = (post.created_time || "").substring(0, 10);

  // Photo markup
  let photoHtml = "";
  if (post.photos && post.photos.length > 0) {
    const photos = post.photos.slice(0, 3);
    photoHtml = photos
      .map(
        (p) =>
          `<img src="${escapeHtml(p)}" alt="${escapeHtml(post.alt || title)}" loading="lazy" style="max-width:100%;border-radius:8px;margin:8px 0;">`
      )
      .join("\n      ");
  }

  // Structured data
  const ogImage = post.photos && post.photos.length > 0 ? (post.photos[0].startsWith("http") ? post.photos[0] : `https://flowstable.vercel.app/${post.photos[0]}`) : "https://flowstable.vercel.app/assets/photos/press/0k8a8828.jpg";

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: description,
    image: ogImage,
    datePublished: datePublished,
    author: {
      "@type": "Organization",
      name: "Flow's Table",
      url: "https://flowstable.vercel.app",
    },
    publisher: {
      "@type": "Organization",
      name: "Flow's Table",
      url: "https://flowstable.vercel.app",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Flow's Table</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <script type="application/ld+json">${schema}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"></noscript>
    <link rel="stylesheet" href="assets/styles.css">
    <script src="assets/site-config.js" defer></script>
    <script src="assets/sanity-client.js" defer></script>
    <script src="assets/article-page.js" defer></script>
    <script src="assets/site.js" defer></script>
    <link rel="icon" type="image/x-icon" href="assets/photos/914737241717875_122093694105110108_3.jpg">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/home">
        <img src="assets/photos/logo_text_orange.png" alt="Flow's Table logo" height="32" style="object-fit: contain;">
      </a>
      <nav aria-label="Main navigation">
        <a href="/home#story">Story</a>
        <a href="/home#moments">Moments</a>
        <a href="/articles">Articles</a>
        <a href="/reels">Reels</a>
        <a href="/guests">Guests</a>
        <a href="/about">About Us</a>
      </nav>
    </header>

    <main class="archive-main">
      <section class="section archive-list">
        <div class="section-inner">
          <article>
            <h1>${escapeHtml(title)}</h1>
            ${datePublished ? `<time datetime="${datePublished}" style="color:#888;font-size:0.9em;">${datePublished}</time>` : ""}
            ${photoHtml ? `\n      <div class="article-photos">\n      ${photoHtml}\n      </div>` : ""}
            <div class="article-body">
              <p>${formatMessage(post.message || "")}</p>
            </div>
          </article>
          <noscript>
            <p><em>JavaScript is disabled — the interactive features on this page require it, but the article content above is fully readable.</em></p>
          </noscript>
          <div data-wp-article hidden></div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <p>Flow's Table — Bangkok dinner circle for builders and mentors.</p>
        <a href="/articles">&larr; Back to articles</a>
      </div>
    </footer>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(html);
}
