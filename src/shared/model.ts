/*
 * Rich Presence Studio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { APPLICATION_ID_PATTERN, DEFAULT_APPLICATION_ID } from "./application";

/** Versioned, client-independent profile model. It never reads account credentials. */
export type ActivityType = 0 | 2 | 3 | 5;

export interface PresenceButton {
    label: string;
    url: string;
}

export interface PresenceProfile {
    id: string;
    label: string;
    applicationId: string;
    name: string;
    details: string;
    state: string;
    type: ActivityType;
    largeImage: string;
    largeText: string;
    smallImage: string;
    smallText: string;
    buttons: PresenceButton[];
    timer: "none" | "elapsed";
}

export interface ValidationIssue {
    field: string;
    message: string;
}

export interface ValidationOptions {
    forApply?: boolean;
}

export const MAX_PROFILES = 50;
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const EXPORT_FORMAT = "rich-presence-studio";
export const SCHEMA_VERSION = 1;
export const MAX_TEXT_LENGTH = 128;
export const MAX_PROFILE_LABEL_LENGTH = 60;
export const MAX_BUTTON_LABEL_LENGTH = 31;
export const MAX_URL_LENGTH = 512;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET_KEY_PATTERN = /^[a-z0-9_-]{1,256}$/i;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const STRING_FIELDS = [
    "id", "label", "applicationId", "name", "details", "state",
    "largeImage", "largeText", "smallImage", "smallText"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function own(value: Record<string, unknown>, key: string): unknown {
    return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
}

function newId(): string {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    // IDs identify local drafts, not credentials. Hermes need not expose Web Crypto.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.floor(Math.random() * 16);
        return (c === "x" ? r : (r & 3) | 8).toString(16);
    });
}

function utf8Bytes(text: string): number {
    let size = 0;
    for (const point of text) {
        const code = point.codePointAt(0)!;
        size += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    }
    return size;
}

function truncate(value: string, length: number): string {
    const sliced = value.slice(0, length);
    // Do not leave half of an emoji at the end when duplicating a long label.
    return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
}

export function createProfile(label = "Новый профиль"): PresenceProfile {
    return {
        id: newId(),
        label: truncate(label.trim(), MAX_PROFILE_LABEL_LENGTH) || "Новый профиль",
        applicationId: DEFAULT_APPLICATION_ID,
        name: "Моя активность",
        details: "",
        state: "",
        type: 0,
        largeImage: "",
        largeText: "",
        smallImage: "",
        smallText: "",
        buttons: [],
        timer: "none"
    };
}

export function cloneProfile(profile: PresenceProfile): PresenceProfile {
    const copy = sanitizeProfile(profile);
    copy.id = newId();
    const suffix = " — копия";
    copy.label = truncate(copy.label, MAX_PROFILE_LABEL_LENGTH - suffix.length).trimEnd() + suffix;
    return copy;
}

function privateHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("[")) {
        // Global-unicast IPv6 addresses are in 2000::/3. Reject local/mapped IPs.
        const address = host.slice(1, -1);
        return !/^[23][0-9a-f]{0,3}:/.test(address) || address.startsWith("2001:db8:");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        const [a, b, c] = host.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || a >= 224
            || (a === 100 && b >= 64 && b <= 127)
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2))))
            || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
            || (a === 203 && b === 0 && c === 113);
    }
    return !host.includes(".") || /(?:^|\.)(?:localhost|local|localdomain|internal|lan|home|invalid|test|onion)$/.test(host);
}

