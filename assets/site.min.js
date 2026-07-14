let allPosts = [];
let currentPost = null;
let currentImageIndex = 0;
let wpPostsLoaded = false;

async function loadSanityPosts() {
  const sanityId = window.SITE_CONFIG?.sanityProjectId;
  if (!window.SanityCMS || !sanityId || sanityId === "YOUR_PROJECT_ID") return [];
  try {
    const docs = await window.SanityCMS.fetchAllArticles();
    return docs.map((doc) => window.SanityCMS.mapToFlowstablePost(doc));
  } catch (error) {
    console.warn("Sanity posts unavailable:", error);
    return [];
  }
}

function postLink(post) {
  if (post.sanitySlug && window.SanityCMS?.articleHref) {
    return window.SanityCMS.articleHref(post);
  }
  // FB posts link directly to Facebook
  if (post.permalink_url && (post.permalink_url.startsWith("https://") || post.permalink_url.startsWith("http"))) {
    return post.permalink_url;
  }
  return "#";
}

function isFacebookPost(post) {
  const url = post.permalink_url || "";
  return url.includes("facebook.com") && !post.sanitySlug;
}

// Returns true when a rendered card element represents a post from the last 30 days.
function isCardNewRelease(postEl) {
  const created = (postEl && postEl.dataset && postEl.dataset.created) || "";
  if (!created) return false;
  const d = new Date(created);
  if (isNaN(d.getTime())) return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

function createArchivePostElement(post) {
  const articleEl = document.createElement("article");
  articleEl.className = "archive-post";
  articleEl.dataset.category = post.category || "Note";
  articleEl.dataset.created = post.created_time || "";
  articleEl.dataset.permalink = postLink(post);
  articleEl.dataset.search = `${(post.title || "").toLowerCase()} ${(post.message || "").toLowerCase()} ${(post.category || "").toLowerCase()}`;

  const fbPost = isFacebookPost(post);
  const link = postLink(post);
  const externalAttr = fbPost ? ' target="_blank" rel="noopener noreferrer"' : "";

  // Photo thumbnail (first image only, top of card)
  let thumbHtml = "";
  if (post.photos && post.photos.length > 0) {
    const alt = (post.title || "Flow's Table").replace(/"/g, "&quot;");
    thumbHtml = `<div class="archive-media"><img src="${post.photos[0]}" alt="${alt}" loading="lazy"></div>`;
  } else {
    // Gradient fallback for posts without photos
    const cat = (post.category || "Note").toLowerCase();
    let gradient = "linear-gradient(135deg, #c56b46, #1a1a2e)";
    if (cat.includes("gather")) gradient = "linear-gradient(135deg, #8b6f47, #1a1a2e)";
    else if (cat.includes("learn")) gradient = "linear-gradient(135deg, #5a7d6a, #1a1a2e)";
    else if (cat.includes("invest")) gradient = "linear-gradient(135deg, #4a6fa5, #1a1a2e)";
    else if (cat.includes("reflect") || cat.includes("life")) gradient = "linear-gradient(135deg, #7a5c8e, #1a1a2e)";
    thumbHtml = `<div class="archive-media archive-media-fallback" style="background:${gradient};min-height:120px;display:flex;align-items:center;justify-content:center;"><span style="font-size:1.5rem;opacity:0.15;">✎</span></div>`;
  }

  const category = post.category || "Note";
  const dateLabel = post.date_label || "Recent";

  // Preview text - collapse whitespace, clamp to ~3 lines
  const rawMsg = (post.message || "").split("\n").join(" ").replace(/\s+/g, " ").trim();
  const previewText = rawMsg.length > 200 ? rawMsg.substring(0, 200) + "\u2026" : rawMsg;

  // Engagement stats
  let statsHtml = "";
  if (typeof post.reaction_count === "number" && post.reaction_count > 0) {
    statsHtml = `<span class="archive-reactions">\u2665 ${post.reaction_count}</span>`;
  }

  // CTA - blue Facebook button for FB posts, neutral button otherwise
  const ctaLabel = fbPost ? "Read on Facebook \u2192" : "Read Note";
  const ctaClass = fbPost ? "fb-cta-button" : "read-note-button";

  articleEl.innerHTML = `
    ${thumbHtml}
    <div class="archive-card-body">
      <div class="archive-head">
        <span class="archive-badge">${category}</span>
        <span class="archive-date">${dateLabel}</span>
      </div>
      <h3 class="archive-title">${post.title || "Flow's Table"}</h3>
      ${previewText ? `<p class="archive-copy">${previewText}</p>` : ""}
      <div class="archive-foot">
        ${statsHtml}
        <a href="${link}" class="${ctaClass}"${externalAttr}>${ctaLabel}</a>
      </div>
    </div>
  `;

  return articleEl;
}
function renderArchiveFromPosts(posts) {
  const container = document.querySelector("#archiveList .section-inner");
  const emptyState = document.getElementById("emptyState");
  if (!container) return;

  container.querySelectorAll(".archive-post").forEach((node) => node.remove());

  posts.forEach((post) => {
    const articleEl = createArchivePostElement(post);
    if (emptyState?.nextSibling) {
      container.insertBefore(articleEl, emptyState.nextSibling);
    } else {
      container.appendChild(articleEl);
    }
  });

  window.dispatchEvent(new Event("cmsLoaded"));
}

function createPostCardElement(post) {
  const card = document.createElement("article");
  card.className = "post-card";
  card.dataset.category = post.category || "Note";
  card.dataset.created = post.created_time || "";
  card.dataset.permalink = postLink(post);
  card.dataset.search = `${(post.title || "").toLowerCase()} ${(post.message || "").toLowerCase()} ${(post.category || "").toLowerCase()}`;

  const thumb = (post.photos && post.photos[0]) ? post.photos[0] : "";
  const link = postLink(post);
  const fbPost = isFacebookPost(post);
  const externalAttr = fbPost ? ' target="_blank" rel="noopener noreferrer"' : "";

  const rawMsg = (post.message || "").split("\n").join(" ").replace(/\s+/g, " ").trim();
  const preview = rawMsg.length > 140 ? rawMsg.substring(0, 140) + "\u2026" : rawMsg;

  let statsHtml = "";
  if (typeof post.reaction_count === "number" && post.reaction_count > 0) {
    statsHtml = `<span class="post-card-reactions">\u2665 ${post.reaction_count}</span>`;
  }

  const ctaLabel = fbPost ? "Read on Facebook \u2192" : "Read Note";
  const ctaClass = fbPost ? "post-read-fb" : "read-note-button";
  const alt = (post.title || "Flow's Table").replace(/"/g, "&quot;");

  card.innerHTML = `
    <a class="post-media" href="${link}"${externalAttr}>
      ${thumb ? `<img src="${thumb}" alt="${alt}" loading="lazy">` : ""}
    </a>
    <div class="post-body">
      <p class="eyebrow">${post.date_label || "Recent"} / ${post.category || "Note"}</p>
      <h3>${post.title || "Flow's Table"}</h3>
      <p>${preview}</p>
      ${statsHtml}
      <a href="${link}" class="${ctaClass}"${externalAttr}>${ctaLabel}</a>
    </div>
  `;

  return card;
}
function renderMomentsFromPosts(posts) {
  const container = document.getElementById("momentsGrid");
  if (!container) return;

  // Filter to keep only Session Summaries
  const filteredPosts = posts.filter(post => (post.category || '').toLowerCase() === 'session summaries');

  // Clear existing static posts
  container.querySelectorAll(".post-card").forEach((node) => node.remove());

  // Filter out duplicates (permalink_url and title)
  const seenUrls = new Set();
  const seenTitles = new Set();
  const uniquePosts = [];

  filteredPosts.forEach(post => {
    const url = post.permalink_url;
    const title = (post.title || '').trim().toLowerCase();
    if (url && !seenUrls.has(url)) {
      if (!title || !seenTitles.has(title)) {
        seenUrls.add(url);
        if (title) seenTitles.add(title);
        uniquePosts.push(post);
      }
    }
  });

  // Calculate WEI score and sort
  const scoredPosts = uniquePosts.map(post => {
    let wei = 0;
    if (post.metrics && typeof post.metrics.wei === 'number') {
      wei = post.metrics.wei;
    } else {
      const reactions = post.reaction_count || 0;
      const comments = post.comment_count || 0;
      const shares = post.share_count || 0;
      wei = reactions * 1 + comments * 3 + shares * 5;
    }
    return { ...post, weiScore: wei };
  });

  // Sort descending by WEI score
  scoredPosts.sort((a, b) => b.weiScore - a.weiScore);

  // Take top 8 unique posts
  const top8 = scoredPosts.slice(0, 8);

  // Render cards
  top8.forEach((post) => {
    container.appendChild(createPostCardElement(post));
  });
}

// Render latest posts into the homepage "Recent Notes" section dynamically.
// This replaces the hardcoded static articles so new FB posts appear automatically.
function renderRecentNotesFromPosts(posts) {
  const container = document.getElementById("recentNotesGrid");
  if (!container) return;

  // Clear existing static posts
  container.querySelectorAll(".post-card").forEach((node) => node.remove());

  // Take the 8 most recent posts (already sorted newest-first by loadPostsDatabase)
  const recent = posts.slice(0, 8);

  recent.forEach((post) => {
    container.appendChild(createPostCardElement(post));
  });
}

// Fetch posts database on load and combine with CMS articles
async function loadPostsDatabase() {
  try {
    const res = await fetch('assets/data/posts.json');
    if (res.ok) {
      allPosts = await res.json();
    }
    
    // Fetch custom CMS articles
    try {
      const cmsRes = await fetch('_data/articles.json');
      if (cmsRes.ok) {
        const cmsArticles = await cmsRes.json();
        
        // Transform CMS format to match posts.json schema
        const formattedCms = cmsArticles.map(art => {
          // Parse date
          let dateLabel = '';
          if (art.date) {
            const dateObj = new Date(art.date);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            dateLabel = dateObj.toLocaleDateString('en-US', options);
          } else {
            dateLabel = 'Recent';
          }
          
          return {
            permalink_url: `cms-${art.title.replace(/\s+/g, '-').toLowerCase()}-${art.date}`,
            created_time: art.date,
            date_label: dateLabel,
            category: art.category || 'Note',
            title: art.title,
            message: art.body,
            photos: art.cover_image ? [art.cover_image] : [],
            reaction_count: 0,
            comment_count: 0,
            share_count: 0
          };
        });
        
        // Prepend to allPosts
        allPosts = [...formattedCms, ...allPosts];
        
        // Render in Archive list if on archive page
        if (document.getElementById('archiveList')) {
          renderCmsArticles(formattedCms);
        }
      }
    } catch (cmsErr) {
      console.log('No custom CMS articles loaded yet or format invalid:', cmsErr);
    }

    const sanityPosts = await loadSanityPosts();
    if (sanityPosts.length) {
      wpPostsLoaded = true;
      allPosts = [...sanityPosts, ...allPosts];
    }

    // Sort all combined posts by date (newest to oldest)
    allPosts.sort((a, b) => {
      const timeA = new Date(a.created_time || a.date || 0).getTime();
      const timeB = new Date(b.created_time || b.date || 0).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

    // Always render dynamic content after combining all post sources
    if (document.getElementById('archiveList')) {
      renderArchiveFromPosts(allPosts);
    }
    if (document.getElementById('momentsGrid')) {
      renderMomentsFromPosts(allPosts);
    }
    if (document.getElementById('recentNotesGrid')) {
      renderRecentNotesFromPosts(allPosts);
    }

    // Update and animate stats band on homepage
    if (document.querySelector('.stats-band')) {
      let followersCount = 1632;
      try {
        const statsRes = await fetch('assets/data/page_stats.json');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData && statsData.followers_count) {
            followersCount = statsData.followers_count;
          }
        }
      } catch (statsErr) {
        console.log('Failed to fetch page stats, using fallback:', statsErr);
      }
      
      const totalPostsCount = allPosts.length;
      const postsWithPhotosCount = allPosts.filter(p => p.photos && p.photos.length > 0).length;
      const totalReactionsCount = allPosts.reduce((sum, p) => sum + (p.reaction_count || 0), 0);
      
      initStatsCountUp(totalPostsCount, postsWithPhotosCount, followersCount, totalReactionsCount);
    }
  } catch (err) {
    console.error('Failed to load posts database:', err);
  }
}

// Dynamic Stats Count-Up Animation
function animateValue(element, start, end, duration) {
  if (!element) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    element.textContent = currentValue.toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end.toLocaleString();
    }
  };
  window.requestAnimationFrame(step);
}

function initStatsCountUp(posts, photos, followers, reactions) {
  const statsBand = document.querySelector('.stats-band');
  if (!statsBand) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.IntersectionObserver || prefersReduced) {
    document.getElementById('stat-posts').textContent = posts.toLocaleString();
    document.getElementById('stat-photos').textContent = photos.toLocaleString();
    document.getElementById('stat-followers').textContent = followers.toLocaleString();
    document.getElementById('stat-reactions').textContent = reactions.toLocaleString();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateValue(document.getElementById('stat-posts'), 0, posts, 1500);
        animateValue(document.getElementById('stat-photos'), 0, photos, 1500);
        animateValue(document.getElementById('stat-followers'), 0, followers, 1500);
        animateValue(document.getElementById('stat-reactions'), 0, reactions, 1500);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  observer.observe(statsBand);
}


// Render CMS articles on the archive page
function renderCmsArticles(articles) {
  const container = document.querySelector('#archiveList .section-inner');
  if (!container) return;

  const emptyState = document.getElementById('emptyState');
  
  // Render in reverse order (newest first)
  [...articles].reverse().forEach(art => {
    const articleEl = document.createElement('article');
    articleEl.className = 'archive-post';
    articleEl.dataset.category = art.category;
    articleEl.dataset.search = `${art.title.toLowerCase()} ${art.message.toLowerCase()} ${art.category.toLowerCase()}`;
    
    let galleryHtml = '';
    if (art.photos && art.photos.length > 0) {
      galleryHtml = `<div class="archive-gallery">
        <img src="${art.photos[0]}" alt="${art.title}" loading="lazy">
      </div>`;
    }

    // Format body text
    const previewText = art.message.length > 200 ? art.message.substring(0, 200) + '...' : art.message;
    const bodyHtml = `<p>${previewText.replace(/\n/g, '<br>')}</p>`;

    articleEl.innerHTML = `
      <div class="archive-head">
        <div>
          <p class="eyebrow">${art.date_label} / ${art.category}</p>
          <h2>${art.title}</h2>
        </div>
        <a href="${art.permalink_url}" class="open-modal-trigger">Read Note</a>
      </div>
      ${galleryHtml}
      <div class="archive-copy">${bodyHtml}</div>
    `;
    
    // Insert right after empty state
    if (emptyState && emptyState.nextSibling) {
      container.insertBefore(articleEl, emptyState.nextSibling);
    } else {
      container.appendChild(articleEl);
    }
  });

  // Trigger update to re-index cards for search/chips filter
  window.dispatchEvent(new Event('cmsLoaded'));
}

// Open Lightbox Modal
function openModal(permalink) {
  const post = allPosts.find(p => p.permalink_url === permalink);
  if (!post) {
    if (permalink.startsWith("sanity-") && window.SanityCMS?.articleHref) {
      window.location.href = window.SanityCMS.articleHref({ sanitySlug: permalink.replace(/^sanity-/, "") });
      return;
    }
    window.open(permalink, '_blank');
    return;
  }

  if (post.source === "sanity" && post.sanitySlug) {
    window.location.href = window.SanityCMS.articleHref(post);
    return;
  }

  if (post.permalink_url && (post.permalink_url.includes('facebook.com/reel/') || post.permalink_url.includes('instagram.com/reel/') || post.permalink_url.includes('facebook.com/watch/'))) {
    openVideoModal(post.permalink_url, post.message || post.story, post.created_time);
    return;
  }

  currentPost = post;
  currentImageIndex = 0;

  const modal = document.querySelector('#postModal');
  const modalImage = document.querySelector('#modalImage');
  const prevBtn = modal.querySelector('.carousel-btn.prev');
  const nextBtn = modal.querySelector('.carousel-btn.next');
  const counter = modal.querySelector('#modalCarouselCounter');

  modal.querySelector('#modalDate').textContent = post.date_label || '';
  modal.querySelector('#modalCategory').textContent = post.category || 'Note';
  modal.querySelector('#modalTitle').textContent = post.title || "Flow's Table";
  
  let messageHtml;
  if (post.contentHtml) {
    messageHtml = post.contentHtml;
  } else {
    messageHtml = (post.message || '')
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }
  modal.querySelector('#modalBody').innerHTML = messageHtml || '<p>No content available.</p>';

  const commentText = post.comment_count === 1 ? '1 comment' : `${post.comment_count || 0} comments`;
  const shareText = post.share_count === 1 ? '1 share' : `${post.share_count || 0} shares`;
  modal.querySelector('#modalStats').textContent = `${post.reaction_count || 0} reactions / ${commentText} / ${shareText}`;
  
  // Hide stats for custom CMS articles (which don't have reactions)
  const statsEl = modal.querySelector('#modalStats');
  if (permalink.startsWith('cms-')) {
    statsEl.style.display = 'none';
  } else {
    statsEl.style.display = 'block';
  }

  modal.querySelector('#modalFacebookLink').setAttribute('href', post.permalink_url);

  updateCarousel();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateCarousel() {
  const modal = document.querySelector('#postModal');
  const modalImage = document.querySelector('#modalImage');
  const prevBtn = modal.querySelector('.carousel-btn.prev');
  const nextBtn = modal.querySelector('.carousel-btn.next');
  const counter = modal.querySelector('#modalCarouselCounter');
  const visualArea = modal.querySelector('.modal-visual');

  const photos = currentPost.photos || [];

  if (photos.length === 0) {
    const cards = Array.from(document.querySelectorAll('.post-card, .archive-post'));
    const matchedCard = cards.find(c => {
      const link = c.querySelector('.post-media') || c.querySelector('.archive-head a') || c.querySelector('.open-modal-trigger');
      return link?.getAttribute('href') === currentPost.permalink_url;
    });
    const thumb = matchedCard?.querySelector('img')?.src;
    
    if (thumb) {
      modalImage.src = thumb;
      modalImage.style.display = 'block';
      visualArea.style.display = 'flex';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      counter.style.display = 'none';
    } else {
      visualArea.style.display = 'none';
    }
  } else {
    visualArea.style.display = 'flex';
    modalImage.src = photos[currentImageIndex];
    modalImage.style.display = 'block';

    if (photos.length > 1) {
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
      counter.style.display = 'block';
      counter.textContent = `${currentImageIndex + 1} / ${photos.length}`;
    } else {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      counter.style.display = 'none';
    }
  }
}

function closeModal() {
  const modal = document.querySelector('#postModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ============ TASTE SKILL ENHANCEMENTS ============

// Scroll Progress Bar
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }, { passive: true });
}

// Noise Overlay
function initNoiseOverlay() {
  if (!document.querySelector('.noise-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'noise-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.prepend(overlay);
  }
}

// Active Nav Page Indicator
function initActiveNavIndicator() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPage = href.split('/').pop().split('#')[0] || 'index.html';
    if (linkPage === currentPath || (currentPath === '' && linkPage === 'index.html')) {
      link.classList.add('active-page');
    }
  });
}

