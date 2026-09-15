#!/usr/bin/env node
import path from 'node:path';
import {
  finishPolicyCheck,
  isWithin,
  lineNumberAt,
  lineTextAt,
  loadConfig,
  parseArgs,
  readTextFiles
} from './lib.mjs';

const args = parseArgs();
const root = path.resolve(args.root || '.');
const config = await loadConfig(root);
const files = await readTextFiles(root, { ignore: config.ignore });
const findings = [];
const tablerImportRegex = /(?:from\s+|import\s*\()(["'])(@tabler\/icons-[^"']+)\1/g;
const emojiButtonRegex = /<(?:button|a)\b[^>]*>[\s\S]{0,160}?(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])[\s\S]{0,160}?<\/(?:button|a)>/gu;
const textIconRegex = /<(?:button|a)\b[^>]*(?:aria-label|title)=["'][^"']+["'][^>]*>\s*(?:×|✕|✖|＋|−|→|←|⋮|⋯|⌕|⚙)\s*<\/(?:button|a)>/gu;
const tablerReExportRegex = /export\s*\{([\s\S]*?)\}\s*from\s*(["'])@tabler\/icons-[^"']+\2\s*;?/g;
const sourceToAliases = new Map();
const aliasToSources = new Map();

for (const { relPath, text } of files) {
  for (const match of text.matchAll(tablerImportRegex)) {
    if (isWithin(relPath, config.iconRegistryPaths)) continue;
    findings.push({
      kind: 'direct-tabler-import',
      file: relPath,
      line: lineNumberAt(text, match.index ?? 0),
      value: match[2],
      excerpt: lineTextAt(text, match.index ?? 0)
    });
  }

  if (isWithin(relPath, config.iconRegistryPaths)) {
    for (const match of text.matchAll(tablerReExportRegex)) {
      const entries = match[1].split(',').map((item) => item.trim()).filter(Boolean);
      for (const entry of entries) {
        const parsed = entry.match(/^(Icon[A-Za-z0-9]+)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (!parsed) continue;
        const sourceName = parsed[1];
        const alias = parsed[2] || sourceName;
        const record = {
          sourceName,
          alias,
          file: relPath,
          line: lineNumberAt(text, (match.index ?? 0) + match[0].indexOf(entry))
        };
        if (!sourceToAliases.has(sourceName)) sourceToAliases.set(sourceName, []);
        sourceToAliases.get(sourceName).push(record);
        if (!aliasToSources.has(alias)) aliasToSources.set(alias, []);
        aliasToSources.get(alias).push(record);
      }
    }
  }

  for (const [regex, kind] of [[emojiButtonRegex, 'emoji-interface-icon'], [textIconRegex, 'text-interface-icon']]) {
    for (const match of text.matchAll(regex)) {
      findings.push({
        kind,
        file: relPath,
        line: lineNumberAt(text, match.index ?? 0),
        value: match[0].replace(/\s+/g, ' ').slice(0, 160),
        excerpt: lineTextAt(text, match.index ?? 0)
      });
    }
  }
}

for (const [sourceName, records] of sourceToAliases) {
  const aliases = [...new Set(records.map((record) => record.alias))];
  if (aliases.length <= 1) continue;
  for (const record of records) {
    findings.push({
      kind: 'duplicate-semantic-icon-alias',
      file: record.file,
      line: record.line,
      value: `${sourceName} exported as ${aliases.join(', ')}`,
      excerpt: `${record.sourceName} as ${record.alias}`
    });
  }
}

for (const [alias, records] of aliasToSources) {
  const sources = [...new Set(records.map((record) => record.sourceName))];
  if (sources.length <= 1) continue;
  for (const record of records) {
    findings.push({
      kind: 'conflicting-semantic-icon-alias',
      file: record.file,
      line: record.line,
      value: `${alias} maps to ${sources.join(', ')}`,
      excerpt: `${record.sourceName} as ${record.alias}`
    });
  }
}

const uniqueFindings = [...new Map(findings.map((item) => [
  `${item.kind}:${item.file}:${item.line}:${item.value}`,
  item
])).values()];

await finishPolicyCheck({
  title: 'Icon-boundary check',
  heuristic: true,
  root,
  summary: {
    violations: uniqueFindings.length,
    registryPaths: config.iconRegistryPaths,
    semanticTablerSources: sourceToAliases.size
  },
  findings: uniqueFindings,
  limitations: [
    'Emoji and text-icon detection is conservative and cannot identify all visual icon misuse.',
    'Registry alias analysis covers direct Tabler re-exports; more complex local composition needs review.',
    'A clean import graph does not prove semantic icon consistency or accessibility.'
  ]
}, args);
