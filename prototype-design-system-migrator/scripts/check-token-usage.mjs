#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { colorPattern } from "./source-analysis.mjs";
import {
  addMatches,
  finishPolicyCheck,
  isWithin,
  loadConfig,
  parseArgs,
  readTextFiles,
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));
  const findings = [];
  const rawColorRegex = colorPattern;

  for (const { relPath, text } of files) {
    if (isWithin(relPath, config.tokenPaths)) continue;
    if (/^(?:docs|public|static|assets)\//.test(relPath)) continue;
    if (/\.(?:json)$/.test(relPath)) continue;
    addMatches({
      findings,
      regex: rawColorRegex,
      text,
      file: relPath,
      kind: "raw-color",
    });
  }

  return await finishPolicyCheck(
    {
      title: "Design-token usage check",
      heuristic: true,
      root,
      skippedFiles: files.diagnostics || [],
      summary: {
        violations: findings.length,
        approvedTokenPaths: config.tokenPaths,
      },
      findings,
      limitations: [
        "The scanner cannot distinguish every literal used for tests, data, charts, or third-party APIs.",
        "A clean result does not prove semantic token quality.",
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
