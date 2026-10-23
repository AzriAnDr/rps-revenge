export const BUILD = "0.2.4";
const components = new Set<string>();
let hooks = 0, matches = 0;
export function observeComponent(element: any) {
    const type = element?.type;
    const name = type?.displayName || type?.name || type?.render?.name;
    if (typeof name === "string" && /profile|quest|shop|setting|actionbar|floating/i.test(name) && components.size < 80) components.add(name.slice(0, 100));
}
export function setHookCount(value: number) { hooks = value; }
export function recordMatch() { matches++; }
// Only component identifiers and counters. No profile contents, pairing codes or account IDs.
export function diagnosticReport() { return JSON.stringify({ build: BUILD, hooks, matches, components: [...components] }, null, 2); }