/** Checks syntax and obvious local hosts; reachability is checked by Discord on Apply. */
function urlIssue(value: string, isImage: boolean): string | undefined {
    if (value.length > MAX_URL_LENGTH) return `Ссылка должна быть не длиннее ${MAX_URL_LENGTH} знаков.`;
    if (value !== value.trim()) return "Уберите пробелы в начале и конце ссылки.";
    if (CONTROL_CHARACTERS.test(value)) return "Ссылка не должна содержать управляющие символы.";

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return "Укажите полную ссылку, начинающуюся с https:// или http://.";
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "Допустимы только ссылки https:// и http://.";
    }
    if (url.username || url.password) return "Ссылка не должна содержать логин или пароль.";
    if (privateHost(url.hostname)) return "Нужна общедоступная ссылка: локальные адреса другим людям недоступны.";
    if (isImage && /^(?:cdn|media)\.discordapp\.(?:com|net)$/i.test(url.hostname)) {
        return "Используйте постоянную ссылку на картинку или ключ Art Asset, а не ссылку на вложение Discord.";
    }
    if (isImage && /^(?:www\.)?imgur\.com$/i.test(url.hostname)) {
        return "Нужна прямая ссылка на картинку: i.imgur.com, а не страница Imgur.";
    }
    if (isImage && /^(?:www\.)?tenor\.com$/i.test(url.hostname)) {
        return "Нужна прямая ссылка на картинку: media.tenor.com, а не страница Tenor.";
    }
    return undefined;
}

export function validateProfile(profile: PresenceProfile, options: ValidationOptions = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const add = (field: string, message: string) => issues.push({ field, message });
    if (!isRecord(profile)) return [{ field: "profile", message: "Профиль должен быть объектом." }];

    for (const field of STRING_FIELDS) {
        if (typeof own(profile, field) !== "string") add(field, "Значение должно быть строкой.");
    }
    if (issues.length) return issues;
    if (!UUID_PATTERN.test(profile.id)) add("id", "Некорректный идентификатор профиля.");
    if (!profile.label.trim()) add("label", "Укажите название профиля.");
    if (profile.label.length > MAX_PROFILE_LABEL_LENGTH) add("label", `Название профиля: не более ${MAX_PROFILE_LABEL_LENGTH} знаков.`);
    if (profile.applicationId && !APPLICATION_ID_PATTERN.test(profile.applicationId)) {
        add("applicationId", "Application ID должен содержать 16–21 цифру. Если своего приложения нет, оставьте поле пустым.");
    }

    for (const field of ["label", "name", "details", "state", "largeText", "smallText"] as const) {
        if (CONTROL_CHARACTERS.test(profile[field])) add(field, "Используйте одну строку без управляющих символов.");
        if (field !== "label" && profile[field].length > MAX_TEXT_LENGTH) add(field, `Не более ${MAX_TEXT_LENGTH} знаков.`);
    }
    if (options.forApply && !profile.name.trim()) add("name", "Введите название активности перед применением.");
    if (![0, 2, 3, 5].includes(profile.type)) add("type", "Выберите поддерживаемый тип активности.");
    if (profile.timer !== "none" && profile.timer !== "elapsed") add("timer", "Некорректный режим таймера.");

    for (const field of ["largeImage", "smallImage"] as const) {
        const value = profile[field];
        if (!value) continue;
        if (/^https?:\/\//i.test(value)) {
            const message = urlIssue(value, true);
            if (message) add(field, message);
        } else if (!ASSET_KEY_PATTERN.test(value)) {
            add(field, "Укажите прямую http(s)-ссылку или ключ Art Asset: латинские буквы, цифры, _ и - (до 256 знаков).");
        }
    }

    if (!Array.isArray(profile.buttons)) {
        add("buttons", "Кнопки должны быть массивом.");
    } else if (profile.buttons.length > 2) {
        add("buttons", "Discord поддерживает не более двух кнопок.");
    } else {
        profile.buttons.forEach((button, index) => {
            const path = `buttons.${index}`;
            if (!isRecord(button) || typeof own(button, "label") !== "string" || typeof own(button, "url") !== "string") {
                add(path, "Для кнопки нужны строковые поля label и url.");
                return;
            }
            if (button.label.length > MAX_BUTTON_LABEL_LENGTH) add(`${path}.label`, `Текст кнопки: не более ${MAX_BUTTON_LABEL_LENGTH} знака.`);
            if (CONTROL_CHARACTERS.test(button.label)) add(`${path}.label`, "Текст кнопки должен быть одной строкой.");
            if (button.url) {
                const message = urlIssue(button.url, false);
                if (message) add(`${path}.url`, message);
            }
            if (options.forApply && Boolean(button.label.trim()) !== Boolean(button.url)) {
                add(path, "Заполните и текст, и ссылку кнопки либо очистите оба поля.");
            }
        });
    }
    return issues;
}

