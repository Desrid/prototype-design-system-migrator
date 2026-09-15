#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ds-regression-"));
const results = [];
async function fixture(name, files) {
  const root = path.join(temp, name);
  for (const [f, s] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true });
    await fs.writeFile(
      path.join(root, f),
      typeof s === "string" ? s : JSON.stringify(s),
    );
  }
  return root;
}
function run(script, root, args = []) {
  const p = spawnSync(
    process.execPath,
    [path.join(skill, "scripts", script), "--root", root, ...args],
    { encoding: "utf8", timeout: 15000 },
  );
  let data;
  try {
    data = JSON.parse(p.stdout);
  } catch {}
  return { code: p.status, data, stderr: p.stderr, stdout: p.stdout };
}
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.stack });
  }
}
await test("CRLF and BOM frontmatter remain portable", async () => {
  const root = path.join(temp, "package");
  await fs.cp(skill, root, { recursive: true });
  const file = path.join(root, "SKILL.md");
  await fs.writeFile(
    file,
    "\uFEFF" +
      (await fs.readFile(file, "utf8"))
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\n/g, "\r\n"),
  );
  assert.equal(run("validate-skill-package.mjs", root).data.valid, true);
});
await test("source roots, relative ignores and glob ignores", async () => {
  const root = await fixture("scope", {
    "ui-system.config.json": {
      sourceRoots: ["src"],
      ignore: ["src/old", "**/*.generated.css"],
    },
    "src/ok.css": ".a{color:var(--text)}",
    "src/old/a.css": ".a{color:#123456}",
    "src/a.generated.css": ".a{color:#123456}",
    "other/a.css": ".a{color:#123456}",
  });
  const r = run("run-checks.mjs", root, ["--json"]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.data.summary.scannedFiles, 1);
});
await test("invalid configuration never silently defaults", async () => {
  for (const [i, config] of [
    "{bad",
    { sorceRoots: ["src"] },
    { sourceRoots: "src" },
    { sourceRoots: [] },
    { sourceRoots: ["../other"] },
    { approvedIconSizes: ["16"] },
    { exceptions: [{ kind: "raw-color" }] },
  ].entries()) {
    const root = await fixture(`invalid-${i}`, {
      "ui-system.config.json": config,
      "src/a.css": ".a{}",
    });
    assert.notEqual(run("run-checks.mjs", root, ["--json"]).code, 0);
  }
});
await test("modern colors and nested/mixed spacing are found", async () => {
  const root = await fixture("values", {
    "src/a.css":
      ".a{padding:0 13px;gap:calc(var(--space) + 3px);margin:var(--a) 7px;color:oklch(60% 0.2 200)}\n.b{padding:var(--space);color:var(--color)}",
  });
  const spacing = run("check-spacing-usage.mjs", root, ["--json"]);
  assert.equal(spacing.data.findings.length, 3);
  assert.equal(
    run("check-token-usage.mjs", root, ["--json"]).data.findings.length,
    1,
  );
});
await test("comments, strings and unsupported hex lengths", async () => {
  const root = await fixture("comments", {
    "src/a.ts":
      '// import {X} from "antd"; color:#123456\nconst docs = "import {Y} from \'@mui/material\'";',
    "src/a.css": "/* color:#123456; padding:13px */ .a{color:#12345}",
  });
  assert.equal(
    run("check-library-mixing.mjs", root, ["--json"]).data.findings.length,
    0,
  );
  assert.equal(
    run("check-token-usage.mjs", root, ["--json"]).data.findings.length,
    0,
  );
});
await test("UI routes exclude special files and distinguish APIs", async () => {
  const root = await fixture("routes", {
    "pages/index.tsx": "x",
    "pages/_app.tsx": "x",
    "pages/api/ping.ts": "x",
    "app/(auth)/login/page.tsx": "x",
    "app/items/[id]/page.tsx": "x",
    "app/api/users/route.ts": "x",
    "src/routes/about/+page.svelte": "x",
  });
  const r = run("inventory-ui.mjs", root, ["--json"]);
  assert.deepEqual(r.data.observed.routes, [
    "/",
    "/about",
    "/items/:id",
    "/login",
  ]);
  assert.deepEqual(r.data.observed.apiRoutes, ["/api/ping", "/api/users"]);
});
await test("literal import forms and configurable icon sets", async () => {
  const root = await fixture("icons", {
    "src/a.ts":
      'export {Search} from "lucide-react"; const m=require("@heroicons/react/24/outline"); import "react-icons/fa"; import("lucide-react");',
  });
  assert.equal(
    run("check-icon-imports.mjs", root, ["--json"]).data.findings.length,
    4,
  );
  await fs.writeFile(
    path.join(root, "ui-system.config.json"),
    JSON.stringify({ iconPackages: ["my-icons"] }),
  );
  assert.equal(
    run("check-icon-imports.mjs", root, ["--json"]).data.findings.length,
    0,
  );
});
await test("semantic alias reuse is valid; ambiguous alias is not", async () => {
  const root = await fixture("alias-icons", {
    "src/ui/icons/index.ts":
      'export {Search as SearchIcon, Search as FindIcon} from "lucide-react";',
  });
  assert.equal(run("check-icon-imports.mjs", root, ["--json"]).code, 0);
  await fs.appendFile(
    path.join(root, "src/ui/icons/index.ts"),
    'export {Plus as SearchIcon} from "lucide-react";',
  );
  assert.equal(run("check-icon-imports.mjs", root, ["--json"]).code, 1);
});
await test("real alias mapping and no guessed basename matches", async () => {
  const root = await fixture("aliases", {
    "ui-system.config.json": {
      legacyPaths: ["components/old"],
      migratedPaths: ["src"],
    },
    "tsconfig.json":
      '{ // config\n"compilerOptions":{"baseUrl":".","paths":{"@old/*":["components/old/*"]},},}',
    "src/a.ts":
      'import {X} from "@old/Button"; import {Y} from "some/old/Button";',
  });
  const r = run("check-legacy-usage.mjs", root, ["--json"]);
  assert.equal(r.data.findings.length, 1);
  assert.equal(r.data.findings[0].value, "@old/Button");
});
await test("baseline distinguishes old findings and duplicate additions", async () => {
  const root = await fixture("baseline", {
      "src/a.css": ".a{color:#123456}\n",
    }),
    baseline = path.join(temp, "baseline.json");
  assert.equal(
    run("run-checks.mjs", root, [
      "--write-baseline",
      baseline,
      "--json",
      "--no-fail",
    ]).code,
    0,
  );
  assert.equal(
    run("run-checks.mjs", root, ["--baseline", baseline, "--json"]).code,
    0,
  );
  await fs.appendFile(path.join(root, "src/a.css"), ".a{color:#123456}\n");
  const r = run("run-checks.mjs", root, ["--baseline", baseline, "--json"]);
  assert.equal(r.data.newFindings.length, 1);
  assert.equal(r.data.existingFindings.length, 1);
  assert.equal(r.data.summary.sourceReadPasses, 1);
});
await test("strict migrated scope and expiring exact exceptions", async () => {
  const root = await fixture("exceptions", {
    "ui-system.config.json": {
      migratedPaths: ["src/new"],
      exceptions: [
        {
          kind: "raw-color",
          file: "src/new/a.css",
          value: "#123456",
          reason: "vendor API",
          expires: "2099-01-01",
        },
      ],
    },
    "src/new/a.css": ".a{color:#123456}",
    "src/old/a.css": ".a{color:#abcdef}",
  });
  assert.equal(run("run-checks.mjs", root, ["--migrated", "--json"]).code, 0);
  const p = path.join(root, "ui-system.config.json"),
    c = JSON.parse(await fs.readFile(p));
  c.exceptions[0].expires = "2000-01-01";
  await fs.writeFile(p, JSON.stringify(c));
  assert.equal(run("run-checks.mjs", root, ["--migrated", "--json"]).code, 1);
});
await test("package profile isolates application imports and Storybook", async () => {
  const root = await fixture("workspace", {
    "package.json": { private: true, workspaces: ["apps/*"] },
    "apps/web/package.json": {
      dependencies: { react: "19", antd: "6" },
      devDependencies: { storybook: "10" },
    },
    "apps/web/src/App.tsx": 'import {Button} from "antd";',
    "apps/web/src/App.stories.tsx": "export const Default={};",
    "apps/admin/package.json": {
      dependencies: { vue: "3", "element-plus": "2" },
    },
    "apps/admin/src/App.vue":
      '<script>import {ElButton} from "element-plus";</script>',
  });
  const r = run("profile-project.mjs", root, ["--json"]);
  assert.equal(r.code, 0, r.stderr);
  const web = r.data.packages.find((p) => p.root === "apps/web"),
    admin = r.data.packages.find((p) => p.root === "apps/admin");
  assert.equal(web.recommendation.system, "ant-design");
  assert.equal(admin.recommendation.system, "element-plus");
  assert.equal(web.storyFiles.length, 1);
  assert(!admin.actualImports.some((i) => i.source === "antd"));
});
await test("transform preview, apply, idempotence, and stale-plan refusal", async () => {
  const root = await fixture("transform", { "src/a.css": ".a{color:#123456}" }),
    map = path.join(temp, "mapping.json"),
    plan = path.join(temp, "plan.json");
  await fs.writeFile(
    map,
    JSON.stringify({
      schemaVersion: 1,
      reason: "approved text color",
      files: [
        {
          file: "src/a.css",
          replacements: [
            { before: "color:#123456", after: "color:var(--text)" },
          ],
        },
      ],
    }),
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--prepare", map, "--out", plan]).code,
    0,
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--plan", plan]).data.status,
    "PREVIEW",
  );
  assert.equal(
    await fs.readFile(path.join(root, "src/a.css"), "utf8"),
    ".a{color:#123456}",
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).data.status,
    "APPLIED_PENDING_VALIDATION",
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).data.status,
    "UNCHANGED",
  );
  await fs.appendFile(path.join(root, "src/a.css"), " /* concurrent */");
  assert.notEqual(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).code,
    0,
  );
});
await test("ambiguous mappings and changes to any target prevent writes", async () => {
  const root = await fixture("transform-guard", {
      "src/a.css": "#123456 #123456",
      "src/b.css": "#abcdef",
    }),
    map = path.join(temp, "guard-map.json"),
    plan = path.join(temp, "guard-plan.json");
  await fs.writeFile(
    map,
    JSON.stringify({
      schemaVersion: 1,
      reason: "test",
      files: [
        {
          file: "src/a.css",
          replacements: [{ before: "#123456", after: "var(--x)" }],
        },
      ],
    }),
  );
  assert.notEqual(
    run("transform-ui.mjs", root, ["--prepare", map, "--out", plan]).code,
    0,
  );
  await fs.writeFile(
    map,
    JSON.stringify({
      schemaVersion: 1,
      reason: "test",
      files: [
        {
          file: "src/a.css",
          replacements: [{ before: "#123456 #123456", after: "var(--x)" }],
        },
        {
          file: "src/b.css",
          replacements: [{ before: "#abcdef", after: "var(--y)" }],
        },
      ],
    }),
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--prepare", map, "--out", plan]).code,
    0,
  );
  await fs.appendFile(path.join(root, "src/b.css"), " changed");
  assert.notEqual(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).code,
    0,
  );
  assert.equal(
    await fs.readFile(path.join(root, "src/a.css"), "utf8"),
    "#123456 #123456",
  );
});
await test("resume detects modifications, deletions, and config changes", async () => {
  const root = await fixture("resume", {
      "src/a.css": ".a{}",
      "src/b.css": ".b{}",
    }),
    state = path.join(temp, "state.json");
  assert.equal(
    run("migration-state.mjs", root, ["--snapshot", "--out", state]).code,
    0,
  );
  assert.equal(
    run("migration-state.mjs", root, ["--previous", state]).data.status,
    "UNCHANGED",
  );
  await fs.appendFile(path.join(root, "src/a.css"), ".c{}");
  await fs.unlink(path.join(root, "src/b.css"));
  const r = run("migration-state.mjs", root, ["--previous", state]);
  assert.deepEqual(r.data.changed, ["src/a.css"]);
  assert.deepEqual(r.data.deleted, ["src/b.css"]);
});

