#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imports } from "./source-analysis.mjs";
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
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));
  const findings = [];
  const usage = new Map();
  const systems = [
    { name: "element-plus", regex: /^element-plus(?:\/|$)/ },
    { name: "vuetify", regex: /^vuetify(?:\/|$)/ },
    { name: "primevue", regex: /^primevue(?:\/|$)/ },
    { name: "angular-material", regex: /^@angular\/material(?:\/|$)/ },
    { name: "ant-design", regex: /^(?:antd)(?:\/|$)/ },
    { name: "mui", regex: /^@mui\// },
    { name: "carbon", regex: /^(?:@carbon\/|carbon-components-react$)/ },
    { name: "chakra-ui", regex: /^@chakra-ui\// },
    { name: "react-bootstrap", regex: /^react-bootstrap(?:\/|$)/ },
    { name: "semantic-ui-react", regex: /^semantic-ui-react(?:\/|$)/ },
  ];

  for (const { relPath, text } of files) {
    for (const item of imports(text)) {
      const source = item.source;
      const system = systems.find((candidate) => candidate.regex.test(source));
      if (!system) continue;
      const record = {
        system: system.name,
        source,
        file: relPath,
        line: lineNumberAt(text, item.index),
        excerpt: lineTextAt(text, item.index),
        insideUiBoundary: isWithin(relPath, config.uiBoundaryPaths),
      };
      if (!usage.has(system.name)) usage.set(system.name, []);
      usage.get(system.name).push(record);
    }
  }

  const usedSystems = [...usage.keys()];
  const featureSystems = usedSystems.filter((name) =>
    usage.get(name).some((item) => !item.insideUiBoundary),
  );

  if (featureSystems.length > 1) {
    for (const name of featureSystems) {
      for (const record of usage
        .get(name)
        .filter((item) => !item.insideUiBoundary)) {
        findings.push({ kind: "mixed-full-ui-systems", ...record });
      }
    }
  }

  if (config.selectedComponentSystem) {
    for (const name of featureSystems) {
      if (name === config.selectedComponentSystem) continue;
      for (const record of usage
        .get(name)
        .filter((item) => !item.insideUiBoundary)) {
        findings.push({
          kind: "non-selected-ui-system",
          selected: config.selectedComponentSystem,
          ...record,
        });
      }
    }
  }

  if (args.enforceBoundary) {
    for (const name of featureSystems) {
      for (const record of usage
        .get(name)
        .filter((item) => !item.insideUiBoundary)) {
        findings.push({
          kind: "direct-ui-system-import-outside-boundary",
          ...record,
        });
      }
    }
  }

  const uniqueFindings = [
    ...new Map(
      findings.map((item) => [
        `${item.kind}:${item.file}:${item.line}:${item.system}`,
        item,
      ]),
    ).values(),
  ];

  return await finishPolicyCheck(
    {
      title: "Full UI-system mixing check",
      heuristic: true,
      root,
      skippedFiles: files.diagnostics || [],
      summary: {
        detectedSystems: usedSystems,
        featureSystems,
        selectedSystem: config.selectedComponentSystem,
        violations: uniqueFindings.length,
      },
      findings: uniqueFindings,
      limitations: [
        "Package aliases, re-exports, and generated imports can hide system usage.",
        "Radix primitives and local source-owned components are not treated as competing full systems.",
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
