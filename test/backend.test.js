const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createApp } = require('../server/app');
const { createMediaService } = require('../server/lib/media-service');

async function makeServer() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rin-backend-'));
  const app = createApp({
    dataDir,
    adminUser: 'admin',
    adminPassword: 'secret-pass',
    logger: { error() {}, debug() {} }
  });
  await app.locals.ready;

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    dataDir,
    baseUrl,
    close: async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  };
}

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret-pass' })
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const body = await response.json();
  assert.ok(body.csrfToken);
  return { cookie, csrfToken: body.csrfToken };
}

test('public files are served and private files are not exposed', async () => {
  const ctx = await makeServer();
  try {
    const index = await fetch(`${ctx.baseUrl}/index.html`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Regarde il neige/);

    const privateFile = await fetch(`${ctx.baseUrl}/server/app.js`);
    assert.equal(privateFile.status, 404);

    const protectedApi = await fetch(`${ctx.baseUrl}/api/admin/content`);
    assert.equal(protectedApi.status, 401);
  } finally {
    await ctx.close();
  }
});

test('admin login, csrf, draft save and publish work', async () => {
  const ctx = await makeServer();
  try {
    const badLogin = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' })
    });
    assert.equal(badLogin.status, 401);

    const auth = await login(ctx.baseUrl);
    const contentResponse = await fetch(`${ctx.baseUrl}/api/admin/content`, {
      headers: { Cookie: auth.cookie }
    });
    assert.equal(contentResponse.status, 200);
    const content = await contentResponse.json();
    const originalName = content.published.site.name;

    const noCsrf = await fetch(`${ctx.baseUrl}/api/admin/content`, {
      method: 'PUT',
      headers: { Cookie: auth.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(content.draft)
    });
    assert.equal(noCsrf.status, 403);

    const edited = { ...content.draft, site: { ...content.draft.site, name: 'Regarde il neige test' } };
    const save = await fetch(`${ctx.baseUrl}/api/admin/content`, {
      method: 'PUT',
      headers: {
        Cookie: auth.cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': auth.csrfToken
      },
      body: JSON.stringify(edited)
    });
    assert.equal(save.status, 200);

    const publicBefore = await fetch(`${ctx.baseUrl}/api/public/content`);
    assert.equal((await publicBefore.json()).site.name, originalName);

    const publish = await fetch(`${ctx.baseUrl}/api/admin/publish`, {
      method: 'POST',
      headers: {
        Cookie: auth.cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': auth.csrfToken
      },
      body: '{}'
    });
    assert.equal(publish.status, 200);

    const publicAfter = await fetch(`${ctx.baseUrl}/api/public/content`);
    assert.equal((await publicAfter.json()).site.name, 'Regarde il neige test');
  } finally {
    await ctx.close();
  }
});

test('admin can publish generated pages with the public site shell', async () => {
  const ctx = await makeServer();
  try {
    const auth = await login(ctx.baseUrl);
    const contentResponse = await fetch(`${ctx.baseUrl}/api/admin/content`, {
      headers: { Cookie: auth.cookie }
    });
    const content = await contentResponse.json();

    const edited = {
      ...content.draft,
      pages: [
        {
          slug: 'nouvelle-page-test',
          page: 'nouvelle-page-test.html',
          section: 'actions',
          title: 'Nouvelle page test',
          pretitle: 'Actions',
          sectionLabel: 'Actions culturelles',
          subtitle: 'Sous-titre test',
          intro: 'Introduction de test',
          body: 'Premier paragraphe.\n\nSecond paragraphe.',
          image: 'assets/images/index.avif',
          imageAlt: 'Image test',
          imageSrcset: '',
          pdf: '',
          status: 'published',
          navVisible: true,
          heroSize: 'default'
        }
      ]
    };

    const save = await fetch(`${ctx.baseUrl}/api/admin/content`, {
      method: 'PUT',
      headers: {
        Cookie: auth.cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': auth.csrfToken
      },
      body: JSON.stringify(edited)
    });
    assert.equal(save.status, 200);

    const publish = await fetch(`${ctx.baseUrl}/api/admin/publish`, {
      method: 'POST',
      headers: {
        Cookie: auth.cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': auth.csrfToken
      },
      body: '{}'
    });
    assert.equal(publish.status, 200);

    const generated = await fetch(`${ctx.baseUrl}/nouvelle-page-test.html`);
    assert.equal(generated.status, 200);
    const html = await generated.text();
    assert.match(html, /<link rel="stylesheet" href="style.css">/);
    assert.match(html, /class="site-header"/);
    assert.match(html, /Nouvelle page test/);
    assert.match(html, /<script src="main.js"><\/script>/);
  } finally {
    await ctx.close();
  }
});

test('contact messages are validated and stored', async () => {
  const ctx = await makeServer();
  try {
    const invalid = await fetch(`${ctx.baseUrl}/api/contact/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'bad', message: 'court' })
    });
    assert.equal(invalid.status, 400);

    const valid = await fetch(`${ctx.baseUrl}/api/contact/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gaelle',
        email: 'gaelle@example.com',
        subject: 'Programmation',
        message: 'Bonjour, nous souhaitons programmer un spectacle.'
      })
    });
    assert.equal(valid.status, 201);

    const auth = await login(ctx.baseUrl);
    const messages = await fetch(`${ctx.baseUrl}/api/admin/messages`, {
      headers: { Cookie: auth.cookie }
    });
    assert.equal(messages.status, 200);
    const body = await messages.json();
    assert.equal(body.messages.length, 1);
    assert.equal(body.messages[0].subject, 'Programmation');
  } finally {
    await ctx.close();
  }
});

test('media optimizer creates public webp variants and no public original', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rin-media-root-'));
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rin-media-data-'));
  try {
    await fs.mkdir(path.join(rootDir, 'assets'), { recursive: true });
    const service = createMediaService({ rootDir, dataDir });
    const png = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 4,
        background: { r: 46, g: 49, b: 146, alpha: 1 }
      }
    }).png().toBuffer();

    const media = await service.saveOptimizedImage({
      originalname: 'photo-test.png',
      buffer: png
    }, {
      slug: 'photo-test',
      alt: 'Photo test',
      usage: 'content'
    });

    assert.equal(media.kind, 'image');
    assert.ok(media.primaryPath.endsWith('.webp'));
    assert.ok(media.srcset.includes('.webp'));

    const generatedFiles = await fs.readdir(path.join(rootDir, 'assets', 'generated', 'images'));
    assert.ok(generatedFiles.some((file) => file.endsWith('.webp')));
    assert.equal(generatedFiles.some((file) => /\.(png|jpg|jpeg)$/i.test(file)), false);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
