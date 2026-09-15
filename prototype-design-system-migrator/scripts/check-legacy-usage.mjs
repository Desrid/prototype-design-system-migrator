#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imports, readAliases, resolveImport } from "./source-analysis.mjs";
import {
  finishPolicyCheck,
  isWithin,
  lineNumberAt,
  lineTextAt,
  loadConfig,
  normalizePrefix,
  parseArgs,
  readTextFiles,
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));
  const findings = [];
  const aliasInfo = await readAliases(root, config.aliases);
  const legacyPrefixes = config.legacyPaths
    .map(normalizePrefix)
    .filter(Boolean);
  const migratedPrefixes = config.migratedPaths
    .map(normalizePrefix)
    .filter(Boolean);

  for (const { relPath, text } of files) {
    if (isWithin(relPath, legacyPrefixes)) continue;
    if (migratedPrefixes.length && !isWithin(relPath, migratedPrefixes))
      continue;

    for (const item of imports(text)) {
      const source = item.source;
      if (!isLegacyImport({ source, importer: relPath, legacyPrefixes }))
        continue;
      findings.push({
        kind: "legacy-ui-import",
        file: relPath,
        line: lineNumberAt(text, item.index),
        value: source,
        excerpt: lineTextAt(text, item.index),
      });
    }
  }

  return await finishPolicyCheck(
    {
      title: "Legacy UI usage check",
      heuristic: true,
      root,
      skippedFiles: files.diagnostics || [],
      summary: {
        violations: findings.length,
        legacyPaths: legacyPrefixes,
        migratedPaths: migratedPrefixes.length
          ? migratedPrefixes
          : ["all non-legacy source files"],
      },
      findings,
      limitations: [
        ...aliasInfo.unresolved,
        "Computed imports and indirect re-exports need graph/runtime inspection.",
        "Dynamic imports, re-exports, and dependency injection can hide legacy usage.",
        "Use migratedPaths to turn this into a narrow rollout gate instead of a repository-wide inventory.",
      ],
    },
    args,
  );

  function isLegacyImport({ source, importer, legacyPrefixes: prefixes }) {
    const resolved = resolveImport(source, importer, aliasInfo.aliases);
    return isWithin(stripKnownExtension(resolved), prefixes);
  }

  function stripKnownExtension(value) {
    return value
      .replace(/\.(?:js|jsx|ts|tsx|mjs|cjs|vue|svelte)$/, "")
      .replace(/\/index$/, "");
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
