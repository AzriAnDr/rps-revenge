// SPDX-License-Identifier: GPL-3.0-or-later
import { mergeProfiles, sanitizeProfiles } from "./lanSyncCore";
import type { PresenceProfile } from "./model";
export interface SyncDocument { revision: number; profiles: PresenceProfile[]; }
export interface SyncRemote {
    read(): Promise<SyncDocument>;
    write(revision: number, profiles: PresenceProfile[]): Promise<{ ok: boolean; document: SyncDocument; }>;
}
export function validateDocument(value: SyncDocument): SyncDocument {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Некорректная версия данных синхронизации.");
    return { revision: value.revision, profiles: sanitizeProfiles(value.profiles) };
}
export async function synchronizeProfiles(
    remote: SyncRemote, base: PresenceProfile[],
    local: () => PresenceProfile[],
    apply: (profiles: PresenceProfile[], expected: PresenceProfile[]) => boolean,
    valid: () => boolean = () => true
): Promise<PresenceProfile[] | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const doc = validateDocument(await remote.read());
        if (!valid()) return null;
        const before = sanitizeProfiles(local());
        const merged = mergeProfiles(base, before, doc.profiles);
        let final = doc;
        if (JSON.stringify(merged) !== JSON.stringify(doc.profiles)) {
            if (!valid()) return null;
            const result = await remote.write(doc.revision, merged);
            if (!valid()) return null;
            if (!result.ok) continue;
            final = validateDocument(result.document);
        }
        if (!valid() || !apply(final.profiles, before)) return null;
        return final.profiles;
    }
    throw new Error("Профили меняются на другом устройстве. Повторю синхронизацию позже.");
}
