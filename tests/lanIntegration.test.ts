import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LanServer } from "./fixtures/lanNative";
import { createMobileSync } from "../src/lanMobile";
import { createRuntime } from "../src/runtime";
import { createProfile } from "../src/shared/model";

test("real encrypted mobile/desktop LAN sync preserves both edits and never auto-publishes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rps-mobile-lan-integration-"));
    const port = 38481;
    const server = new LanServer(directory, { allowLoopbackForTests: true, port });
    const events: any[] = [];
    const api: any = {
        plugin: { storage: {} },
        metro: {
            common: { FluxDispatcher: { dispatch: (event: any) => events.push(event), subscribe() {}, unsubscribe() {} } },
            findByProps: (name: string) => name === "getCurrentUser" ? { getCurrentUser: () => ({ id: "integration-owner" }) } : { SET_ACTIVITY: true }
        }
    };
    const runtime = createRuntime(api);
    const wireBodies: string[] = [];
    const fetcher: typeof fetch = (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.hostname, "192.168.1.2");
        assert.equal(url.port, "38474");
        if (init?.body) wireBodies.push(String(init.body));
        // Only the transport address changes. Challenges, encryption and HTTP are real.
        return fetch(`http://127.0.0.1:${port}${url.pathname}`, init);
    };
    const sync = createMobileSync(api, runtime.controller, fetcher);
    try {
        const desktopProfile = createProfile("Desktop seed");
        const state = await server.configure(true, "127.0.0.1", "integration-owner", [desktopProfile]);
        const pairing = state.code.replace(`127.0.0.1:${port}`, "192.168.1.2:38474");
        runtime.start();
        const mobileSeed = runtime.controller.getSnapshot().profiles[0];
        await sync.connect(pairing);
        // connect starts a background tick; observe its completion without waiting for the ten-second timer.
        const deadline = Date.now() + 3000;
        while (!api.plugin.storage.lanLink.base.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
        assert.match(sync.status(), /^Синхронизировано:/);
        assert.ok(runtime.controller.getSnapshot().profiles.some(profile => profile.id === desktopProfile.id));
        assert.ok((await server.read("integration-owner")).profiles.some(profile => profile.id === mobileSeed.id));
        assert.equal(events.length, 0, "Initial pairing must not dispatch a presence");

        runtime.controller.saveProfile({ ...desktopProfile, details: "Edited on mobile" });
        await sync.syncNow();
        assert.equal((await server.read("integration-owner")).profiles.find(profile => profile.id === desktopProfile.id)?.details, "Edited on mobile");

        let doc = await server.read("integration-owner");
        const desktopEdit = doc.profiles.map(profile => profile.id === desktopProfile.id ? { ...profile, state: "Edited on desktop" } : profile);
        assert.equal((await server.write("integration-owner", doc.revision, desktopEdit)).ok, true);
        await sync.syncNow();
        assert.equal(runtime.controller.getSnapshot().profiles.find(profile => profile.id === desktopProfile.id)?.state, "Edited on desktop");
        assert.equal(events.length, 0, "Bidirectional synchronization must not dispatch a presence");

        const common = runtime.controller.getSnapshot().profiles.find(profile => profile.id === desktopProfile.id)!;
        await runtime.controller.applyProfile(common);
        assert.equal(events.length, 1, "Explicit Apply dispatches once");
        const published = runtime.controller.getSnapshot().activeProfile;
        runtime.controller.saveProfile({ ...common, name: "Mobile conflicting version" });
        doc = await server.read("integration-owner");
        await server.write("integration-owner", doc.revision, doc.profiles.map(profile => profile.id === common.id ? { ...profile, name: "Desktop conflicting version" } : profile));
        await sync.syncNow();
        const names = runtime.controller.getSnapshot().profiles.map(profile => profile.name);
        assert.ok(names.includes("Mobile conflicting version"));
        assert.ok(names.includes("Desktop conflicting version"));
        assert.deepEqual((await server.read("integration-owner")).profiles, api.plugin.storage.lanLink.base);
        assert.deepEqual(runtime.controller.getSnapshot().activeProfile, published, "Sync leaves the already published snapshot intact");
        assert.equal(events.length, 1, "Conflict resolution does not publish or clear activity");
        assert.ok(wireBodies.length >= 4);
        assert.ok(wireBodies.every(body => !body.includes("integration-owner") && !body.includes("profiles") && !body.includes("conflicting version")));
    } finally {
        sync.stop();
        runtime.stop();
        await server.stop();
        await rm(directory, { recursive: true, force: true });
    }
});
