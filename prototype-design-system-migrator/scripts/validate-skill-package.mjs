#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSymlinks, parseArgs, pathExists } from './lib.mjs';

const args = parseArgs();
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(args.root || defaultRoot);
const errors = [];
const warnings = [];

const required = [
  'SKILL.md', 'VERSION', 'PORTABILITY.md', 'LICENSES.md',
  'references/workflow.md',
  'references/decision-matrix.md',
  'references/stack-adapters.md',
  'references/component-systems.md',
  'references/tokens.md',
  'references/layout-and-spacing.md',
  'references/icons.md',
  'references/accessibility.md',
  'references/visual-regression.md',
  'references/output-contract.md',
  'references/security.md',
  'templates/AGENTS.fragment.md',
  'templates/CLAUDE.fragment.md',
  'templates/ui-constitution.md',
  'templates/decision-log.md',
  'templates/migration-report.md',
  'scripts/detect-stack.mjs',
  'scripts/inventory-ui.mjs',
  'scripts/check-token-usage.mjs',
  'scripts/check-spacing-usage.mjs',
  'scripts/check-icon-imports.mjs',
  'scripts/check-library-mixing.mjs',
  'scripts/check-legacy-usage.mjs',
  'scripts/install-skill.mjs',
  'scripts/validate-skill-package.mjs',
  'evals/cases.yaml',
  'evals/expected-contracts.md',
  'evals/run-static-evals.mjs'
];

for (const relative of required) {
  if (!(await pathExists(path.join(root, relative)))) errors.push(`Missing required file: ${relative}`);
}

const skillPath = path.join(root, 'SKILL.md');
if (await pathExists(skillPath)) {
  const skill = await fs.readFile(skillPath, 'utf8');
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    errors.push('SKILL.md must begin with YAML frontmatter.');
  } else {
    const keys = frontmatter[1]
      .split('\n')
      .filter((line) => /^[A-Za-z][\w-]*\s*:/.test(line))
      .map((line) => line.match(/^([A-Za-z][\w-]*)\s*:/)[1]);
    const uniqueKeys = [...new Set(keys)];
    const allowed = ['name', 'description'];
    for (const key of uniqueKeys) {
      if (!allowed.includes(key)) errors.push(`Non-portable frontmatter key: ${key}`);
    }
    for (const key of allowed) {
      if (!uniqueKeys.includes(key)) errors.push(`Missing frontmatter key: ${key}`);
    }
    if (!/^name:\s*prototype-design-system-migrator\s*$/m.test(frontmatter[1])) {
      errors.push('SKILL.md name must be prototype-design-system-migrator.');
    }
  }

  const forbidden = [
    ['Claude allowed-tools frontmatter', /^allowed-tools\s*:/m],
    ['Claude context frontmatter', /^context\s*:/m],
    ['Claude agent frontmatter', /^agent\s*:/m],
    ['Claude disable-model-invocation frontmatter', /^disable-model-invocation\s*:/m],
    ['Claude dynamic shell injection', /!`[^`]+`/],
    ['Claude argument substitution', /\$ARGUMENTS|\$\{CLAUDE_/],
    ['Codex-only tool namespace dependency', /\b(?:web\.run|api_tool\.|container\.)/]
  ];
  for (const [label, regex] of forbidden) {
    if (regex.test(skill)) errors.push(`Non-portable construct in SKILL.md: ${label}`);
  }

  const references = [...skill.matchAll(/`((?:references|templates|scripts)\/[^`\s]+)`/g)].map((match) => match[1]);
  for (const relative of references) {
    if (!(await pathExists(path.join(root, relative)))) errors.push(`SKILL.md references missing path: ${relative}`);
  }

  const lineCount = skill.split('\n').length;
  if (lineCount > 260) warnings.push(`SKILL.md has ${lineCount} lines; keep it as a thin router.`);
}

const versionPath = path.join(root, 'VERSION');
if (await pathExists(versionPath)) {
  const version = (await fs.readFile(versionPath, 'utf8')).trim();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) errors.push(`Invalid VERSION: ${version}`);
}

const symlinks = await findSymlinks(root, { ignore: [] });
for (const file of symlinks) {
  errors.push(`Symlink is not portable: ${path.relative(root, file)}`);
}

const result = {
  package: root,
  valid: errors.length === 0,
  errors,
  warnings
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
