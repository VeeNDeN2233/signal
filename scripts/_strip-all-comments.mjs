import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function walkDir(dir, exts, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, exts, files);
    else if (exts.some((ext) => p.endsWith(ext))) files.push(p);
  }
  return files;
}

function stripWithTsPrinter(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const tsx = filePath.endsWith(".tsx");
  const isTs = filePath.endsWith(".ts");
  const sf = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    tsx ? ts.ScriptKind.TSX : isTs ? ts.ScriptKind.TS : ts.ScriptKind.JS
  );
  const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
  });
  let out = printer.printFile(sf);
  if (!out.endsWith("\n")) out += "\n";
  fs.writeFileSync(filePath, out);
}

function stripSql(content) {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < content.length) {
    const c = content[i];
    if (!inString && c === "/" && content[i + 1] === "*") {
      i += 2;
      while (i < content.length - 1 && !(content[i] === "*" && content[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'") {
      if (inString && content[i + 1] === "'") {
        out += "''";
        i += 2;
        continue;
      }
      inString = !inString;
      out += "'";
      i++;
      continue;
    }
    out += c;
    i++;
  }
  function stripLine(line) {
    let ins = false;
    for (let j = 0; j < line.length - 1; j++) {
      const ch = line[j];
      if (ch === "'") {
        if (ins && line[j + 1] === "'") {
          j++;
          continue;
        }
        ins = !ins;
        continue;
      }
      if (!ins && ch === "-" && line[j + 1] === "-") {
        return line.slice(0, j).replace(/\s+$/u, "");
      }
    }
    return line;
  }
  return out.split("\n").map(stripLine).join("\n");
}

function stripKotlinLike(content) {
  let out = "";
  let i = 0;
  const len = content.length;
  while (i < len) {
    if (i <= len - 3 && content.slice(i, i + 3) === '"""') {
      const end = content.indexOf('"""', i + 3);
      if (end === -1) {
        out += content.slice(i);
        break;
      }
      out += content.slice(i, end + 3);
      i = end + 3;
      continue;
    }
    const c = content[i];
    if (c === '"') {
      out += c;
      i++;
      while (i < len) {
        const ch = content[i];
        if (ch === "\\") {
          out += ch + (content[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (ch === '"') {
          out += ch;
          i++;
          break;
        }
        out += ch;
        i++;
      }
      continue;
    }
    if (c === "'") {
      out += c;
      i++;
      if (i < len && content[i] === "\\") {
        out += content[i++];
        if (i < len) out += content[i++];
        if (i < len && content[i] === "'") {
          out += content[i++];
        }
        continue;
      }
      if (i < len) out += content[i++];
      if (i < len && content[i] === "'") out += content[i++];
      continue;
    }
    if (c === "/" && content[i + 1] === "/") {
      i += 2;
      while (i < len && content[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && content[i + 1] === "*") {
      i += 2;
      while (i < len - 1 && !(content[i] === "*" && content[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function stripYamlPound(content) {
  return content
    .split("\n")
    .map((line) => {
      const t = line.trimStart();
      if (t.startsWith("#")) return "";
      const idx = line.indexOf("#");
      if (idx === -1) return line;
      if (/^\s*#/.test(line.slice(idx))) return line.slice(0, idx).replace(/\s+$/u, "");
      return line;
    })
    .join("\n");
}

function stripEnvExample(content) {
  return content
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("#");
      if (idx === -1) return line;
      const before = line.slice(0, idx);
      if (/^\s*$/.test(before)) return "";
      return before.replace(/\s+$/u, "");
    })
    .join("\n");
}

function stripXmlComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, "");
}

const tsJsFiles = [
  ...walkDir(path.join(root, "backend", "src"), [".ts"]),
  ...walkDir(path.join(root, "web", "src"), [".ts", ".tsx"]),
  ...walkDir(path.join(root, "web", "e2e"), [".ts"]),
  path.join(root, "web", "vite.config.ts"),
  path.join(root, "web", "playwright.config.ts"),
  ...walkDir(path.join(root, "scripts"), [".js"]),
  ...walkDir(path.join(root, "backend", "scripts"), [".js"]),
].filter((f) => fs.existsSync(f));

for (const f of tsJsFiles) stripWithTsPrinter(f);

const ktFiles = walkDir(path.join(root, "android"), [".kt"]);
const gradleKts = [
  path.join(root, "android", "settings.gradle.kts"),
  path.join(root, "android", "build.gradle.kts"),
  path.join(root, "android", "app", "build.gradle.kts"),
].filter((f) => fs.existsSync(f));

for (const f of [...ktFiles, ...gradleKts]) {
  const code = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, stripKotlinLike(code));
}

for (const f of walkDir(path.join(root, "backend", "migrations"), [".sql"])) {
  const code = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, stripSql(code));
}

const compose = path.join(root, "docker-compose.yml");
fs.writeFileSync(compose, stripYamlPound(fs.readFileSync(compose, "utf8")));

const envEx = path.join(root, "env.example");
if (fs.existsSync(envEx)) {
  fs.writeFileSync(envEx, stripEnvExample(fs.readFileSync(envEx, "utf8")));
}

const xmlRoots = [
  path.join(root, "android", "app", "src", "main"),
];
for (const dir of xmlRoots) {
  for (const f of walkDir(dir, [".xml"])) {
    if (f.includes(`${path.sep}.idea${path.sep}`)) continue;
    const code = fs.readFileSync(f, "utf8");
    fs.writeFileSync(f, stripXmlComments(code));
  }
}
