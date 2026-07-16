import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { flatten, root, walk } from "./shared.mjs";

const en = flatten(JSON.parse(readFileSync(resolve(root, "languages/en.json"), "utf8")));
const pl = flatten(JSON.parse(readFileSync(resolve(root, "languages/pl.json"), "utf8")));
const errors = [];
for (const key of Object.keys(en)) if (!(key in pl)) errors.push(`missing Polish key: ${key}`);
for (const key of Object.keys(pl)) if (!(key in en)) errors.push(`missing English key: ${key}`);
const referenced = new Set();
for (const file of walk(resolve(root, "src"), (path) => /\.(?:js|hbs)$/.test(path))) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/["'](L5RCTD\.[A-Za-z0-9.]+)["']/g)) referenced.add(match[1]);
}
for (const key of referenced) if (!(key in en)) errors.push(`untranslated UI key: ${key}`);
if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}
console.log(`Localization OK: ${Object.keys(en).length} keys, English/Polish parity`);
