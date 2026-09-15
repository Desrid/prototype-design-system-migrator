#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  loadConfig,
  readJson,
  writeJson,
  parseArgs,
  readTextFiles,
  validateRelative,
} from "./lib.mjs";
const args = parseArgs(),
  root = path.resolve(args.root || ".");
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const config = await loadConfig(root),
  sources = await readTextFiles(root, { config });
const permitted = new Set(sources.map((f) => f.relPath));
async function target(file) {
  validateRelative(file);
  if (!permitted.has(file))
    throw new Error(`Not a scanned source file: ${file}`);
  const absolute = path.resolve(root, file),
    real = await fs.realpath(absolute),
    realRoot = await fs.realpath(root);
  const relative = path.relative(realRoot, real);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`Unsafe or linked target: ${file}`);
  for (
    let current = absolute;
    current !== root;
    current = path.dirname(current)
  ) {
    if ((await fs.lstat(current)).isSymbolicLink())
      throw new Error(`Linked target: ${file}`);
  }
  return absolute;
}
if (args.prepare) {
  if (args.apply || args.plan || !args.out)
    throw new Error("Use --prepare mapping.json --out plan.json");
  const spec = await readJson(path.resolve(args.prepare));
  if (spec.schemaVersion !== 1 || !Array.isArray(spec.files) || !spec.reason)
    throw new Error("Mapping requires schemaVersion:1, reason, files");
  const plan = { schemaVersion: 1, root, reason: spec.reason, files: [] };
  const seen = new Set();
  for (const item of spec.files) {
    if (seen.has(item.file)) throw new Error(`Duplicate file: ${item.file}`);
    seen.add(item.file);
    const absolute = await target(item.file),
      before = await fs.readFile(absolute, "utf8");
    let after = before;
    if (!Array.isArray(item.replacements) || !item.replacements.length)
      throw new Error("replacements must not be empty");
    for (const change of item.replacements) {
      if (
        typeof change.before !== "string" ||
        !change.before ||
        typeof change.after !== "string" ||
        change.before === change.after
      )
        throw new Error("Each replacement needs distinct before/after text");
      const index = after.indexOf(change.before);
      if (index < 0 || after.indexOf(change.before, index + 1) >= 0)
        throw new Error(
          `Replacement must match exactly once in ${item.file}; provide more context`,
        );
      after =
        after.slice(0, index) +
        change.after +
        after.slice(index + change.before.length);
    }
    if (before === after) throw new Error(`No change in ${item.file}`);
    plan.files.push({
      file: item.file,
      beforeHash: hash(before),
      afterHash: hash(after),
      before,
      after,
    });
  }
  if (
    permitted.has(
      path.relative(root, path.resolve(args.out)).split(path.sep).join("/"),
    )
  )
    throw new Error("Plan output must not overwrite source");
  await writeJson(path.resolve(args.out), plan);
  console.log(
    JSON.stringify(
      {
        status: "PREPARED",
        plan: path.resolve(args.out),
        files: plan.files.map((f) => ({
          file: f.file,
          beforeHash: f.beforeHash,
          afterHash: f.afterHash,
        })),
        next: "Review plan before applying; functional and visual verification remain required.",
      },
      null,
      2,
    ),
  );
} else {
  if (!args.plan) throw new Error("Use --plan plan.json [--apply]");
  const plan = await readJson(path.resolve(args.plan));
  if (
    plan.schemaVersion !== 1 ||
    plan.root !== root ||
    !Array.isArray(plan.files)
  )
    throw new Error("Invalid plan or project root");
  const pending = [],
    unchanged = [],
    seen = new Set();
  for (const f of plan.files) {
    if (seen.has(f.file)) throw new Error("Duplicate plan target");
    seen.add(f.file);
    if (
      typeof f.before !== "string" ||
      typeof f.after !== "string" ||
      hash(f.before) !== f.beforeHash ||
      hash(f.after) !== f.afterHash
    )
      throw new Error("Invalid plan content hashes");
    const absolute = await target(f.file),
      current = await fs.readFile(absolute, "utf8");
    if (hash(current) === f.afterHash) {
      unchanged.push(f.file);
      continue;
    }
    if (hash(current) !== f.beforeHash)
      throw new Error(
        `Source changed since planning: ${f.file}; regenerate plan`,
      );
    pending.push({ ...f, absolute });
  }
  if (args.apply) {
    const written = [];
    try {
      for (const f of pending) {
        if (hash(await fs.readFile(f.absolute, "utf8")) !== f.beforeHash)
          throw new Error(`Concurrent edit: ${f.file}`);
        written.push(f);
        await fs.writeFile(f.absolute, f.after, "utf8");
      }
    } catch (error) {
      for (const f of written.reverse()) {
        const current = await fs.readFile(f.absolute, "utf8");
        if (hash(current) === f.afterHash)
          await fs.writeFile(f.absolute, f.before, "utf8");
      }
      throw error;
    }
  }
  console.log(
    JSON.stringify(
      {
        status: args.apply
          ? pending.length
            ? "APPLIED_PENDING_VALIDATION"
            : "UNCHANGED"
          : "PREVIEW",
        changed: pending.map((f) => f.file),
        unchanged,
        verification:
          "Run relevant policy, build, behavior and visual checks; this transform never declares READY.",
      },
      null,
      2,
    ),
  );
}
