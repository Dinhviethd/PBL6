const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const root = path.resolve(__dirname, "../src");
function inspect(file, source) {
  const rel = path.relative(root, file).replaceAll("\\", "/"),
    module = rel.match(/^modules\/([^/]+)/)?.[1],
    errors = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(n) {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      const name = n.moduleSpecifier.text;
      const dest = name.startsWith(".")
        ? path
            .relative(root, path.resolve(path.dirname(file), name))
            .replaceAll("\\", "/")
        : name.startsWith("@/")
          ? name.slice(2)
          : name;
      const target = dest.match(/^modules\/([^/]+)\/(.+)$/);
      if (target && target[1] !== module && target[2] !== "public")
        errors.push("cross-module internal import: " + name);
      if (module && /^(platform\/database|configs\/database)/.test(dest))
        errors.push("module imports raw database: " + name);
      if (
        name === "typeorm" &&
        !rel.startsWith("platform/") &&
        !rel.startsWith("migrations/") &&
        !rel.startsWith("configs/") &&
        !rel.includes("/infrastructure/")
      )
        errors.push("TypeORM outside persistence");
      if (rel.startsWith("contracts/") && target)
        errors.push("contract depends on module implementation");
    }
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ["query", "getRepository", "createQueryBuilder"].includes(
        n.expression.name.text,
      ) &&
      !rel.includes("/infrastructure/") &&
      !rel.startsWith("platform/") &&
      !rel.startsWith("migrations/")
    )
      errors.push("database access outside persistence");
    if (
      ts.isCallExpression(n) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(n.expression) && n.expression.text === "require")) &&
      module
    )
      errors.push("dynamic module imports are not allowed in domain modules");
    ts.forEachChild(n, visit);
  }
  visit(ast);
  return errors;
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith(".ts")
          ? [path.join(dir, e.name)]
          : [],
    );
}
if (require.main === module) {
  const failures = walk(root).flatMap((file) =>
    inspect(file, fs.readFileSync(file, "utf8")).map(
      (e) => `${path.relative(root, file)}: ${e}`,
    ),
  );
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else console.log("Module boundary checks passed.");
}
module.exports = { inspect, root };
