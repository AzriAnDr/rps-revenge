/*
 * Rich Presence Studio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MAX_PROFILES, MAX_PROFILE_LABEL_LENGTH, PresenceProfile, sanitizeProfile } from "./model";

/** Validate a complete snapshot before its caller changes any stored state. */
export function sanitizeProfiles(value: unknown): PresenceProfile[] {
    if (!Array.isArray(value) || value.length > MAX_PROFILES) {
        throw new Error(`Синхронизация поддерживает не более ${MAX_PROFILES} профилей.`);
    }
    const profiles = value.map(sanitizeProfile);
    const ids = new Set<string>();
    for (const profile of profiles) {
        if (ids.has(profile.id)) throw new Error("Повторяющийся идентификатор профиля.");
        ids.add(profile.id);
    }
    return profiles;
}

// sanitizeProfile gives all properties a fixed order and strips unknown fields.
function equal(a: PresenceProfile | undefined, b: PresenceProfile | undefined): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** A stable non-security hash, deliberately independent of crypto APIs on mobile. */
function conflictId(profile: PresenceProfile, attempt: number): string {
    const input = JSON.stringify(profile) + ":" + attempt;
    const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
    const hex = words.map(seed => {
        let hash = seed;
        for (let i = 0; i < input.length; i++) {
            hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function conflictLabel(label: string): string {
    const suffix = " — конфликт";
    let prefix = label.slice(0, MAX_PROFILE_LABEL_LENGTH - suffix.length);
    if (/[\uD800-\uDBFF]$/.test(prefix)) prefix = prefix.slice(0, -1);
    return prefix.trimEnd() + suffix;
}

/**
 * The baseline is the last successfully synchronized snapshot, including absence.
 * An empty baseline joins independent initial collections. Conflicting edits keep
 * the remote ID and preserve local content in a deterministic, retry-safe copy.
 * Throws atomically on invalid inputs or an oversized merged collection.
 */
export function mergeProfiles(
    base: readonly PresenceProfile[], local: readonly PresenceProfile[], remote: readonly PresenceProfile[]
): PresenceProfile[] {
    const snapshots = [base, local, remote].map(sanitizeProfiles);
    const [baseMap, localMap, remoteMap] = snapshots.map(profiles => new Map(profiles.map(p => [p.id, p])));
    const result = new Map<string, PresenceProfile>();
    const conflicts: PresenceProfile[] = [];
    const ids = new Set([...remoteMap.keys(), ...localMap.keys(), ...baseMap.keys()]);
    for (const id of ids) {
        const before = baseMap.get(id), here = localMap.get(id), there = remoteMap.get(id);
        let chosen: PresenceProfile | undefined;
        if (equal(here, there)) chosen = here;
        else if (equal(here, before)) chosen = there;
        else if (equal(there, before)) chosen = here;
        else if (!here || !there) chosen = here ?? there; // Changed content wins against deletion.
        else {
            chosen = there;
            conflicts.push(here);
        }
        if (chosen) result.set(id, chosen);
    }
    for (const profile of conflicts) {
        for (let attempt = 0; ; attempt++) {
            const copy = { ...profile, id: conflictId(profile, attempt), label: conflictLabel(profile.label) };
            // Reserve even deleted IDs: an unrelated record must never be overwritten.
            const occupied = snapshots.flatMap(entries => entries.filter(p => p.id === copy.id));
            const current = result.get(copy.id);
            if (occupied.some(p => !equal(p, copy)) || (current && !equal(current, copy))) continue;
            result.set(copy.id, copy);
            break;
        }
    }
    return sanitizeProfiles([...result.values()]);
}
