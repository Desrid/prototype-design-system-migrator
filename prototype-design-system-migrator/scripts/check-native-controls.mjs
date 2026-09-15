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
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || "."),
    config = args.config || (await loadConfig(root)),
    files = args.files || (await readTextFiles(root, { config }));
  const findings = [];
  const add = (file, text, index, kind, value) =>
    findings.push({
      file,
      line: lineNumberAt(text, index),
      kind,
      value,
      excerpt: lineTextAt(text, index),
    });
  for (const { relPath, text } of files) {
    if (!/\.(?:[cm]?[jt]sx?|vue|svelte|astro|html?)$/.test(relPath)) continue;
    const inside = isWithin(relPath, config.uiBoundaryPaths);
    for (const m of text.matchAll(
      /<(button|input|select|textarea|datalist|option|progress|meter|details|summary|dialog)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g,
    )) {
      const tag = m[1].toLowerCase(),
        attrs = m[2];
      if (
        tag === "input" &&
        /\btype\s*=\s*(?:["']hidden["']|\{\s*["']hidden["']\s*\})/i.test(attrs)
      )
        continue;
      if (!inside)
        add(relPath, text, m.index, "native-control-outside-ds", tag);
      else if (
        ["select", "datalist"].includes(tag) ||
        (tag === "input" &&
          /\b(?:type\s*=\s*(?:\{\s*)?["'](?:date|datetime-local|month|week|time|color|file)["']|list\s*=)/i.test(
            attrs,
          ))
      )
        add(relPath, text, m.index, "native-widget-in-ds", tag);
    }
    for (const m of text.matchAll(
      /\b(?:window\.|globalThis\.)?(alert|confirm|prompt)\s*\(/g,
    ))
      add(relPath, text, m.index, "browser-dialog", m[1]);
    for (const m of text.matchAll(
      /\btitle\s*=\s*(?:["'][^"']+["']|\{[^}]+\})/g,
    ))
      add(relPath, text, m.index, "native-tooltip-review", "title");
    for (const m of text.matchAll(
      /\b(?:document\.)?createElement\s*\(\s*["'](button|input|select|textarea|datalist|progress|meter|dialog)["']/g,
    )) {
      if (!inside)
        add(relPath, text, m.index, "native-control-outside-ds", m[1]);
      else if (["select", "datalist"].includes(m[1]))
        add(relPath, text, m.index, "native-widget-in-ds", m[1]);
    }
  }
  return finishPolicyCheck(
    {
      title: "DS control ownership check",
      root,
      heuristic: true,
      skippedFiles: files.diagnostics || [],
      findings,
      summary: {
        violations: findings.length,
        uiBoundaryPaths: config.uiBoundaryPaths,
      },
      limitations: [
        "Markup and call detection is heuristic: template strings, local function names, dynamic tags, custom aliases, and third-party internals require review.",
        "Inside a DS directory does not prove DS styling. Inspect actual rendered controls and every opened popup.",
        "Hidden implementation controls and unavoidable OS surfaces require explicit verified exceptions; HTML semantics are allowed inside DS components.",
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