await test("all policy checks share one actual source read", async () => {
  const root = await fixture("one-read", {
    "src/Only.tsx": "export const Only=()=>null;",
  });
  const { run: check } = await import("../scripts/run-checks.mjs");
  const original = fs.readFile;
  let reads = 0;
  fs.readFile = async function (file, ...rest) {
    if (String(file).endsWith("Only.tsx")) reads++;
    return original.call(this, file, ...rest);
  };
  try {
    await check({ root, silent: true, noFail: true });
  } finally {
    fs.readFile = original;
  }
  assert.equal(reads, 1);
});
await test("oversized source is incomplete, not a clean pass", async () => {
  const root = await fixture("oversized", { "src/a.ts": " ".repeat(1500001) });
  const r = run("run-checks.mjs", root, ["--json"]);
  assert.equal(r.data.status, "PARTIAL");
  assert.equal(r.code, 1);
  assert.equal(r.data.skippedFiles[0].reason, "size-limit");
  assert.equal(
    run("check-token-usage.mjs", root, ["--json"]).data.status,
    "PARTIAL",
  );
});
await test("root static HTML and numeric object spacing", async () => {
  const root = await fixture("static-root", {
    "index.html": "<main>Home</main>",
    "style.css": "main{padding:13px}",
    "component.tsx": "const style={padding: 12, marginTop: 8, margin: 0};",
  });
  const r = run("inventory-ui.mjs", root, ["--json"]);
  assert.deepEqual(r.data.observed.routes, ["/"]);
  const checks = run("check-spacing-usage.mjs", root, ["--json"]);
  assert.equal(
    checks.data.findings.filter((f) => f.kind === "raw-object-spacing").length,
    2,
  );
});
await test("Next route filenames and optional catch-all semantics", async () => {
  const root = await fixture("route-edge", {
    "app/homepage.tsx": "x",
    "app/page.tsx": "x",
    "app/docs/[[...slug]]/page.tsx": "x",
    "app/@modal/page.tsx": "x",
  });
  const r = run("inventory-ui.mjs", root, ["--json"]);
  assert.deepEqual(r.data.observed.routes, ["/", "/docs/:slug*"]);
  assert.equal(r.data.observed.unresolvedRoutes.length, 1);
});
await test("lockfile changes invalidate saved verification", async () => {
  const root = await fixture("lock-state", {
      "src/a.css": ".a{}",
      "package-lock.json": "{}",
    }),
    state = path.join(temp, "lock-state.json");
  assert.equal(
    run("migration-state.mjs", root, ["--snapshot", "--out", state]).code,
    0,
  );
  await fs.writeFile(
    path.join(root, "package-lock.json"),
    ' {"lockfileVersion":3}',
  );
  const r = run("migration-state.mjs", root, ["--previous", state]);
  assert.equal(r.data.status, "REVALIDATE");
  assert(r.data.changed.includes("package-lock.json"));
});
await test("token migration can reach clean policy state without repeated edits", async () => {
  const root = await fixture("end-to-end", {
    "src/ui/foundation/tokens.css": ":root{--text:#123456;--gap:13px}",
    "src/view.css": ".a{color:#123456;padding:13px}",
  });
  const map = path.join(temp, "e2e-map.json"),
    plan = path.join(temp, "e2e-plan.json");
  assert.equal(run("run-checks.mjs", root, ["--json"]).code, 1);
  await fs.writeFile(
    map,
    JSON.stringify({
      schemaVersion: 1,
      reason: "Preserve exact values using approved semantic tokens",
      files: [
        {
          file: "src/view.css",
          replacements: [
            {
              before: "color:#123456;padding:13px",
              after: "color:var(--text);padding:var(--gap)",
            },
          ],
        },
      ],
    }),
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--prepare", map, "--out", plan]).code,
    0,
  );
  assert.equal(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).code,
    0,
  );
  assert.equal(run("run-checks.mjs", root, ["--json"]).code, 0);
  assert.equal(
    run("transform-ui.mjs", root, ["--plan", plan, "--apply"]).data.status,
    "UNCHANGED",
  );
});

