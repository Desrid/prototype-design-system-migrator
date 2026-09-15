#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  parseArgs,
  readTextFiles,
  walkFiles,
  readJson,
  writeJson,
  normalizeRelative,
  printResult,
} from "./lib.mjs";
import { readAliases, imports, fileRoute } from "./source-analysis.mjs";
import { run as detect } from "./detect-stack.mjs";
export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || "."),
    config = await loadConfig(root);
  const files = await readTextFiles(root, { config });
  const manifests = (
    await walkFiles(root, {
      extensions: new Set([".json"]),
      ignore: config.ignore,
    })
  ).filter((p) => path.basename(p) === "package.json");
  const packageRoots = [
    ...new Set([root, ...manifests.map((p) => path.dirname(p))]),
  ].sort((a, b) => b.length - a.length);
  const packages = [];
  for (const packageRoot of packageRoots) {
    const rel = normalizeRelative(root, packageRoot) || ".";
    const manifest = await readJson(path.join(packageRoot, "package.json"), {});
    const ownFiles = files.filter(
      (f) =>
        packageRoots.find((p) => f.filePath.startsWith(`${p}${path.sep}`)) ===
        packageRoot,
    );
    const stack = await detect({ root: packageRoot, silent: true });
    const aliasInfo = await readAliases(
      packageRoot,
      packageRoot === root ? config.aliases : {},
    );
    const counts = new Map();
    for (const f of ownFiles)
      for (const item of imports(f.text))
        counts.set(item.source, (counts.get(item.source) || 0) + 1);
    const actualImports = [...counts]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
    const routes = ownFiles
      .map((f) => fileRoute(normalizeRelative(packageRoot, f.filePath)))
      .filter(Boolean);
    const systems = stack.stack.componentSystems
      .filter((s) => s.type === "full")
      .map((s) => ({
        ...s,
        importCount: actualImports
          .filter(
            (i) =>
              i.source === s.package || i.source.startsWith(`${s.package}/`),
          )
          .reduce((n, i) => n + i.count, 0),
      }));
    const used = systems.filter((s) => s.importCount > 0);
    const storyFiles = ownFiles
      .filter((f) => /\.stories\.[^.]+$/.test(f.relPath))
      .map((f) => f.relPath);
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };
    packages.push({
      root: rel,
      name: manifest.name ?? null,
      stack: stack.stack,
      scripts: manifest.scripts ?? {},
      packageManager: manifest.packageManager ?? null,
      aliases: aliasInfo.aliases,
      unresolved: aliasInfo.unresolved,
      actualImports,
      systems,
      routes,
      storyFiles,
      storybookVersion: dependencies.storybook ?? null,
      sourceFiles: ownFiles.map((f) => f.relPath),
      recommendation:
        used.length === 1
          ? {
              action: "retain-used-system",
              system: used[0].name,
              confidence: "medium",
              reason:
                "Literal source imports observed; runtime and semantics still require inspection",
            }
          : used.length > 1
            ? { action: "resolve-mixed-systems", confidence: "medium" }
            : { ...stack.recommendation, confidence: "low" },
      evidence: {
        manifest:
          manifest.name || Object.keys(manifest).length
            ? `${rel}/package.json`
            : null,
        sourceFileCount: ownFiles.length,
      },
      capabilities: {
        sourceAudit: true,
        routeDiscovery: routes.length ? "partial" : "unresolved",
        runtime: "not-run",
        visual: "not-run",
        migration:
          stack.stack.supportTier === 3 ? "plan-only" : "requires-pilot",
      },
    });
  }
  const result = {
    schemaVersion: 1,
    title: "Project UI profile",
    root,
    packages: packages.reverse(),
    skippedFiles: files.diagnostics,
    limitations: [
      "Package discovery includes nested manifests; workspace inheritance and custom bundler aliases require inspection.",
      "No project commands are executed. Commands in this profile must be inspected before use.",
      "Source counts and candidate story files are evidence, not semantic or visual coverage.",
    ],
    summary: { packages: packages.length, scannedFiles: files.length },
  };
  if (args.out) await writeJson(path.resolve(args.out), result);
  if (!args.silent)
    printResult(result, { json: Boolean(args.json || args.out) });
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
