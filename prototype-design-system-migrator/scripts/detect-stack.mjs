#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  parseArgs,
  pathExists,
  printResult,
  readJson,
  walkFiles,
  normalizeRelative,
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const packagePath = path.join(root, "package.json");
  const packageJson = await readJson(packagePath, {});
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {}),
  };

  const has = (name) =>
    Object.prototype.hasOwnProperty.call(dependencies, name);
  const evidence = [];
  const addEvidence = (kind, value, source) =>
    evidence.push({ kind, value, source });

  let framework = "unknown";
  let tier = 3;

  if (has("next")) {
    framework = "nextjs";
    tier = 1;
    addEvidence("framework", "nextjs", "package.json: next");
  } else if (has("react") && !has("astro")) {
    framework = has("vite") ? "react-vite" : "react";
    tier = 1;
    addEvidence(
      "framework",
      framework,
      `package.json: react${has("vite") ? " + vite" : ""}`,
    );
  } else if (has("nuxt")) {
    framework = "nuxt";
    tier = 2;
    addEvidence("framework", "nuxt", "package.json: nuxt");
  } else if (has("vue")) {
    framework = "vue";
    tier = 2;
    addEvidence("framework", "vue", "package.json: vue");
  } else if (has("@sveltejs/kit")) {
    framework = "sveltekit";
    tier = 2;
    addEvidence("framework", "sveltekit", "package.json: @sveltejs/kit");
  } else if (has("svelte")) {
    framework = "svelte";
    tier = 2;
    addEvidence("framework", "svelte", "package.json: svelte");
  } else if (has("@angular/core")) {
    framework = "angular";
    tier = 2;
  } else if (has("astro")) {
    framework = "astro";
    tier = 2;
  } else {
    const htmlFiles = await walkFiles(root, {
      extensions: new Set([".html", ".htm"]),
      ignore: config.ignore,
      maxBytes: 500_000,
    });
    if (htmlFiles.length) {
      framework = "static-html";
      tier = 1;
      addEvidence(
        "framework",
        "static-html",
        normalizeRelative(root, htmlFiles[0]),
      );
    }
  }

  const packageManagers = [];
  for (const [file, manager] of [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ]) {
    if (await pathExists(path.join(root, file))) {
      packageManagers.push(manager);
      addEvidence("package-manager", manager, file);
    }
  }
  if (!packageManagers.length && Object.keys(packageJson).length)
    packageManagers.push("npm-or-unknown");

  const styling = [];
  const stylePackages = [
    ["tailwindcss", "tailwind"],
    ["styled-components", "styled-components"],
    ["@emotion/react", "emotion"],
    ["@emotion/styled", "emotion"],
    ["sass", "sass"],
    ["less", "less"],
  ];
  for (const [pkg, label] of stylePackages) {
    if (has(pkg) && !styling.includes(label)) {
      styling.push(label);
      addEvidence("styling", label, `package.json: ${pkg}`);
    }
  }
  const sourceFiles = await walkFiles(root, {
    extensions: new Set([".css", ".scss", ".sass", ".less"]),
    ignore: config.ignore,
    maxBytes: 500_000,
  });
  if (
    sourceFiles.some((file) => /\.module\.(css|scss|sass|less)$/.test(file)) &&
    !styling.includes("css-modules")
  ) {
    styling.push("css-modules");
    addEvidence(
      "styling",
      "css-modules",
      normalizeRelative(
        root,
        sourceFiles.find((file) => /\.module\./.test(file)),
      ),
    );
  }
  if (
    sourceFiles.some(
      (file) => file.endsWith(".css") && !file.includes(".module."),
    ) &&
    !styling.includes("plain-css")
  ) {
    styling.push("plain-css");
    addEvidence(
      "styling",
      "plain-css",
      normalizeRelative(root, sourceFiles[0]),
    );
  }

  const systems = [];
  const systemPackages = [
    ["antd", "ant-design", "full"],
    ["@mui/material", "mui", "full"],
    ["@carbon/react", "carbon", "full"],
    ["carbon-components-react", "carbon", "full"],
    ["@chakra-ui/react", "chakra-ui", "full"],
    ["react-bootstrap", "react-bootstrap", "full"],
    ["semantic-ui-react", "semantic-ui-react", "full"],
    ["element-plus", "element-plus", "full"],
    ["vuetify", "vuetify", "full"],
    ["primevue", "primevue", "full"],
    ["@angular/material", "angular-material", "full"],
    ["@radix-ui/react-dialog", "radix-primitives", "primitive"],
    ["@tabler/icons-react", "tabler-icons", "icons"],
    ["@tabler/icons-vue", "tabler-icons", "icons"],
  ];
  for (const [pkg, label, type] of systemPackages) {
    if (has(pkg) && !systems.some((item) => item.name === label)) {
      systems.push({ name: label, type, package: pkg });
      addEvidence(
        type === "icons" ? "icons" : "component-system",
        label,
        `package.json: ${pkg}`,
      );
    }
  }
  if (await pathExists(path.join(root, "components.json"))) {
    systems.push({ name: "shadcn-style", type: "source-owned", package: null });
    addEvidence("component-system", "shadcn-style", "components.json");
  }

  const fullSystems = systems.filter((item) => item.type === "full");
  let recommendation;
  if (fullSystems.length === 1) {
    recommendation = {
      action: "retain-existing-system",
      system: fullSystems[0].name,
      confidence: "low",
      reason:
        "One system is declared; retain provisionally, then verify actual imports and runtime usage.",
    };
  } else if (fullSystems.length > 1) {
    recommendation = {
      action: "resolve-mixed-systems",
      system: null,
      confidence: "high",
      reason:
        "Multiple full component systems are declared; usage evidence is required before choosing an incumbent.",
    };
  } else if (systems.some((item) => item.name === "shadcn-style")) {
    recommendation = {
      action: "retain-local-source-owned-system",
      system: "shadcn-style",
      confidence: "medium",
      reason:
        "A shadcn-style components.json file exists and no competing full system was detected.",
    };
  } else {
    recommendation = {
      action: "local-layer-no-new-library",
      system: null,
      confidence: framework === "unknown" ? "low" : "medium",
      reason:
        "No coherent full component system was detected. Audit usage before proposing a new dependency.",
    };
  }

  const result = {
    title: "Prototype stack detection",
    heuristic: true,
    root,
    stack: {
      framework,
      supportTier: tier,
      packageManagers: [...new Set(packageManagers)],
      styling: [...new Set(styling)],
      componentSystems: systems,
    },
    recommendation,
    evidence,
    limitations: [
      "Root package metadata does not prove which dependencies are used at runtime.",
      "Monorepo package-level systems require a separate package scan.",
      "A migration decision still requires source and runtime inspection.",
    ],
    summary: {
      framework,
      supportTier: tier,
      componentSystems: systems.map((item) => item.name),
      recommendation: recommendation.action,
    },
  };

  if (!args.silent) printResult(result, { json: Boolean(args.json) });
  if (args.out) {
    await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
    await fs.writeFile(
      path.resolve(args.out),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  }

  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
