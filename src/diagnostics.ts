export const BUILD = "0.2.10";
let presence = "not-applied";
export function recordPresence(value: "not-applied" | "dispatched" | "local-confirmed" | "local-missing" | "verification-unavailable" | "cleared") { presence = value; }
const components = new Set<string>();
let hooks = 0, matches = 0;
// React memo/forwardRef wrappers can hide the icon's name from JSX consumers.
export function componentNames(type: any): string[] {
    const names: string[] = [];
    for (let depth = 0; type && depth < 5; depth++) {
        for (const name of [type.displayName, type.name]) {
            if (typeof name === "string" && name) names.push(name);
        }
        type = type.type ?? type.render;
    }
    return names;
}
export function observeComponent(element: any) {
    for (const name of componentNames(element?.type)) {
        if (/profile|quest|shop|setting|actionbar|floating/i.test(name) && components.size < 80) components.add(name.slice(0, 100));
    }
}
export function setHookCount(value: number) { hooks = value; }
export function recordMatch() { matches++; }
// Only component identifiers and counters. No profile contents, pairing codes or account IDs.
export function diagnosticReport() { return JSON.stringify({ build: BUILD, hooks, matches, presence, components: [...components] }, null, 2); }
