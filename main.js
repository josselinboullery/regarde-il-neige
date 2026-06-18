/* ============================================================
   REGARDE IL NEIGE - main.js
   Script : injection images, menu mobile, scroll header,
            carousels, lecteurs YouTube integres
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const sharedMenus = {
    company: [
      { href: 'la-compagnie.html', label: 'Présentation' },
      { href: 'equipe.html', label: "L'équipe" },
    ],
    youth: [
      { href: 'alice.html', label: 'Alice au pays des miroirs' },
      { href: 'aurore.html', label: "Aurore — La Belle au bois ne s'endort pas" },
      { href: 'ambroisie.html', label: 'Ambroisie' },
      { href: 'robinson.html', label: 'Robinson Crusoé et Zoé Liberté' },
      { href: 'remi-do-et-gagaboum.html', label: 'Rémi Do et Gagaboum' },
      { href: 'kinder-jardin-songs.html', label: 'Kinder Jardin Songs' },
    ],
    allPublic: [
      { href: 'le-conte-d-hiver.html', label: "Le Conte d'hiver — Shakespeare" },
      { href: 'mathis-andersen.html', label: 'Mathis Andersen — Monde Monde' },
    ],
    actions: [
      { href: 'ateliers-et-stages.html', label: 'Ateliers & stages' },
      { href: 'dessine-moi-une-chanson.html', label: 'Dessine-moi une chanson' },
      { href: 'eveil-musical.html', label: 'Éveil musical' },
    ],
    contact: [
      { href: 'contact.html', label: 'Contact' },
    ],
  };

  let bindMobileNavLinks = () => {};

  function appendMenuItems(container, items, role) {
    items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      if (role) {
        link.setAttribute('role', role);
      }
      container.appendChild(link);
    });
  }

  function addMenuItem(section, item) {
    if (!sharedMenus[section]) return;
    if (sharedMenus[section].some(existing => existing.href === item.href)) return;
    sharedMenus[section].push(item);
  }

  function showSection(category) {
    return category === 'Tout public' ? 'allPublic' : 'youth';
  }

  function pageMenuSection(section) {
    if (section === 'team') return 'company';
    return section;
  }

  function applyDynamicPublicContent(content) {
    (content.pages || []).forEach(page => {
      if (page.status !== 'published' || page.navVisible === false) return;
      addMenuItem(pageMenuSection(page.section), {
        href: page.page || `${page.slug}.html`,
        label: page.title,
      });
    });

    (content.shows || []).forEach(show => {
      if (show.status !== 'published') return;
      addMenuItem(showSection(show.category), {
        href: show.page || `${show.slug}.html`,
        label: show.title,
      });
    });
  }

  function markActiveLinks() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a, .mobile-nav a').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', Boolean(href && href === currentPage));
    });
  }

  async function loadDynamicMenus() {
    try {
      const response = await fetch('/api/public/content', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      applyDynamicPublicContent(await response.json());
      normalizeSharedMenus();
      bindMobileNavLinks();
      markActiveLinks();
    } catch {
      // Le site reste pleinement utilisable en statique si le back-end est absent.
    }
  }

  function normalizeSharedMenus() {
    const siteNav = document.querySelector('.site-nav');
    const contactLink = siteNav?.querySelector(':scope > a[href="contact.html"]');
    if (siteNav && contactLink && sharedMenus.contact.length > 1) {
      const dropdown = document.createElement('div');
      dropdown.className = 'nav-dropdown';
      const trigger = document.createElement('a');
      trigger.href = 'contact.html';
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.textContent = 'Contact';
      const menu = document.createElement('div');
      menu.className = 'nav-dropdown-menu';
      menu.setAttribute('role', 'menu');
      dropdown.append(trigger, menu);
      contactLink.replaceWith(dropdown);
    }

    const desktopMenuMap = {
      'La compagnie': sharedMenus.company,
      'Jeune public': sharedMenus.youth,
      'Tout public': sharedMenus.allPublic,
      'Actions': sharedMenus.actions,
      'Contact': sharedMenus.contact,
    };

    document.querySelectorAll('.site-nav > .nav-dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector(':scope > a');
      const menu = dropdown.querySelector(':scope > .nav-dropdown-menu');
      if (!trigger || !menu) return;

      const items = desktopMenuMap[trigger.textContent.trim()];
      if (!items) return;

      menu.innerHTML = '';
      appendMenuItems(menu, items, 'menuitem');
    });

    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;

    mobileNav.innerHTML = '';

    const mobileSections = [
      { label: 'La compagnie', items: sharedMenus.company },
      { label: 'Jeune public', items: sharedMenus.youth },
      { label: 'Tout public', items: sharedMenus.allPublic },
      { label: 'Actions', items: sharedMenus.actions },
      { label: 'Contact', items: sharedMenus.contact },
    ];

    mobileSections.forEach(section => {
      const title = document.createElement('span');
      title.className = 'mobile-nav-label';
      title.textContent = section.label;
      mobileNav.appendChild(title);
      appendMenuItems(mobileNav, section.items);
    });
  }

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
  // 2. Menus partages : meme ordre sur toutes les pages
  // ----------------------------------------------------------
  normalizeSharedMenus();

  // ----------------------------------------------------------
  // 3. Header : classe scrolled au scroll
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
  // 4. Menu burger (mobile)
  // ----------------------------------------------------------
  const burger = document.querySelector('.burger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    const closeMobileNav = () => {
      mobileNav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    bindMobileNavLinks = () => {
      mobileNav.querySelectorAll('a').forEach(link => {
        if (link.dataset.mobileBound) return;
        link.dataset.mobileBound = 'true';
        link.addEventListener('click', closeMobileNav);
      });
    };

    burger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      burger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    bindMobileNavLinks();
  }

  // ----------------------------------------------------------
  // 5. Marquer le lien actif
  // ----------------------------------------------------------
  markActiveLinks();
  loadDynamicMenus();

  // ----------------------------------------------------------
  // 6. Formulaire contact back-end
  // ----------------------------------------------------------
  const contactForm = document.querySelector('.js-contact-form');
  if (contactForm) {
    const status = contactForm.querySelector('.contact-form-status');
    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (status) {
        status.textContent = 'Envoi en cours...';
        status.className = 'contact-form-status';
      }

      const payload = Object.fromEntries(new FormData(contactForm).entries());

      try {
        const response = await fetch('/api/contact/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Message non envoye');
        }

        contactForm.reset();
        if (status) {
          status.textContent = 'Message envoye.';
          status.className = 'contact-form-status contact-form-status--ok';
        }
      } catch (error) {
        if (status) {
          status.textContent = error.message || 'Message non envoye.';
          status.className = 'contact-form-status contact-form-status--error';
        }
      }
    });
  }

  // ----------------------------------------------------------
  // 7. Carousels
  // ----------------------------------------------------------
  document.querySelectorAll('.carousel').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const prevBtn = carousel.querySelector('.carousel-btn--prev');
    const nextBtn = carousel.querySelector('.carousel-btn--next');

    if (!track || slides.length === 0) return;

    let current = 0;

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
        dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === current);
        });
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    let startX = 0;
    carousel.addEventListener('touchstart', event => {
      startX = event.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', event => {
      const dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        goTo(dx < 0 ? current + 1 : current - 1);
      }
    });
  });

  // ----------------------------------------------------------
  // 8. Lecteurs YouTube integres
  // ----------------------------------------------------------
  document.querySelectorAll('.yt-player').forEach(player => {
    const videoId = player.dataset.videoId;
    if (!videoId || player.querySelector('iframe')) return;

    player.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
    iframe.title = player.dataset.title || 'Video YouTube';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';
    player.appendChild(iframe);
  });

});
