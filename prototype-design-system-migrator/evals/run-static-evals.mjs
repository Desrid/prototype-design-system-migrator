#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = path.join(skillRoot, 'scripts');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-ds-skill-evals-'));
const results = [];

try {
  test('package validation', () => {
    const run = invoke('validate-skill-package.mjs', ['--root', skillRoot]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(run.json.valid, true);
  });

  await testAsync('stack detection matrix', async () => {
    const react = await fixture('react-vite', {
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0' }, devDependencies: { vite: '^7.0.0' } }),
      'src/App.tsx': 'export function App(){ return <main>Hello</main> }',
      'src/app.css': '.card { color:#123456; padding:13px; }'
    });
    assert.equal(detect(react).stack.framework, 'react-vite');
    assert.equal(detect(react).stack.supportTier, 1);

    const next = await fixture('next-tailwind', {
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0', next: '^16.0.0' }, devDependencies: { tailwindcss: '^4.0.0' } }),
      'app/page.tsx': 'export default function Page(){return <div className="p-[13px]">x</div>}'
    });
    const nextResult = detect(next);
    assert.equal(nextResult.stack.framework, 'nextjs');
    assert(nextResult.stack.styling.includes('tailwind'));

    const ant = await fixture('existing-ant', {
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0', antd: '^6.0.0' } }),
      'src/App.tsx': 'import { Button } from "antd"; export const App=()=> <Button/>;'
    });
    assert.equal(detect(ant).recommendation.action, 'retain-existing-system');
    assert.equal(detect(ant).recommendation.system, 'ant-design');

    const sourceOwned = await fixture('source-owned', {
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0', '@radix-ui/react-dialog': '^1.0.0' } }),
      'components.json': '{}',
      'src/ui/button.tsx': 'export const Button = "button";'
    });
    assert.equal(detect(sourceOwned).recommendation.action, 'retain-local-source-owned-system');

    const staticHtml = await fixture('static-html', {
      'index.html': '<main>Static</main>',
      'styles.css': 'main{display:grid}'
    });
    assert.equal(detect(staticHtml).stack.framework, 'static-html');

    const vue = await fixture('vue', {
      'package.json': JSON.stringify({ dependencies: { vue: '^3.0.0' } }),
      'src/App.vue': '<template><main>Vue</main></template>'
    });
    assert.equal(detect(vue).stack.supportTier, 2);

    const unknown = await fixture('unknown', { 'README.txt': 'custom stack' });
    assert.equal(detect(unknown).stack.framework, 'unknown');
    assert.equal(detect(unknown).stack.supportTier, 3);
  });

  await testAsync('audit inventory is non-mutating', async () => {
    const root = await fixture('inventory', {
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0' } }),
      'src/App.tsx': 'export const App=()=> <button style={{color:"#ff0000"}}>×</button>;',
      'src/app.css': '.x{padding:13px;border-radius:7px}'
    });
    const before = await fs.readFile(path.join(root, 'src/App.tsx'), 'utf8');
    const out = path.join(root, 'docs/ui-system-migration/inventory.json');
    const run = invoke('inventory-ui.mjs', ['--root', root, '--out', out]);
    assert.equal(run.status, 0, run.stderr);
    const after = await fs.readFile(path.join(root, 'src/App.tsx'), 'utf8');
    assert.equal(after, before);
    const inventory = JSON.parse(await fs.readFile(out, 'utf8'));
    assert(inventory.observed.values.colors.some((item) => item.value === '#ff0000'));
  });

  await testAsync('policy checks reject uncontrolled values and imports', async () => {
    const root = await fixture('violations', {
      'ui-system.config.json': JSON.stringify({
        tokenPaths: ['src/ui/foundation'],
        iconRegistryPaths: ['src/ui/icons'],
        uiBoundaryPaths: ['src/ui'],
        legacyPaths: ['src/legacy-ui'],
        migratedPaths: ['src/features'],
        ignore: []
      }),
      'src/App.tsx': 'import { Button } from "antd"; import { Dialog } from "@mui/material"; import { IconSearch } from "@tabler/icons-react"; export const App=()=> <button>⚙</button>;',
      'src/ui/icons/duplicates.ts': 'export { IconSearch as SearchIcon, IconSearch as MagnifierIcon } from "@tabler/icons-react";',
      'src/legacy-ui/Button.tsx': 'export const LegacyButton=()=> null;',
      'src/features/Profile.tsx': 'import { LegacyButton } from "../legacy-ui/Button"; export const Profile=LegacyButton;',
      'src/app.css': '.x{color:#123456;padding:13px;gap:7px}'
    });
    assert.equal(invoke('check-token-usage.mjs', ['--root', root, '--json']).status, 1);
    assert.equal(invoke('check-spacing-usage.mjs', ['--root', root, '--json']).status, 1);
    const icons = invoke('check-icon-imports.mjs', ['--root', root, '--json']);
    assert.equal(icons.status, 1);
    assert(icons.json.findings.some((item) => item.kind === 'duplicate-semantic-icon-alias'));
    assert.equal(invoke('check-legacy-usage.mjs', ['--root', root, '--json']).status, 1);
    const mixed = invoke('check-library-mixing.mjs', ['--root', root, '--json']);
    assert.equal(mixed.status, 1);
    assert(mixed.json.summary.featureSystems.includes('ant-design'));
    assert(mixed.json.summary.featureSystems.includes('mui'));
  });

  await testAsync('clean local boundaries pass static checks', async () => {
    const root = await fixture('clean-boundary', {
      'ui-system.config.json': JSON.stringify({
        tokenPaths: ['src/ui/foundation'],
        iconRegistryPaths: ['src/ui/icons'],
        uiBoundaryPaths: ['src/ui'],
        legacyPaths: ['src/legacy-ui'],
        migratedPaths: ['src/features'],
        selectedComponentSystem: 'ant-design',
        ignore: []
      }),
      'src/ui/foundation/tokens.css': ':root{--ds-action:#123456;--ds-space:0.75rem}',
      'src/ui/icons/index.ts': 'export { IconSearch as SearchIcon } from "@tabler/icons-react";',
      'src/ui/index.ts': 'export { Button } from "antd"; export * from "./icons/index";',
      'src/App.tsx': 'import { Button, SearchIcon } from "./ui"; export const App=()=> <Button icon={<SearchIcon/>}/>;',
      'src/app.css': '.x{color:var(--ds-action);padding:var(--ds-space)}'
    });
    assert.equal(invoke('check-token-usage.mjs', ['--root', root, '--json']).status, 0);
    assert.equal(invoke('check-spacing-usage.mjs', ['--root', root, '--json']).status, 0);
    assert.equal(invoke('check-icon-imports.mjs', ['--root', root, '--json']).status, 0);
    assert.equal(invoke('check-library-mixing.mjs', ['--root', root, '--json']).status, 0);
    assert.equal(invoke('check-legacy-usage.mjs', ['--root', root, '--json']).status, 0);
  });

  await testAsync('installer supports both agents, idempotence, and drift protection', async () => {
    const target = path.join(tempRoot, 'install-target');
    await fs.mkdir(target, { recursive: true });
    let run = invoke('install-skill.mjs', ['--agent', 'both', '--scope', 'project', '--target', target]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(run.json.results.map((item) => item.status), ['installed', 'installed']);

    run = invoke('install-skill.mjs', ['--agent', 'both', '--scope', 'project', '--target', target]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(run.json.results.map((item) => item.status), ['unchanged', 'unchanged']);

    run = invoke('install-skill.mjs', ['--agent', 'both', '--scope', 'project', '--target', target, '--check']);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(run.json.results.map((item) => item.status), ['current', 'current']);

    const codexSkill = path.join(target, '.agents/skills/prototype-design-system-migrator/SKILL.md');
    await fs.appendFile(codexSkill, '\nlocal change\n');
    run = invoke('install-skill.mjs', ['--agent', 'codex', '--scope', 'project', '--target', target, '--check']);
    assert.equal(run.status, 1);
    assert.equal(run.json.results[0].status, 'drifted');

    run = invoke('install-skill.mjs', ['--agent', 'codex', '--scope', 'project', '--target', target]);
    assert.equal(run.status, 1);
    assert.equal(run.json.results[0].status, 'refused');

    run = invoke('install-skill.mjs', ['--agent', 'codex', '--scope', 'project', '--target', target, '--force']);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(run.json.results[0].status, 'updated');
  });

  process.stdout.write(`${JSON.stringify({ status: 'PASS', tempRoot, results }, null, 2)}\n`);
} finally {
  if (!process.env.KEEP_SKILL_EVAL_TMP) await fs.rm(tempRoot, { recursive: true, force: true });
}

function detect(root) {
  const run = invoke('detect-stack.mjs', ['--root', root, '--json']);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return run.json;
}

function invoke(script, scriptArgs) {
  const child = spawnSync(process.execPath, [path.join(scripts, script), ...scriptArgs], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  });
  let json = null;
  try { json = JSON.parse(child.stdout); } catch { /* test reports raw output below */ }
  return { status: child.status, stdout: child.stdout, stderr: child.stderr, json };
}

async function fixture(name, files) {
  const root = path.join(tempRoot, name);
  await fs.mkdir(root, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }
  return root;
}

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack || error.message });
    throw error;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack || error.message });
    throw error;
  }
}
