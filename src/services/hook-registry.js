export class HookRegistry {
    constructor(hooks = globalThis.Hooks) {
        this.hooks = hooks;
        this.entries = [];
    }

    on(name, callback) {
        const id = this.hooks?.on?.(name, callback);
        this.entries.push({ name, id });
        return id;
    }

    once(name, callback) {
        const id = this.hooks?.once?.(name, callback);
        this.entries.push({ name, id });
        return id;
    }

    clear() {
        for (const { name, id } of this.entries) this.hooks?.off?.(name, id);
        this.entries = [];
    }
}
