#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  parseArgs,
  readTextFiles,
  readJson,
  writeJson,
  printResult,
} from "./lib.mjs";
import { run as tokens } from "./check-token-usage.mjs";
import { run as spacing } from "./check-spacing-usage.mjs";
import { run as icons } from "./check-icon-imports.mjs";
import { run as libraries } from "./check-library-mixing.mjs";
import { run as legacy } from "./check-legacy-usage.mjs";
import { run as nativeControls } from "./check-native-controls.mjs";
export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || "."),
    config = await loadConfig(root),
    files = await readTextFiles(root, { config });
  const results = [];
  for (const check of [
    tokens,
    spacing,
    icons,
    libraries,
    legacy,
    nativeControls,
  ])
    results.push(
      await check({
        ...args,
        root,
        config,
        files,
        noFail: true,
        silent: true,
        out: null,
      }),
    );
  const findings = results.flatMap((r) => r.findings),
    existing = [],
    fresh = [];
  if (args.baseline) {
    const baseline = await readJson(path.resolve(args.baseline));
    if (
      baseline.schemaVersion !== 1 ||
      !Array.isArray(baseline.findings) ||
      baseline.findings.some((f) => !f.fingerprint)
    )
      throw new Error("Invalid policy baseline");
    if (baseline.root !== root)
      throw new Error("Baseline belongs to a different project root");
    const counts = new Map();
    for (const f of baseline.findings)
      counts.set(f.fingerprint, (counts.get(f.fingerprint) || 0) + 1);
    for (const f of findings) {
      const n = counts.get(f.fingerprint) || 0;
      if (n) {
        counts.set(f.fingerprint, n - 1);
        existing.push(f);
      } else fresh.push(f);
    }
  } else fresh.push(...findings);
  const result = {
    schemaVersion: 1,
    title: "UI policy checks",
    root,
    heuristic: true,
    findings,
    newFindings: fresh,
    existingFindings: existing,
    skippedFiles: files.diagnostics,
    checks: results,
    summary: {
      scannedFiles: files.length,
      sourceReadPasses: 1,
      violations: findings.length,
      newViolations: fresh.length,
      existingViolations: existing.length,
      skippedFiles: files.diagnostics.length,
    },
  };
  result.status = files.diagnostics.length
    ? "PARTIAL"
    : fresh.length
      ? "FAIL"
      : "PASS";
  if (args.writeBaseline) {
    if (args.baseline)
      throw new Error("Do not read and replace a baseline in the same run");
    await writeJson(path.resolve(args.writeBaseline), {
      schemaVersion: 1,
      root,
      findings,
    });
  }
  if (args.out) await writeJson(path.resolve(args.out), result);
  if (!args.silent) printResult(result, { json: Boolean(args.json) });
  if (!args.noFail && (fresh.length || files.diagnostics.length))
    process.exitCode = 1;
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
