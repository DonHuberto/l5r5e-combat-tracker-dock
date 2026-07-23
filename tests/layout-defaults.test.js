import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { registerSettings, setStateProfileConfigClass } from "../src/settings.js";

test("0.1.2 defaults to a visible, expanded, large top-docked Actor portrait layout", () => {
    const settings = new Map();
    globalThis.game = {
        settings: {
            registerMenu: () => {},
            register: (_module, key, data) => settings.set(key, data),
        },
    };
    setStateProfileConfigClass(class TestProfileConfig {});
    registerSettings();
    assert.equal(settings.get("dockEdge").default, "top");
    assert.equal(settings.get("portraitImage").default, "actor");
    assert.equal(settings.get("portraitSize").default, 128);
    assert.equal(settings.get("portraitAspect").default, "portrait");
    assert.equal(settings.get("hideConflictingUi").default, true);
    assert.equal(settings.get("visible").default, true);
    assert.equal(settings.get("visible").scope, "client");
    assert.equal(settings.get("collapsed").default, false);
});

test("stylesheet uses top-edge positioning and image-first overlay cards", () => {
    const css = readFileSync(fileURLToPath(new URL("../src/styles/combat-dock.css", import.meta.url)), "utf8");
    assert.match(css, /data-edge="top"/);
    assert.match(css, /\.l5rctd-combatant-body\s*\{[^}]*position:\s*absolute/s);
    assert.match(css, /object-position:\s*center top/);
    assert.match(css, /height:\s*calc\(var\(--l5rctd-portrait-size\) \* var\(--l5rctd-portrait-aspect\)\)/);
});
