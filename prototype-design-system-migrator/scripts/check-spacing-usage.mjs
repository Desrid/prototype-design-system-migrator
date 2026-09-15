#!/usr/bin/env node
import path from 'node:path';
import {
  isWithin,
  finishPolicyCheck,
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
const declarationRegex = /\b(margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap|inset(?:-(?:inline|block)(?:-(?:start|end))?)?|top|right|bottom|left)\s*:\s*([^;}{]+)/gi;
const literalUnitRegex = /(?<![\w.-])-?(?:\d*\.\d+|\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch)\b/g;
const tailwindRegex = /(?:^|[\s"'`])(-?(?:m|p|gap|space|inset|top|right|bottom|left)[trblxy]?\-\[[^\]]+\])/g;

for (const { relPath, text } of files) {
  if (isWithin(relPath, config.tokenPaths)) continue;
  if (/^(?:docs|public|static|assets)\//.test(relPath)) continue;

  for (const match of text.matchAll(declarationRegex)) {
    const value = match[2].trim();
    if (/^(?:0(?:\s+0)*|auto|inherit|initial|unset|revert(?:-layer)?|var\(|calc\(|clamp\(|min\(|max\()/i.test(value)) continue;
    const literals = [...value.matchAll(literalUnitRegex)].map((item) => item[0]);
    if (!literals.length) continue;
    findings.push({
      kind: 'raw-spacing',
      file: relPath,
      line: lineNumberAt(text, match.index ?? 0),
      property: match[1],
      value,
      literals,
      excerpt: lineTextAt(text, match.index ?? 0)
    });
  }

  for (const match of text.matchAll(tailwindRegex)) {
    findings.push({
      kind: 'tailwind-arbitrary-spacing',
      file: relPath,
      line: lineNumberAt(text, match.index ?? 0),
      value: match[1],
      excerpt: lineTextAt(text, match.index ?? 0)
    });
  }
}

await finishPolicyCheck({
  title: 'Spacing policy check',
  heuristic: true,
  root,
  summary: {
    violations: findings.length,
    approvedTokenPaths: config.tokenPaths
  },
  findings,
  limitations: [
    'The scanner intentionally reports literal layout offsets that may be legitimate temporary exceptions.',
    'It cannot prove that a variable refers to an approved spacing token.'
  ]
}, args);
