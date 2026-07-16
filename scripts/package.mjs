import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { root } from "./shared.mjs";

let result = spawnSync(process.execPath, [resolve(root, "scripts/build.mjs")], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const source = resolve(root, "dist/l5r5e-combat-tracker-dock/*");
const output = resolve(root, "dist/module.zip");
rmSync(output, { force: true });
const command = `Compress-Archive -Path '${source}' -DestinationPath '${output}' -CompressionLevel Optimal -Force`;
result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Packaged ${output}`);
