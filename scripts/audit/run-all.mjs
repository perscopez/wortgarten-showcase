#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { dedupeAndSort } from './types.mjs';
import { runStaticAudit } from './check-static.mjs';
import { runLinguisticsAudit } from './check-linguistics.mjs';
import { runSrsFlowsAudit } from './check-srs-flows.mjs';
import { runSyncAndApiAudit } from './check-sync-and-api.mjs';
import { runUiCssAudit } from './check-ui-css.mjs';

const args = new Set(process.argv.slice(2));
const skipTooling = args.has('--fast');
const jsonOutIdx = process.argv.indexOf('--json');
const jsonOutPath = jsonOutIdx > -1 ? process.argv[jsonOutIdx + 1] : null;

async function main() {
  const started = Date.now();
  const layers = {};
  const allFindings = [];

  for (const [name, fn] of [
    ['static', () => runStaticAudit({ runTooling: !skipTooling })],
    ['linguistics', runLinguisticsAudit],
    ['srsFlows', runSrsFlowsAudit],
    ['syncAndApi', runSyncAndApiAudit],
    ['uiAndCss', runUiCssAudit],
  ]) {
    const t0 = Date.now();
    const res = await fn();
    layers[name] = { ms: Date.now() - t0, stats: res.stats, count: res.findings.length };
    allFindings.push(...res.findings);
  }

  const findings = dedupeAndSort(allFindings);
  const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byCategory = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    summary: { total: findings.length, bySeverity, byCategory },
    layers,
    findings,
  };

  if (jsonOutPath) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOutPath)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonOutPath), JSON.stringify(report, null, 2), 'utf8');
  }

  console.log(`\n=== Wortgarten Otomatik Denetim Özeti (${report.durationMs}ms) ===`);
  console.log(`Toplam bulgu: ${findings.length} | P0=${bySeverity.P0} P1=${bySeverity.P1} P2=${bySeverity.P2} P3=${bySeverity.P3}`);
  for (const [name, info] of Object.entries(layers)) {
    console.log(`  - ${name}: ${info.count} bulgu (${info.ms}ms)`, JSON.stringify(info.stats));
  }
  console.log('\n--- Bulgular ---');
  for (const f of findings) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`[${f.severity}] (${f.category}) ${f.id} | ${loc} — ${f.title}`);
    if (f.evidence) console.log(`    Kanıt: ${f.evidence.slice(0, 220)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