// Section Fade-In (Intersection Observer)
function initSectionFadeIn() {
  const sections = document.querySelectorAll('.section:not(.archive-list):not(.reels-grid):not(.guest-section), .about-editorial, .highlights-band, .reels-band, .split-band, .press-band');
  sections.forEach(el => el.classList.add('section-fade'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.02 });

  sections.forEach(el => observer.observe(el));
}

// Mobile Hamburger Menu
function initMobileMenu() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const nav = header.querySelector('nav');
  if (!nav) return;

  // Create hamburger button
  const btn = document.createElement('button');
  btn.className = 'mobile-menu-btn';
  btn.setAttribute('aria-label', 'Open navigation menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span></span><span></span><span></span>';
  header.appendChild(btn);

  // Create dropdown menu (was mobile-nav-sheet)
  const sheet = document.createElement('nav');
  sheet.className = 'mobile-nav-sheet';
  sheet.setAttribute('aria-label', 'Mobile navigation');

  // Clone nav links from the existing desktop nav
  const links = nav.querySelectorAll('a');
  links.forEach(link => {
    const clone = link.cloneNode(true);
    sheet.appendChild(clone);
  });
  header.appendChild(sheet);

  // Toggle menu
  let menuOpen = false;
  function toggleMenu() {
    menuOpen = !menuOpen;
    btn.classList.toggle('open', menuOpen);
    sheet.classList.toggle('open', menuOpen);
    btn.setAttribute('aria-expanded', String(menuOpen));
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (menuOpen && !sheet.contains(e.target) && !btn.contains(e.target)) {
      toggleMenu();
    }
  });

  // Close on link click
  sheet.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      toggleMenu();
    }
  });
}

