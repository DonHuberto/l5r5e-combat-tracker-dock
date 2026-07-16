import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root, walk } from "./shared.mjs";

const extensions = new Set([".js", ".mjs", ".json", ".md", ".hbs", ".css"]);
const files = walk(root, (path) => !path.includes(`${resolve(root, "dist")}`) && extensions.has(path.slice(path.lastIndexOf("."))));
const errors = [];
for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (content && !content.endsWith("\n")) errors.push(`${file}: missing final newline`);
    if (/\r?\n\r?\n$/.test(content)) errors.push(`${file}: excessive blank line at end of file`);
    content.split(/\r?\n/).forEach((line, index) => {
        if (/\s+$/.test(line)) errors.push(`${file}:${index + 1}: trailing whitespace`);
    });
}
if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}
console.log(`Format check OK: ${files.length} files`);
