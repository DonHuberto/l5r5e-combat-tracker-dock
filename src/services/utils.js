export function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value)));
}

export function finiteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function deepClone(value) {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function randomId(prefix = "id") {
    const generated = globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return `${prefix}-${generated}`;
}

export function getProperty(object, path, fallback = undefined) {
    if (!object || !path) return fallback;
    const value = String(path).split(".").reduce((current, key) => current?.[key], object);
    return value === undefined ? fallback : value;
}

export function compareVersions(left, right) {
    const a = String(left ?? "0").split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
    const b = String(right ?? "0").split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0);
    }
    return 0;
}

export function isSafeColor(value) {
    return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value ?? ""));
}

export function localizedLabel(label, locale = "en") {
    if (typeof label === "string") return label.trim();
    if (!label || typeof label !== "object") return "";
    return String(label[locale] ?? label.en ?? label.pl ?? "").trim();
}

export function debounce(callback, delay = 50) {
    let timer = null;
    const debounced = (...args) => {
        globalThis.clearTimeout(timer);
        timer = globalThis.setTimeout(() => callback(...args), delay);
    };
    debounced.cancel = () => globalThis.clearTimeout(timer);
    return debounced;
}

export function toArray(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (Array.isArray(collection.contents)) return collection.contents;
    return [...collection];
}
