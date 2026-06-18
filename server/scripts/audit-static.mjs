import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const skipPrefixes = ['http:', 'https:', 'mailto:', 'tel:', 'data:', '#', 'javascript:'];
const textFileExtensions = new Set(['.html', '.css', '.js']);
const refPattern = /(?:href|src)=["']([^"']*)["']|url\(["']?([^"')]+)["']?\)|["'](assets\/[^"']+)["']/g;

async function listTextFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'server') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTextFiles(full));
    } else if (textFileExtensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

function cleanRef(ref) {
  if (!ref) return '';
  const trimmed = ref.trim();
  if (trimmed.includes('${')) return '';
  if (!trimmed || skipPrefixes.some((prefix) => trimmed.startsWith(prefix))) return '';
  return trimmed.split('#')[0].split('?')[0].replace(/^\//, '');
}

const files = await listTextFiles(root);
const missing = [];

for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  for (const match of text.matchAll(refPattern)) {
    const ref = cleanRef(match[1] || match[2] || match[3]);
    if (!ref) continue;
    const target = path.resolve(root, ref);
    if (!target.startsWith(root)) {
      missing.push({ file, ref, reason: 'outside-root' });
      continue;
    }
    try {
      await fs.access(target);
    } catch {
      missing.push({ file, ref, reason: 'missing' });
    }
  }
}

if (missing.length) {
  console.error('References locales invalides:');
  for (const item of missing) {
    console.error(`- ${path.relative(root, item.file)} -> ${item.ref} (${item.reason})`);
  }
  process.exit(1);
}

console.log(`Audit statique OK: ${files.length} fichiers verifies.`);
