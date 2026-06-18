const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { createContentStore } = require('./lib/content-store');
const { createMediaService } = require('./lib/media-service');
const { findGeneratedPage, renderPageDocument } = require('./lib/page-renderer');

const SESSION_COOKIE = 'rin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqualText(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function jsonError(res, status, message) {
  res.status(status).json({ error: message });
}

function createApp(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const adminDir = path.join(__dirname, 'admin');
  const logger = options.logger || console;
  const app = express();
  const store = createContentStore({ dataDir: options.dataDir });
  const mediaService = createMediaService({ rootDir, dataDir: options.dataDir });
  const ready = store.ensureDataFiles();
  const sessions = new Map();
  const adminUser = options.adminUser || process.env.ADMIN_USER || 'admin';
  const adminPassword = options.adminPassword || process.env.ADMIN_PASSWORD;
  const publicFiles = new Set(
    fs.readdirSync(rootDir)
      .filter((file) => file.endsWith('.html'))
      .concat(['style.css', 'main.js'])
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1
    }
  });

  app.locals.ready = ready;
  app.locals.store = store;
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(async (_req, _res, next) => {
    try {
      await ready;
      next();
    } catch (error) {
      next(error);
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
  });

  function getSession(req) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return null;

    const key = hashToken(token);
    const session = sessions.get(key);
    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      sessions.delete(key);
      return null;
    }

    return session;
  }

  function createSession(res) {
    const token = crypto.randomBytes(32).toString('base64url');
    const session = {
      role: 'owner',
      csrfToken: crypto.randomBytes(24).toString('base64url'),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };

    sessions.set(hashToken(token), session);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS,
      path: '/'
    });
    return session;
  }

  function destroySession(req, res) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) sessions.delete(hashToken(token));
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  function requireAuth(req, res, next) {
    const session = getSession(req);
    if (!session) return jsonError(res, 401, 'Connexion requise');
    req.session = session;
    next();
  }

  function requireCsrf(req, res, next) {
    const token = req.get('x-csrf-token');
    if (!token || !req.session || !safeEqualText(token, req.session.csrfToken)) {
      return jsonError(res, 403, 'CSRF invalide');
    }
    next();
  }

  function requireUpload(req, res, next) {
    upload.single('file')(req, res, (error) => {
      if (error) return jsonError(res, 400, 'Fichier refuse');
      return next();
    });
  }

  function assertGeneratedPageNames(content) {
    for (const page of content.pages || []) {
      const filename = `${page.slug}.html`;
      if (publicFiles.has(filename)) {
        throw new Error(`Nom de page deja utilise: ${filename}`);
      }
    }
  }

  function sendAdminFile(res, name) {
    return res.sendFile(path.join(adminDir, name));
  }

  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!adminPassword) return jsonError(res, 503, 'ADMIN_PASSWORD manquant');
      if (!safeEqualText(username, adminUser) || !safeEqualText(password, adminPassword)) {
        return jsonError(res, 401, 'Identifiants invalides');
      }

      const session = createSession(res);
      res.json({ ok: true, role: session.role, csrfToken: session.csrfToken });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/logout', requireAuth, requireCsrf, (req, res) => {
    destroySession(req, res);
    res.json({ ok: true });
  });

  app.get('/api/admin/session', requireAuth, (req, res) => {
    res.json({ authenticated: true, role: req.session.role, csrfToken: req.session.csrfToken });
  });

  app.get('/api/admin/content', requireAuth, async (_req, res, next) => {
    try {
      res.json({
        draft: await store.getDraft(),
        published: await store.getPublished()
      });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/admin/content', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const normalized = store.normalizeContent(req.body || {});
      assertGeneratedPageNames(normalized);
      const draft = await store.saveDraft(normalized, req.session.role);
      res.json({ ok: true, draft });
    } catch (error) {
      jsonError(res, 400, error.message);
    }
  });

  app.post('/api/admin/publish', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const published = await store.publishDraft(req.session.role);
      res.json({ ok: true, published });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/messages', requireAuth, async (_req, res, next) => {
    try {
      res.json({ messages: await store.getMessages() });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/media', requireAuth, async (_req, res, next) => {
    try {
      res.json({ media: await mediaService.getMedia() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/media/image', requireAuth, requireCsrf, requireUpload, async (req, res) => {
    try {
      const media = await mediaService.saveOptimizedImage(req.file, {
        slug: req.body?.slug,
        alt: req.body?.alt,
        usage: req.body?.usage || 'content'
      });
      res.status(201).json({ ok: true, media });
    } catch (error) {
      jsonError(res, 400, error.message);
    }
  });

  app.post('/api/admin/media/pdf', requireAuth, requireCsrf, requireUpload, async (req, res) => {
    try {
      const media = await mediaService.savePdf(req.file, {
        slug: req.body?.slug,
        usage: req.body?.usage || 'document'
      });
      res.status(201).json({ ok: true, media });
    } catch (error) {
      jsonError(res, 400, error.message);
    }
  });

  app.get('/api/public/content', async (_req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=60');
      res.json(await store.getPublished());
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/contact/messages', contactLimiter, async (req, res) => {
    try {
      const message = await store.addMessage(req.body || {}, { ip: req.ip });
      res.status(201).json({ ok: true, message });
    } catch (error) {
      jsonError(res, 400, error.message);
    }
  });

  app.get('/admin/login', (req, res) => {
    if (getSession(req)) return res.redirect('/admin');
    return sendAdminFile(res, 'login.html');
  });

  app.get(['/admin', '/admin/'], (req, res) => {
    if (!getSession(req)) return res.redirect('/admin/login');
    return sendAdminFile(res, 'admin.html');
  });

  app.get('/admin/preview', (req, res) => {
    if (!getSession(req)) return res.redirect('/admin/login');
    return sendAdminFile(res, 'preview.html');
  });

  const adminAssets = new Set(['admin.css', 'admin.js', 'login.js', 'preview.js']);
  app.get('/admin/assets/:file', (req, res) => {
    if (!adminAssets.has(req.params.file)) return res.sendStatus(404);
    return res.sendFile(path.join(adminDir, req.params.file));
  });

  app.use('/assets', express.static(path.join(rootDir, 'assets'), {
    index: false,
    dotfiles: 'ignore',
    fallthrough: false,
    maxAge: '1h'
  }));

  app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'index.html')));
  app.get('/favicon.ico', (_req, res) => res.sendStatus(204));
  app.get('/:file', async (req, res, next) => {
    const file = path.basename(req.params.file);
    if (publicFiles.has(file)) return res.sendFile(path.join(rootDir, file));

    if (file.endsWith('.html')) {
      try {
        const content = await store.getPublished();
        const generated = findGeneratedPage(content, file);
        if (generated) {
          return res.type('html').send(renderPageDocument(rootDir, generated.item, content, generated.kind));
        }
      } catch (error) {
        return next(error);
      }
    }

    return res.sendStatus(404);
  });

  app.use((req, res) => {
    logger.debug?.(`404 ${req.method} ${req.originalUrl}`);
    res.status(404).type('text/plain').send('Not found');
  });

  app.use((error, _req, res, _next) => {
    logger.error?.(error);
    res.status(500).json({ error: 'Erreur serveur' });
  });

  return app;
}

module.exports = {
  createApp
};
