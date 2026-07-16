import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { root, walk } from "./shared.mjs";

const files = ["src", "scripts", "tests"].flatMap((directory) => walk(resolve(root, directory), (path) => path.endsWith(".js") || path.endsWith(".mjs")));
for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout);
        process.exitCode = 1;
    }
}
if (!process.exitCode) console.log(`Syntax OK: ${files.length} files`);
