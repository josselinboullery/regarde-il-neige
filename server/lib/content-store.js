const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const defaultContent = require('../default-content');
const { slugify } = require('./slug');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanString(value, field, max = 1000, required = true) {
  if (value === undefined || value === null) {
    if (!required) return '';
    throw new Error(`${field} requis`);
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} doit etre du texte`);
  }

  const output = value.replace(/\0/g, '').replace(/\r\n/g, '\n').trim();
  if (required && !output) throw new Error(`${field} requis`);
  if (output.length > max) throw new Error(`${field} trop long`);
  return output;
}

function cleanSlug(value, field) {
  const slug = cleanString(value, field, 120).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new Error(`${field} doit contenir seulement lettres, chiffres et tirets`);
  }
  return slug;
}

function cleanUrl(value, field, required = false) {
  const output = cleanString(value || '', field, 500, required);
  if (!output) return '';
  if (
    output.startsWith('assets/') ||
    output.endsWith('.html') ||
    output.startsWith('http://') ||
    output.startsWith('https://')
  ) {
    return output;
  }
  throw new Error(`${field} doit etre une URL http(s), un asset local ou une page HTML`);
}

function generatedPageFromSlug(slug) {
  return `${slug}.html`;
}

function cleanStatus(value) {
  const status = cleanString(value || 'draft', 'status', 40);
  if (!['draft', 'ready', 'published', 'archived', 'past', 'upcoming'].includes(status)) {
    throw new Error('status invalide');
  }
  return status;
}

function normalizeShows(input) {
  const shows = Array.isArray(input) ? input : [];
  const slugs = new Set();

  return shows.map((item, index) => {
    const slug = cleanSlug(item.slug, `shows[${index}].slug`);
    if (slugs.has(slug)) throw new Error(`slug spectacle duplique: ${slug}`);
    slugs.add(slug);

    return {
      slug,
      title: cleanString(item.title, `shows[${index}].title`, 160),
      category: cleanString(item.category || 'Jeune public', `shows[${index}].category`, 80),
      age: cleanString(item.age || '', `shows[${index}].age`, 80, false),
      duration: cleanString(item.duration || '', `shows[${index}].duration`, 80, false),
      cast: cleanString(item.cast || '', `shows[${index}].cast`, 120, false),
      page: cleanUrl(item.page || generatedPageFromSlug(slug), `shows[${index}].page`, false),
      image: cleanUrl(item.image || '', `shows[${index}].image`, false),
      imageAlt: cleanString(item.imageAlt || item.title || '', `shows[${index}].imageAlt`, 200, false),
      imageSrcset: cleanString(item.imageSrcset || '', `shows[${index}].imageSrcset`, 2000, false),
      pdf: cleanUrl(item.pdf || '', `shows[${index}].pdf`, false),
      status: cleanStatus(item.status || 'draft'),
      shortDescription: cleanString(item.shortDescription || '', `shows[${index}].shortDescription`, 600, false),
      body: cleanString(item.body || '', `shows[${index}].body`, 12000, false)
    };
  });
}

function normalizePages(input) {
  const pages = Array.isArray(input) ? input : [];
  const slugs = new Set();

  return pages.map((item, index) => {
    const title = cleanString(item.title || 'Nouvelle page', `pages[${index}].title`, 160);
    const slug = cleanSlug(item.slug || slugify(title, `page-${index + 1}`), `pages[${index}].slug`);
    if (slugs.has(slug)) throw new Error(`slug page duplique: ${slug}`);
    slugs.add(slug);

    const section = cleanString(item.section || 'company', `pages[${index}].section`, 40);
    if (!['company', 'youth', 'allPublic', 'actions', 'team', 'contact'].includes(section)) {
      throw new Error(`pages[${index}].section invalide`);
    }

    return {
      slug,
      page: generatedPageFromSlug(slug),
      section,
      title,
      pretitle: cleanString(item.pretitle || '', `pages[${index}].pretitle`, 120, false),
      sectionLabel: cleanString(item.sectionLabel || '', `pages[${index}].sectionLabel`, 120, false),
      subtitle: cleanString(item.subtitle || '', `pages[${index}].subtitle`, 240, false),
      intro: cleanString(item.intro || '', `pages[${index}].intro`, 1200, false),
      body: cleanString(item.body || '', `pages[${index}].body`, 12000, false),
      image: cleanUrl(item.image || '', `pages[${index}].image`, false),
      imageAlt: cleanString(item.imageAlt || title, `pages[${index}].imageAlt`, 200, false),
      imageSrcset: cleanString(item.imageSrcset || '', `pages[${index}].imageSrcset`, 2000, false),
      pdf: cleanUrl(item.pdf || '', `pages[${index}].pdf`, false),
      status: cleanStatus(item.status || 'draft'),
      navVisible: item.navVisible !== false,
      heroSize: cleanString(item.heroSize || 'default', `pages[${index}].heroSize`, 40, false)
    };
  });
}

function normalizeAgenda(input) {
  const agenda = Array.isArray(input) ? input : [];

  return agenda.map((item, index) => ({
    id: cleanString(item.id || crypto.randomUUID(), `agenda[${index}].id`, 80),
    showSlug: cleanString(item.showSlug || '', `agenda[${index}].showSlug`, 120, false),
    date: cleanString(item.date || '', `agenda[${index}].date`, 80, false),
    endDate: cleanString(item.endDate || '', `agenda[${index}].endDate`, 80, false),
    venue: cleanString(item.venue || '', `agenda[${index}].venue`, 160, false),
    city: cleanString(item.city || '', `agenda[${index}].city`, 120, false),
    bookingUrl: cleanUrl(item.bookingUrl || '', `agenda[${index}].bookingUrl`, false),
    status: cleanStatus(item.status || 'draft')
  }));
}

function normalizeTeam(input) {
  const team = Array.isArray(input) ? input : [];

  return team.map((item, index) => ({
    slug: cleanSlug(item.slug, `team[${index}].slug`),
    name: cleanString(item.name, `team[${index}].name`, 160),
    role: cleanString(item.role || '', `team[${index}].role`, 240, false),
    bio: cleanString(item.bio || '', `team[${index}].bio`, 4000, false),
    image: cleanUrl(item.image || '', `team[${index}].image`, false),
    status: cleanStatus(item.status || 'draft'),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1
  }));
}

function normalizePartners(input) {
  const partners = Array.isArray(input) ? input : [];

  return partners.map((item, index) => ({
    name: cleanString(item.name, `contact.partners[${index}].name`, 180),
    logo: cleanUrl(item.logo || '', `contact.partners[${index}].logo`, false),
    category: cleanString(item.category || 'Partenaires', `contact.partners[${index}].category`, 80)
  }));
}

function normalizePeople(input) {
  const people = Array.isArray(input) ? input : [];

  return people.map((item, index) => ({
    role: cleanString(item.role, `contact.people[${index}].role`, 120),
    name: cleanString(item.name, `contact.people[${index}].name`, 160),
    detail: cleanString(item.detail || '', `contact.people[${index}].detail`, 240, false)
  }));
}

function normalizeContent(input) {
  const source = input && typeof input === 'object' ? input : {};
  const site = source.site || {};
  const home = source.home || {};
  const contact = source.contact || {};
  const seo = source.seo || {};

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    site: {
      name: cleanString(site.name || defaultContent.site.name, 'site.name', 120),
      baseline: cleanString(site.baseline || '', 'site.baseline', 160, false),
      tagline: cleanString(site.tagline || '', 'site.tagline', 500, false),
      email: cleanString(site.email || '', 'site.email', 160, false),
      phone: cleanString(site.phone || '', 'site.phone', 120, false),
      address: cleanString(site.address || '', 'site.address', 260, false),
      socials: {
        instagram: cleanUrl(site.socials?.instagram || '', 'site.socials.instagram', false),
        youtube: cleanUrl(site.socials?.youtube || '', 'site.socials.youtube', false),
        facebook: cleanUrl(site.socials?.facebook || '', 'site.socials.facebook', false)
      }
    },
    home: {
      heroLabel: cleanString(home.heroLabel || '', 'home.heroLabel', 160, false),
      heroTitle: cleanString(home.heroTitle || defaultContent.home.heroTitle, 'home.heroTitle', 160),
      intro: cleanString(home.intro || '', 'home.intro', 1200, false)
    },
    shows: normalizeShows(source.shows || []),
    pages: normalizePages(source.pages || []),
    agenda: normalizeAgenda(source.agenda || []),
    team: normalizeTeam(source.team || []),
    contact: {
      people: normalizePeople(contact.people || []),
      partners: normalizePartners(contact.partners || [])
    },
    seo: {
      title: cleanString(seo.title || '', 'seo.title', 160, false),
      description: cleanString(seo.description || '', 'seo.description', 300, false)
    }
  };
}

async function readJson(file, fallback) {
  try {
    const body = await fs.readFile(file, 'utf8');
    return JSON.parse(body);
  } catch (error) {
    if (error.code === 'ENOENT') return clone(fallback);
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

function createContentStore(options = {}) {
  const dataDir = options.dataDir || path.join(__dirname, '..', 'data');
  const paths = {
    dataDir,
    draft: path.join(dataDir, 'content.draft.json'),
    published: path.join(dataDir, 'content.published.json'),
    messages: path.join(dataDir, 'messages.json'),
    auditLog: path.join(dataDir, 'audit.log.jsonl'),
    releases: path.join(dataDir, 'releases')
  };

  async function ensureDataFiles() {
    await fs.mkdir(paths.dataDir, { recursive: true });
    await fs.mkdir(paths.releases, { recursive: true });

    const initial = normalizeContent(defaultContent);
    try {
      await fs.access(paths.draft);
    } catch {
      await writeJson(paths.draft, initial);
    }

    try {
      await fs.access(paths.published);
    } catch {
      await writeJson(paths.published, { ...initial, publishedAt: new Date().toISOString() });
    }

    try {
      await fs.access(paths.messages);
    } catch {
      await writeJson(paths.messages, []);
    }
  }

  async function appendAudit(event) {
    await fs.mkdir(paths.dataDir, { recursive: true });
    const entry = {
      ...event,
      at: new Date().toISOString()
    };
    await fs.appendFile(paths.auditLog, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async function getDraft() {
    await ensureDataFiles();
    return normalizeContent(await readJson(paths.draft, defaultContent));
  }

  async function getPublished() {
    await ensureDataFiles();
    const raw = await readJson(paths.published, defaultContent);
    const normalized = normalizeContent(raw);
    if (raw.publishedAt) normalized.publishedAt = raw.publishedAt;
    return normalized;
  }

  async function saveDraft(content, actor = 'system') {
    const normalized = normalizeContent(content);
    await writeJson(paths.draft, normalized);
    await appendAudit({ type: 'content.saveDraft', actor });
    return normalized;
  }

  async function publishDraft(actor = 'system') {
    await ensureDataFiles();
    const draft = normalizeContent(await getDraft());
    const previous = await getPublished();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeJson(path.join(paths.releases, `${stamp}.json`), previous);
    const published = { ...draft, publishedAt: new Date().toISOString() };
    await writeJson(paths.published, published);
    await appendAudit({ type: 'content.publish', actor, release: `${stamp}.json` });
    return published;
  }

  async function getMessages() {
    await ensureDataFiles();
    return readJson(paths.messages, []);
  }

  async function addMessage(input, meta = {}) {
    if (cleanString(input.company || '', 'company', 200, false)) {
      throw new Error('Message refuse');
    }

    const message = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'new',
      name: cleanString(input.name, 'name', 120),
      email: cleanString(input.email, 'email', 180),
      subject: cleanString(input.subject || 'Contact site', 'subject', 160),
      message: cleanString(input.message, 'message', 5000),
      ip: cleanString(meta.ip || '', 'ip', 80, false)
    };

    if (!EMAIL_RE.test(message.email)) throw new Error('email invalide');
    if (message.message.length < 10) throw new Error('message trop court');

    const messages = await getMessages();
    messages.unshift(message);
    await writeJson(paths.messages, messages.slice(0, 500));
    await appendAudit({ type: 'contact.message', actor: 'public', messageId: message.id });
    return {
      id: message.id,
      createdAt: message.createdAt,
      status: message.status
    };
  }

  return {
    paths,
    ensureDataFiles,
    getDraft,
    getPublished,
    saveDraft,
    publishDraft,
    getMessages,
    addMessage,
    normalizeContent
  };
}

module.exports = {
  createContentStore,
  normalizeContent
};
