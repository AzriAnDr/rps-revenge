/* SPDX-License-Identifier: GPL-3.0-or-later */

/** Public application identifier; this is not a credential. */
export const DEFAULT_APPLICATION_ID = "1563133363232055448";
export const APPLICATION_ID_PATTERN = /^\d{16,21}$/;

/** Empty profiles use the shared app; explicit invalid IDs must never silently fall back. */
export function resolveApplicationId(value?: string): string {
    if (value === undefined || value === "") return DEFAULT_APPLICATION_ID;
    if (!APPLICATION_ID_PATTERN.test(value)) throw new Error("Application ID должен содержать 16–21 цифру. Оставь поле пустым для общего приложения.");
    return value;
}
