import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./shared.mjs";

const manifest = JSON.parse(readFileSync(resolve(root, "module.json"), "utf8"));
const errors = [];
if (manifest.id !== "l5r5e-combat-tracker-dock") errors.push("unexpected module id");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push("version must be semantic");
if (!manifest.download.includes(`/v${manifest.version}/`)) errors.push("download URL version differs from manifest version");
if (!manifest.manifest.endsWith("/releases/latest/download/module.json")) errors.push("manifest URL must target the latest release asset");
for (const key of ["minimum", "verified", "maximum"]) if (manifest.compatibility?.[key] !== "14") errors.push(`Foundry ${key} must be 14`);
const system = manifest.relationships?.systems?.find((entry) => entry.id === "l5r5e");
if (system?.compatibility?.minimum !== "1.14.103") errors.push("l5r5e minimum must be 1.14.103");
for (const path of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map((entry) => entry.path)]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing manifest path: ${path}`);
}
if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}
console.log(`Manifest OK: ${manifest.id} ${manifest.version}`);