// Local Clean URLs fallback for development
function initCleanUrlsLocalFallback() {
  const hn = window.location.hostname;
  const isLocal = !hn || 
                  hn === 'localhost' || 
                  hn === '127.0.0.1' || 
                  hn.startsWith('192.168.') || 
                  hn.startsWith('10.') || 
                  hn.startsWith('172.') || 
                  hn.endsWith('.local');
  if (isLocal) {
    document.querySelectorAll('a').forEach(link => {
      let href = link.getAttribute('href') || '';
      if (href.startsWith('/') && !href.includes('.')) {
        const parts = href.split('#');
        let path = parts[0];
        const hash = parts[1] ? '#' + parts[1] : '';
        
        if (path === '/home' || path === '/') {
          path = 'index.html';
        } else {
          path = path.substring(1) + '.html';
        }
        link.setAttribute('href', path + hash);
      }
    });
  }
}

// ============ MAIN INIT ============
document.addEventListener('DOMContentLoaded', () => {
  initCleanUrlsLocalFallback();
  loadPostsDatabase();

  // Taste Skill Enhancements
  initScrollProgress();
  initNoiseOverlay();
  initActiveNavIndicator();
  initSectionFadeIn();
  initMobileMenu();

  // Floating Header Scroll Effect
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      header?.classList.add('solid');
    } else {
      header?.classList.remove('solid');
    }
  }, { passive: true });

  // Modal Card Click Listeners
  document.addEventListener('click', (e) => {
    if (e.target.closest('#modalFacebookLink') || e.target.closest('.modal-close') || e.target.closest('.carousel-btn')) {
      return;
    }
    // Let explicit CTA buttons navigate on their own (e.g. open FB in a new tab)
    if (e.target.closest('.fb-cta-button') || e.target.closest('.read-note-button') || e.target.closest('.post-read-fb')) {
      return;
    }
    const postCard = e.target.closest('.post-card') || e.target.closest('.archive-post');
    if (!postCard) return;
    e.preventDefault();
    const permalink = postCard.dataset.permalink ||
      postCard.querySelector('.post-media')?.getAttribute('href') ||
      postCard.querySelector('.fb-cta-button')?.getAttribute('href') ||
      postCard.querySelector('.read-note-button')?.getAttribute('href') ||
      postCard.querySelector('.archive-head a')?.getAttribute('href') ||
      postCard.querySelector('.open-modal-trigger')?.getAttribute('href');
    if (permalink) {
      openModal(permalink);
    }
  });

  // Close Modal Actions
  const modal = document.querySelector('#postModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      closeModal();
    }
  });

  // Carousel Button Listeners
  modal?.querySelector('.carousel-btn.prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentPost && currentPost.photos && currentPost.photos.length > 1) {
      currentImageIndex = (currentImageIndex - 1 + currentPost.photos.length) % currentPost.photos.length;
      updateCarousel();
    }
  });

  modal?.querySelector('.carousel-btn.next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentPost && currentPost.photos && currentPost.photos.length > 1) {
      currentImageIndex = (currentImageIndex + 1) % currentPost.photos.length;
      updateCarousel();
    }
  });

  // Keyboard navigation for Modal
  document.addEventListener('keydown', (e) => {
    if (modal?.classList.contains('active')) {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') modal.querySelector('.carousel-btn.prev')?.click();
      if (e.key === 'ArrowRight') modal.querySelector('.carousel-btn.next')?.click();
    }
  });

  // Archive Filter/Search Logic
  let archivePosts = [];
  const searchInput = document.querySelector("#archiveSearch");
  const chipsContainer = document.querySelector("#categoryChips");
  const emptyState = document.querySelector("#emptyState");
  let activeCategory = "all";

  function initArchiveElements() {
    archivePosts = Array.from(document.querySelectorAll(".archive-post"));
  }

  function sortArchivePosts(order) {
    const container = document.querySelector("#archiveList .section-inner");
    if (!container) return;

    const posts = Array.from(container.querySelectorAll(".archive-post"));
    if (posts.length === 0) return;

    posts.sort((a, b) => {
      const rawA = a.dataset.created || "";
      const rawB = b.dataset.created || "";
      const dateA = rawA ? new Date(rawA).getTime() : 0;
      const dateB = rawB ? new Date(rawB).getTime() : 0;
      return order === "newest" ? dateB - dateA : dateA - dateB;
    });

    posts.forEach(post => container.appendChild(post));
    initArchiveElements();
  }
  /* Highlight matched terms inside text */
  function ftHighlightTerms(text, terms) {
    if (!terms.length || !text) return text;
    var html = text;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      html = html.replace(re, "<mark class=\"search-hit\">$1</mark>");
    }
    return html;
  }

  function updateArchive() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    var terms = query ? query.split(/\s+/).filter(Boolean) : [];
    let visibleCount = 0;

    var scored = [];
    for (var i = 0; i < archivePosts.length; i++) {
      var post = archivePosts[i];
      var haystack = post.dataset.search || "";
      var postCategory = post.dataset.category || "";

      var categoryMatch;
      if (activeCategory === "all") {
        categoryMatch = true;
      } else if (activeCategory === "new-release") {
        categoryMatch = isCardNewRelease(post);
      } else {
        categoryMatch = postCategory === activeCategory;
      }
      if (!categoryMatch) {
        post.classList.add("is-hidden");
        continue;
      }

      var score = 0;
      if (!terms.length) {
        score = 1; /* no query = keep original date order */
      } else {
        var titleEl = post.querySelector(".archive-title");
        var titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
        var allMatched = true;
        for (var j = 0; j < terms.length; j++) {
          var t = terms[j];
          var matched = false;
          if (titleText.indexOf(t) !== -1) { score += 1000; matched = true; }
          if (haystack.indexOf(t) !== -1) { score += 10; matched = true; }
          if (!matched) { allMatched = false; break; }
        }
        if (!allMatched) score = -1;
      }

      if (score >= 0) {
        scored.push({ el: post, score: score, idx: i });
      } else {
        post.classList.add("is-hidden");
      }
    }

    /* Sort by score (relevance), then by original index (date order) */
    if (terms.length) {
      scored.sort(function(a, b) { return b.score - a.score; });
    }

    var container = document.querySelector("#archiveList .section-inner");
    for (var k = 0; k < scored.length; k++) {
      var el = scored[k].el;
      el.classList.remove("is-hidden");
      if (container) container.appendChild(el); /* re-order DOM */
      visibleCount++;
    }

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  /* Debounced search */
  var _ftSearchTimer = null;
  function debouncedUpdateArchive() {
    if (_ftSearchTimer) clearTimeout(_ftSearchTimer);
    _ftSearchTimer = setTimeout(function() {
      updateArchive();
    }, 250);
  }

  // Initialize once static items are loaded
  initArchiveElements();
  updateArchive();
  searchInput?.addEventListener("input", debouncedUpdateArchive);

  /* Keyboard shortcut: "/" focuses search */
  document.addEventListener("keydown", function(e) {
    if (e.key === "/" && searchInput && document.activeElement !== searchInput) {
      var tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchInput.focus();
      }
    }
  });

  chipsContainer?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      chipsContainer.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.value || "all";
      
      if (activeCategory === "new-release") {
        sortArchivePosts("newest");
      }
      
      updateArchive();
    }
  });

  // When dynamic CMS articles are inserted, re-index archive posts
  window.addEventListener('cmsLoaded', () => {
    sortArchivePosts("newest");
    initArchiveElements();
    updateArchive();
  });

  // Vibe Carousel Logic
  const vibeSlides = document.querySelectorAll('.vibe-slide');
  const vibeDots = document.querySelectorAll('.vibe-dots .dot');
  const vibePrev = document.querySelector('.vibe-btn.prev');
  const vibeNext = document.querySelector('.vibe-btn.next');
  let vibeIndex = 0;
  let vibeInterval = null;

  function showVibeSlide(idx) {
    if (vibeSlides.length === 0) return;
    vibeSlides.forEach(s => s.classList.remove('active'));
    vibeDots.forEach(d => d.classList.remove('active'));
    vibeIndex = (idx + vibeSlides.length) % vibeSlides.length;
    vibeSlides[vibeIndex].classList.add('active');
    if (vibeDots[vibeIndex]) vibeDots[vibeIndex].classList.add('active');
  }

  function startAutoSlide() {
    vibeInterval = setInterval(() => { showVibeSlide(vibeIndex + 1); }, 5000);
  }

  function resetAutoSlide() {
    clearInterval(vibeInterval);
    startAutoSlide();
  }

  vibePrev?.addEventListener('click', () => { showVibeSlide(vibeIndex - 1); resetAutoSlide(); });
  vibeNext?.addEventListener('click', () => { showVibeSlide(vibeIndex + 1); resetAutoSlide(); });

  vibeDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index || '0');
      showVibeSlide(idx);
      resetAutoSlide();
    });
  });

  if (vibeSlides.length > 0) {
    startAutoSlide();
  }

  // Load and render Video Reels
  loadReelsData();
});

