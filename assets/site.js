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
});
