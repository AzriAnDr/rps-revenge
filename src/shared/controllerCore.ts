/*
 * Rich Presence Studio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    createProfile, MAX_PROFILES, parseImport, PresenceProfile, sanitizeProfile,
    serializeProfiles, validateProfile
} from "./model";

import { resolveApplicationId } from "./application";

export interface StudioData {
    version: 1;
    profiles: PresenceProfile[];
    restoreOnStart: boolean;
    lastApplied: PresenceProfile | null;
    lastOwnerId: string | null;
    resumeEnabled: boolean;
}

export interface StudioSnapshot {
    profiles: PresenceProfile[];
    activeProfile: PresenceProfile | null;
    restoreOnStart: boolean;
    phase: "idle" | "applying" | "active" | "error";
    message: string;
    sharingEnabled: boolean;
    conflict: boolean;
}

export interface StudioActivity {
    application_id: string;
    name: string;
    details?: string;
    state?: string;
    type: 0 | 2 | 3 | 5;
    flags: 1;
    timestamps?: { start: number; end?: number; };
    assets?: {
        large_image?: string;
        large_text?: string;
        small_image?: string;
        small_text?: string;
    };
    buttons?: string[];
    metadata?: { button_urls: string[]; };
}

export interface StudioDependencies {
    read(): unknown;
    write(data: StudioData): void;
    publish(activity: StudioActivity | null): void;
    resolveAsset(applicationId: string, image: string): Promise<string>;
    getUserId(): string | null;
    getSharingEnabled(): boolean;
    getConflict(): boolean;
    now?(): number;
}

export const APPLY_COOLDOWN_MS = 5000;

function copyProfile(profile: PresenceProfile): PresenceProfile {
    return { ...profile, buttons: profile.buttons.map(button => ({ ...button })) };
}

function errorText(error: unknown): string {
    return error instanceof Error ? error.message : "Не удалось обновить Rich Presence.";
}

/** The state machine is independent of Discord so races and restoration can be tested. */
export function createStudioController(deps: StudioDependencies) {
    const listeners = new Set<() => void>();
    const now = deps.now ?? Date.now;
    let loaded = false;
    let running = false;
    let ownerId: string | null = null;
    let generation = 0;
    let lastPublishedAt = -Infinity;
    let startupRestoreChecked = false;
    let data: StudioData;
    let snapshot: StudioSnapshot = {
        profiles: [], activeProfile: null, restoreOnStart: false,
        phase: "idle", message: "Активность выключена.",
        sharingEnabled: true, conflict: false
    };

    function update(patch: Partial<StudioSnapshot>) {
        snapshot = { ...snapshot, ...patch };
        listeners.forEach(listener => listener());
    }

    function environment() {
        let sharingEnabled = false;
        let conflict = false;
        try { sharingEnabled = deps.getSharingEnabled(); } catch { /* API unavailable */ }
        try { conflict = deps.getConflict(); } catch { /* Optional plugin unavailable */ }
        return { sharingEnabled, conflict };
    }

    function persist(next: StudioData) {
        const owned = {
            ...next,
            profiles: next.profiles.map(copyProfile),
            lastApplied: next.lastApplied ? copyProfile(next.lastApplied) : null
        };
        deps.write(owned);
        data = owned;
    }

    function load() {
        if (loaded) return;
        const raw = deps.read();
        let message = "Выбери профиль, настрой карточку и нажми «Применить».";
        let profiles = [createProfile("Мой профиль")];
        data = {
            version: 1, profiles, restoreOnStart: false,
            lastApplied: null, lastOwnerId: null, resumeEnabled: false
        };
        if (raw != null) {
            if (typeof raw !== "object" || (raw as { version?: unknown; }).version !== 1)
                throw new Error("Неизвестная версия сохранённых данных. Не сбрасывай настройки: сохрани резервную копию и обнови плагин.");
            const saved = raw as Partial<StudioData>;
            if (!Array.isArray(saved.profiles) || saved.profiles.length > MAX_PROFILES)
                throw new Error("Сохранённый список профилей повреждён. Настройки не были перезаписаны.");
            profiles = saved.profiles.map(sanitizeProfile);
            if (new Set(profiles.map(profile => profile.id)).size !== profiles.length)
                throw new Error("В сохранённых настройках повторяются ID профилей. Настройки не были перезаписаны.");
            data = {
                version: 1,
                profiles,
                restoreOnStart: saved.restoreOnStart === true,
                lastApplied: saved.lastApplied ? sanitizeProfile(saved.lastApplied) : null,
                lastOwnerId: typeof saved.lastOwnerId === "string" ? saved.lastOwnerId : null,
                resumeEnabled: saved.resumeEnabled === true
            };
            if (data.restoreOnStart && data.resumeEnabled)
                message = "Сохранённый профиль будет восстановлен только для исходного аккаунта.";
        }
        loaded = true;
        snapshot = {
            ...snapshot, profiles: data.profiles.map(copyProfile),
            restoreOnStart: data.restoreOnStart, message, ...environment()
        };
    }

    function saveProfile(profile: PresenceProfile) {
        load();
        const clean = sanitizeProfile(profile);
        const exists = data.profiles.some(item => item.id === clean.id);
        if (!exists && data.profiles.length >= MAX_PROFILES)
            throw new Error(`Можно сохранить не больше ${MAX_PROFILES} профилей.`);
        const profiles = exists
            ? data.profiles.map(item => item.id === clean.id ? clean : item)
            : [...data.profiles, clean];
        persist({ ...data, profiles });
        update({ profiles: profiles.map(copyProfile), message: "Профиль сохранён. Опубликованная карточка не менялась." });
    }

    function clearPresence(message: string, preserveRestore: boolean) {
        ++generation;
        let storageFailure: unknown;
        if (loaded && !preserveRestore) {
            try { persist({ ...data, resumeEnabled: false }); }
            catch (error) { storageFailure = error; }
        }
        // Null does not need an application ID or asset resolution.
        try {
            deps.publish(null);
        } catch (error) {
            update({ phase: "error", message: "Не удалось отключить карточку. Перезапусти Discord.", ...environment() });
            throw error;
        }
        update({
            activeProfile: null,
            phase: storageFailure ? "error" : "idle",
            message: storageFailure
                ? "Показ выключен, но настройка автовосстановления не сохранилась. Отключи автовосстановление перед перезапуском."
                : message,
            ...environment()
        });
        if (storageFailure) throw storageFailure;
    }

    function fail(message: string): never {
        update({ phase: "error", message });
        throw new Error(message);
    }

    async function applyProfile(profile: PresenceProfile, saveDraft = true): Promise<void> {
        load();
        if (!running) fail("Плагин ещё не запущен или уже отключён. Перезапусти Discord.");
        const userId = deps.getUserId();
        if (!userId) fail("Сначала войди в свой аккаунт Discord.");
        if (ownerId && ownerId !== userId) {
            clearPresence("Аккаунт изменился. Примени нужный профиль вручную.", false);
        }
        ownerId = userId;
        let clean: PresenceProfile;
        try { clean = sanitizeProfile(profile); }
        catch (error) { fail(errorText(error)); }
        const issues = validateProfile(clean, { forApply: true });
        if (issues.length) {
            const message = issues.map(issue => issue.message).join(" ");
            fail(message);
        }
        const waitMs = APPLY_COOLDOWN_MS - (now() - lastPublishedAt);
        if (waitMs > 0) {
            const message = `Подожди ${Math.ceil(waitMs / 1000)} сек. перед следующим применением.`;
            update({ message });
            throw new Error(message);
        }

        const request = ++generation;
        try {
            // Restoration republishes the last sent snapshot without reverting later draft edits.
            if (saveDraft) saveProfile(clean);
            update({ phase: "applying", message: "Проверяю изображения и отправляю карточку…", ...environment() });
            const applicationId = resolveApplicationId(clean.applicationId);
            const [large, small] = await Promise.all([
                clean.largeImage.trim() ? deps.resolveAsset(applicationId, clean.largeImage.trim()) : undefined,
                clean.smallImage.trim() ? deps.resolveAsset(applicationId, clean.smallImage.trim()) : undefined
            ]);
            if (request !== generation || !running) return;
            if (deps.getUserId() !== userId) {
                clearPresence("Аккаунт изменился. Примени нужный профиль вручную.", false);
                ownerId = deps.getUserId();
                return;
            }
            if (clean.largeImage.trim() && !large)
                throw new Error("Discord не принял большую картинку. Проверь прямую ссылку или ключ изображения.");
            if (clean.smallImage.trim() && !small)
                throw new Error("Discord не принял маленькую картинку. Проверь прямую ссылку или ключ изображения.");

            const activity: StudioActivity = {
                application_id: applicationId,
                name: clean.name.trim(),
                type: clean.type,
                flags: 1
            };
            if (clean.details.trim()) activity.details = clean.details.trim();
            if (clean.state.trim()) activity.state = clean.state.trim();
            if (clean.timer === "elapsed" && clean.type !== 5)
                activity.timestamps = { start: now() };
            if (large || small) {
                activity.assets = {};
                if (large) {
                    activity.assets.large_image = large;
                    if (clean.largeText.trim()) activity.assets.large_text = clean.largeText.trim();
                }
                if (small) {
                    activity.assets.small_image = small;
                    if (clean.smallText.trim()) activity.assets.small_text = clean.smallText.trim();
                }
            }
            const buttons = clean.buttons.filter(button => button.label.trim() && button.url.trim());
            if (buttons.length) {
                activity.buttons = buttons.map(button => button.label.trim());
                activity.metadata = { button_urls: buttons.map(button => button.url.trim()) };
            }
            deps.publish(activity);
            lastPublishedAt = now();
            update({ activeProfile: copyProfile(clean), phase: "active", message: "Карточка отправлена в Discord.", ...environment() });
            persist({ ...data, lastApplied: clean, lastOwnerId: userId, resumeEnabled: true });
        } catch (error) {
            if (request !== generation || !running) return;
            const message = errorText(error);
            update({ phase: "error", message });
            throw new Error(message);
        }
    }

    function tryRestore() {
        if (startupRestoreChecked || !running) return;
        const userId = deps.getUserId();
        if (!userId) return;
        startupRestoreChecked = true;
        ownerId = userId;
        if (data.restoreOnStart && data.resumeEnabled && data.lastApplied) {
            if (data.lastOwnerId !== userId) {
                update({ message: "Автовосстановление пропущено: выбран другой аккаунт Discord." });
                return;
            }
            // applyProfile reports a failure through the snapshot; never leak a rejected promise.
            void applyProfile(data.lastApplied, false).catch(() => {});
        }
    }

    return {
        replaceSyncedProfiles(profiles: PresenceProfile[], expected: PresenceProfile[]): boolean {
            load();
            if (JSON.stringify(data.profiles.map(sanitizeProfile)) !== JSON.stringify(expected.map(sanitizeProfile))) return false;
            if (profiles.length > MAX_PROFILES) throw new Error("Слишком много синхронизированных профилей.");
            const next = profiles.map(sanitizeProfile);
            if (new Set(next.map(p => p.id)).size !== next.length) throw new Error("Повторяются ID профилей.");
            if (JSON.stringify(next) === JSON.stringify(data.profiles)) return true;
            persist({ ...data, profiles: next });
            update({ profiles: next.map(copyProfile), message: "Профили синхронизированы. Опубликованная карточка не менялась." });
            return true;
        },
        getSnapshot(): StudioSnapshot { load(); return snapshot; },
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        saveProfile,
        removeProfile(id: string) {
            load();
            if (snapshot.activeProfile?.id === id) clearPresence("Активный профиль удалён; показ выключен.", false);
            // A pending apply must not resurrect a profile the user just deleted.
            ++generation;
            const profiles = data.profiles.filter(profile => profile.id !== id);
            persist({
                ...data, profiles,
                lastApplied: data.lastApplied?.id === id ? null : data.lastApplied,
                resumeEnabled: data.lastApplied?.id === id ? false : data.resumeEnabled
            });
            update({
                profiles: profiles.map(copyProfile),
                phase: snapshot.activeProfile ? "active" : "idle",
                message: "Профиль удалён."
            });
        },
        applyProfile: (profile: PresenceProfile) => applyProfile(profile),
        disable() { load(); clearPresence("Показ активности выключен.", false); },
        setRestoreOnStart(restoreOnStart: boolean) {
            load();
            persist({ ...data, restoreOnStart });
            update({ restoreOnStart });
        },
        importProfiles(text: string) {
            load();
            const incoming = parseImport(text, data.profiles.map(profile => profile.id));
            if (data.profiles.length + incoming.length > MAX_PROFILES)
                throw new Error(`После импорта получится больше ${MAX_PROFILES} профилей. Удали ненужные и повтори импорт.`);
            persist({ ...data, profiles: [...data.profiles, ...incoming] });
            update({ profiles: data.profiles.map(copyProfile), message: `Добавлено профилей: ${incoming.length}.` });
        },
        exportProfiles(): string { load(); return serializeProfiles(data.profiles); },
        reportRuntimeError(message: string) {
            update({ phase: "error", message });
        },
        start() {
            load();
            if (running) return;
            running = true;
            ownerId = deps.getUserId();
            startupRestoreChecked = false;
            update(environment());
            tryRestore();
        },
        stop() {
            if (!loaded) return;
            running = false;
            clearPresence("Плагин остановлен.", data.restoreOnStart);
        },
        onLogout() {
            if (!loaded) return;
            startupRestoreChecked = true;
            clearPresence("Аккаунт отключён. После входа примени профиль вручную.", false);
            ownerId = null;
        },
        refreshEnvironment() {
            load();
            const userId = deps.getUserId();
            if (ownerId && ownerId !== userId) {
                startupRestoreChecked = true;
                clearPresence("Аккаунт изменился. Примени нужный профиль вручную.", false);
                ownerId = userId;
            }
            update(environment());
            tryRestore();
        }
    };
}

export type StudioController = ReturnType<typeof createStudioController>;
