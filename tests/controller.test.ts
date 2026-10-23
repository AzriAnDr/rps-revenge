import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APPLICATION_ID } from "../src/shared/application";

import { createStudioController, StudioActivity, StudioData } from "../src/shared/controllerCore";
import { createProfile } from "../src/shared/model";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function fixture(saved?: StudioData) {
    let stored = saved;
    let userId: string | null = "owner";
    let time = 10000;
    let resolver = async (_app: string, image: string) => `resolved:${image}`;
    const published: Array<StudioActivity | null> = [];
    const deps = {
        read: () => stored,
        write: (value: StudioData) => { stored = structuredClone(value); },
        publish: (activity: StudioActivity | null) => { published.push(structuredClone(activity)); },
        resolveAsset: (app: string, image: string) => resolver(app, image),
        getUserId: () => userId,
        getSharingEnabled: () => true,
        getConflict: () => false,
        now: () => time
    };
    const studio = createStudioController(deps);
    studio.start();
    return {
        studio, deps, published,
        stored: () => stored!,
        advance: (ms = 5000) => { time += ms; },
        setUser: (id: string | null) => { userId = id; },
        setResolver: (next: typeof resolver) => { resolver = next; }
    };
}

test("saving a modified draft does not replace the last published profile", async () => {
    const f = fixture();
    const profile = createProfile("Work");
    profile.details = "Published";
    await f.studio.applyProfile(profile);
    f.studio.saveProfile({ ...profile, details: "Unsaved on Discord" });
    assert.equal(f.published.length, 1);
    assert.equal(f.studio.getSnapshot().activeProfile?.details, "Published");
    assert.equal(f.studio.getSnapshot().profiles.find(item => item.id === profile.id)?.details, "Unsaved on Discord");
    assert.equal(f.stored().lastApplied?.details, "Published");
});

test("a slow older apply cannot overwrite a newer profile", async () => {
    const f = fixture();
    const pending = deferred<string>();
    f.setResolver(() => pending.promise);
    const slow = createProfile("Old");
    slow.applicationId = "123456789012345678";
    slow.largeImage = "https://images.example.com/old.png";
    const first = f.studio.applyProfile(slow);
    const newer = createProfile("New");
    newer.name = "Newer status";
    await f.studio.applyProfile(newer);
    pending.resolve("asset-old");
    await first;
    assert.equal(f.published.length, 1);
    assert.equal(f.published[0]?.name, "Newer status");
    assert.equal(f.studio.getSnapshot().activeProfile?.id, newer.id);
});

test("disabling during image resolution prevents a late publication", async () => {
    const f = fixture();
    const pending = deferred<string>();
    f.setResolver(() => pending.promise);
    const profile = createProfile();
    profile.applicationId = "123456789012345678";
    profile.largeImage = "https://images.example.com/pending.png";
    const work = f.studio.applyProfile(profile);
    f.studio.disable();
    assert.deepEqual(f.published, [null]);
    pending.resolve("asset-pending");
    await work;
    assert.deepEqual(f.published, [null]);
    assert.equal(f.studio.getSnapshot().activeProfile, null);
    assert.equal(f.stored().resumeEnabled, false);
});

test("switching accounts while an image is pending cancels the old owner's activity", async () => {
    const f = fixture();
    const pending = deferred<string>();
    f.setResolver(() => pending.promise);
    const profile = createProfile();
    profile.applicationId = "123456789012345678";
    profile.largeImage = "https://images.example.com/pending.png";
    const work = f.studio.applyProfile(profile);
    f.setUser("someone-else");
    f.studio.refreshEnvironment();
    pending.resolve("asset-pending");
    await work;
    assert.deepEqual(f.published, [null]);
    assert.equal(f.studio.getSnapshot().activeProfile, null);
    assert.equal(f.stored().resumeEnabled, false);
});

test("successful publications are spaced by at least five seconds", async () => {
    const f = fixture();
    await f.studio.applyProfile(createProfile("First"));
    await assert.rejects(f.studio.applyProfile(createProfile("Too fast")), /Подожди/);
    assert.equal(f.published.length, 1);
    f.advance();
    await f.studio.applyProfile(createProfile("Later"));
    assert.equal(f.published.length, 2);
});

test("asset failures preserve the previously published activity", async () => {
    const f = fixture();
    const initial = createProfile("Previous");
    await f.studio.applyProfile(initial);
    f.advance();
    f.setResolver(async () => { throw new Error("Image unavailable"); });
    const next = createProfile("New");
    next.applicationId = "123456789012345678";
    next.largeImage = "https://images.example.com/missing.png";
    await assert.rejects(f.studio.applyProfile(next), /Image unavailable/);
    assert.equal(f.published.length, 1);
    assert.equal(f.studio.getSnapshot().activeProfile?.id, initial.id);
    assert.equal(f.studio.getSnapshot().phase, "error");
});

