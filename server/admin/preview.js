function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadPreview() {
  const response = await fetch('/api/admin/content');
  if (response.status === 401) {
    window.location.href = '/admin/login';
    return;
  }
  const data = await response.json();
  const content = data.draft;
  document.getElementById('preview-title').textContent = content.site.name;
  document.getElementById('preview-root').innerHTML = `
    <section class="preview-hero">
      <p class="eyebrow">${escapeHtml(content.home.heroLabel)}</p>
      <h2>${escapeHtml(content.home.heroTitle)}</h2>
      <p>${escapeHtml(content.home.intro)}</p>
    </section>
    <section>
      <p class="eyebrow">Pages creees</p>
      <div class="preview-grid">
        ${content.pages.map((page) => `
          <article class="preview-card">
            <strong>${escapeHtml(page.title)}</strong>
            <p>${escapeHtml(page.section)} - ${escapeHtml(page.status)}</p>
            <p><a href="/${escapeHtml(page.page)}" target="_blank" rel="noopener">${escapeHtml(page.page)}</a></p>
            <p>${escapeHtml(page.intro)}</p>
          </article>
        `).join('') || '<p>Aucune page.</p>'}
      </div>
    </section>
    <section>
      <p class="eyebrow">Spectacles</p>
      <div class="preview-grid">
        ${content.shows.map((show) => `
          <article class="preview-card">
            <strong>${escapeHtml(show.title)}</strong>
            <p>${escapeHtml(show.category)} - ${escapeHtml(show.age)} - ${escapeHtml(show.duration)}</p>
            <p>${escapeHtml(show.shortDescription)}</p>
          </article>
        `).join('')}
      </div>
    </section>
    <section class="preview-hero">
      <p class="eyebrow">Agenda</p>
      <div class="preview-grid">
        ${content.agenda.map((date) => `
          <article class="preview-card">
            <strong>${escapeHtml(date.date || 'Date a confirmer')}</strong>
            <p>${escapeHtml(date.venue)} - ${escapeHtml(date.city)}</p>
            <p>${escapeHtml(date.showSlug)} - ${escapeHtml(date.status)}</p>
          </article>
        `).join('') || '<p>Aucune date.</p>'}
      </div>
    </section>
  `;
}

loadPreview();