await test("native feature controls fail DS ownership checks", async () => {
  const root = await fixture("ds-ownership", {
    "src/Page.tsx":
      "export const Page=()=> <div><button>Save</button><input/><select><option>A</option></select><textarea/></div>;",
  });
  const r = run("check-native-controls.mjs", root, ["--json"]);
  assert.equal(r.code, 1);
  assert.equal(
    r.data.findings.filter((f) => f.kind === "native-control-outside-ds")
      .length,
    5,
  );
  assert.equal(run("run-checks.mjs", root, ["--json"]).code, 1);
});
await test("semantic DS internals allowed but native popup internals reviewed", async () => {
  const root = await fixture("ds-internals", {
    "src/ui/Button.tsx": "export const Button=()=> <button/>;",
    "src/ui/Input.tsx": 'export const Input=()=> <input type="text"/>;',
    "src/Page.tsx": "export const Page=()=> <Button/>;",
  });
  assert.equal(run("check-native-controls.mjs", root, ["--json"]).code, 0);
  await fs.writeFile(
    path.join(root, "src/ui/Select.tsx"),
    'export const Select=()=> <select style={{appearance:"none"}}/>;',
  );
  const r = run("check-native-controls.mjs", root, ["--json"]);
  assert.equal(r.data.findings[0].kind, "native-widget-in-ds");
});
await test("hidden form values and browser-owned widget candidates", async () => {
  const root = await fixture("ds-platform", {
    "src/ui/Fields.tsx":
      'export const Fields=()=> <div><input type="hidden"/><input type="date"/><input type="color"/><input list="choices"/><datalist id="choices"/></div>;',
    "src/State.tsx": 'export const State=()=> <input type={"hidden"}/>;',
  });
  const r = run("check-native-controls.mjs", root, ["--json"]);
  assert.equal(r.data.findings.length, 4);
  assert(r.data.findings.every((f) => f.kind === "native-widget-in-ds"));
});
await test("browser dialogs, title tooltips and DOM-created select found", async () => {
  const root = await fixture("ds-fallback", {
    "src/ui/Example.tsx":
      'window.alert("x"); confirm("x"); prompt("x"); const node=document.createElement("select"); export const Example=()=> <button title="Help"/>;',
  });
  const r = run("check-native-controls.mjs", root, ["--json"]);
  assert.equal(
    r.data.findings.filter((f) => f.kind === "browser-dialog").length,
    3,
  );
  assert(r.data.findings.some((f) => f.kind === "native-tooltip-review"));
  assert(r.data.findings.some((f) => f.kind === "native-widget-in-ds"));
});
await test("native debt is not hidden in strict completed scope", async () => {
  const root = await fixture("ds-migrated", {
    "ui-system.config.json": { migratedPaths: ["src/new"] },
    "src/new/Page.tsx": "export const Page=()=> <select/>;",
    "src/old/Page.tsx": "export const Page=()=> <button/>;",
  });
  const r = run("run-checks.mjs", root, ["--migrated", "--json"]);
  assert.equal(r.code, 1);
  assert(r.data.findings.every((f) => f.file === "src/new/Page.tsx"));
});

console.log(
  JSON.stringify(
    {
      status: results.every((r) => r.status === "PASS") ? "PASS" : "FAIL",
      tempRoot: temp,
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
// Keep isolated fixtures for inspection; no recursive deletion of computed paths.
