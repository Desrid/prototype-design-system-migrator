#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  finishPolicyCheck,
  isWithin,
  lineNumberAt,
  lineTextAt,
  loadConfig,
  parseArgs,
  readTextFiles,
  matchGlob,
} from "./lib.mjs";
import { imports } from "./source-analysis.mjs";
export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || "."),
    config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));
  const findings = [],
    aliases = new Map();
  const recognized = (source) => {
    const packageName = source
      .split("/")
      .slice(0, source.startsWith("@") ? 2 : 1)
      .join("/");
    return config.iconPackages.some(
      (p) =>
        matchGlob(packageName, p) ||
        matchGlob(source, p) ||
        source === p ||
        source.startsWith(`${p}/`),
    );
  };
  for (const { relPath, text } of files) {
    for (const item of imports(text)) {
      if (
        !recognized(item.source) ||
        isWithin(relPath, config.iconRegistryPaths)
      )
        continue;
      findings.push({
        kind: "direct-icon-import",
        file: relPath,
        line: lineNumberAt(text, item.index),
        value: item.source,
        excerpt: lineTextAt(text, item.index),
      });
    }
    if (isWithin(relPath, config.iconRegistryPaths)) {
      for (const m of text.matchAll(
        /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g,
      )) {
        if (!recognized(m[2])) continue;
        for (const entry of m[1].split(",")) {
          const parts = entry.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
          if (!parts) continue;
          const alias = parts[2] || parts[1],
            source = `${m[2]}:${parts[1]}`;
          if (!aliases.has(alias)) aliases.set(alias, []);
          aliases.get(alias).push({
            source,
            file: relPath,
            line: lineNumberAt(text, m.index),
            excerpt: m[0],
          });
        }
      }
    }
    // Text content alone does not prove misuse; review rather than banning legitimate emoji labels.
  }
  for (const [alias, records] of aliases) {
    const sources = [...new Set(records.map((r) => r.source))];
    if (sources.length > 1)
      for (const r of records)
        findings.push({
          kind: "conflicting-semantic-icon-alias",
          file: r.file,
          line: r.line,
          value: `${alias}: ${sources.join(", ")}`,
          excerpt: r.excerpt,
        });
  }
  return finishPolicyCheck(
    {
      title: "Icon-boundary check",
      heuristic: true,
      root,
      skippedFiles: files.diagnostics || [],
      summary: {
        violations: findings.length,
        registryPaths: config.iconRegistryPaths,
        semanticAliases: aliases.size,
      },
      findings,
      limitations: [
        "One glyph may serve several semantic names. The reverse mapping must be unambiguous.",
        "Runtime icon sizes, custom wrappers, emoji-as-content, and accessible names require visual/interaction review.",
      ],
    },
    args,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
