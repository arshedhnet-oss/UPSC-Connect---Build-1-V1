#!/usr/bin/env node
/**
 * Reads Lighthouse CI results from .lighthouseci/ and emits a Markdown
 * summary to GITHUB_OUTPUT for the PR comment step.
 */
const fs = require('fs');
const path = require('path');

const LHCI_DIR = '.lighthouseci';

function loadManifest() {
  const manifestPath = path.join(LHCI_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function loadAssertions() {
  const p = path.join(LHCI_DIR, 'assertion-results.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function emoji(score) {
  if (score >= 0.9) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

function fmtMs(v) {
  return v == null ? '—' : `${Math.round(v)} ms`;
}

function fmtCls(v) {
  return v == null ? '—' : v.toFixed(3);
}

function setOutput(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    console.log(`${name}=${value}`);
    return;
  }
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(out, `${name}<<${delim}\n${value}\n${delim}\n`);
}

const manifest = loadManifest();
if (!manifest || manifest.length === 0) {
  setOutput('body', '');
  process.exit(0);
}

// Pick representative run per URL (the median, marked isRepresentativeRun).
const reps = manifest.filter((r) => r.isRepresentativeRun);

const rows = reps.map((run) => {
  const lhr = JSON.parse(fs.readFileSync(run.jsonPath, 'utf8'));
  const cats = lhr.categories;
  const audits = lhr.audits;
  return {
    url: lhr.finalDisplayedUrl || lhr.requestedUrl,
    perf: cats.performance?.score ?? null,
    seo: cats.seo?.score ?? null,
    a11y: cats.accessibility?.score ?? null,
    bp: cats['best-practices']?.score ?? null,
    fcp: audits['first-contentful-paint']?.numericValue,
    lcp: audits['largest-contentful-paint']?.numericValue,
    cls: audits['cumulative-layout-shift']?.numericValue,
    tbt: audits['total-blocking-time']?.numericValue,
    reportUrl: run.url || null,
  };
});

const assertions = loadAssertions();
const failed = assertions.filter((a) => a.level === 'error' && !a.passed);
const warned = assertions.filter((a) => a.level === 'warn' && !a.passed);

let body = `## 🔦 Lighthouse CI Results\n\n`;

body += `| URL | Perf | SEO | A11y | BP | FCP | LCP | CLS | TBT |\n`;
body += `| --- | :--: | :-: | :--: | :-: | :-: | :-: | :-: | :-: |\n`;
for (const r of rows) {
  const label = r.reportUrl ? `[report](${r.reportUrl})` : r.url;
  body += `| ${label} | ${emoji(r.perf)} ${Math.round(r.perf * 100)} | ${emoji(r.seo)} ${Math.round(r.seo * 100)} | ${emoji(r.a11y)} ${Math.round(r.a11y * 100)} | ${emoji(r.bp)} ${Math.round(r.bp * 100)} | ${fmtMs(r.fcp)} | ${fmtMs(r.lcp)} | ${fmtCls(r.cls)} | ${fmtMs(r.tbt)} |\n`;
}

if (failed.length || warned.length) {
  body += `\n### Regressions\n\n`;
  if (failed.length) {
    body += `**❌ Failed (${failed.length})**\n`;
    for (const a of failed.slice(0, 10)) {
      body += `- \`${a.auditId}\` — actual: ${a.actual}, expected ${a.operator} ${a.expected}\n`;
    }
  }
  if (warned.length) {
    body += `\n**⚠️ Warnings (${warned.length})**\n`;
    for (const a of warned.slice(0, 10)) {
      body += `- \`${a.auditId}\` — actual: ${a.actual}, expected ${a.operator} ${a.expected}\n`;
    }
  }
} else {
  body += `\n✅ All performance & SEO budgets met.\n`;
}

body += `\n<sub>Commit: \`${(process.env.GITHUB_SHA || '').slice(0, 7)}\` · median of 3 runs · desktop preset</sub>\n`;

setOutput('body', body);
