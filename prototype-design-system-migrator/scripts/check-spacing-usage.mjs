#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isWithin,
  finishPolicyCheck,
  lineNumberAt,
  lineTextAt,
  loadConfig,
  parseArgs,
  readTextFiles,
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));
  const findings = [];
  // Numeric spacing in CSS-in-JS uses implicit pixels; retain a heuristic label.
  const objectSpacingRegex =
    /\b(?:margin|padding)(?:Top|Right|Bottom|Left|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)?\s*:\s*(-?(?:\d*\.\d+|\d+))(?=\s*[,}])/g;
  const declarationRegex =
    /\b(margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap|inset(?:-(?:inline|block)(?:-(?:start|end))?)?|top|right|bottom|left)\s*:\s*([^;}{]+)/gi;
  const literalUnitRegex =
    /(?<![\w.-])-?(?:\d*\.\d+|\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch)\b/g;
  const tailwindRegex =
    /(?:^|[\s"'`:])(-?(?:m|p|gap|space|inset|top|right|bottom|left)[trblxy]?\-\[[^\]]+\])/g;

  for (const { relPath, text } of files) {
    if (isWithin(relPath, config.tokenPaths)) continue;
    if (/^(?:docs|public|static|assets)\//.test(relPath)) continue;

    if (/\.(?:[cm]?[jt]sx?|vue|svelte)$/.test(relPath)) {
      for (const match of text.matchAll(objectSpacingRegex)) {
        if (Number(match[1]) === 0) continue;
        findings.push({
          kind: "raw-object-spacing",
          file: relPath,
          line: lineNumberAt(text, match.index),
          value: match[1],
          excerpt: lineTextAt(text, match.index),
        });
      }
    }
    for (const match of text.matchAll(declarationRegex)) {
      const value = match[2].trim();
      const literals = [...value.matchAll(literalUnitRegex)].map(
        (item) => item[0],
      );
      if (!literals.length) continue;
      findings.push({
        kind: "raw-spacing",
        file: relPath,
        line: lineNumberAt(text, match.index ?? 0),
        property: match[1],
        value,
        literals,
        excerpt: lineTextAt(text, match.index ?? 0),
      });
    }

    for (const match of text.matchAll(tailwindRegex)) {
      findings.push({
        kind: "tailwind-arbitrary-spacing",
        file: relPath,
        line: lineNumberAt(text, match.index ?? 0),
        value: match[1],
        excerpt: lineTextAt(text, match.index ?? 0),
      });
    }
  }

  return await finishPolicyCheck(
    {
      title: "Spacing policy check",
      heuristic: true,
      root,
      skippedFiles: files.diagnostics || [],
      summary: {
        violations: findings.length,
        approvedTokenPaths: config.tokenPaths,
      },
      findings,
      limitations: [
        "The scanner intentionally reports literal layout offsets that may be legitimate temporary exceptions.",
        "It cannot prove that a variable refers to an approved spacing token.",
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
