#!/usr/bin/env node
import path from 'node:path';
import {
  finishPolicyCheck,
  isWithin,
  lineNumberAt,
  lineTextAt,
  loadConfig,
  normalizePrefix,
  parseArgs,
  readTextFiles
} from './lib.mjs';

const args = parseArgs();
const root = path.resolve(args.root || '.');
const config = await loadConfig(root);
const files = await readTextFiles(root, { ignore: config.ignore });
const findings = [];
const importRegex = /(?:from\s+|import\s*\()(["'])([^"']+)\1/g;
const legacyPrefixes = config.legacyPaths.map(normalizePrefix).filter(Boolean);
const migratedPrefixes = config.migratedPaths.map(normalizePrefix).filter(Boolean);

for (const { relPath, text } of files) {
  if (isWithin(relPath, legacyPrefixes)) continue;
  if (migratedPrefixes.length && !isWithin(relPath, migratedPrefixes)) continue;

  for (const match of text.matchAll(importRegex)) {
    const source = match[2];
    if (!isLegacyImport({ source, importer: relPath, legacyPrefixes })) continue;
    findings.push({
      kind: 'legacy-ui-import',
      file: relPath,
      line: lineNumberAt(text, match.index ?? 0),
      value: source,
      excerpt: lineTextAt(text, match.index ?? 0)
    });
  }
}

await finishPolicyCheck({
  title: 'Legacy UI usage check',
  heuristic: true,
  root,
  summary: {
    violations: findings.length,
    legacyPaths: legacyPrefixes,
    migratedPaths: migratedPrefixes.length ? migratedPrefixes : ['all non-legacy source files']
  },
  findings,
  limitations: [
    'Alias resolution is heuristic and may require target-project configuration.',
    'Dynamic imports, re-exports, and dependency injection can hide legacy usage.',
    'Use migratedPaths to turn this into a narrow rollout gate instead of a repository-wide inventory.'
  ]
}, args);

function isLegacyImport({ source, importer, legacyPrefixes: prefixes }) {
  const normalizedSource = source.replaceAll('\\', '/');
  const importerDir = path.posix.dirname(importer);

  if (normalizedSource.startsWith('.')) {
    const resolved = path.posix.normalize(path.posix.join(importerDir, normalizedSource));
    if (isWithin(stripKnownExtension(resolved), prefixes)) return true;
  }

  const dealiased = normalizedSource
    .replace(/^@\//, 'src/')
    .replace(/^~\//, 'src/')
    .replace(/^\$lib\//, 'src/lib/');
  if (isWithin(stripKnownExtension(dealiased), prefixes)) return true;

  return prefixes.some((prefix) => {
    const basename = path.posix.basename(prefix);
    return normalizedSource === basename
      || normalizedSource.startsWith(`${basename}/`)
      || normalizedSource.includes(`/${basename}/`)
      || normalizedSource.endsWith(`/${basename}`);
  });
}

function stripKnownExtension(value) {
  return value.replace(/\.(?:js|jsx|ts|tsx|mjs|cjs|vue|svelte)$/, '').replace(/\/index$/, '');
}
