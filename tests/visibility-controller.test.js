import assert from "node:assert/strict";
import test from "node:test";
import { SCENE_CONTROL_TOOL_ID, VisibilityController } from "../src/services/visibility-controller.js";

function harness(initial = { visible: true, collapsed: false }) {
    const values = new Map(Object.entries(initial));
    const settings = {
        get: (_module, key) => values.get(key),
        set: async (_module, key, value) => values.set(key, value),
    };
    let current = null;
    let created = 0;
    const docks = [];
    const controller = new VisibilityController({
        settings,
        getDock: () => current,
        setDock: (dock) => { current = dock; },
        createDock: () => {
            created += 1;
            const dock = {
                renders: [],
                closes: [],
                async render(options) { this.renders.push(options); },
                async close(options) {
                    this.closes.push(options);
                    await controller.dockClosed(this, options);
                },
            };
            docks.push(dock);
            return dock;
        },
    });
    return { controller, values, docks, created: () => created, current: () => current };
}

test("ready/reload/scene sync creates at most one dock and uses ApplicationV2 options", async () => {
    const h = harness();
    await h.controller.sync();
    await h.controller.sync();
    assert.equal(h.created(), 1);
    assert.deepEqual(h.docks[0].renders, [{ force: true }, { force: true }]);
});

test("hide, X, restore, collapse and expand remain distinct client states", async () => {
    const h = harness();
    await h.controller.sync();
    await h.controller.setCollapsed(true);
    assert.equal(h.values.get("visible"), true);
    assert.equal(h.values.get("collapsed"), true);
    assert.equal(h.created(), 1);
    await h.controller.setVisible(false);
    assert.equal(h.current(), null);
    assert.deepEqual(h.docks[0].closes[0], { visibilityController: true });
    await h.controller.setVisible(true);
    assert.equal(h.created(), 2);
    await h.controller.dockClosed(h.current(), {});
    assert.equal(h.values.get("visible"), false);
});

test("V14 token Scene Control always exists and mirrors local visibility", async () => {
    const h = harness();
    const controls = { tokens: { tools: {} } };
    h.controller.registerSceneControl(controls);
    const tool = controls.tokens.tools[SCENE_CONTROL_TOOL_ID];
    assert.equal(tool.toggle, true);
    assert.equal(tool.active, true);
    await tool.onChange(null, false);
    assert.equal(h.values.get("visible"), false);
});

test("Scene Control can exist before the dock services are ready", async () => {
    const values = new Map([["visible", true], ["collapsed", false]]);
    const controller = new VisibilityController({
        settings: {
            get: (_module, key) => values.get(key),
            set: async (_module, key, value) => values.set(key, value),
        },
        createDock: () => null,
        getDock: () => null,
        setDock: () => {},
    });
    const controls = { tokens: { tools: {} } };
    controller.registerSceneControl(controls);
    assert.equal(controls.tokens.tools[SCENE_CONTROL_TOOL_ID].active, true);
    assert.equal(await controller.sync(), null);
});

test("visibility is per settings store/client", async () => {
    const first = harness({ visible: true, collapsed: false });
    const second = harness({ visible: false, collapsed: false });
    await first.controller.sync();
    await second.controller.sync();
    assert.equal(first.created(), 1);
    assert.equal(second.created(), 0);
});
