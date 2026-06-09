(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const root = document.querySelector("[data-wp-article]");
  const statusEl = document.querySelector("[data-wp-status]");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function renderPost(post) {
    if (!root || !post) return;

    const image = window.SanityCMS?.imageUrl(post.coverImage) || "";
    const alt = post.coverImage?.alt || post.title;
    const categories = (post.tags || [post.category]).filter(Boolean).join(" / ");
    const date = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
    const content = (post.body || "").replace(/\n/g, "<br>");

    document.title = `${post.title} | Flow's Table`;

    root.innerHTML = `
      <article class="archive-post wp-article-detail">
        <div class="archive-head">
          <div>
            <p class="eyebrow">${date}${categories ? ` / ${categories}` : ""}</p>
            <h1>${post.title}</h1>
          </div>
        </div>
        ${image ? `<div class="archive-gallery"><img src="${image}" alt="${alt}" loading="eager"></div>` : ""}
        <div class="archive-copy wp-content"><p>${content}</p></div>
      </article>`;

    if (statusEl) statusEl.hidden = true;
    root.hidden = false;
  }

  async function init() {
    if (!slug) {
      setStatus("Missing article slug.");
      return;
    }
    if (!window.SanityCMS) {
      setStatus("Sanity client failed to load.");
      return;
    }

    setStatus("Loading note…");
    try {
      const post = await window.SanityCMS.fetchArticleBySlug(slug);
      if (!post) {
        setStatus("Note not found.");
        return;
      }
      renderPost(post);
    } catch (error) {
      console.error(error);
      setStatus("Could not load note from Sanity.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
