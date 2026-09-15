#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { colorPattern, imports, fileRoute } from "./source-analysis.mjs";
import {
  addMatches,
  loadConfig,
  parseArgs,
  printResult,
  readTextFiles,
  writeJson,
} from "./lib.mjs";

export async function run(args = parseArgs()) {
  const root = path.resolve(args.root || ".");
  const config = args.config || (await loadConfig(root));
  const files = args.files || (await readTextFiles(root, { config }));

  const findings = [];
  const frequencies = {
    colors: new Map(),
    dimensions: new Map(),
    spacing: new Map(),
    radii: new Map(),
    shadows: new Map(),
    zIndex: new Map(),
    imports: new Map(),
  };
  const routes = new Set();
  const apiRoutes = new Set();
  const unresolvedRoutes = [];
  const componentCandidates = [];

  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const mapToSorted = (map, limit = 200) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));

  const colorRegex = colorPattern;
  const dimensionRegex =
    /(?<![\w.-])-?(?:\d*\.\d+|\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|%)\b/g;
  const spacingDeclarationRegex =
    /\b(?:margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap|inset(?:-(?:inline|block)(?:-(?:start|end))?)?|top|right|bottom|left)\s*:\s*([^;}{]+)/gi;
  const radiusRegex = /\bborder-radius\s*:\s*([^;}{]+)/gi;
  const shadowRegex = /\bbox-shadow\s*:\s*([^;}{]+)/gi;
  const zIndexRegex = /\bz-index\s*:\s*([^;}{]+)/gi;

  for (const { relPath, text } of files) {
    for (const match of text.matchAll(colorRegex))
      increment(frequencies.colors, match[0]);
    for (const match of text.matchAll(dimensionRegex))
      increment(frequencies.dimensions, match[0]);
    for (const match of text.matchAll(spacingDeclarationRegex))
      increment(frequencies.spacing, match[1].trim());
    for (const match of text.matchAll(radiusRegex))
      increment(frequencies.radii, match[1].trim());
    for (const match of text.matchAll(shadowRegex))
      increment(frequencies.shadows, match[1].trim());
    for (const match of text.matchAll(zIndexRegex))
      increment(frequencies.zIndex, match[1].trim());
    for (const item of imports(text))
      increment(frequencies.imports, item.source);

    if (/\.(?:jsx|tsx|vue|svelte)$/.test(relPath)) {
      const name = path.basename(relPath).replace(/\.[^.]+$/, "");
      if (/^[A-Z][A-Za-z0-9]+$/.test(name)) componentCandidates.push(relPath);
    }

    const discovered = fileRoute(relPath);
    if (discovered?.kind === "ui") routes.add(discovered.path);
    else if (discovered?.kind === "api") apiRoutes.add(discovered.path);
    else if (discovered) unresolvedRoutes.push(discovered);

    for (const match of text.matchAll(/\bpath\s*=\s*["']([^"']+)["']/g))
      routes.add(match[1]);
    for (const match of text.matchAll(
      /\b(?:createRoute|route)\s*\(\s*["']([^"']+)["']/g,
    ))
      routes.add(match[1]);

    addMatches({
      findings,
      regex: /-webkit-text-stroke\s*:/gi,
      text,
      file: relPath,
      kind: "font-weight-synthesis",
    });
    addMatches({
      findings,
      regex:
        /(?:aria-label\s*=\s*["']\s*["']|<button\b(?![^>]*aria-label)[^>]*>\s*<(?:svg|[A-Z][A-Za-z]*Icon)\b)/g,
      text,
      file: relPath,
      kind: "accessibility-review",
    });
    addMatches({
      findings,
      regex:
        /class(?:Name)?\s*=\s*["'][^"']*(?:m|p|gap|inset|top|right|bottom|left)[trblxy]?\-\[[^\]]+\][^"']*["']/g,
      text,
      file: relPath,
      kind: "tailwind-arbitrary-spacing",
    });
  }

  const fullUiImports = mapToSorted(frequencies.imports, 500).filter(
    ({ value }) =>
      /^(?:antd|@mui\/|@carbon\/|carbon-components-react|@chakra-ui\/|react-bootstrap|semantic-ui-react)/.test(
        value,
      ),
  );
  const iconImports = mapToSorted(frequencies.imports, 500).filter(
    ({ value }) =>
      /(?:tabler|lucide|heroicons|fontawesome|react-icons|material-icons)/i.test(
        value,
      ),
  );

  const result = {
    title: "UI source inventory",
    heuristic: true,
    root,
    observed: {
      scannedFiles: files.length,
      routes: [...routes].sort(),
      apiRoutes: [...apiRoutes].sort(),
      unresolvedRoutes,
      skippedFiles: files.diagnostics || [],
      componentCandidates: componentCandidates.sort(),
      values: {
        colors: mapToSorted(frequencies.colors),
        dimensions: mapToSorted(frequencies.dimensions),
        spacing: mapToSorted(frequencies.spacing),
        radii: mapToSorted(frequencies.radii),
        shadows: mapToSorted(frequencies.shadows),
        zIndex: mapToSorted(frequencies.zIndex),
      },
      uiImports: fullUiImports,
      iconImports,
    },
    reviewFindings: findings,
    inferred: [],
    proposed: [],
    unresolved: [
      "Runtime-only styles and conditional states require browser inspection.",
      "Regex component discovery cannot prove semantic duplicates.",
      "Routes generated by custom configuration may be missing.",
      "Accessibility findings require interaction testing.",
    ],
    summary: {
      scannedFiles: files.length,
      routes: routes.size,
      componentCandidates: componentCandidates.length,
      distinctColors: frequencies.colors.size,
      distinctSpacingValues: frequencies.spacing.size,
      fullUiImports: fullUiImports.map((item) => item.value),
      iconImports: iconImports.map((item) => item.value),
      reviewFindings: findings.length,
    },
  };

  if (args.out) await writeJson(path.resolve(args.out), result);
  if (!args.silent)
    printResult(result, { json: Boolean(args.json || args.out) });

  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run();
