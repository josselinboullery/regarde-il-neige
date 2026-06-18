const fs = require('node:fs');
const path = require('node:path');

const SECTION_LABELS = {
  company: 'La compagnie',
  youth: 'Jeune public',
  allPublic: 'Tout public',
  actions: 'Actions',
  team: "L'equipe",
  contact: 'Contact'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJs(value) {
  return JSON.stringify(String(value ?? ''));
}

function extractBlock(html, startNeedle, endNeedle) {
  const start = html.indexOf(startNeedle);
  if (start === -1) return '';
  const end = html.indexOf(endNeedle, start);
  if (end === -1) return '';
  return html.slice(start, end + endNeedle.length);
}

function getShell(rootDir) {
  const source = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  return {
    header: extractBlock(source, '<header class="site-header"', '</header>'),
    mobileNav: extractBlock(source, '<nav class="mobile-nav"', '</nav>'),
    footer: extractBlock(source, '<footer class="site-footer"', '</footer>')
  };
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function imageFigure(item) {
  if (!item.image) return '';
  const srcset = item.imageSrcset ? ` srcset="${escapeHtml(item.imageSrcset)}" sizes="(max-width: 900px) 100vw, 760px"` : '';
  return `
        <figure class="generated-page-figure">
          <img src="${escapeHtml(item.image)}"${srcset} alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy">
        </figure>`;
}

function pdfButton(item) {
  if (!item.pdf) return '';
  return `<a href="${escapeHtml(item.pdf)}" download class="btn btn--outline">Telecharger le dossier</a>`;
}

function agendaList(content, slug) {
  const dates = (content.agenda || []).filter((item) => item.showSlug === slug && item.status !== 'archived');
  if (!dates.length) {
    return '<p style="color:var(--color-text-muted);font-size:.9rem;font-style:italic;">Les prochaines dates seront annoncees prochainement.</p>';
  }

  return `
          <div class="dates-past-list" role="list">
            ${dates.map((date) => `
            <div class="date-past-item" role="listitem">
              <span class="date-past-year">${escapeHtml(date.date)}</span>
              <span class="date-past-venue">${escapeHtml(date.venue)}</span>
              <span class="date-past-city">${escapeHtml(date.city)}</span>
            </div>`).join('')}
          </div>`;
}

function renderStandardPage(item) {
  return `
    <section class="page-hero ${item.heroSize === 'short' ? 'page-hero--short' : ''}" aria-labelledby="page-title">
      <div class="hero-bg"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-pretitle">${escapeHtml(item.pretitle || SECTION_LABELS[item.section] || item.section)}</span>
        <h1 class="hero-title" id="page-title">${escapeHtml(item.title)}</h1>
        <p class="hero-subtitle">${escapeHtml(item.subtitle || '')}</p>
        <div class="btn-group">${pdfButton(item)}</div>
      </div>
    </section>

    <section class="section">
      <div class="container--narrow">
        <span class="section-label">${escapeHtml(item.sectionLabel || SECTION_LABELS[item.section] || 'Page')}</span>
        <p class="intro-text">${escapeHtml(item.intro || '')}</p>
        <div class="divider"></div>
        ${imageFigure(item)}
        <div class="body-text">
          ${paragraphs(item.body)}
        </div>
      </div>
    </section>`;
}

function renderShowPage(show, content) {
  return `
    <section class="page-hero" aria-labelledby="spectacle-title">
      <div class="hero-bg"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-pretitle">Spectacle musical · ${escapeHtml(show.age || show.category)}</span>
        <h1 class="hero-title" id="spectacle-title">${escapeHtml(show.title)}</h1>
        <p class="hero-subtitle">${escapeHtml(show.shortDescription || '')}</p>
        <div class="btn-group">
          <a href="#dates" class="btn btn--primary">Dates a venir</a>
          ${pdfButton(show)}
        </div>
      </div>
    </section>

    <div class="spectacle-strip" role="complementary">
      <div class="spectacle-strip-inner">
        <div class="strip-item"><span class="strip-item-label">Type</span><span class="strip-item-value">Spectacle musical</span></div>
        <div class="strip-item"><span class="strip-item-label">Public</span><span class="strip-item-value">${escapeHtml(show.age || '')}</span></div>
        <div class="strip-item"><span class="strip-item-label">Duree</span><span class="strip-item-value">${escapeHtml(show.duration || '')}</span></div>
        <div class="strip-item"><span class="strip-item-label">Distribution</span><span class="strip-item-value">${escapeHtml(show.cast || '')}</span></div>
      </div>
    </div>

    <section class="section">
      <div class="container--narrow">
        <span class="section-label">Le spectacle</span>
        <p class="intro-text">${escapeHtml(show.shortDescription || '')}</p>
        <div class="divider"></div>
        ${imageFigure(show)}
        <div class="body-text">
          ${paragraphs(show.body)}
        </div>
      </div>
    </section>

    <section class="section section--alt" id="dates" aria-labelledby="dates-title">
      <div class="container">
        <span class="section-label">Tournee</span>
        <h2 id="dates-title" class="section-title">Dates a venir</h2>
        ${agendaList(content, show.slug)}
      </div>
    </section>`;
}

function renderPageDocument(rootDir, item, content, kind = 'page') {
  const shell = getShell(rootDir);
  const title = `${item.title} · Regarde il neige`;
  const description = item.shortDescription || item.subtitle || item.intro || content.seo?.description || '';
  const hero = item.image || 'assets/images/index.avif';
  const body = kind === 'show' ? renderShowPage(item, content) : renderStandardPage(item);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <script>
    const PAGE_HERO_IMAGE = ${escapeJs(hero)};
    const PAGE_HERO_ALT = ${escapeJs(item.imageAlt || item.title)};
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${shell.header}
  ${shell.mobileNav}
  <main>
${body}
  </main>
  ${shell.footer}
  <script src="main.js"></script>
</body>
</html>`;
}

function findGeneratedPage(content, filename) {
  const pages = content.pages || [];
  const page = pages.find((item) => item.status === 'published' && `${item.slug}.html` === filename);
  if (page) return { item: page, kind: 'page' };

  const show = (content.shows || []).find((item) => {
    const pageName = item.page || `${item.slug}.html`;
    return item.status === 'published' && pageName === filename;
  });

  if (show) return { item: show, kind: 'show' };
  return null;
}

module.exports = {
  SECTION_LABELS,
  renderPageDocument,
  findGeneratedPage,
  escapeHtml
};
