import { clamp, deepClone, finiteNumber, isSafeColor, localizedLabel, randomId } from "./utils.js";

export const PROFILE_KEYS = Object.freeze(["fatigue", "strife", "armyStrength", "armyDiscipline"]);

export function validateProfile(states, { profileKey = "profile" } = {}) {
    if (!Array.isArray(states)) return { valid: false, errors: [`${profileKey}:notArray`] };
    const active = states.filter((state) => state?.enabled).sort((a, b) => finiteNumber(a.order) - finiteNumber(b.order));
    const errors = [];
    if (active.length > 4) errors.push(`${profileKey}:tooManyActive`);
    let previous = -1;
    for (const state of active) {
        const bound = Number(state.upperBoundPercent);
        if (!Number.isFinite(bound) || bound < 0 || bound > 100) errors.push(`${profileKey}:invalidBound`);
        if (bound <= previous) errors.push(`${profileKey}:boundsNotIncreasing`);
        if (!localizedLabel(state.label, "en") && !localizedLabel(state.label, "pl")) errors.push(`${profileKey}:missingLabel`);
        if (!isSafeColor(state.color)) errors.push(`${profileKey}:invalidColor`);
        previous = bound;
    }
    if (active.length && previous !== 100) errors.push(`${profileKey}:mustEndAt100`);
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function validateProfiles(profiles) {
    const errors = [];
    for (const key of PROFILE_KEYS) errors.push(...validateProfile(profiles?.[key] ?? [], { profileKey: key }).errors);
    return { valid: errors.length === 0, errors };
}

export function normalizeProfiles(profiles) {
    const result = { schemaVersion: 1 };
    for (const key of PROFILE_KEYS) {
        result[key] = (profiles?.[key] ?? []).slice(0, 8).map((state, index) => ({
            id: String(state.id ?? randomId(key)),
            enabled: Boolean(state.enabled),
            upperBoundPercent: clamp(finiteNumber(state.upperBoundPercent), 0, 100),
            order: index,
            label: {
                en: localizedLabel(state.label, "en"),
                pl: localizedLabel(state.label, "pl"),
            },
            color: isSafeColor(state.color) ? state.color : "#ffffff",
        }));
    }
    return result;
}

export function classifyResource({ value, max, states, locale = "en", terminal = null } = {}) {
    if (terminal) return { key: terminal.key, label: terminal.label, color: terminal.color ?? "#d64545", terminal: true };
    const numericValue = Number(value);
    const numericMax = Number(max);
    if (!Number.isFinite(numericValue) || !Number.isFinite(numericMax) || numericMax <= 0) return null;
    const validation = validateProfile(states);
    if (!validation.valid) return null;
    const active = states.filter((state) => state.enabled).sort((a, b) => finiteNumber(a.order) - finiteNumber(b.order));
    if (!active.length) return null;
    const percentage = clamp((numericValue / numericMax) * 100, 0, 100);
    const selected = active.find((state) => percentage <= Number(state.upperBoundPercent)) ?? active.at(-1);
    return {
        key: String(selected.id),
        label: localizedLabel(selected.label, locale),
        color: selected.color,
        terminal: false,
    };
}

export async function loadDefaultProfiles(fetcher = globalThis.fetch) {
    const response = await fetcher("modules/l5r5e-combat-tracker-dock/data/default-state-profiles.json");
    if (!response.ok) throw new Error(`Unable to load default profiles: ${response.status}`);
    return normalizeProfiles(await response.json());
}

export function cloneProfiles(profiles) {
    return deepClone(normalizeProfiles(profiles));
}
