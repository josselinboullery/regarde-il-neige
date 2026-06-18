const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { slugify } = require('./slug');

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 32_000_000;
const IMAGE_VARIANTS = [300, 800, 1600, 2400];

function shortHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
}

function detectImage(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) return 'png';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Chemin media invalide');
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

function createMediaService(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const dataDir = options.dataDir || path.join(__dirname, '..', 'data');
  const publicImageDir = path.join(rootDir, 'assets', 'generated', 'images');
  const publicPdfDir = path.join(rootDir, 'assets', 'generated', 'pdf');
  const tmpDir = path.join(dataDir, 'tmp-media');
  const mediaFile = path.join(dataDir, 'media.json');

  async function getMedia() {
    return readJson(mediaFile, []);
  }

  async function addMedia(entry) {
    const media = await getMedia();
    media.unshift(entry);
    await writeJson(mediaFile, media.slice(0, 1000));
    return entry;
  }

  async function saveOptimizedImage(file, options = {}) {
    if (!file?.buffer?.length) throw new Error('Image manquante');
    if (file.buffer.length > MAX_IMAGE_BYTES) throw new Error('Image trop lourde');

    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      throw new Error('Format image refuse');
    }

    const detected = detectImage(file.buffer);
    if (!detected) throw new Error('Fichier image invalide');

    const baseSlug = slugify(options.slug || path.basename(file.originalname || 'image', extension), 'image');
    const alt = String(options.alt || '').trim();
    const jobDir = path.join(tmpDir, crypto.randomUUID());
    const variants = [];

    await fs.mkdir(jobDir, { recursive: true });
    await fs.mkdir(publicImageDir, { recursive: true });

    try {
      const metadata = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS }).metadata();
      if (!metadata.width || !metadata.height) throw new Error('Dimensions image invalides');
      if (metadata.width * metadata.height > MAX_PIXELS) throw new Error('Image trop grande');

      for (const width of IMAGE_VARIANTS) {
        if (width > metadata.width && width !== IMAGE_VARIANTS[0]) continue;

        const result = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: width >= 1600 ? 86 : 82 })
          .toBuffer({ resolveWithObject: true });

        const hash = shortHash(result.data);
        const finalName = `${baseSlug}-${hash}-${result.info.width}.webp`;
        const tmpPath = path.join(jobDir, finalName);
        const finalPath = path.join(publicImageDir, finalName);
        assertInside(publicImageDir, finalPath);

        await fs.writeFile(tmpPath, result.data);
        await fs.rename(tmpPath, finalPath);

        variants.push({
          width: result.info.width,
          height: result.info.height,
          bytes: result.data.length,
          path: `assets/generated/images/${finalName}`
        });
      }

      if (!variants.length) throw new Error('Aucune variante image generee');

      variants.sort((a, b) => a.width - b.width);
      const primary = variants[variants.length - 1];
      const entry = {
        id: crypto.randomUUID(),
        kind: 'image',
        originalName: file.originalname || '',
        usage: String(options.usage || 'content'),
        alt,
        variants,
        primaryPath: primary.path,
        srcset: variants.map((variant) => `${variant.path} ${variant.width}w`).join(', '),
        createdAt: new Date().toISOString()
      };

      await addMedia(entry);
      return entry;
    } finally {
      await fs.rm(jobDir, { recursive: true, force: true });
    }
  }

  async function savePdf(file, options = {}) {
    if (!file?.buffer?.length) throw new Error('PDF manquant');
    if (file.buffer.length > MAX_PDF_BYTES) throw new Error('PDF trop lourd');

    const extension = path.extname(file.originalname || '').toLowerCase();
    if (extension !== '.pdf') throw new Error('Format PDF refuse');
    if (file.buffer.slice(0, 5).toString('ascii') !== '%PDF-') throw new Error('PDF invalide');

    const baseSlug = slugify(options.slug || path.basename(file.originalname || 'document', extension), 'document');
    const hash = shortHash(file.buffer);
    const finalName = `${baseSlug}-${hash}.pdf`;
    const jobDir = path.join(tmpDir, crypto.randomUUID());
    const tmpPath = path.join(jobDir, finalName);
    const finalPath = path.join(publicPdfDir, finalName);
    assertInside(publicPdfDir, finalPath);

    await fs.mkdir(jobDir, { recursive: true });
    await fs.mkdir(publicPdfDir, { recursive: true });

    try {
      await fs.writeFile(tmpPath, file.buffer);
      await fs.rename(tmpPath, finalPath);
      const entry = {
        id: crypto.randomUUID(),
        kind: 'pdf',
        originalName: file.originalname || '',
        usage: String(options.usage || 'document'),
        bytes: file.buffer.length,
        path: `assets/generated/pdf/${finalName}`,
        createdAt: new Date().toISOString()
      };
      await addMedia(entry);
      return entry;
    } finally {
      await fs.rm(jobDir, { recursive: true, force: true });
    }
  }

  return {
    getMedia,
    saveOptimizedImage,
    savePdf
  };
}

module.exports = {
  createMediaService,
  detectImage
};
