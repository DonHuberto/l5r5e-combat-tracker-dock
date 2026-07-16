import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { root } from "./shared.mjs";

for (const script of ["check-syntax.mjs", "check-format.mjs", "validate-manifest.mjs", "validate-i18n.mjs"]) {
    const result = spawnSync(process.execPath, [resolve(root, "scripts", script)], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
}
let result = spawnSync(process.execPath, ["--test"], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
result = spawnSync(process.execPath, [resolve(root, "scripts/build.mjs")], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
