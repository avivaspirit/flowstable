let allPosts = [];
let currentPost = null;
let currentImageIndex = 0;

// Fetch posts database on load
async function loadPostsDatabase() {
  try {
    const res = await fetch('assets/data/posts.json');
    if (res.ok) {
      allPosts = await res.json();
    }
  } catch (err) {
    console.error('Failed to load posts database:', err);
  }
}

// Open Lightbox Modal
function openModal(permalink) {
  // Find matching post in database
  const post = allPosts.find(p => p.permalink_url === permalink);
  if (!post) {
    // Fallback: If not found in database, redirect to link
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

  // Fill in textual content
  modal.querySelector('#modalDate').textContent = post.date_label || '';
  modal.querySelector('#modalCategory').textContent = post.category || 'Note';
  modal.querySelector('#modalTitle').textContent = post.title || 'Flow\'s Table';
  
  // Format message text with paragraphs
  const messageHtml = (post.message || '')
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
  modal.querySelector('#modalBody').innerHTML = messageHtml || '<p>No content available.</p>';

  // Format stats text
  const commentText = post.comment_count === 1 ? '1 comment' : `${post.comment_count || 0} comments`;
  const shareText = post.share_count === 1 ? '1 share' : `${post.share_count || 0} shares`;
  modal.querySelector('#modalStats').textContent = `${post.reaction_count || 0} reactions / ${commentText} / ${shareText}`;
  modal.querySelector('#modalFacebookLink').setAttribute('href', post.permalink_url);

  // Setup photos
  updateCarousel();

  // Show modal
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
    // If no photos, try to fall back to the thumbnail image from the page, or hide panel
    // Find the original card's thumbnail
    const cards = Array.from(document.querySelectorAll('.post-card, .archive-post'));
    const matchedCard = cards.find(c => {
      const link = c.querySelector('.post-media') || c.querySelector('.archive-head a');
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

    // Show/hide controls based on photo count
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

// Close Lightbox Modal
function closeModal() {
  const modal = document.querySelector('#postModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadPostsDatabase();

  // Floating Header Scroll Effect
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      header?.classList.add('solid');
    } else {
      header?.classList.remove('solid');
    }
  });

  // Modal Card Click Listeners
  document.addEventListener('click', (e) => {
    const postCard = e.target.closest('.post-card') || e.target.closest('.archive-post');
    // If they clicked the Facebook link directly inside the modal or a standard link
    if (e.target.closest('#modalFacebookLink') || e.target.closest('.modal-close') || e.target.closest('.carousel-btn')) {
      return;
    }
    if (postCard) {
      e.preventDefault();
      const linkEl = postCard.querySelector('.post-media') || postCard.querySelector('.archive-head a');
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
  const searchInput = document.querySelector("#archiveSearch");
  const chipsContainer = document.querySelector("#categoryChips");
  const archivePosts = Array.from(document.querySelectorAll(".archive-post"));
  const emptyState = document.querySelector("#emptyState");
  let activeCategory = "all";

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

  // Input listener
  searchInput?.addEventListener("input", updateArchive);

  // Chips click listener
  chipsContainer?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      chipsContainer.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.value || "all";
      updateArchive();
    }
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
    vibeDots[vibeIndex].classList.add('active');
  }

  function startAutoSlide() {
    vibeInterval = setInterval(() => {
      showVibeSlide(vibeIndex + 1);
    }, 5000);
  }

  function resetAutoSlide() {
    clearInterval(vibeInterval);
    startAutoSlide();
  }

  vibePrev?.addEventListener('click', () => {
    showVibeSlide(vibeIndex - 1);
    resetAutoSlide();
  });
  
  vibeNext?.addEventListener('click', () => {
    showVibeSlide(vibeIndex + 1);
    resetAutoSlide();
  });

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
