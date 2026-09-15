import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const DEFAULT_IGNORE = new Set([
  ".git",
  ".agents",
  ".claude",
  ".codex",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "vendor",
  ".cache",
  ".turbo",
  ".vercel",
  ".output",
  "storybook-static",
  "docs/ui-system-migration",
]);
export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  sourceRoots: ["."],
  ignore: [],
  tokenPaths: ["src/ui/foundation", "src/ui/theme", "styles/tokens"],
  iconRegistryPaths: ["src/ui/icons"],
  uiBoundaryPaths: ["src/ui", "packages/ui"],
  legacyPaths: ["src/legacy-ui"],
  migratedPaths: [],
  selectedComponentSystem: null,
  approvedIconSizes: [],
  iconPackages: [
    "@tabler/icons-*",
    "lucide*",
    "@heroicons/*",
    "react-icons",
    "@fortawesome/*",
    "@mui/icons-material",
    "@phosphor-icons/*",
    "@iconify/*",
  ],
  aliases: {},
  exceptions: [],
});
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const equal = item.indexOf("=");
    const raw = equal < 0 ? item.slice(2) : item.slice(2, equal);
    const key = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (equal >= 0) {
      args[key] = item.slice(equal + 1);
      continue;
    }
    if (argv[i + 1] && !argv[i + 1].startsWith("--")) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}
