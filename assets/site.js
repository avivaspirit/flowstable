let allPosts = [];
let currentPost = null;
let currentImageIndex = 0;

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
  } catch (err) {
    console.error('Failed to load posts database:', err);
  }
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
    window.open(permalink, '_blank');
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
  
  const messageHtml = (post.message || '')
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
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
  const sections = document.querySelectorAll('.section, .about-editorial, .highlights-band, .reels-band, .split-band, .press-band');
  sections.forEach(el => el.classList.add('section-fade'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

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

// ============ MAIN INIT ============
document.addEventListener('DOMContentLoaded', () => {
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
    const postCard = e.target.closest('.post-card') || e.target.closest('.archive-post');
    if (e.target.closest('#modalFacebookLink') || e.target.closest('.modal-close') || e.target.closest('.carousel-btn')) {
      return;
    }
    if (postCard) {
      e.preventDefault();
      const linkEl = postCard.querySelector('.post-media') || postCard.querySelector('.archive-head a') || postCard.querySelector('.open-modal-trigger');
      const permalink = linkEl?.getAttribute('href');
      if (permalink) {
        openModal(permalink);
      }
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

  function updateArchive() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    let visibleCount = 0;

    for (const post of archivePosts) {
      const haystack = post.dataset.search || "";
      const postCategory = post.dataset.category || "";
      const queryMatch = !query || haystack.includes(query);
      const categoryMatch = activeCategory === "all" || postCategory === activeCategory;
      const isVisible = queryMatch && categoryMatch;

      post.classList.toggle("is-hidden", !isVisible);
      if (isVisible) visibleCount++;
    }

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  // Initialize once static items are loaded
  initArchiveElements();
  searchInput?.addEventListener("input", updateArchive);

  chipsContainer?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      chipsContainer.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.value || "all";
      updateArchive();
    }
  });

  // When dynamic CMS articles are inserted, re-index archive posts
  window.addEventListener('cmsLoaded', () => {
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
      const thumb = r.thumbnail_url || 'assets/photos/uploads/reel_placeholder.jpg';
      
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
          <img class="reel-thumbnail" src="${thumb}" alt="Flow's Table Reel: ${excerpt}" loading="lazy">
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
