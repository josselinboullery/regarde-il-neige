/* ============================================================
   REGARDE IL NEIGE — main.js
   Script : injection images, menu mobile, scroll header,
            carousels, lecteur YouTube click-to-play
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ----------------------------------------------------------
  // 1. Injection des images via variables globales (PAGE_*)
  // ----------------------------------------------------------
  if (typeof PAGE_HERO_IMAGE !== 'undefined') {
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
      heroBg.style.backgroundImage = `url('${PAGE_HERO_IMAGE}')`;
      heroBg.setAttribute('role', 'img');
      if (typeof PAGE_HERO_ALT !== 'undefined') {
        heroBg.setAttribute('aria-label', PAGE_HERO_ALT);
      }
      const img = new Image();
      img.onload = () => heroBg.classList.add('loaded');
      img.src = PAGE_HERO_IMAGE;
    }
  }

  // ----------------------------------------------------------
  // 2. Header : classe scrolled au scroll
  // ----------------------------------------------------------
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ----------------------------------------------------------
  // 3. Menu burger (mobile)
  // ----------------------------------------------------------
  const burger = document.querySelector('.burger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      burger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ----------------------------------------------------------
  // 4. Marquer le lien actif
  // ----------------------------------------------------------
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPage) {
      link.classList.add('active');
    }
  });

  // ----------------------------------------------------------
  // 5. Carousels
  // ----------------------------------------------------------
  document.querySelectorAll('.carousel').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const prevBtn = carousel.querySelector('.carousel-btn--prev');
    const nextBtn = carousel.querySelector('.carousel-btn--next');

    if (!track || slides.length === 0) return;

    let current = 0;

    // Créer les dots
    if (dotsContainer) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Photo ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      });
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
          d.classList.toggle('active', i === current);
        });
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    // Swipe tactile
    let startX = 0;
    carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
    });
  });

  // ----------------------------------------------------------
  // 6. Lecteur YouTube click-to-play (évite l'Erreur 153)
  // ----------------------------------------------------------
  document.querySelectorAll('.yt-player').forEach(player => {
    const videoId = player.dataset.videoId;
    if (!videoId) return;

    // Thumbnail
    const thumb = document.createElement('img');
    thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    thumb.alt = player.dataset.title || 'Vidéo YouTube';
    thumb.loading = 'lazy';
    thumb.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';

    // Bouton play
    const btn = document.createElement('button');
    btn.className = 'yt-play-btn';
    btn.setAttribute('aria-label', 'Lire la vidéo sur YouTube');
    btn.innerHTML = `<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
      <path d="M66.52,7.74C65.74,4.72,63.37,2.33,60.37,1.54C55.07,0,34,0,34,0S12.93,0,7.63,1.54C4.63,2.33,2.26,4.72,1.48,7.74C0,13.08,0,24,0,24s0,10.92,1.48,16.26c0.78,3.02,3.15,5.41,6.15,6.20C12.93,48,34,48,34,48s21.07,0,26.37-1.54c3-0.79,5.37-3.18,6.15-6.20C68,34.92,68,24,68,24S68,13.08,66.52,7.74z" fill="#FF0000"/>
      <path d="M45,24L27,14v20" fill="#fff"/>
    </svg>`;

    player.style.position = 'relative';
    player.appendChild(thumb);
    player.appendChild(btn);

    function loadVideo() {
      // Si on ouvre le fichier en local (file://), YouTube bloque l'iframe avec l'Erreur 153.
      // Dans ce cas précis, on ouvre la vidéo dans un nouvel onglet.
      if (window.location.protocol === 'file:') {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
        return;
      }

      // Nettoyer
      player.innerHTML = '';
      const iframe = document.createElement('iframe');
      // youtube-nocookie est préférable pour le RGPD
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      iframe.title = player.dataset.title || 'Vidéo YouTube';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';
      player.appendChild(iframe);
    }

    btn.addEventListener('click', loadVideo);
    thumb.addEventListener('click', loadVideo);
  });

});
