(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const root = document.querySelector("[data-wp-article]");
  const statusEl = document.querySelector("[data-wp-status]");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function excerpt(text, limit = 180) {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    return clean.substring(0, limit - 3) + "...";
  }

  function injectSchema(post, image, dateStr) {
    const existing = document.getElementById("article-schema");
    if (existing) existing.remove();

    const canonicalUrl = window.location.href;
    const ogImage = image ? (image.startsWith("http") ? image : `${window.location.origin}/${image}`) : "";

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": post.title,
      "description": excerpt(post.body || post.message || post.story, 160),
      "image": ogImage,
      "datePublished": post.publishedAt || post.created_time,
      "author": {
        "@type": "Organization",
        "name": "Flow's Table",
        "url": window.location.origin
      },
      "publisher": {
        "@type": "Organization",
        "name": "Flow's Table",
        "url": window.location.origin
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      }
    };

    const script = document.createElement("script");
    script.id = "article-schema";
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function renderPost(post) {
    if (!root || !post) return;

    let image = "";
    if (typeof post.coverImage === "string") {
      image = post.coverImage;
    } else if (post.coverImage) {
      image = window.SanityCMS?.imageUrl(post.coverImage) || "";
    }
    const alt = post.coverImage?.alt || post.alt || post.title;
    const categories = (post.tags || [post.category]).filter(Boolean).join(" / ");
    const date = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
    
    const bodyText = post.body || post.message || post.story || "";
    const summary = excerpt(bodyText, 180);
    const summaryHtml = summary ? `<p class="article-callout" style="padding: 12px 16px; border-left: 3px solid var(--coral); border-radius: 0 10px 10px 0; background: rgba(197, 107, 70, 0.08); font-weight: 600; margin-bottom: 20px;">💡 Summary: ${summary}</p>` : "";
    
    const content = bodyText.replace(/\n/g, "<br>");

    document.title = `${post.title} | Flow's Table`;

    injectSchema(post, image, date);

    const footerCta = post.isFacebook && post.originalUrl
      ? `<div class="article-footer-cta" style="margin-top: 40px; padding: 20px; border-top: 1px solid var(--line); text-align: center;">
           <a class="button primary" href="${post.originalUrl}" target="_blank" rel="noopener" style="background: var(--coral); color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 800;">View original post on Facebook</a>
         </div>`
      : "";

    root.innerHTML = `
      <article class="archive-post wp-article-detail">
        <div class="archive-head">
          <div>
            <p class="eyebrow">${date}${categories ? ` / ${categories}` : ""}</p>
            <h1>${post.title}</h1>
          </div>
        </div>
        ${image ? `<div class="archive-gallery"><img src="${image}" alt="${alt}" loading="eager"></div>` : ""}
        <div class="archive-copy wp-content">${summaryHtml}<p>${content}</p></div>
        ${footerCta}
      </article>`;

    if (statusEl) statusEl.hidden = true;
    root.hidden = false;
  }

  function renderPostFromFacebook(post) {
    const mappedPost = {
      title: post.title || "Flow's Table Note",
      publishedAt: post.created_time,
      category: post.category || "Note",
      tags: [post.category],
      body: post.message || post.story || "",
      coverImage: post.photos && post.photos.length ? post.photos[0] : "",
      isFacebook: true,
      originalUrl: post.permalink_url
    };
    renderPost(mappedPost);
  }

  async function loadFromPostsJson(idOrSlug) {
    try {
      const res = await fetch("assets/data/posts.json");
      if (!res.ok) {
        setStatus("Note not found.");
        return;
      }
      const posts = await res.json();
      const post = posts.find(p => p.id === idOrSlug || p.permalink_url?.includes(idOrSlug));
      if (!post) {
        setStatus("Note not found.");
        return;
      }
      renderPostFromFacebook(post);
    } catch (err) {
      console.error(err);
      setStatus("Could not load note.");
    }
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
        await loadFromPostsJson(slug);
        return;
      }
      renderPost(post);
    } catch (error) {
      console.error(error);
      await loadFromPostsJson(slug);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
