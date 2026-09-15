import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_IGNORE = new Set([
  '.git', '.next', '.nuxt', '.svelte-kit', 'node_modules', 'dist', 'build',
  'coverage', 'out', 'vendor', '.cache', '.turbo', '.vercel', '.output'
]);

export const DEFAULT_CONFIG = Object.freeze({
  sourceRoots: ['src', 'app', 'pages', 'components'],
  ignore: [],
  tokenPaths: ['src/ui/foundation', 'src/ui/theme', 'styles/tokens'],
  iconRegistryPaths: ['src/ui/icons'],
  uiBoundaryPaths: ['src/ui', 'packages/ui'],
  legacyPaths: ['src/legacy-ui'],
  migratedPaths: [],
  selectedComponentSystem: null,
  approvedIconSizes: [14, 16, 20, 24]
});

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
    const [rawKey, inline] = item.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inline !== undefined) {
      args[key] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== null) return fallback;
    throw new Error(`Unable to read JSON ${filePath}: ${error.message}`);
  }
}

export async function loadConfig(root) {
  const candidates = [
    path.join(root, 'ui-system.config.json'),
    path.join(root, '.ui-system.json')
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const config = await readJson(candidate, {});
      return normalizeConfig({ ...DEFAULT_CONFIG, ...config, path: candidate });
    }
  }
  return normalizeConfig({ ...DEFAULT_CONFIG, path: null });
}

function normalizeConfig(config) {
  const arrayKeys = [
    'sourceRoots', 'ignore', 'tokenPaths', 'iconRegistryPaths', 'uiBoundaryPaths',
    'legacyPaths', 'migratedPaths', 'approvedIconSizes'
  ];
  const normalized = { ...config };
  for (const key of arrayKeys) {
    if (!Array.isArray(normalized[key])) normalized[key] = [...DEFAULT_CONFIG[key]];
  }
  return normalized;
}

export function normalizeRelative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

export function normalizePrefix(prefix) {
  return String(prefix).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
}

export function isWithin(relPath, prefixes = []) {
  return prefixes.some((prefix) => {
    const normalized = normalizePrefix(prefix);
    return Boolean(normalized) && (relPath === normalized || relPath.startsWith(`${normalized}/`));
  });
}

export async function walkFiles(root, options = {}) {
  const extensions = options.extensions ?? null;
  const maxBytes = options.maxBytes ?? 1_500_000;
  const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
  const files = [];

  async function visit(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (extensions && !extensions.has(path.extname(entry.name).toLowerCase())) continue;
      try {
        const stat = await fs.stat(full);
        if (stat.size <= maxBytes) files.push(full);
      } catch {
        // Ignore files that disappear during a scan.
      }
    }
  }

  await visit(root);
  return files;
}

export async function findSymlinks(root, options = {}) {
  const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
  const symlinks = [];

  async function visit(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        symlinks.push(full);
        continue;
      }
      if (entry.isDirectory()) await visit(full);
    }
  }

  await visit(root);
  return symlinks;
}

export function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

export function lineTextAt(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end).trim().slice(0, 240);
}

export function addMatches({ findings, regex, text, file, kind, value = (match) => match[0] }) {
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    findings.push({
      kind,
      file,
      line: lineNumberAt(text, match.index ?? 0),
      value: value(match),
      excerpt: lineTextAt(text, match.index ?? 0)
    });
  }
}

export async function readTextFiles(root, options = {}) {
  const extensions = options.extensions ?? new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte',
    '.css', '.scss', '.sass', '.less', '.html', '.htm', '.json'
  ]);
  const files = await walkFiles(root, { ...options, extensions });
  const output = [];
  for (const filePath of files) {
    try {
      output.push({
        filePath,
        relPath: normalizeRelative(root, filePath),
        text: await fs.readFile(filePath, 'utf8')
      });
    } catch {
      // Binary, locked, or transient files are skipped.
    }
  }
  return output;
}

export async function writeJson(outPath, data) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function printResult(result, { json = false } = {}) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${result.title ?? 'Result'}\n`);
  for (const [key, value] of Object.entries(result.summary ?? {})) {
    process.stdout.write(`- ${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`);
  }
  if (result.findings?.length) {
    for (const finding of result.findings) {
      process.stdout.write(`${finding.file}:${finding.line} [${finding.kind}] ${finding.value}\n`);
    }
  }
}

export function finishPolicyCheck(result, args) {
  printResult(result, { json: Boolean(args.json) });
  if (args.out) {
    return writeJson(path.resolve(args.out), result).then(() => {
      if (result.findings.length && !args.noFail) process.exitCode = 1;
    });
  }
  if (result.findings.length && !args.noFail) process.exitCode = 1;
  return Promise.resolve();
}
