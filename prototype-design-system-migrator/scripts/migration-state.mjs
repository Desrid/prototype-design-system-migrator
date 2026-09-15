#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {
  parseArgs,
  loadConfig,
  readTextFiles,
  readJson,
  writeJson,
  walkFiles,
  normalizeRelative,
} from "./lib.mjs";
const args = parseArgs(),
  root = path.resolve(args.root || ".");
const config = await loadConfig(root),
  files = await readTextFiles(root, { config });
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const snapshot = Object.fromEntries(
  files.map((f) => [f.relPath, hash(f.rawText)]),
);
const contextFiles = await walkFiles(root, {
  ignore: config.ignore,
  diagnostics: files.diagnostics,
});
for (const file of contextFiles) {
  if (
    /^(?:package.json|(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)|(?:tsconfig|jsconfig)(?:\.[^.]+)?\.json)$/.test(
      path.basename(file),
    )
  ) {
    snapshot[normalizeRelative(root, file)] = hash(await fs.readFile(file));
  }
}
const configHash = hash(JSON.stringify(config));
if (args.snapshot) {
  if (!args.out) throw new Error("--snapshot requires --out");
  await writeJson(path.resolve(args.out), {
    schemaVersion: 1,
    root,
    configHash,
    sources: snapshot,
    skippedFiles: files.diagnostics,
  });
  console.log(
    JSON.stringify({
      status: "SNAPSHOT_SAVED",
      files: files.length,
      skipped: files.diagnostics.length,
    }),
  );
} else {
  if (!args.previous)
    throw new Error("Use --snapshot --out state.json or --previous state.json");
  const prior = await readJson(path.resolve(args.previous));
  if (
    prior.schemaVersion !== 1 ||
    prior.root !== root ||
    !prior.sources ||
    typeof prior.sources !== "object" ||
    Array.isArray(prior.sources)
  )
    throw new Error("Invalid state or project root");
  const changed = Object.keys(snapshot).filter(
    (f) => prior.sources[f] !== snapshot[f],
  );
  const deleted = Object.keys(prior.sources).filter((f) => !(f in snapshot));
  const configChanged = prior.configHash !== configHash;
  const result = {
    status:
      changed.length ||
      deleted.length ||
      configChanged ||
      files.diagnostics.length
        ? "REVALIDATE"
        : "UNCHANGED",
    changed,
    deleted,
    configChanged,
    skippedFiles: files.diagnostics,
    next: "Revalidate affected components and consumers; a snapshot is not proof of visual or functional acceptance.",
  };
  if (args.out) await writeJson(path.resolve(args.out), result);
  console.log(JSON.stringify(result, null, 2));
}
