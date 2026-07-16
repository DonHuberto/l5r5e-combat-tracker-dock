import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./shared.mjs";

const manifest = JSON.parse(readFileSync(resolve(root, "module.json"), "utf8"));
const dist = resolve(root, "dist");
const target = resolve(dist, manifest.id);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const entry of ["module.json", "src", "data", "languages", "docs", "README.md", "CHANGELOG.md", "LICENSE.md"]) {
    cpSync(resolve(root, entry), resolve(target, entry), { recursive: true });
}
writeFileSync(resolve(dist, "build.json"), `${JSON.stringify({ id: manifest.id, version: manifest.version }, null, 4)}\n`);
console.log(`Built ${manifest.id} ${manifest.version} in ${target}`);
