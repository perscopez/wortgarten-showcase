import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

/**
 * Normalizes a finding into the canonical AuditFinding schema.
 * @param {object} f
 */
export function makeFinding({
  id,
  severity,
  category,
  module: mod,
  file,
  line,
  title,
  evidence,
  impact,
  suggestion,
}) {
  return {
    id,
    severity,
    category,
    module: mod,
    file: file.replace(/\\/g, '/'),
    ...(Number.isInteger(line) && line > 0 ? { line } : {}),
    title,
    evidence: String(evidence || '').trim(),
    impact: String(impact || '').trim(),
    suggestion: String(suggestion || '').trim(),
  };
}

/** Recursively walks a directory returning relative POSIX paths. */
export function walkFiles(dirRel, predicate = () => true) {
  const start = path.join(ROOT, dirRel);
  if (!fs.existsSync(start)) return [];
  const out = [];
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        if (predicate(rel)) out.push(rel);
      }
    }
  }
  return out.sort();
}

export function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

export function readJson(rel) {
  return JSON.parse(readText(rel));
}

export function lineOfIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Bundles a TypeScript module with esbuild into CJS in memory so Node can execute
 * arbitrary app modules (including JSON imports) without modifying the repo.
 */
export async function loadTsModule(relPath, external = ['../components/*']) {
  const { buildSync } = await import('esbuild');
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  const res = buildSync({
    entryPoints: [path.join(ROOT, relPath)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    loader: { '.json': 'json' },
    external,
  });
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', res.outputFiles[0].text);
  fn(mod, mod.exports, req);
  return mod.exports;
}

export function dedupeAndSort(findings) {
  const seen = new Map();
  for (const f of findings) {
    const key = `${f.file}:${f.line || 0}:${f.title}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.category.localeCompare(b.category) ||
      a.file.localeCompare(b.file) ||
      (a.line || 0) - (b.line || 0)
  );
}