// ============ DYNAMIC VIDEO MODAL PLAYER ============
function createVideoModalElement() {
  if (document.getElementById('videoModal')) return;
  const modalHtml = `
    <div id="videoModal" class="video-modal" aria-hidden="true">
      <div class="video-modal-container">
        <button class="video-modal-close" aria-label="Close video player">&times;</button>
        <div class="video-modal-player-side"></div>
        <div class="video-modal-details-side">
          <span class="video-modal-meta">Video Highlight</span>
          <h3 class="video-modal-title">Flow's Table Reel</h3>
          <p class="video-modal-caption"></p>
          <a href="#" class="video-modal-link-btn" target="_blank" rel="noopener">
            <svg style="width:16px;height:16px;fill:currentColor;vertical-align:middle;margin-right:6px" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            View original post
          </a>
          <p class="video-modal-date"></p>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = modalHtml.trim();
  document.body.appendChild(div.firstChild);
  
  const modal = document.getElementById('videoModal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('video-modal-close')) {
      closeVideoModal();
    }
  });
}

function openVideoModal(url, caption, timestamp) {
  createVideoModalElement();
  const modal = document.getElementById('videoModal');
  if (!modal) return;

  let embedUrl = '';
  let isInstagram = false;
  let cleanUrl = url.split('?')[0];

  if (url.includes('facebook.com')) {
    const encodedUrl = encodeURIComponent(url);
    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=280`;
  } else if (url.includes('instagram.com')) {
    isInstagram = true;
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';
    embedUrl = `${cleanUrl}embed`;
  }

  const playerSide = modal.querySelector('.video-modal-player-side');
  if (playerSide) {
    playerSide.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
  }

  // Parse title and category
  let title = "Flow's Table Video Reel";
  let category = isInstagram ? "Instagram Reel" : "Facebook Reel";
  let displayCaption = caption || "No description available.";

  if (caption) {
    const lines = caption.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      title = lines[0].replace(/^[^\w\s\u0e00-\u0e7f]+/g, '').trim();
      if (title.length > 70) {
        title = title.substring(0, 67) + "...";
      }
    }
  }

  // Set category tags
  const lowerCaption = (caption || "").toLowerCase();
  if (lowerCaption.includes('society')) {
    category = "Flow Society";
  } else if (lowerCaption.includes('interview') || lowerCaption.includes('สัมภาษณ์') || lowerCaption.includes('แชร์ประสบการณ์') || lowerCaption.includes('พี่มี่') || lowerCaption.includes('พี่เจ้กกี้') || lowerCaption.includes('พี่เชน') || lowerCaption.includes('พี่ตรี')) {
    category = "Guest Interview";
  } else if (lowerCaption.includes('mindset') || lowerCaption.includes('ความเชื่อ') || lowerCaption.includes('ความฝัน')) {
    category = "Mindset Reflection";
  } else if (lowerCaption.includes('kbtg') || lowerCaption.includes('company visit')) {
    category = "Gathering / Event";
  }

  modal.querySelector('.video-modal-meta').textContent = category;
  modal.querySelector('.video-modal-title').textContent = title;
  modal.querySelector('.video-modal-caption').textContent = displayCaption;
  
  // Link button
  const linkBtn = modal.querySelector('.video-modal-link-btn');
  linkBtn.setAttribute('href', url);
  linkBtn.innerHTML = isInstagram 
    ? `<svg style="width:16px;height:16px;fill:currentColor;vertical-align:middle;margin-right:6px" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> View on Instagram`
    : `<svg style="width:16px;height:16px;fill:currentColor;vertical-align:middle;margin-right:6px" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> View on Facebook`;

  // Parse Date
  let dateLabel = "Flow's Table Video";
  if (timestamp) {
    try {
      const date = new Date(timestamp);
      dateLabel = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {}
  }
  modal.querySelector('.video-modal-date').textContent = `Published on ${dateLabel}`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    const playerSide = modal.querySelector('.video-modal-player-side');
    if (playerSide) playerSide.innerHTML = '';
  }
}

