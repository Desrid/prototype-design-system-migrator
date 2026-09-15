#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, pathExists, walkFiles } from "./lib.mjs";

const SKILL_NAME = "prototype-design-system-migrator";
const MARKER = ".skill-install.json";
const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = parseArgs();
const agent = String(args.agent || "both").toLowerCase();
const scope = String(args.scope || "project").toLowerCase();

if (!["codex", "claude", "both"].includes(agent))
  fail("--agent must be codex, claude, or both");
if (!["project", "user"].includes(scope))
  fail("--scope must be project or user");

const base = path.resolve(
  args.target || (scope === "user" ? os.homedir() : process.cwd()),
);
const version = (
  await fs.readFile(path.join(sourceRoot, "VERSION"), "utf8")
).trim();
const sourceHash = await hashTree(sourceRoot);
const destinations = [];
if (agent === "codex" || agent === "both") {
  destinations.push({
    agent: "codex",
    path: path.join(base, ".agents", "skills", SKILL_NAME),
  });
}
if (agent === "claude" || agent === "both") {
  destinations.push({
    agent: "claude",
    path: path.join(base, ".claude", "skills", SKILL_NAME),
  });
}

const results = [];
for (const destination of destinations) {
  results.push(
    args.check
      ? await checkDestination(destination)
      : await installDestination(destination),
  );
}

process.stdout.write(
  `${JSON.stringify(
    {
      skill: SKILL_NAME,
      version,
      source: sourceRoot,
      sourceHash,
      scope,
      base,
      dryRun: Boolean(args.dryRun),
      check: Boolean(args.check),
      results,
    },
    null,
    2,
  )}\n`,
);

if (
  results.some((item) =>
    ["drifted", "outdated", "missing", "refused", "error"].includes(
      item.status,
    ),
  )
) {
  process.exitCode = 1;
}

async function installDestination(destination) {
  const dest = destination.path;
  const exists = await pathExists(dest);
  for (
    let current = dest;
    current !== path.dirname(current);
    current = path.dirname(current)
  ) {
    if (
      (await pathExists(current)) &&
      (await fs.lstat(current)).isSymbolicLink()
    )
      throw new Error("Refusing linked install path: " + current);
  }
  const relativeSource = path.relative(dest, sourceRoot);
  if (
    !relativeSource ||
    (!relativeSource.startsWith("..") && !path.isAbsolute(relativeSource))
  )
    throw new Error("Destination contains source package");
  let currentMarker = null;
  let currentHash = null;

  if (exists) {
    currentMarker = await readMarker(dest);
    currentHash = await hashTree(dest);
    const locallyModified =
      !currentMarker || currentHash !== currentMarker.sourceHash;
    if (locallyModified && !args.force) {
      return {
        ...destination,
        status: "refused",
        reason: currentMarker
          ? "Installed copy differs from its recorded source hash. Use --force to overwrite local changes."
          : "Destination exists without an installation marker. Use --force to overwrite it.",
        currentHash,
        recordedHash: currentMarker?.sourceHash || null,
      };
    }
    if (!locallyModified && currentMarker.sourceHash === sourceHash) {
      return { ...destination, status: "unchanged", hash: sourceHash };
    }
  }

  if (args.dryRun) {
    return {
      ...destination,
      status: exists ? "would-update" : "would-install",
      hash: sourceHash,
    };
  }

  const parent = path.dirname(dest);
  const temp = path.join(
    parent,
    `.${SKILL_NAME}.tmp-${process.pid}-${Date.now()}`,
  );
  await fs.mkdir(parent, { recursive: true });
  await fs.cp(sourceRoot, temp, { recursive: true, force: true });
  await fs.writeFile(
    path.join(temp, MARKER),
    `${JSON.stringify(
      {
        name: SKILL_NAME,
        version,
        agent: destination.agent,
        scope,
        sourceHash,
        installedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  // Retain the previous installation until the staged replacement is verified.
  if ((await hashTree(temp)) !== sourceHash)
    throw new Error("Staged content hash mismatch");
  const backup = exists
    ? path.join(
        parent,
        "." + SKILL_NAME + ".backup-" + process.pid + "-" + Date.now(),
      )
    : null;
  if (exists) await fs.rename(dest, backup);
  try {
    await fs.rename(temp, dest);
  } catch (error) {
    if (backup) await fs.rename(backup, dest);
    throw error;
  }

  const installedHash = await hashTree(dest);
  if (installedHash !== sourceHash) {
    return {
      ...destination,
      status: "error",
      reason: "Post-install content hash mismatch",
      installedHash,
    };
  }
  return {
    ...destination,
    status: exists ? "updated" : "installed",
    hash: installedHash,
    backup,
  };
}

async function checkDestination(destination) {
  const dest = destination.path;
  if (!(await pathExists(dest))) return { ...destination, status: "missing" };
  const marker = await readMarker(dest);
  const installedHash = await hashTree(dest);
  if (!marker) {
    return {
      ...destination,
      status: "drifted",
      reason: "Missing installation marker",
      installedHash,
    };
  }
  if (installedHash !== marker.sourceHash) {
    return {
      ...destination,
      status: "drifted",
      reason: "Installed files were modified after installation",
      installedHash,
      recordedHash: marker.sourceHash,
    };
  }
  if (installedHash !== sourceHash) {
    return {
      ...destination,
      status: "outdated",
      installedHash,
      sourceHash,
      installedVersion: marker.version,
      sourceVersion: version,
    };
  }
  return {
    ...destination,
    status: "current",
    hash: installedHash,
    version: marker.version,
  };
}

async function readMarker(dir) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, MARKER), "utf8"));
  } catch {
    return null;
  }
}

async function hashTree(dir) {
  const files = await walkFiles(dir, {
    ignore: ["node_modules", ".git"],
    maxBytes: Infinity,
    useDefaultIgnore: false,
  });
  const relativeFiles = files
    .map((file) => path.relative(dir, file).split(path.sep).join("/"))
    .filter((file) => file !== MARKER)
    .sort();
  const hash = crypto.createHash("sha256");
  for (const relative of relativeFiles) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await fs.readFile(path.join(dir, ...relative.split("/"))));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
