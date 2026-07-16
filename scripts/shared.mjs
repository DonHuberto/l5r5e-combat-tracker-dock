import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");

export function walk(directory, predicate = () => true) {
    const files = [];
    for (const entry of readdirSync(directory)) {
        const path = resolve(directory, entry);
        if (statSync(path).isDirectory()) files.push(...walk(path, predicate));
        else if (predicate(path)) files.push(path);
    }
    return files;
}

export function flatten(object, prefix = "", output = {}) {
    for (const [key, value] of Object.entries(object ?? {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, output);
        else output[path] = value;
    }
    return output;
}
