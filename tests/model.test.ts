/*
 * Rich Presence Studio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APPLICATION_ID, resolveApplicationId } from "../src/shared/application";

import {
    cloneProfile,
    createProfile,
    EXPORT_FORMAT,
    MAX_IMPORT_BYTES,
    MAX_PROFILES,
    parseImport,
    sanitizeProfile,
    serializeProfiles,
    validateProfile
} from "../src/shared/model";

function document(profiles: unknown[], version = 1) {
    return JSON.stringify({ format: EXPORT_FORMAT, version, profiles });
}

test("neutral profile can be applied with no application ID or account credentials", () => {
    const first = createProfile();
    const second = createProfile();
    assert.notEqual(first.id, second.id);
    assert.equal(first.applicationId, DEFAULT_APPLICATION_ID);
    assert.deepEqual(validateProfile(first, { forApply: true }), []);
    assert.equal(Object.hasOwn(first, "token"), false);
});

test("drafts retain incomplete configuration, while Apply validates required pieces", () => {
    const profile = createProfile();
    profile.name = "";
    profile.largeImage = "portrait";
    profile.buttons = [{ label: "Мой проект", url: "" }];
    assert.deepEqual(validateProfile(profile), []);
    assert.deepEqual(sanitizeProfile(profile), profile);
    const fields = validateProfile(profile, { forApply: true }).map(issue => issue.field);
    assert.ok(fields.includes("name"));
    assert.ok(!fields.includes("applicationId"));
    assert.ok(fields.includes("buttons.0"));
});

test("empty application ID supports images through the shared app while invalid explicit IDs fail", () => {
    const profile = createProfile();
    for (const field of ["largeImage", "smallImage"] as const) {
        for (const image of ["https://images.example.com/portrait.png", "portrait"]) {
            profile[field] = image;
            profile.applicationId = "";
            assert.deepEqual(validateProfile(profile), []);
            assert.deepEqual(validateProfile(profile, { forApply: true }), []);
            profile.applicationId = "123456789012345678";
            assert.deepEqual(validateProfile(profile, { forApply: true }), []);
            profile[field] = "";
        }
    }
    profile.applicationId = "";
    assert.deepEqual(validateProfile(profile, { forApply: true }), []); // Text-only remains usable.
    profile.applicationId = "0";
    assert.ok(validateProfile(profile).some(issue => issue.field === "applicationId"));
});

test("Cyrillic text uses the same 128 JS-unit limit as upstream, not 128 UTF-8 bytes", () => {
    const profile = createProfile();
    profile.details = "я".repeat(128);
    assert.deepEqual(validateProfile(profile), []);
    profile.details += "я";
    assert.ok(validateProfile(profile).some(issue => issue.field === "details"));
    profile.details = "🙂".repeat(64);
    assert.deepEqual(validateProfile(profile), []);
    profile.details += "🙂";
    assert.ok(validateProfile(profile).some(issue => issue.field === "details"));
});

test("invalid public fields and local file schemes never become activity assets", () => {
    const badImages = [
        "javascript:alert(1)", "data:image/png;base64,AAAA", "file:///tmp/avatar.png",
        "blob:https://example.com/avatar", "https://user:password@example.com/image.png",
        "http://localhost/image.png", "http://127.0.0.1/image.png", "http://2130706433/image.png",
        "http://10.0.0.1/image.png", "http://172.20.0.1/image.png", "http://192.168.1.1/image.png",
        "http://100.64.1.2/image.png", "http://169.254.169.254/image.png",
        "http://[::1]/image.png", "http://[::ffff:127.0.0.1]/image.png",
        "http://[fd00::1]/image.png", "http://printer.local/image.png",
        "https://cdn.discordapp.com/attachments/image.png",
        "https://media.discordapp.net/attachments/image.png",
        "https://imgur.com/album", "https://tenor.com/view/gif"
    ];
    for (const largeImage of badImages) {
        const profile = createProfile();
        profile.largeImage = largeImage;
        assert.ok(validateProfile(profile).some(issue => issue.field === "largeImage"), largeImage);
    }
});

test("public direct URLs, signed image URLs and public IPs remain usable", () => {
    for (const largeImage of [
        "https://i.imgur.com/image.png", "https://media.tenor.com/image.gif",
        "https://images.example.com/render?id=5&signature=abc", "https://8.8.8.8/image.png",
        "https://[2606:4700:4700::1111]/image.png"
    ]) {
        const profile = createProfile();
        profile.largeImage = largeImage;
        assert.deepEqual(validateProfile(profile), [], largeImage);
    }
});

test("button constraints reject unsafe schemes, overlong links and more than two buttons", () => {
    const profile = createProfile();
    profile.buttons = [{ label: "Проект", url: "javascript:alert(1)" }];
    assert.ok(validateProfile(profile).some(issue => issue.field === "buttons.0.url"));
    profile.buttons = [{ label: "а".repeat(32), url: "https://example.com" }];
    assert.ok(validateProfile(profile).some(issue => issue.field === "buttons.0.label"));
    profile.buttons = [{ label: "Проект", url: "https://example.com/" + "a".repeat(512) }];
    assert.ok(validateProfile(profile).some(issue => issue.field === "buttons.0.url"));
    profile.buttons = Array.from({ length: 3 }, () => ({ label: "Проект", url: "https://example.com" }));
    assert.ok(validateProfile(profile).some(issue => issue.field === "buttons"));
});

test("blank button rows are permitted but half-filled buttons cannot be applied", () => {
    const profile = createProfile();
    profile.buttons = [{ label: "", url: "" }, { label: "", url: "https://example.com" }];
    assert.deepEqual(validateProfile(profile), []);
    assert.ok(validateProfile(profile, { forApply: true }).some(issue => issue.field === "buttons.1"));
});

test("cloning is deep, assigns a new UUID and respects long emoji label boundaries", () => {
    const profile = createProfile("x" + "🙂".repeat(29));
    profile.buttons = [{ label: "Проект", url: "https://example.com" }];
    const clone = cloneProfile(profile);
    assert.notEqual(clone.id, profile.id);
    assert.ok(clone.label.endsWith(" — копия"));
    assert.ok(clone.label.length <= 60);
    assert.equal(/[\uD800-\uDBFF]$/.test(clone.label.slice(0, -" — копия".length)), false);
    clone.buttons[0].label = "Другой";
    assert.equal(profile.buttons[0].label, "Проект");
    assert.deepEqual(validateProfile(clone), []);
});

test("sanitizer preserves ID and strips unknown and prototype keys at every level", () => {
    const profile = createProfile();
    const incoming = JSON.parse(JSON.stringify(profile));
    incoming.token = "DO_NOT_KEEP";
    incoming.__proto__ = { polluted: true };
    incoming.constructor = { prototype: { polluted: true } };
    incoming.buttons = [{ label: "Проект", url: "https://example.com", token: "DO_NOT_KEEP", __proto__: { polluted: true } }];
    const clean = sanitizeProfile(incoming);
    assert.equal(clean.id, profile.id);
    assert.equal(Object.hasOwn(clean, "token"), false);
    assert.equal(Object.hasOwn(clean, "__proto__"), false);
    assert.equal(Object.hasOwn(clean, "constructor"), false);
    assert.deepEqual(Object.keys(clean.buttons[0]), ["label", "url"]);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("structurally malformed input is rejected rather than coerced", () => {
    const profile = createProfile();
    for (const malformed of [
        null, [], "profile", { ...profile, name: 42 }, { ...profile, type: "0" },
        { ...profile, type: 1 }, { ...profile, timer: true }, { ...profile, buttons: {} },
        { ...profile, buttons: [{ label: "text", url: null }] }, { ...profile, id: "__proto__" }
    ]) assert.throws(() => sanitizeProfile(malformed));
});

test("schema versions and foreign formats cannot be imported", () => {
    assert.throws(() => parseImport("not-json"), /JSON/);
    assert.throws(() => parseImport(document([createProfile()], 2)), /версия/);
    assert.throws(() => parseImport(JSON.stringify({ format: "foreign", version: 1, profiles: [] })), /формат/);
    assert.throws(() => parseImport("null"), /формат/);
});

test("import/export round trips saved drafts and assigns fresh IDs even for duplicates", () => {
    const profile = createProfile();
    profile.name = "";
    profile.largeImage = "draft_image_key";
    profile.buttons = [{ label: "Позже добавлю ссылку", url: "" }];
    const serialized = serializeProfiles([profile, profile]);
    const imported = parseImport(serialized, [profile.id]);
    assert.equal(imported.length, 2);
    assert.notEqual(imported[0].id, profile.id);
    assert.notEqual(imported[1].id, profile.id);
    assert.notEqual(imported[0].id, imported[1].id);
    assert.deepEqual({ ...imported[0], id: profile.id }, profile);
    assert.notStrictEqual(imported[0].buttons, imported[1].buttons);
});

test("malformed entries reject the complete import, without mutating existing profiles", () => {
    const existing = createProfile();
    const snapshot = JSON.stringify(existing);
    assert.throws(() => parseImport(document([existing, { ...existing, name: 5 }]), [existing.id]), /Профиль 2/);
    assert.equal(JSON.stringify(existing), snapshot);
});

test("import limits count UTF-8 bytes and cap profile counts", () => {
    assert.throws(() => parseImport(" ".repeat(MAX_IMPORT_BYTES + 1)), /1 МиБ/);
    const multiByte = JSON.stringify({ padding: "я".repeat(MAX_IMPORT_BYTES / 2 + 1) });
    assert.ok(multiByte.length < MAX_IMPORT_BYTES);
    assert.throws(() => parseImport(multiByte), /1 МиБ/);
    const tooMany = Array.from({ length: MAX_PROFILES + 1 }, () => createProfile());
    assert.throws(() => parseImport(document(tooMany)), /50/);
    assert.throws(() => serializeProfiles(tooMany), /50/);
});

test("export strips undocumented data without mutating original profiles", () => {
    const profile = Object.assign(createProfile(), { token: "DO_NOT_KEEP" });
    assert.equal(serializeProfiles([profile]).includes("DO_NOT_KEEP"), false);
    assert.equal(profile.token, "DO_NOT_KEEP");
});

test("application ID fallback never masks a malformed explicit override", () => {
    assert.equal(resolveApplicationId(), DEFAULT_APPLICATION_ID);
    assert.equal(resolveApplicationId(""), DEFAULT_APPLICATION_ID);
    assert.equal(resolveApplicationId("123456789012345678"), "123456789012345678");
    for (const invalid of ["0", "abc", " ", "123456789012345678 "]) assert.throws(() => resolveApplicationId(invalid));
});

