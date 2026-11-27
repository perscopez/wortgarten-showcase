import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, walkFiles, readText, readJson, lineOfIndex, makeFinding } from './types.mjs';

function runCmd(cmd, args, timeoutMs = 120000) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, stdout, stderr: '', code: 0 };
  } catch (err) {
    return {
      ok: false,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
      code: err.status ?? 1,
    };
  }
}

export async function runStaticAudit({ runTooling = true } = {}) {
  const findings = [];
  const stats = {
    filesScanned: 0,
    typecheckOk: null,
    lintErrors: 0,
    lintWarnings: 0,
    testsOk: null,
    missingAssets: 0,
  };

  // 1. Official toolchain checks when node_modules is installed
  const hasDeps = fs.existsSync(path.join(ROOT, 'node_modules'));
  if (runTooling && hasDeps) {
    const tsc = runCmd('npx', ['tsc', '--noEmit']);
    stats.typecheckOk = tsc.ok;
    if (!tsc.ok) {
      const lines = (tsc.stdout + '\n' + tsc.stderr).split('\n').filter((l) => /error TS\d+/.test(l));
      for (let i = 0; i < Math.min(lines.length, 40); i++) {
        const m = lines[i].match(/^([^\s(]+)\((\d+),\d+\):\s*(error TS\d+:.*)$/);
        findings.push(
          makeFinding({
            id: `STAT-TSC-${String(i + 1).padStart(3, '0')}`,
            severity: 'P1',
            category: 'Mantık/Bug',
            module: 'TypeScript',
            file: m ? m[1] : 'tsconfig.json',
            line: m ? Number(m[2]) : undefined,
            title: 'TypeScript tip hatası',
            evidence: m ? m[3] : lines[i],
            impact: 'Tip güvenliği kırılır ve üretim derlemesi başarısız olabilir.',
            suggestion: 'İlgili satırdaki tip uyumsuzluğunu giderin.',
          })
        );
      }
    }

    const eslint = runCmd('npx', ['eslint', '.', '--format', 'json']);
    try {
      const parsed = JSON.parse(eslint.stdout || '[]');
      const warnByRule = new Map();
      let errIdx = 0;
      for (const item of parsed) {
        const rel = path.relative(ROOT, item.filePath).replace(/\\/g, '/');
        if (rel.startsWith('scripts/audit/')) continue;
        for (const msg of item.messages || []) {
          if (msg.severity === 2) {
            stats.lintErrors++;
            findings.push(
              makeFinding({
                id: `STAT-LINT-E${String(++errIdx).padStart(3, '0')}`,
                severity: 'P1',
                category: 'Kod Sağlığı',
                module: 'ESLint',
                file: rel,
                line: msg.line,
                title: `ESLint hatası: ${msg.ruleId || 'syntax'}`,
                evidence: msg.message,
                impact: 'CI/lint aşaması başarısız olur veya çalışma zamanı hatasına yol açar.',
                suggestion: 'ESLint kuralını karşılayacak şekilde kodu düzeltin.',
              })
            );
          } else if (msg.severity === 1) {
            stats.lintWarnings++;
            const rule = msg.ruleId || 'unknown';
            if (!warnByRule.has(rule)) warnByRule.set(rule, []);
            warnByRule.get(rule).push(`${rel}:${msg.line}`);
          }
        }
      }
      let wIdx = 0;
      for (const [rule, locs] of [...warnByRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
        const [firstFile, firstLine] = locs[0].split(':');
        findings.push(
          makeFinding({
            id: `STAT-LINT-W${String(++wIdx).padStart(3, '0')}`,
            severity: rule.startsWith('react-hooks/') ? 'P2' : 'P3',
            category: 'Kod Sağlığı',
            module: 'ESLint',
            file: firstFile,
            line: Number(firstLine) || undefined,
            title: `ESLint uyarısı (${locs.length} yerde): ${rule}`,
            evidence: locs.slice(0, 8).join(', ') + (locs.length > 8 ? ` (+${locs.length - 8} daha)` : ''),
            impact: rule.startsWith('react-hooks/')
              ? 'React 19 / React Compiler uyumluluğu, gereksiz render veya bayat ref riski.'
              : 'Tip güvenliği veya ölü kod borcu birikir.',
            suggestion: `Kural ihlallerini temizleyin: ${rule}.`,
          })
        );
      }
    } catch {
      // ESLint JSON parse failed
    }
  }

  // 2. Source graph: unused imports, useState never set, useEffect without deps, unreferenced local assets
  const sourceFiles = [
    ...walkFiles('app', (f) => /\.(ts|tsx)$/.test(f)),
    ...walkFiles('components', (f) => /\.(ts|tsx)$/.test(f)),
    ...walkFiles('lib', (f) => /\.ts$/.test(f)),
  ];
  stats.filesScanned = sourceFiles.length;

  const allSourceText = new Map(sourceFiles.map((f) => [f, readText(f)]));
  let deadIdx = 0;

  for (const [file, text] of allSourceText) {
    // a) useEffect with no dependency array (runs on EVERY render!)
    const effectRe = /\buseEffect\s*\(\s*\(\s*\)\s*=>\s*\{/g;
    let m;
    while ((m = effectRe.exec(text)) !== null) {
      // Scan balanced braces to find end of arrow body
      let depth = 0;
      let i = m.index + m[0].length - 1;
      let inStr = null;
      for (; i < text.length; i++) {
        const ch = text[i];
        if (inStr) {
          if (ch === '\\') i++;
          else if (ch === inStr) inStr = null;
          continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') {
          inStr = ch;
          continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      const after = text.slice(i + 1, i + 12).trim();
      if (after.startsWith(')')) {
        const line = lineOfIndex(text, m.index);
        findings.push(
          makeFinding({
            id: `STAT-HOOK-${String(++deadIdx).padStart(3, '0')}`,
            severity: 'P2',
            category: 'Performans',
            module: file.split('/')[0],
            file,
            line,
            title: 'Bağımlılık dizisi olmayan useEffect (her renderda yeniden çalışır)',
            evidence: text.slice(m.index, Math.min(text.length, m.index + 120)).replace(/\s+/g, ' '),
            impact: 'Her renderda (ör. 1 sn zamanlayıcı veya her tuş vuruşunda) efekt ve varsa dinleyiciler sökülüp yeniden bağlanır.',
            suggestion: 'Uygun bağımlılık dizisi ekleyin veya olay dinleyicisi için güncel callback ref kullanın.',
          })
        );
      }
    }

    // b) useState where setter is only ever called with initial falsy/same value (never toggled to true/non-empty)
    const stateRe = /(?:const|,)\s*\[\s*([a-zA-Z_$][\w$]*)\s*,\s*(set[A-Z][\w$]*)\s*\]\s*=\s*useState(?:<[^>]+>)?\(\s*(false|null|''|"")\s*\)/g;
    while ((m = stateRe.exec(text)) !== null) {
      const [, varName, setter, initVal] = m;
      const allRefs = [...text.matchAll(new RegExp(`\\b${setter}\\b`, 'g'))].length;
      const calls = [...text.matchAll(new RegExp(`\\b${setter}\\s*\\(([^)]*)\\)`, 'g'))].map((x) => x[1].trim());
      // If setter is referenced beyond its declaration + direct calls (e.g., passed as a prop), skip.
      const passedByRef = allRefs - 1 > calls.length;
      if (!passedByRef && (calls.length === 0 || calls.every((arg) => arg === initVal))) {
        findings.push(
          makeFinding({
            id: `STAT-STATE-${String(++deadIdx).padStart(3, '0')}`,
            severity: 'P3',
            category: 'Kod Sağlığı',
            module: file.split('/')[0],
            file,
            line: lineOfIndex(text, m.index),
            title: `Ölü useState: '${varName}' hiçbir zaman başlangıç değeri (${initVal}) dışına güncellenmiyor`,
            evidence: `${setter} çağrıları: ${calls.length ? calls.join(', ') : '(hiç çağrılmamış)'}`,
            impact: 'Eski arayüzden kalan ölü durum karmaşıklık ve gereksiz bağımlılık yaratır.',
            suggestion: `Kullanılmayan '${varName}' / '${setter}' state'ini kaldırın.`,
          })
        );
      }
    }

    // c) readAloud return value discarded (no cleanup on unmount / fast navigation)
    const readAloudRe = /readAloud\s*\(/g;
    while ((m = readAloudRe.exec(text)) !== null) {
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const before = text.slice(lineStart, m.index);
      if (!/[=:]\s*$|return\s+$/.test(before) && !file.endsWith('lib/read-aloud.ts')) {
        findings.push(
          makeFinding({
            id: `STAT-TTS-${String(++deadIdx).padStart(3, '0')}`,
            severity: 'P2',
            category: 'A11y/TTS',
            module: file,
            file,
            line: lineOfIndex(text, m.index),
            title: 'readAloud() durdurma fonksiyonu saklanmıyor (unmount ses sızıntısı)',
            evidence: text.slice(lineStart, text.indexOf('\n', m.index)).trim().slice(0, 140),
            impact: 'Bileşen kapandığında veya kullanıcı hızlıca sonraki soruya geçtiğinde önceki ses kesilmez.',
            suggestion: 'readAloud() dönüşündeki stop fonksiyonunu ref içinde tutup unmount anında çağırın.',
          })
        );
      }
    }
  }

  // 3. Unreferenced components or lib modules
  const allSearchable = [
    ...sourceFiles,
    ...walkFiles('scripts', (f) => /\.(mjs|js|ts)$/.test(f) && !f.startsWith('scripts/audit/')),
    ...walkFiles('tests', (f) => /\.mjs$/.test(f)),
  ];
  const corpus = allSearchable.map((f) => [f, readText(f)]);
  for (const file of [...walkFiles('components', (f) => /\.tsx$/.test(f)), ...walkFiles('lib', (f) => /\.ts$/.test(f))]) {
    const base = path.basename(file).replace(/\.(tsx|ts)$/, '');
    const importedByProd = sourceFiles.some(
      (other) => other !== file && new RegExp(`['"][^'"]*/${base}(?:\\.(?:ts|tsx))?['"]`).test(allSourceText.get(other) || '')
    );
    if (!importedByProd) {
      const usedInTestsOnly = corpus.some(
        ([other, content]) => other.startsWith('tests/') && content.includes(base)
      );
      findings.push(
        makeFinding({
          id: `STAT-ORPHAN-${String(++deadIdx).padStart(3, '0')}`,
          severity: 'P3',
          category: 'Kod Sağlığı',
          module: 'Modül Grafiği',
          file,
          line: 1,
          title: usedInTestsOnly
            ? `Üretim kodunda kullanılmayan modül (yalnız testlerde geçiyor): ${base}`
            : `Hiçbir yerde içe aktarılmayan yetim modül: ${base}`,
          evidence: `app/, components/ ve lib/ içinde '${base}' import'u bulunamadı.`,
          impact: 'Bakım yükü oluşturur veya unutulmuş entegrasyona işaret eder.',
          suggestion: 'Gerçekten artık gerekmiyorsa temizleyin; gerekiyorsa ilgili ekrana bağlayın.',
        })
      );
    }
  }

  // 4. Verify all bundled art & pack-data asset paths exist on disk
  const artManifests = [
    'lib/reviewed-art.json',
    'lib/reviewed-photos.json',
    'lib/teaching-scenes.json',
    'lib/new-word-scenes.json',
    'lib/lesson-20261108-art.json',
    'lib/audit-20261109-art.json',
    'lib/wiki-photos.json',
  ];
  const missingArt = [];
  for (const manifest of artManifests) {
    if (!fs.existsSync(path.join(ROOT, manifest))) continue;
    const data = readJson(manifest);
    for (const asset of data.reviewedAssets || []) {
      if (typeof asset.path === 'string' && asset.path.startsWith('/')) {
        const diskPath = path.join(ROOT, 'public', asset.path.slice(1));
        if (!fs.existsSync(diskPath)) missingArt.push(`${manifest} -> ${asset.path}`);
      }
    }
  }
  stats.missingAssets = missingArt.length;
  if (missingArt.length) {
    findings.push(
      makeFinding({
        id: 'STAT-ASSET-001',
        severity: 'P1',
        category: 'Dilbilim/Veri',
        module: 'Görseller',
        file: missingArt[0].split(' -> ')[0],
        title: `Görsel manifestlerinde diskte bulunmayan ${missingArt.length} dosya yolu`,
        evidence: missingArt.slice(0, 8).join('; '),
        impact: 'Kartlarda ve alıştırmalarda kırık görsel (404) gösterilir.',
        suggestion: 'Eksik görsel dosyalarını public/vocabulary-art altına ekleyin veya manifestten çıkarın.',
      })
    );
  }

  return { stats, findings };
}