// ============ REELS CAROUSEL AND GALLERY ============
async function loadReelsData() {
  const carouselTrack = document.getElementById('reelsCarouselTrack');
  const reelsGrid = document.getElementById('reelsGrid');
  
  if (!carouselTrack && !reelsGrid) return;
  
  try {
    const res = await fetch('_data/reels.json');
    if (!res.ok) return;
    const reels = await res.json();
    if (!reels || reels.length === 0) return;
    
    const renderCard = (r) => {
      const url = r.url || '';
      const caption = r.caption || '';
      const timestamp = r.timestamp || '';
      const thumb = r.thumbnail_url || '';
      const isFB = url.includes('facebook.com');
      const fallbackColor = isFB ? 'var(--coral, #c56b46)' : 'var(--warm, #8b6f47)';
      
      let displayTag = "Highlight";
      const lowerCap = caption.toLowerCase();
      if (lowerCap.includes('society')) displayTag = "Society";
      else if (lowerCap.includes('kbtg') || lowerCap.includes('visit')) displayTag = "Gathering";
      else if (lowerCap.includes('mindset') || caption.includes('ความฝัน')) displayTag = "Mindset";
      else if (lowerCap.includes('interview') || caption.includes('สัมภาษณ์') || caption.includes('พี่มี่') || caption.includes('พี่เจ้กกี้') || caption.includes('พี่เชน') || caption.includes('พี่ตรี') || caption.includes('พี่tre')) displayTag = "Interview";
      
      let excerpt = "Flow's Table Video Reel";
      if (caption) {
        const lines = caption.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          excerpt = lines[0].replace(/^[^\w\s\u0e00-\u0e7f]+/g, '').trim();
          if (excerpt.length > 60) excerpt = excerpt.substring(0, 57) + "...";
        }
      }
      
      let formattedDate = "";
      if (timestamp) {
        try {
          const date = new Date(timestamp);
          formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch(e){}
      }
      
      return `
        <div class="reel-card" data-url="${url}" data-caption="${encodeURIComponent(caption)}" data-timestamp="${timestamp}" data-category="${displayTag}">
          ${thumb 
            ? `<img class="reel-thumbnail" src="${thumb}" alt="Flow's Table Reel: ${excerpt}" loading="lazy">`
            : `<div class="reel-thumbnail reel-thumbnail-fallback" style="background:linear-gradient(135deg, ${fallbackColor}, #1a1a2e);display:flex;align-items:center;justify-content:center;"><span style="font-size:2rem;opacity:0.3;">▶</span></div>`
          }
          <div class="reel-play-overlay">
            <div class="reel-play-btn">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="reel-text-info">
            <span class="reel-meta-category">${displayTag}</span>
            <p class="reel-title-excerpt">${excerpt}</p>
            ${formattedDate ? `<p class="reel-date">${formattedDate}</p>` : ''}
          </div>
        </div>
      `;
    };

    if (carouselTrack) {
      // Show latest 8 items on home page carousel
      carouselTrack.innerHTML = reels.slice(0, 8).map(renderCard).join('');
      initReelsCarousel();
    }
    
    if (reelsGrid) {
      // Show all reels on dedicated page
      reelsGrid.innerHTML = reels.map(renderCard).join('');
      initReelsPageFilter();
    }
    
    // Set up click handlers for dynamic cards
    document.querySelectorAll('.reel-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const url = card.dataset.url;
        const caption = decodeURIComponent(card.dataset.caption);
        const timestamp = card.dataset.timestamp;
        openVideoModal(url, caption, timestamp);
      });
    });

  } catch (err) {
    console.error("Failed to load reels data:", err);
  }
}

