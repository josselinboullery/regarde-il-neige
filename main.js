/* ============================================================
   REGARDE IL NEIGE — main.js
   Script léger : injection images, menu mobile, scroll header
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

  // Images secondaires (PAGE_IMG_1, PAGE_IMG_2 …)
  const extraImages = [
    { varName: 'PAGE_IMG_1', selector: '[data-img="1"]' },
    { varName: 'PAGE_IMG_2', selector: '[data-img="2"]' },
    { varName: 'PAGE_IMG_3', selector: '[data-img="3"]' },
  ];
  extraImages.forEach(({ varName, selector }) => {
    if (typeof window[varName] !== 'undefined') {
      const el = document.querySelector(selector);
      if (el && el.tagName === 'IMG') {
        el.src = window[varName];
        el.alt = window[varName + '_ALT'] || '';
      } else if (el) {
        el.style.backgroundImage = `url('${window[varName]}')`;
      }
    }
  });

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

    // Fermer au clic sur un lien
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ----------------------------------------------------------
  // 4. Marquer le lien actif dans la navigation
  // ----------------------------------------------------------
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPage) {
      link.classList.add('active');
    }
  });

});
