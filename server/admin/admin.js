let csrfToken = '';
let draft = null;
let published = null;
let selectedPage = 0;
let selectedShow = 0;
let latestMessages = [];

const statusEl = document.getElementById('global-status');
const panelTitle = document.getElementById('panel-title');
const titles = {
  dashboard: 'Tableau',
  pages: 'Pages',
  shows: 'Spectacles',
  agenda: 'Agenda',
  json: 'JSON',
  messages: 'Messages'
};

const sectionOptions = [
  ['company', 'La compagnie'],
  ['youth', 'Jeune public'],
  ['allPublic', 'Tout public'],
  ['actions', 'Actions'],
  ['team', 'Equipe'],
  ['contact', 'Contact']
];

function setStatus(message, type = '') {
  statusEl.className = `form-status ${type}`;
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value, fallback = 'page') {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || fallback;
}

function generatedPage(slug) {
  return `${slug}.html`;
}

async function api(route, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['x-csrf-token'] = csrfToken;

  const response = await fetch(route, { ...options, method, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

async function uploadMedia(kind, file, options = {}) {
  if (!file) throw new Error('Choisir un fichier');
  const form = new FormData();
  form.append('file', file);
  form.append('slug', options.slug || 'media');
  form.append('usage', options.usage || 'content');
  if (options.alt) form.append('alt', options.alt);

  const response = await fetch(`/api/admin/media/${kind}`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Upload refuse');
  return data.media;
}

function syncJsonEditor() {
  document.getElementById('json-editor').value = JSON.stringify(draft, null, 2);
}

function renderDashboard() {
  const metrics = [
    ['Pages', draft.pages.length],
    ['Spectacles', draft.shows.length],
    ['Dates', draft.agenda.length],
    ['Messages', latestMessages.length]
  ];
  document.getElementById('metric-grid').innerHTML = metrics.map(([label, value]) => `
    <div class="metric"><strong>${value}</strong><span>${label}</span></div>
  `).join('');

  document.getElementById('publish-summary').innerHTML = `
    <dt>Brouillon modifie</dt><dd>${escapeHtml(draft.updatedAt || '-')}</dd>
    <dt>Publication</dt><dd>${escapeHtml(published.publishedAt || '-')}</dd>
    <dt>Site</dt><dd>${escapeHtml(draft.site.name)}</dd>
  `;
}

function uploadControls(entity, kind) {
  const imagePath = entity.image || '';
  const pdfPath = entity.pdf || '';
  return `
    <label class="wide">Image optimisee
      <div class="upload-line">
        <input name="image" value="${escapeHtml(imagePath)}" readonly>
        <button type="button" class="button-secondary" data-upload-image>Upload and Optimize</button>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" data-image-file hidden>
      </div>
    </label>
    <label class="wide">Alt image<input name="imageAlt" value="${escapeHtml(entity.imageAlt || entity.title || '')}"></label>
    <input type="hidden" name="imageSrcset" value="${escapeHtml(entity.imageSrcset || '')}">
    <label class="wide">PDF
      <div class="upload-line">
        <input name="pdf" value="${escapeHtml(pdfPath)}" readonly>
        <button type="button" class="button-secondary" data-upload-pdf>Upload PDF</button>
        <input type="file" accept=".pdf,application/pdf" data-pdf-file hidden>
      </div>
    </label>
    <p class="media-hint" data-media-hint>${kind === 'image' ? '' : ''}</p>
  `;
}

function bindUploadControls(form, getSlug) {
  const imageButton = form.querySelector('[data-upload-image]');
  const imageFile = form.querySelector('[data-image-file]');
  const pdfButton = form.querySelector('[data-upload-pdf]');
  const pdfFile = form.querySelector('[data-pdf-file]');
  const hint = form.querySelector('[data-media-hint]');

  imageButton?.addEventListener('click', () => imageFile.click());
  imageFile?.addEventListener('change', async () => {
    try {
      setStatus('Optimisation image...');
      const media = await uploadMedia('image', imageFile.files[0], {
        slug: getSlug(),
        alt: form.elements.imageAlt?.value || form.elements.title?.value || '',
        usage: 'content'
      });
      form.elements.image.value = media.primaryPath;
      form.elements.imageSrcset.value = media.srcset || '';
      if (hint) {
        const sizes = media.variants.map((variant) => `${variant.width}w ${Math.round(variant.bytes / 1024)} Ko`).join(' · ');
        hint.textContent = `Image optimisee: ${sizes}`;
      }
      setStatus('Image optimisee.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      imageFile.value = '';
    }
  });

  pdfButton?.addEventListener('click', () => pdfFile.click());
  pdfFile?.addEventListener('change', async () => {
    try {
      setStatus('Upload PDF...');
      const media = await uploadMedia('pdf', pdfFile.files[0], {
        slug: getSlug(),
        usage: 'document'
      });
      form.elements.pdf.value = media.path;
      if (hint) hint.textContent = `PDF envoye: ${Math.round(media.bytes / 1024)} Ko`;
      setStatus('PDF envoye.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      pdfFile.value = '';
    }
  });
}

function renderPages() {
  const list = document.getElementById('pages-list');
  list.innerHTML = draft.pages.map((page, index) => `
    <button class="item-row ${index === selectedPage ? 'active' : ''}" data-page-index="${index}">
      <strong>${escapeHtml(page.title)}</strong>
      <span class="item-meta">${escapeHtml(page.page)} - ${escapeHtml(page.status)}</span>
    </button>
  `).join('');

  list.querySelectorAll('[data-page-index]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedPage = Number(button.dataset.pageIndex);
      renderPages();
    });
  });

  const page = draft.pages[selectedPage];
  const form = document.getElementById('page-form');
  if (!page) {
    form.innerHTML = '<p class="form-status">Aucune page. Utiliser Ajouter.</p>';
    return;
  }

  form.innerHTML = `
    <div class="form-grid">
      <input type="hidden" name="slug" value="${escapeHtml(page.slug)}">
      <input type="hidden" name="page" value="${escapeHtml(page.page)}">
      <label>Section
        <select name="section">
          ${sectionOptions.map(([value, label]) => `<option value="${value}" ${page.section === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      <label>Titre<input name="title" value="${escapeHtml(page.title)}" required></label>
      <label>Page generee<input name="generatedPage" value="${escapeHtml(page.page)}" readonly></label>
      <label>Statut
        <select name="status">
          ${['draft', 'ready', 'published', 'archived'].map((status) => `<option ${page.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </label>
      <label>Pretitre<input name="pretitle" value="${escapeHtml(page.pretitle || '')}"></label>
      <label>Libelle section<input name="sectionLabel" value="${escapeHtml(page.sectionLabel || '')}"></label>
      <label class="wide">Sous-titre<input name="subtitle" value="${escapeHtml(page.subtitle || '')}"></label>
      <label class="wide">Introduction<textarea name="intro">${escapeHtml(page.intro || '')}</textarea></label>
      <label class="wide">Texte<textarea name="body" class="large-textarea">${escapeHtml(page.body || '')}</textarea></label>
      ${uploadControls(page, 'page')}
      <label class="checkbox-line wide"><input type="checkbox" name="navVisible" ${page.navVisible !== false ? 'checked' : ''}> Afficher dans le menu</label>
    </div>
    <div class="form-row form-row-actions">
      <button type="button" class="button-danger" id="delete-page-btn">Supprimer</button>
      <button type="submit">Enregistrer</button>
    </div>
  `;

  form.elements.title.addEventListener('input', () => {
    const slug = slugify(form.elements.title.value, `page-${Date.now()}`);
    form.elements.slug.value = slug;
    form.elements.page.value = generatedPage(slug);
    form.elements.generatedPage.value = generatedPage(slug);
  });

  bindUploadControls(form, () => form.elements.slug.value || slugify(form.elements.title.value));

  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.navVisible = form.elements.navVisible.checked;
    data.page = generatedPage(data.slug);
    draft.pages[selectedPage] = data;
    await saveDraft();
  };

  document.getElementById('delete-page-btn').onclick = async () => {
    if (!confirm('Supprimer cette page du brouillon ?')) return;
    draft.pages.splice(selectedPage, 1);
    selectedPage = Math.max(0, selectedPage - 1);
    await saveDraft();
  };
}

function renderShows() {
  const list = document.getElementById('shows-list');
  list.innerHTML = draft.shows.map((show, index) => `
    <button class="item-row ${index === selectedShow ? 'active' : ''}" data-show-index="${index}">
      <strong>${escapeHtml(show.title)}</strong>
      <span class="item-meta">${escapeHtml(show.page || generatedPage(show.slug))} - ${escapeHtml(show.status)}</span>
    </button>
  `).join('');

  list.querySelectorAll('[data-show-index]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedShow = Number(button.dataset.showIndex);
      renderShows();
    });
  });

  const show = draft.shows[selectedShow];
  const form = document.getElementById('show-form');
  if (!show) {
    form.innerHTML = '<p class="form-status">Aucun spectacle.</p>';
    return;
  }

  const autoPage = !show.page || show.page === generatedPage(show.slug);
  form.innerHTML = `
    <div class="form-grid">
      <input type="hidden" name="slug" value="${escapeHtml(show.slug)}">
      <input type="hidden" name="page" value="${escapeHtml(show.page || generatedPage(show.slug))}">
      <label>Titre<input name="title" value="${escapeHtml(show.title)}" required></label>
      <label>Categorie
        <select name="category">
          ${['Jeune public', 'Tout public'].map((category) => `<option ${show.category === category ? 'selected' : ''}>${category}</option>`).join('')}
        </select>
      </label>
      <label>Page generee<input name="generatedPage" value="${escapeHtml(show.page || generatedPage(show.slug))}" readonly></label>
      <label>Statut
        <select name="status">
          ${['draft', 'ready', 'published', 'archived'].map((status) => `<option ${show.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </label>
      <label>Age<input name="age" value="${escapeHtml(show.age)}"></label>
      <label>Duree<input name="duration" value="${escapeHtml(show.duration)}"></label>
      <label>Distribution<input name="cast" value="${escapeHtml(show.cast)}"></label>
      <label class="wide">Description courte<textarea name="shortDescription">${escapeHtml(show.shortDescription)}</textarea></label>
      <label class="wide">Texte page<textarea name="body" class="large-textarea">${escapeHtml(show.body || '')}</textarea></label>
      ${uploadControls(show, 'show')}
    </div>
    <div class="form-row form-row-actions">
      <button type="button" class="button-danger" id="delete-show-btn">Supprimer</button>
      <button type="submit">Enregistrer</button>
    </div>
  `;

  if (autoPage) {
    form.elements.title.addEventListener('input', () => {
      const slug = slugify(form.elements.title.value, `spectacle-${Date.now()}`);
      form.elements.slug.value = slug;
      form.elements.page.value = generatedPage(slug);
      form.elements.generatedPage.value = generatedPage(slug);
    });
  }

  bindUploadControls(form, () => form.elements.slug.value || slugify(form.elements.title.value));

  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.page = autoPage ? generatedPage(data.slug) : form.elements.page.value;
    draft.shows[selectedShow] = data;
    await saveDraft();
  };

  document.getElementById('delete-show-btn').onclick = async () => {
    if (!confirm('Supprimer ce spectacle du brouillon ?')) return;
    draft.shows.splice(selectedShow, 1);
    selectedShow = Math.max(0, selectedShow - 1);
    await saveDraft();
  };
}

function renderAgenda() {
  const body = document.getElementById('agenda-body');
  body.innerHTML = draft.agenda.map((item, index) => `
    <tr data-date-index="${index}">
      <td><input data-field="date" value="${escapeHtml(item.date)}"></td>
      <td><input data-field="showSlug" value="${escapeHtml(item.showSlug)}"></td>
      <td><input data-field="venue" value="${escapeHtml(item.venue)}"></td>
      <td><input data-field="city" value="${escapeHtml(item.city)}"></td>
      <td>
        <select data-field="status">
          ${['draft', 'upcoming', 'past', 'published'].map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </td>
      <td><button class="button-danger" data-remove-date="${index}">Retirer</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('input, select').forEach((field) => {
    field.addEventListener('change', async () => {
      const row = field.closest('tr');
      draft.agenda[Number(row.dataset.dateIndex)][field.dataset.field] = field.value;
      await saveDraft(false);
    });
  });

  body.querySelectorAll('[data-remove-date]').forEach((button) => {
    button.addEventListener('click', async () => {
      draft.agenda.splice(Number(button.dataset.removeDate), 1);
      await saveDraft();
    });
  });
}

function renderMessages(messages) {
  const list = document.getElementById('message-list');
  if (!messages.length) {
    list.innerHTML = '<p class="form-status">Aucun message.</p>';
    return;
  }
  list.innerHTML = messages.map((message) => `
    <article class="message-item">
      <strong>${escapeHtml(message.subject)}</strong>
      <p class="message-meta">${escapeHtml(message.name)} - ${escapeHtml(message.email)} - ${escapeHtml(message.createdAt)}</p>
      <p>${escapeHtml(message.message)}</p>
    </article>
  `).join('');
}

function renderAll() {
  renderDashboard();
  renderPages();
  renderShows();
  renderAgenda();
  syncJsonEditor();
}

async function saveDraft(render = true) {
  setStatus('Enregistrement...');
  const data = await api('/api/admin/content', {
    method: 'PUT',
    body: JSON.stringify(draft)
  });
  draft = data.draft;
  if (render) renderAll();
  setStatus('Brouillon enregistre.', 'ok');
}

async function load() {
  try {
    const session = await fetch('/api/admin/session');
    if (session.status === 401) {
      window.location.href = '/admin/login';
      return;
    }
    const sessionData = await session.json();
    csrfToken = sessionData.csrfToken;

    const contentData = await api('/api/admin/content');
    const messageData = await api('/api/admin/messages');
    draft = contentData.draft;
    published = contentData.published;
    latestMessages = messageData.messages;
    renderAll();
    renderMessages(latestMessages);
    setStatus('Pret.', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

document.querySelectorAll('.admin-nav button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav button').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(`panel-${button.dataset.panel}`).classList.add('active');
    panelTitle.textContent = titles[button.dataset.panel] || 'Admin';
  });
});

document.getElementById('add-page-btn').addEventListener('click', async () => {
  const slug = `nouvelle-page-${Date.now()}`;
  draft.pages.push({
    slug,
    page: generatedPage(slug),
    section: 'company',
    title: 'Nouvelle page',
    pretitle: '',
    sectionLabel: '',
    subtitle: '',
    intro: '',
    body: '',
    image: '',
    imageAlt: '',
    imageSrcset: '',
    pdf: '',
    status: 'draft',
    navVisible: true,
    heroSize: 'default'
  });
  selectedPage = draft.pages.length - 1;
  await saveDraft();
});

document.getElementById('add-show-btn').addEventListener('click', async () => {
  const slug = `nouveau-spectacle-${Date.now()}`;
  draft.shows.push({
    slug,
    title: 'Nouveau spectacle',
    category: 'Jeune public',
    age: '',
    duration: '',
    cast: '',
    page: generatedPage(slug),
    image: '',
    imageAlt: '',
    imageSrcset: '',
    pdf: '',
    status: 'draft',
    shortDescription: '',
    body: ''
  });
  selectedShow = draft.shows.length - 1;
  await saveDraft();
});

document.getElementById('add-date-btn').addEventListener('click', async () => {
  draft.agenda.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    showSlug: draft.shows[0]?.slug || '',
    date: '',
    endDate: '',
    venue: '',
    city: '',
    bookingUrl: '',
    status: 'draft'
  });
  await saveDraft();
});

document.getElementById('save-json-btn').addEventListener('click', async () => {
  try {
    draft = JSON.parse(document.getElementById('json-editor').value);
    await saveDraft();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

document.getElementById('format-json-btn').addEventListener('click', () => {
  try {
    document.getElementById('json-editor').value = JSON.stringify(JSON.parse(document.getElementById('json-editor').value), null, 2);
    setStatus('JSON formate.', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

document.getElementById('publish-btn').addEventListener('click', async () => {
  if (!confirm('Publier le brouillon ?')) return;
  try {
    setStatus('Publication...');
    const data = await api('/api/admin/publish', { method: 'POST', body: '{}' });
    published = data.published;
    renderDashboard();
    setStatus('Publication terminee.', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
  window.location.href = '/admin/login';
});

load();
