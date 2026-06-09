(function () {
  "use strict";

  const API_VERSION = "2024-01-01";

  function config() {
    return window.SITE_CONFIG || {};
  }

  function projectId() {
    return config().sanityProjectId || "";
  }

  function dataset() {
    return config().sanityDataset || "production";
  }

  function siteId() {
    return config().siteId || "";
  }

  async function query(groq, params) {
    const pid = projectId();
    if (!pid) throw new Error("Missing sanityProjectId in SITE_CONFIG");

    const url = `https://${pid}.apicdn.sanity.io/v${API_VERSION}/data/query/${dataset()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: groq, params: params || {} }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error?.description || `Sanity HTTP ${res.status}`);
    }
    return payload.result;
  }

  function imageUrl(ref) {
    if (!ref) return "";
    if (typeof ref === "string" && ref.startsWith("http")) return ref;
    const assetRef = ref?.asset?._ref || ref?._ref;
    if (!assetRef) return "";
    const pid = projectId();
    const [, id, dims, format] = assetRef.match(/^image-([^-]+-[^-]+)-(\d+x\d+)-(\w+)$/) || [];
    if (!id) return "";
    return `https://cdn.sanity.io/images/${pid}/${dataset()}/${id}-${dims}.${format}`;
  }

  async function fetchAllArticles() {
    return query(
      `*[_type == "article" && site == $site] | order(publishedAt desc) {
        _id,
        title,
        "slug": slug.current,
        body,
        category,
        tags,
        publishedAt,
        coverImage,
        seoKeyword,
        sourceUrl,
        legacyId,
        recommended,
        recommendedRank,
        popularity
      }`,
      { site: siteId() }
    );
  }

  async function fetchArticleBySlug(slug) {
    const rows = await query(
      `*[_type == "article" && site == $site && slug.current == $slug][0] {
        _id,
        title,
        "slug": slug.current,
        body,
        category,
        tags,
        publishedAt,
        coverImage,
        seoKeyword,
        sourceUrl,
        legacyId,
        recommended,
        recommendedRank,
        popularity
      }`,
      { site: siteId(), slug }
    );
    return rows || null;
  }

  function mapToFengshuiArticle(doc, index) {
    const image = imageUrl(doc.coverImage) || "";
    const tags = (doc.tags || []).slice(0, 2);
    const category = doc.category || tags[0] || "general";
    const id = doc.legacyId || doc.slug || `sanity-${index}`;

    return {
      id,
      sanitySlug: doc.slug,
      sourceId: doc._id,
      title: doc.title || "Untitled",
      seoKeyword: doc.seoKeyword || "",
      category,
      tags: tags.length ? tags : [category],
      image,
      alt: doc.coverImage?.alt || doc.title || "Fengshui Balance article",
      date: (doc.publishedAt || "").slice(0, 10),
      url: doc.sourceUrl || "",
      body: doc.body || "",
      contentHtml: doc.body || "",
      recommended: Boolean(doc.recommended),
      recommendedRank: doc.recommendedRank,
      metrics: { wei: doc.popularity || 0 },
      source: "sanity",
    };
  }

  function mapToFlowstablePost(doc) {
    const photos = imageUrl(doc.coverImage) ? [imageUrl(doc.coverImage)] : [];
    const slug = doc.slug;
    const dateLabel = doc.publishedAt
      ? new Date(doc.publishedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Recent";

    return {
      permalink_url: `sanity-${slug}`,
      sanitySlug: slug,
      slug,
      date_label: dateLabel,
      category: doc.category || "Note",
      title: doc.title || "Flow's Table",
      message: doc.body || "",
      contentHtml: doc.body || "",
      photos,
      reaction_count: 0,
      comment_count: 0,
      share_count: 0,
      source: "sanity",
    };
  }

  function articleHref(article, cfg) {
    const settings = cfg || config();
    const slug = article.sanitySlug || article.slug;
    if (slug && settings.articlePage) {
      return `${settings.articlePage}?slug=${encodeURIComponent(slug)}`;
    }
    if (article.id && settings.siteId === "fengshuibalance") {
      return `articles/${article.id}.html`;
    }
    return article.url || "#";
  }

  window.SanityCMS = {
    query,
    fetchAllArticles,
    fetchArticleBySlug,
    mapToFengshuiArticle,
    mapToFlowstablePost,
    articleHref,
    imageUrl,
  };
})();
