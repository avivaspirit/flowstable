(function () {
  "use strict";

  const POSTS_QUERY = `
    query SitePosts($first: Int!, $after: String, $categoryName: String, $tag: String, $search: String) {
      posts(
        first: $first
        after: $after
        where: {
          status: PUBLISH
          categoryName: $categoryName
          tag: $tag
          search: $search
        }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          databaseId
          slug
          title
          date
          excerpt
          content
          uri
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
          tags {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const POST_BY_SLUG_QUERY = `
    query SitePost($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id
        databaseId
        slug
        title
        date
        excerpt
        content
        uri
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
      }
    }
  `;

  function config() {
    return window.SITE_CONFIG || {};
  }

  function proxyUrl() {
    const cfg = config();
    if (cfg.wpProxy) return cfg.wpProxy;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return cfg.wpEndpoint || "";
    }
    return "/api/wp-graphql";
  }

  function stripHtml(html) {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").replace(/\s+\n/g, "\n").trim();
  }

  function formatDateLabel(isoDate) {
    if (!isoDate) return "";
    try {
      return new Date(isoDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return isoDate.slice(0, 10);
    }
  }

  async function graphqlRequest(query, variables) {
    const res = await fetch(proxyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || `GraphQL HTTP ${res.status}`);
    }
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e) => e.message).join("; "));
    }
    return payload.data;
  }

  async function fetchPostsPage(options) {
    const cfg = config();
    const variables = {
      first: options.first || cfg.postsPerPage || 50,
      after: options.after || null,
      categoryName: options.category || cfg.wpCategory || null,
      tag: options.tag || cfg.wpTag || null,
      search: options.search || null,
    };

    const data = await graphqlRequest(POSTS_QUERY, variables);
    return data?.posts || { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  async function fetchAllPosts(options) {
    const merged = { ...(options || {}) };
    const posts = [];
    let after = null;
    let guard = 0;

    while (guard < 40) {
      const page = await fetchPostsPage({ ...merged, after });
      posts.push(...(page.nodes || []));
      if (!page.pageInfo?.hasNextPage) break;
      after = page.pageInfo.endCursor;
      guard += 1;
    }

    return posts;
  }

  async function fetchPostBySlug(slug) {
    if (!slug) return null;
    const data = await graphqlRequest(POST_BY_SLUG_QUERY, { slug });
    return data?.post || null;
  }

  function mapToFengshuiArticle(post, index) {
    const image = post.featuredImage?.node?.sourceUrl || "";
    const tags = (post.tags?.nodes || []).map((t) => t.slug).filter(Boolean);
    const category = post.categories?.nodes?.[0]?.slug || tags[0] || "general";
    const body = stripHtml(post.content || post.excerpt);

    return {
      id: post.slug || `wp-${post.databaseId}`,
      wpSlug: post.slug,
      sourceId: String(post.databaseId || ""),
      title: post.title || "Untitled",
      seoKeyword: post.categories?.nodes?.[0]?.name || "",
      category,
      tags: tags.length ? tags.slice(0, 2) : [category],
      image,
      alt: post.featuredImage?.node?.altText || post.title || "Fengshui Balance article",
      date: (post.date || "").slice(0, 10),
      url: post.uri || "",
      body,
      contentHtml: post.content || "",
      recommended: index < 10,
      recommendedRank: index < 10 ? index + 1 : undefined,
      metrics: { wei: Math.max(0, 1000 - index * 3) },
    };
  }

  function mapToFlowstablePost(post) {
    const photos = post.featuredImage?.node?.sourceUrl
      ? [post.featuredImage.node.sourceUrl]
      : [];
    const category = post.categories?.nodes?.[0]?.name || "Note";
    const slug = post.slug;

    return {
      permalink_url: `wp-${slug}`,
      wpSlug: slug,
      slug,
      date_label: formatDateLabel(post.date),
      category,
      title: post.title || "Flow's Table",
      message: stripHtml(post.content || post.excerpt),
      contentHtml: post.content || "",
      photos,
      reaction_count: 0,
      comment_count: 0,
      share_count: 0,
      source: "wordpress",
    };
  }

  function articleHref(article, cfg) {
    const settings = cfg || config();
    const slug = article.wpSlug || article.slug;
    if (slug && settings.articlePage) {
      return `${settings.articlePage}?slug=${encodeURIComponent(slug)}`;
    }
    if (article.id && settings.siteId === "fengshuibalance") {
      return `articles/${article.id}.html`;
    }
    return article.url || "#";
  }

  window.WPGraphQL = {
    fetchPostsPage,
    fetchAllPosts,
    fetchPostBySlug,
    mapToFengshuiArticle,
    mapToFlowstablePost,
    articleHref,
    stripHtml,
    formatDateLabel,
  };
})();