function initReelsCarousel() {
  const carousel = document.getElementById('reelsCarousel');
  const prevBtn = document.querySelector('.carousel-arrow-btn.prev-arrow');
  const nextBtn = document.querySelector('.carousel-arrow-btn.next-arrow');
  const dotsContainer = document.getElementById('carouselDots');
  if (!carousel) return;

  const cardWidth = 270 + 24; // Card width + gap
  
  prevBtn?.addEventListener('click', () => {
    carousel.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' });
  });

  nextBtn?.addEventListener('click', () => {
    carousel.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
  });

  const updateDots = () => {
    const cards = carousel.querySelectorAll('.reel-card');
    if (cards.length === 0 || !dotsContainer) return;
    
    dotsContainer.innerHTML = '';
    const visibleCards = Math.round(carousel.clientWidth / cardWidth) || 1;
    const numDots = Math.max(1, cards.length - visibleCards + 1);
    const scrollPos = carousel.scrollLeft;
    const activeIndex = Math.round(scrollPos / cardWidth);

    for (let i = 0; i < numDots; i++) {
      const dot = document.createElement('div');
      dot.className = `carousel-dot ${i === activeIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        carousel.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);
    }
  };

  carousel.addEventListener('scroll', updateDots);
  window.addEventListener('resize', updateDots);
  setTimeout(updateDots, 300);
}

function initReelsPageFilter() {
  const searchInput = document.getElementById('reelsSearch');
  const chipsContainer = document.getElementById('reelsChips');
  const cards = Array.from(document.querySelectorAll('.reels-grid .reel-card'));
  const emptyState = document.getElementById('reelsEmptyState');
  if (cards.length === 0) return;

  let activeCategory = 'all';

  function filterReels() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach(card => {
      const text = decodeURIComponent(card.dataset.caption || '').toLowerCase();
      const cat = (card.dataset.category || '').toLowerCase();
      
      const queryMatch = !query || text.includes(query);
      const categoryMatch = activeCategory === 'all' || cat === activeCategory;
      
      const isVisible = queryMatch && categoryMatch;
      card.style.display = isVisible ? 'block' : 'none';
      if (isVisible) visibleCount++;
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  searchInput?.addEventListener('input', filterReels);

  chipsContainer?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = (chip.dataset.value || 'all').toLowerCase();
      filterReels();
    }
  });
}
