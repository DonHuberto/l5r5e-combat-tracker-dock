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
if (system?.compatibility?.minimum !== "1.14.105") errors.push("l5r5e minimum must be 1.14.105");
if (manifest.download.split("/").at(-1) !== "module.zip") errors.push("release archive must be module.zip");
if (!manifest.changelog?.endsWith("/CHANGELOG.md")) errors.push("public changelog URL is required");
for (const path of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map((entry) => entry.path)]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing manifest path: ${path}`);
}
const template = readFileSync(resolve(root, "src/templates/combat-dock.hbs"), "utf8");
if (template.includes("background-image")) errors.push("portrait must not use inline background-image");
if (!template.includes('data-action="collapse"') || !template.includes('data-action="restore"')) errors.push("collapse/restore controls are required");
if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}
console.log(`Manifest OK: ${manifest.id} ${manifest.version}`);