export async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
export async function readJson(p, fallback = null) {
  try {
    return JSON.parse((await fs.readFile(p, "utf8")).replace(/^\uFEFF/, ""));
  } catch (e) {
    if (e.code === "ENOENT" && fallback !== null) return fallback;
    throw new Error(`Unable to read JSON ${p}: ${e.message}`);
  }
}
export function normalizeRelative(root, p) {
  return path.relative(root, p).split(path.sep).join("/");
}
export function normalizePrefix(p) {
  return String(p)
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}
export function validateRelative(p, label = "path") {
  if (
    typeof p !== "string" ||
    !p.trim() ||
    path.isAbsolute(p) ||
    /^[A-Za-z]:/.test(p) ||
    p.replaceAll("\\", "/").split("/").includes("..")
  )
    throw new Error(`Invalid project-relative ${label}: ${p}`);
  return p;
}
export function matchGlob(value, pattern) {
  pattern = normalizePrefix(pattern);
  value = normalizePrefix(value);
  let regex = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      i++;
      if (pattern[i + 1] === "/") {
        i++;
        regex += "(?:.*/)?";
      } else regex += ".*";
    } else if (c === "*") regex += "[^/]*";
    else if (c === "?") regex += "[^/]";
    else regex += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${regex}$`).test(value);
}
export function isWithin(rel, prefixes = []) {
  return prefixes.some((p) => {
    p = normalizePrefix(p);
    return p === "." || rel === p || rel.startsWith(`${p}/`);
  });
}
export function selectedPath(rel, patterns) {
  return patterns.some((p) => isWithin(rel, [p]) || matchGlob(rel, p));
}
export async function loadConfig(root) {
  const candidates = ["ui-system.config.json", ".ui-system.json"];
  let input = {},
    configPath = null;
  for (const name of candidates) {
    const p = path.join(root, name);
    if (await pathExists(p)) {
      input = await readJson(p);
      configPath = p;
      break;
    }
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("UI config must be an object");
  for (const key of Object.keys(input))
    if (!(key in DEFAULT_CONFIG))
      throw new Error(`Unknown UI config key: ${key}`);
  const config = { ...DEFAULT_CONFIG, ...input, path: configPath };
  if (config.schemaVersion !== 1)
    throw new Error("Unsupported UI config schemaVersion");
  for (const key of [
    "sourceRoots",
    "ignore",
    "tokenPaths",
    "iconRegistryPaths",
    "uiBoundaryPaths",
    "legacyPaths",
    "migratedPaths",
    "iconPackages",
  ]) {
    if (
      !Array.isArray(config[key]) ||
      config[key].some((p) => typeof p !== "string" || !p.trim())
    )
      throw new Error(`${key} must be an array of nonempty strings`);
    if (key !== "iconPackages")
      config[key].forEach((p) => validateRelative(p, key));
  }
  if (!config.sourceRoots.length)
    throw new Error(
      'sourceRoots must not be empty; use ["."] for all source files',
    );
  if (
    !Array.isArray(config.approvedIconSizes) ||
    config.approvedIconSizes.some((n) => !Number.isFinite(n) || n <= 0)
  )
    throw new Error("approvedIconSizes must contain positive numbers");
  if (
    config.selectedComponentSystem !== null &&
    typeof config.selectedComponentSystem !== "string"
  )
    throw new Error("selectedComponentSystem must be a string or null");
  if (
    !config.aliases ||
    typeof config.aliases !== "object" ||
    Array.isArray(config.aliases)
  )
    throw new Error("aliases must be an object");
  for (const [key, value] of Object.entries(config.aliases)) {
    if (!key) throw new Error("Empty alias");
    validateRelative(value, "alias target");
  }
  if (!Array.isArray(config.exceptions))
    throw new Error("exceptions must be an array");
  for (const e of config.exceptions) {
    if (
      !e ||
      ["kind", "file", "value", "reason", "expires"].some(
        (k) => typeof e[k] !== "string" || !e[k].trim(),
      )
    )
      throw new Error(
        "Each exception needs kind, file, value, reason, expires",
      );
    validateRelative(e.file, "exception file");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(e.expires) ||
      !Number.isFinite(Date.parse(e.expires)) ||
      new Date(e.expires).toISOString().slice(0, 10) !== e.expires
    )
      throw new Error("Invalid exception expiry date");
  }
  return config;
}
export async function walkFiles(root, options = {}) {
  root = path.resolve(root);
  const files = [];
  const diagnostics = options.diagnostics ?? [];
  const ignore = [
    ...(options.useDefaultIgnore === false ? [] : DEFAULT_IGNORE),
    ...(options.ignore ?? []),
  ];
  async function visit(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      diagnostics.push({
        path: normalizeRelative(root, dir) || ".",
        reason: e.code,
      });
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name),
        rel = normalizeRelative(root, full);
      if (ignore.some((p) => p === entry.name || selectedPath(rel, [p])))
        continue;
      if (entry.isSymbolicLink()) {
        diagnostics.push({ path: rel, reason: "symlink-skipped" });
        continue;
      }
      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }
      if (
        !entry.isFile() ||
        (options.extensions &&
          !options.extensions.has(path.extname(entry.name).toLowerCase()))
      )
        continue;
      try {
        const stat = await fs.stat(full);
        if (stat.size <= (options.maxBytes ?? 1_500_000)) files.push(full);
        else diagnostics.push({ path: rel, reason: "size-limit" });
      } catch (e) {
        diagnostics.push({ path: rel, reason: e.code });
      }
    }
  }
  await visit(root);
  return files;
}
export async function findSymlinks(root, options = {}) {
  const found = [];
  async function visit(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", ...(options.ignore ?? [])].includes(e.name))
        continue;
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) found.push(p);
      else if (e.isDirectory()) await visit(p);
    }
  }
  await visit(root);
  return found;
}
export function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}
export function lineTextAt(text, index) {
  const a = text.lastIndexOf("\n", index - 1) + 1,
    b = text.indexOf("\n", index);
  return text
    .slice(a, b < 0 ? text.length : b)
    .trim()
    .slice(0, 240);
}
export function addMatches({
  findings,
  regex,
  text,
  file,
  kind,
  value = (m) => m[0],
}) {
  regex.lastIndex = 0;
  for (const m of text.matchAll(regex))
    findings.push({
      kind,
      file,
      line: lineNumberAt(text, m.index ?? 0),
      value: value(m),
      excerpt: lineTextAt(text, m.index ?? 0),
    });
}
// Preserve offsets while removing comments; strings remain available for JSX/CSS heuristics.
export function stripComments(text) {
  return text.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|<!--[\s\S]*?-->/g,
    (m, string) => (string ? m : m.replace(/[^\r\n]/g, " ")),
  );
}
export async function readTextFiles(root, options = {}) {
  const config = options.config ?? (await loadConfig(root)),
    diagnostics = [];
  const extensions =
    options.extensions ??
    new Set([
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".mjs",
      ".cjs",
      ".vue",
      ".svelte",
      ".astro",
      ".css",
      ".scss",
      ".sass",
      ".less",
      ".html",
      ".htm",
    ]);
  const files = await walkFiles(root, {
    ...options,
    ignore: [...config.ignore, ...(options.ignore ?? [])],
    extensions,
    diagnostics,
  });
  const output = [];
  for (const filePath of files) {
    const relPath = normalizeRelative(root, filePath);
    if (!selectedPath(relPath, config.sourceRoots)) continue;
    try {
      const rawText = await fs.readFile(filePath, "utf8");
      if (rawText.includes("\0")) {
        diagnostics.push({ path: relPath, reason: "binary" });
        continue;
      }
      output.push({ filePath, relPath, rawText, text: stripComments(rawText) });
    } catch (e) {
      diagnostics.push({ path: relPath, reason: e.code });
    }
  }
  output.diagnostics = diagnostics;
  return output;
}
export async function writeJson(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
export function printResult(result, { json = false } = {}) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${result.title ?? "Result"}\n`);
  for (const [k, v] of Object.entries(result.summary ?? {}))
    process.stdout.write(`- ${k}: ${Array.isArray(v) ? v.join(", ") : v}\n`);
  for (const f of result.findings ?? [])
    process.stdout.write(
      `${f.file}:${f.line} [${f.kind}] ${f.value ?? f.source}\n`,
    );
}
export function fingerprint(f) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify([f.kind, f.file, f.value ?? f.source, f.excerpt]))
    .digest("hex");
}
export async function finishPolicyCheck(result, args) {
  const config = args.config ?? (await loadConfig(result.root));
  result.findings = result.findings.map((f) => ({
    ...f,
    fingerprint: fingerprint(f),
  }));
  const today = new Date().toISOString().slice(0, 10);
  result.exceptions = [];
  result.expiredExceptions = config.exceptions.filter((e) => e.expires < today);
  result.findings = result.findings.filter((f) => {
    const e = config.exceptions.find(
      (e) =>
        e.expires >= today &&
        e.kind === f.kind &&
        e.file === f.file &&
        e.value === (f.value ?? f.source),
    );
    if (e) {
      result.exceptions.push({ ...f, exception: e });
      return false;
    }
    return true;
  });
  if (args.migrated) {
    if (!config.migratedPaths.length)
      throw new Error("--migrated requires migratedPaths");
    result.outOfScope = result.findings.filter(
      (f) => !selectedPath(f.file, config.migratedPaths),
    );
    result.findings = result.findings.filter((f) =>
      selectedPath(f.file, config.migratedPaths),
    );
  }
  result.summary.violations = result.findings.length;
  result.status = result.skippedFiles?.length
    ? "PARTIAL"
    : result.findings.length
      ? "FAIL"
      : "PASS";
  if (!args.silent) printResult(result, { json: Boolean(args.json) });
  if (args.out) await writeJson(path.resolve(args.out), result);
  if ((result.findings.length || result.skippedFiles?.length) && !args.noFail)
    process.exitCode = 1;
  return result;
}
