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
const usage = new Map();
const systems = [
  { name: 'ant-design', regex: /^(?:antd)(?:\/|$)/ },
  { name: 'mui', regex: /^@mui\// },
  { name: 'carbon', regex: /^(?:@carbon\/|carbon-components-react$)/ },
  { name: 'chakra-ui', regex: /^@chakra-ui\// },
  { name: 'react-bootstrap', regex: /^react-bootstrap(?:\/|$)/ },
  { name: 'semantic-ui-react', regex: /^semantic-ui-react(?:\/|$)/ }
];
const importRegex = /(?:from\s+|import\s*\()(["'])([^"']+)\1/g;

for (const { relPath, text } of files) {
  for (const match of text.matchAll(importRegex)) {
    const source = match[2];
    const system = systems.find((candidate) => candidate.regex.test(source));
    if (!system) continue;
    const record = {
      system: system.name,
      source,
      file: relPath,
      line: lineNumberAt(text, match.index ?? 0),
      excerpt: lineTextAt(text, match.index ?? 0),
      insideUiBoundary: isWithin(relPath, config.uiBoundaryPaths)
    };
    if (!usage.has(system.name)) usage.set(system.name, []);
    usage.get(system.name).push(record);
  }
}

const usedSystems = [...usage.keys()];
const featureSystems = usedSystems.filter((name) => usage.get(name).some((item) => !item.insideUiBoundary));

if (featureSystems.length > 1) {
  for (const name of featureSystems) {
    for (const record of usage.get(name).filter((item) => !item.insideUiBoundary)) {
      findings.push({ kind: 'mixed-full-ui-systems', ...record });
    }
  }
}

if (config.selectedComponentSystem) {
  for (const name of featureSystems) {
    if (name === config.selectedComponentSystem) continue;
    for (const record of usage.get(name).filter((item) => !item.insideUiBoundary)) {
      findings.push({ kind: 'non-selected-ui-system', selected: config.selectedComponentSystem, ...record });
    }
  }
}

if (args.enforceBoundary) {
  for (const name of featureSystems) {
    for (const record of usage.get(name).filter((item) => !item.insideUiBoundary)) {
      findings.push({ kind: 'direct-ui-system-import-outside-boundary', ...record });
    }
  }
}

const uniqueFindings = [...new Map(findings.map((item) => [
  `${item.kind}:${item.file}:${item.line}:${item.system}`,
  item
])).values()];

await finishPolicyCheck({
  title: 'Full UI-system mixing check',
  heuristic: true,
  root,
  summary: {
    detectedSystems: usedSystems,
    featureSystems,
    selectedSystem: config.selectedComponentSystem,
    violations: uniqueFindings.length
  },
  findings: uniqueFindings,
  limitations: [
    'Package aliases, re-exports, and generated imports can hide system usage.',
    'Radix primitives and local source-owned components are not treated as competing full systems.'
  ]
}, args);
