export function ownerLevel() {
    return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

export function observerLevel() {
    return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
}

export function canSeeExact(actor, user = globalThis.game?.user) {
    if (user?.isGM) return true;
    if (!actor || !user) return false;
    return Boolean(actor.testUserPermission?.(user, ownerLevel()));
}

export function canObserveActor(actor, user = globalThis.game?.user) {
    if (user?.isGM) return true;
    return Boolean(actor?.testUserPermission?.(user, observerLevel()));
}

export function canSeeCombatant(combatant, user = globalThis.game?.user) {
    if (!combatant || !user) return false;
    if (user.isGM) return true;
    if (combatant.visible === false || combatant.hidden) return false;
    return true;
}

export function canManageEffect(actor, user = globalThis.game?.user) {
    return Boolean(user?.isGM || actor?.testUserPermission?.(user, ownerLevel()));
}

export function visibleCombatantName(combatant, user, mode = "foundry") {
    if (!canSeeCombatant(combatant, user)) return "";
    if (user?.isGM || canSeeExact(combatant.actor, user)) return String(combatant.name ?? combatant.actor?.name ?? "");
    if (mode === "always" && canObserveActor(combatant.actor, user)) return String(combatant.name ?? combatant.actor?.name ?? "");
    if (mode === "owner") return "";
    const token = combatant.token;
    const displayName = token?.displayName;
    const modes = globalThis.CONST?.TOKEN_DISPLAY_MODES ?? {};
    if (!token || [modes.HOVER, modes.ALWAYS].includes(displayName)) return String(combatant.name ?? combatant.actor?.name ?? "");
    return "";
}