test("blank button rows are removed without breaking label and URL alignment", async () => {
    const f = fixture();
    const profile = createProfile();
    profile.buttons = [
        { label: "", url: "" },
        { label: "My project", url: "https://example.com/project" }
    ];
    profile.timer = "elapsed";
    await f.studio.applyProfile(profile);
    assert.deepEqual(f.published[0]?.buttons, ["My project"]);
    assert.deepEqual(f.published[0]?.metadata?.button_urls, ["https://example.com/project"]);
    assert.equal(f.published[0]?.timestamps?.start, 10000);
});

test("restoration requires explicit opt-in and the same account", async () => {
    const original = fixture();
    const profile = createProfile("Restore");
    await original.studio.applyProfile(profile);
    const withoutOptIn = fixture(original.stored());
    await Promise.resolve();
    assert.deepEqual(withoutOptIn.published, []);

    original.studio.setRestoreOnStart(true);
    const sameOwner = fixture(original.stored());
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(sameOwner.published[0]?.name, profile.name);

    const otherOwnerData = { ...original.stored(), lastOwnerId: "different-owner" };
    const otherOwner = fixture(otherOwnerData);
    await Promise.resolve();
    assert.deepEqual(otherOwner.published, []);
    assert.match(otherOwner.studio.getSnapshot().message, /другой аккаунт/);
});

test("explicit disable prevents restoration even when the option remains enabled", async () => {
    const first = fixture();
    await first.studio.applyProfile(createProfile());
    first.studio.setRestoreOnStart(true);
    first.studio.disable();
    const restored = fixture(first.stored());
    await Promise.resolve();
    assert.deepEqual(restored.published, []);
    assert.equal(restored.studio.getSnapshot().restoreOnStart, true);
});

test("restoration republishes the sent snapshot without overwriting newer draft edits", async () => {
    const first = fixture();
    const profile = createProfile();
    profile.details = "Published version";
    await first.studio.applyProfile(profile);
    first.studio.saveProfile({ ...profile, details: "Saved draft for later" });
    first.studio.setRestoreOnStart(true);
    first.studio.stop();
    const restored = fixture(first.stored());
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(restored.published[0]?.details, "Published version");
    assert.equal(restored.studio.getSnapshot().profiles.find(item => item.id === profile.id)?.details, "Saved draft for later");
});

test("plugin stop clears the current activity but preserves opted-in restoration", async () => {
    const first = fixture();
    await first.studio.applyProfile(createProfile());
    first.studio.setRestoreOnStart(true);
    first.studio.stop();
    assert.equal(first.published.at(-1), null);
    assert.equal(first.stored().resumeEnabled, true);
    const restored = fixture(first.stored());
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(restored.published.length, 1);
});

test("deleting a profile during application cannot resurrect it", async () => {
    const f = fixture();
    const pending = deferred<string>();
    f.setResolver(() => pending.promise);
    const profile = createProfile("Deleted");
    profile.applicationId = "123456789012345678";
    profile.largeImage = "https://images.example.com/pending.png";
    const work = f.studio.applyProfile(profile);
    f.studio.removeProfile(profile.id);
    pending.resolve("deleted-asset");
    await work;
    assert.deepEqual(f.published, []);
    assert.equal(f.studio.getSnapshot().profiles.some(item => item.id === profile.id), false);
    assert.equal(f.studio.getSnapshot().activeProfile, null);
});

test("corrupt persisted profiles are rejected without overwriting the stored object", () => {
    const broken = { version: 1, profiles: [{ id: "bad" }] } as unknown as StudioData;
    assert.throws(() => fixture(broken));
    assert.deepEqual(broken, { version: 1, profiles: [{ id: "bad" }] });
});

test("new and empty profiles resolve images and buttons with shared application; own ID overrides", async () => {
    for (const input of [undefined, "", "123456789012345678"]) {
        const f = fixture();
        const appIds: string[] = [];
        f.setResolver(async (app, image) => { appIds.push(app); return "resolved:" + image; });
        const profile = createProfile();
        if (input !== undefined) profile.applicationId = input;
        profile.largeImage = "https://images.example.com/image.png";
        profile.smallImage = "https://images.example.com/small.png";
        profile.buttons = [{ label: "Link", url: "https://example.com/" }];
        await f.studio.applyProfile(profile);
        const expected = input || DEFAULT_APPLICATION_ID;
        assert.equal(f.published[0]?.application_id, expected);
        assert.deepEqual(appIds, [expected, expected]);
        assert.deepEqual(f.published[0]?.metadata?.button_urls, ["https://example.com/"]);
    }
});
test("invalid nonempty application ID cannot publish or resolve assets", async () => {
    const f = fixture();
    f.setResolver(async () => { throw new Error("Must not resolve an invalid ID"); });
    await assert.rejects(f.studio.applyProfile({ ...createProfile(), applicationId: "invalid", largeImage: "portrait" }), /Application ID/);
    assert.equal(f.published.length, 0);
});

