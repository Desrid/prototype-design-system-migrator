#!/usr/bin/env node
import path from 'node:path';
import {
  addMatches,
  finishPolicyCheck,
  isWithin,
  loadConfig,
  parseArgs,
  readTextFiles
} from './lib.mjs';

const args = parseArgs();
const root = path.resolve(args.root || '.');
const config = await loadConfig(root);
const files = await readTextFiles(root, { ignore: config.ignore });
const findings = [];
const rawColorRegex = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^\n;{}]+\)/g;

for (const { relPath, text } of files) {
  if (isWithin(relPath, config.tokenPaths)) continue;
  if (/^(?:docs|public|static|assets)\//.test(relPath)) continue;
  if (/\.(?:json)$/.test(relPath)) continue;
  addMatches({ findings, regex: rawColorRegex, text, file: relPath, kind: 'raw-color' });
}

await finishPolicyCheck({
  title: 'Design-token usage check',
  heuristic: true,
  root,
  summary: {
    violations: findings.length,
    approvedTokenPaths: config.tokenPaths
  },
  findings,
  limitations: [
    'The scanner cannot distinguish every literal used for tests, data, charts, or third-party APIs.',
    'A clean result does not prove semantic token quality.'
  ]
}, args);
