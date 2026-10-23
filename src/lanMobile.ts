import { open, seal, parsePairing } from "./shared/lanCrypto";
import { synchronizeProfiles } from "./shared/lanSyncClient";
import type { StudioController } from "./shared/controllerCore";
import type { PresenceProfile } from "./shared/model";
export interface MobileLink { enabled: boolean; code: string; owner: string; base: PresenceProfile[]; }
export function createMobileSync(api: any, studio: StudioController, fetcher = globalThis.fetch) {
    let timer: ReturnType<typeof setInterval> | undefined, busy = false, generation = 0;
    let status = "Синхронизация по Wi-Fi не подключена.";
    const listeners = new Set<() => void>();
    const setStatus = (text: string) => { status = text; listeners.forEach(f => f()); };
    const owner = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? "";
    const stored = () => api.plugin.storage.lanLink as MobileLink | undefined;
    async function request(config: MobileLink, value: object) {
        const pair = parsePairing(config.code), endpoint = `http://${pair.address}:38474`;
        const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 6000);
        let stage = "подключение к ПК";
        try {
            // React Native's fetch polyfill rewrites cache:no-store into ?_=timestamp.
            // Use HTTP headers instead; the desktop also sends Cache-Control: no-store.
            const challengeResponse = await fetcher(endpoint + "/challenge", { signal: abort.signal, redirect: "error", headers: { "Cache-Control": "no-cache" } });
            if (!challengeResponse.ok) throw new Error(`ПК ответил HTTP ${challengeResponse.status}. Проверь Discord и сеть.`);
            stage = "проверка кода подключения";
            const challenge = await challengeResponse.json();
            if (challenge.prefix !== pair.prefix || typeof challenge.nonce !== "string" || !/^[0-9a-f]{48}$/.test(challenge.nonce)) throw new Error("Код подключения изменился. Скопируй новый код с ПК.");
            stage = "шифрование запроса";
            const body = JSON.stringify(seal({ ...value, ownerId: config.owner }, pair.key, challenge.nonce));
            stage = "отправка профилей на ПК";
            const response = await fetcher(endpoint + "/sync", { method: "POST", signal: abort.signal, redirect: "error", headers: { "Content-Type": "application/json" }, body });
            if (!response.ok) throw new Error(`ПК отклонил запрос (HTTP ${response.status}). Проверь код и совпадение аккаунта Discord.`);
            stage = "расшифровка ответа ПК";
            const raw = await response.text();
            if (raw.length > 2097152) throw new Error("Слишком большой ответ ПК.");
            const result = open(JSON.parse(raw), pair.key);
            if (result.requestNonce !== challenge.nonce) throw new Error("Ответ относится к другому запросу.");
            return result;
        } catch (e) { throw new Error(`${stage}: ${e instanceof Error ? e.message : String(e)}`); }
        finally { clearTimeout(timeout); }
    }
    async function tick() {
        const config = stored(); if (busy || !config?.enabled) return;
        if (!owner() || owner() !== config.owner) { generation++; api.plugin.storage.lanLink = { ...config, enabled: false }; setStatus("Аккаунт изменился. Переподключи синхронизацию вручную."); return; }
        busy = true; const operation = generation;
        const valid = () => operation === generation && stored()?.enabled === true && stored()?.code === config.code && owner() === config.owner;
        try {
            const base = await synchronizeProfiles({ read: async () => (await request(config, { op: "read" })).document, write: (expectedRevision, profiles) => request(config, { op: "write", expectedRevision, profiles }) }, config.base || [], () => studio.getSnapshot().profiles, (next, before) => studio.replaceSyncedProfiles(next, before), valid);
            if (base && valid()) { api.plugin.storage.lanLink = { ...config, base }; setStatus("Синхронизировано: " + new Date().toLocaleTimeString() + ". Активная карточка не менялась."); }
        } catch (e) { if (valid()) setStatus("Нет синхронизации. " + (e instanceof Error ? e.message : "Проверь Wi-Fi и Discord на ПК.") + " Локальные правки сохранены; повтор через 10 секунд."); }
        finally { busy = false; }
    }
    return {
        status: () => status,
        enabled: () => stored()?.enabled === true,
        subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
        async connect(code: string) {
            parsePairing(code); const id = owner(); if (!id) throw new Error("Сначала войди в Discord.");
            const previous = stored(); generation++;
            api.plugin.storage.lanLink = { enabled: true, code: code.trim(), owner: id, base: previous?.code === code.trim() && previous.owner === id ? previous.base : [] };
            this.start(); await tick();
        },
        disconnect() { generation++; const config = stored(); if (config) api.plugin.storage.lanLink = { ...config, enabled: false }; setStatus("Синхронизация выключена. Профили сохранены."); },
        start() { if (timer) return; timer = setInterval(() => { void tick(); }, 10000); void tick(); },
        stop() { generation++; if (timer) clearInterval(timer); timer = undefined; },
        syncNow: tick
    };
}