/** Validates a saved draft and copies ONLY the documented fields, preserving its ID. */
export function sanitizeProfile(value: unknown): PresenceProfile {
    if (!isRecord(value)) throw new Error("Профиль должен быть объектом.");
    const profile = {} as PresenceProfile;
    for (const field of STRING_FIELDS) {
        const fieldValue = own(value, field);
        if (typeof fieldValue !== "string") throw new Error(`Поле «${field}» должно быть строкой.`);
        profile[field] = fieldValue;
    }
    profile.type = own(value, "type") as ActivityType;
    profile.timer = own(value, "timer") as PresenceProfile["timer"];
    const buttons = own(value, "buttons");
    if (!Array.isArray(buttons) || buttons.length > 2) throw new Error("Поле buttons должно содержать не более двух кнопок.");
    profile.buttons = buttons.map((button: unknown) => {
        if (!isRecord(button) || typeof own(button, "label") !== "string" || typeof own(button, "url") !== "string") {
            throw new Error("Каждая кнопка должна иметь строковые поля label и url.");
        }
        return { label: own(button, "label") as string, url: own(button, "url") as string };
    });
    const issues = validateProfile(profile);
    if (issues.length) throw new Error(`${issues[0].field}: ${issues[0].message}`);
    return profile;
}

export function parseImport(text: string, existingIds: Iterable<string> = []): PresenceProfile[] {
    if (text.length > MAX_IMPORT_BYTES || utf8Bytes(text) > MAX_IMPORT_BYTES) {
        throw new Error("Файл профилей должен быть не больше 1 МиБ.");
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("Не удалось прочитать JSON. Выберите файл экспорта Rich Presence Studio.");
    }
    if (!isRecord(parsed) || own(parsed, "format") !== EXPORT_FORMAT || own(parsed, "version") !== SCHEMA_VERSION) {
        throw new Error("Неподдерживаемый формат или версия файла профилей.");
    }
    const entries = own(parsed, "profiles");
    if (!Array.isArray(entries) || entries.length > MAX_PROFILES) {
        throw new Error(`Файл должен содержать массив из не более ${MAX_PROFILES} профилей.`);
    }
    // Validate every record before allocating import IDs; a broken file is never partly imported.
    const profiles = entries.map((entry, index) => {
        try {
            return sanitizeProfile(entry);
        } catch (error) {
            throw new Error(`Профиль ${index + 1}: ${error instanceof Error ? error.message : "Некорректные данные."}`);
        }
    });
    const reserved = new Set(existingIds);
    for (const profile of profiles) {
        // Also avoid matching an ID in the imported file itself.
        reserved.add(profile.id);
    }
    for (const profile of profiles) {
        do {
            profile.id = newId();
        } while (reserved.has(profile.id));
        reserved.add(profile.id);
    }
    return profiles;
}

export function serializeProfiles(profiles: readonly PresenceProfile[]): string {
    if (!Array.isArray(profiles) || profiles.length > MAX_PROFILES) {
        throw new Error(`Можно экспортировать не более ${MAX_PROFILES} профилей.`);
    }
    return JSON.stringify({
        format: EXPORT_FORMAT,
        version: SCHEMA_VERSION,
        profiles: profiles.map(sanitizeProfile)
    }, null, 2);
}
