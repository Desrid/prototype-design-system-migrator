import path from "node:path";
import fs from "node:fs/promises";
import { stripComments, normalizeRelative, pathExists } from "./lib.mjs";

export const colorPattern =
  /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\([^;{}\n]+\)/gi;
// Literal module references only. Computed specifiers are deliberately unresolved.
export function imports(text) {
  const tokens = [];
  const pattern =
    /\s+|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]/g;
  for (const m of text.matchAll(pattern)) {
    if (/^\s|^\/\/|^\/\*/.test(m[0])) continue;
    tokens.push({ value: m[0], string: Boolean(m[1]), index: m.index });
  }
  const found = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.string || !["import", "export", "require"].includes(t.value))
      continue;
    if (tokens[i - 1]?.value === "." || tokens[i + 1]?.value === ":") continue;
    let spec = null;
    if (tokens[i + 1]?.string && t.value === "import") spec = tokens[i + 1];
    else if (
      tokens[i + 1]?.value === "(" &&
      tokens[i + 2]?.string &&
      tokens[i + 3]?.value === ")" &&
      t.value !== "export"
    )
      spec = tokens[i + 2];
    else if (t.value !== "require" && tokens[i + 1]?.value !== "(") {
      for (let j = i + 1; j < Math.min(tokens.length, i + 100); j++) {
        if ([";", "import", "export"].includes(tokens[j].value)) break;
        if (tokens[j].value === "from" && tokens[j + 1]?.string) {
          spec = tokens[j + 1];
          break;
        }
      }
    }
    if (spec)
      found.push({
        source: spec.value.slice(1, -1),
        index: spec.index + 1,
        end: spec.index + spec.value.length - 1,
        kind: t.value,
      });
  }
  return found;
}
export function fileRoute(rel) {
  let name,
    kind = "ui";
  let m = rel.match(/^(?:src\/)?app\/(?:(.*\/))?(page|route)\.(?:jsx?|tsx?)$/);
  if (m) {
    name = m[1] || "";
    kind = m[2] === "route" ? "api" : "ui";
    if (name.split("/").some((x) => x.startsWith("_"))) return null;
  } else if (
    (m = rel.match(/^(?:src\/)?pages\/(.+)\.(?:jsx?|tsx?|vue|astro)$/))
  ) {
    name = m[1];
    if (/^_(?:app|document|error)$/.test(name)) return null;
    if (/^api(?:\/|$)/.test(name)) kind = "api";
    name = name.replace(/(^|\/)index$/, "");
  } else if (
    (m = rel.match(/^src\/routes\/(.*?)\+(page|server)\.(?:svelte|[jt]s)$/))
  ) {
    name = m[1];
    kind = m[2] === "server" ? "api" : "ui";
  } else if (/\.html?$/.test(rel) && !rel.includes("/"))
    name = rel.replace(/\.html?$/, "").replace(/^index$/, "");
  else return null;
  if (name.split("/").some((x) => x.startsWith("@") || /^\(\./.test(x)))
    return {
      kind: "unresolved",
      file: rel,
      reason: "parallel/intercepting route requires runtime mapping",
    };
  name = name
    .split("/")
    .filter((x) => x && !/^\([^)]*\)$/.test(x))
    .join("/")
    .replace(/\[\[\.\.\.([^\]]+)\]\]/g, ":$1*")
    .replace(/\[\.\.\.([^\]]+)\]/g, ":$1+")
    .replace(/\[\[([^\]]+)\]\]/g, ":$1?")
    .replace(/\[([^\]=]+)(?:=[^\]]+)?\]/g, ":$1");
  return { kind, file: rel, path: `/${name}` };
}
export async function readAliases(root, explicit = {}) {
  const aliases = {},
    unresolved = [];
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const p = path.join(root, name);
    if (!(await pathExists(p))) continue;
    try {
      const text = stripComments(
        (await fs.readFile(p, "utf8")).replace(/^\uFEFF/, ""),
      );
      const json = JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
      if (json.extends)
        unresolved.push(
          `${name}: inherited aliases require inspection (${JSON.stringify(json.extends)})`,
        );
      for (const [key, values] of Object.entries(
        json.compilerOptions?.paths ?? {},
      )) {
        if (!Array.isArray(values) || typeof values[0] !== "string") continue;
        aliases[key] = normalizeRelative(
          root,
          path.resolve(root, json.compilerOptions?.baseUrl ?? ".", values[0]),
        );
        if (values.length > 1)
          unresolved.push(`${name}: alias ${key} has fallback targets`);
      }
    } catch (e) {
      unresolved.push(`${name}: ${e.message}`);
    }
  }
  return { aliases: { ...aliases, ...explicit }, unresolved };
}
export function resolveImport(source, importer, aliases) {
  if (source.startsWith("."))
    return path.posix.normalize(
      path.posix.join(path.posix.dirname(importer), source),
    );
  for (const key of Object.keys(aliases).sort((a, b) => b.length - a.length)) {
    if (key.includes("*")) {
      const [prefix, suffix] = key.split("*");
      if (source.startsWith(prefix) && source.endsWith(suffix)) {
        const middle = source.slice(
          prefix.length,
          suffix ? -suffix.length : undefined,
        );
        return aliases[key].replace("*", middle);
      }
    } else if (source === key || source.startsWith(`${key}/`))
      return aliases[key] + source.slice(key.length);
  }
  return source;
}
