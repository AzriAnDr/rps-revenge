// SPDX-License-Identifier: GPL-3.0-or-later
import { gcmsiv } from "./vendor/noble/aes.js";
export interface Envelope { nonce: string; box: string; }
export function unhex(text: string, bytes?: number): Uint8Array {
    if (typeof text !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(text) || (bytes !== undefined && text.length !== bytes * 2)) throw new Error("Некорректный ключ или пакет синхронизации.");
    return Uint8Array.from(text.match(/../g)!, x => parseInt(x, 16));
}
export const hex = (value: Uint8Array) => Array.from(value, n => n.toString(16).padStart(2, "0")).join("");
function encode(text: string) {
    const escaped = encodeURIComponent(text), bytes: number[] = [];
    for (let i = 0; i < escaped.length; i++) {
        if (escaped[i] === "%") { bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16)); i += 2; }
        else bytes.push(escaped.charCodeAt(i));
    }
    return new Uint8Array(bytes);
}
function decode(bytes: Uint8Array) { return decodeURIComponent(Array.from(bytes, b => "%" + b.toString(16).padStart(2, "0")).join("")); }
export function seal(value: unknown, key: string, nonce: string): Envelope {
    // Misuse-resistant AEAD: a replayed/tampered plaintext challenge must not cause stream-cipher nonce reuse.
    const n = unhex(nonce, 24);
    return { nonce, box: hex(gcmsiv(unhex(key, 32), n.slice(0, 12), n).encrypt(encode(JSON.stringify(value)))) };
}
export function open(value: Envelope, key: string): any {
    if (!value || typeof value.box !== "string" || value.box.length > 2097152) throw new Error("Слишком большой или некорректный пакет.");
    const n = unhex(value.nonce, 24);
    const bytes = gcmsiv(unhex(key, 32), n.slice(0, 12), n).decrypt(unhex(value.box));
    return JSON.parse(decode(bytes));
}
export function parsePairing(code: string) {
    const match = /^rpslan1:(\d{1,3}(?:\.\d{1,3}){3}):38474:([0-9a-f]{64}):([0-9a-f]{32})$/i.exec(code.trim());
    if (!match) throw new Error("Скопируй полный код подключения из RPS на ПК.");
    const octets = match[1].split(".").map(Number);
    if (octets.some(n => n > 255) || !(octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168))) throw new Error("Подключение разрешено только к локальному IPv4-адресу ПК.");
    return { address: match[1], key: match[2].toLowerCase(), prefix: match[3].toLowerCase() };
}
