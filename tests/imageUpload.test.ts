import test from "node:test";
import assert from "node:assert/strict";
import { createImageUploader, MAX_IMAGE_BYTES } from "../src/imageUpload";

const image = (extra = {}) => ({ uri: "content://media/images/123", type: "image/png", size: 100, ...extra });
const reply = (body: string, status = 200) => ({ ok: status === 200, status, text: async () => body }) as Response;
const catbox = "https://files.catbox.moe/abc123.png";
const img402 = "https://i.img402.dev/abc-123.png";
function fixture(t: any, selection: any = image(), kind = "old") {
    const calls: any[] = [], picks: any[] = [];
    function NativeFormData() {
        const parts: any[] = [];
        return { parts, append: (...args: any[]) => { parts.push(args); } };
    }
    t.mock.method(globalThis, "FormData", NativeFormData);
    t.mock.method(globalThis, "fetch", async (...args: any[]) => { calls.push(args); return reply(catbox); });
    const select = async (options: any) => { picks.push(options); if (selection instanceof Error) throw selection; return selection; };
    const picker = kind === "old" ? { pickSingle: select, isCancel: (e: any) => e.code === "DOCUMENT_PICKER_CANCELED" }
        : kind === "new" ? { pick: select, saveDocuments() {} }
        : { openPicker: select };
    const api = { metro: { findByProps: (...props: string[]) => props.every(prop => prop in picker) ? picker : undefined } };
    return { api, calls, picks };
}

test("uploads a native URI multipart file to Catbox without setting multipart headers", async t => {
    const f = fixture(t);
    assert.equal(await createImageUploader(f.api)(), catbox);
    assert.deepEqual(f.picks[0], { type: ["image/png", "image/jpeg", "image/gif", "image/webp"], allowMultiSelection: false, mode: "import" });
    assert.equal(f.calls[0][0], "https://catbox.moe/user/api.php");
    const request = f.calls[0][1];
    assert.deepEqual(request.body.parts, [["reqtype", "fileupload"], ["fileToUpload", { uri: "content://media/images/123", type: "image/png", name: "presence.png" }]]);
    assert.equal(request.headers, undefined);
    assert.equal(request.signal.aborted, false);
});

test("supports new document picker arrays and GIF/WebP/JPEG plus native paths", async t => {
    const f = fixture(t, [image({ uri: "file:///storage/my image.gif", type: "image/gif" })], "new");
    await createImageUploader(f.api)();
    assert.equal(f.calls[0][1].body.parts[1][1].uri, "file:///storage/my image.gif");
    assert.equal(f.calls[0][1].body.parts[1][1].name, "presence.gif");
    for (const [mime, extension] of [["image/webp", "webp"], ["image/jpeg", "jpg"]]) {
        const crop = fixture(t, { path: "/storage/image", mime, size: 42 }, "crop");
        await createImageUploader(crop.api)();
        assert.equal(crop.calls[0][1].body.parts[1][1].name, `presence.${extension}`);
        assert.equal(crop.calls[0][1].body.parts[1][1].uri, "file:///storage/image");
    }
});

test("cancellation returns null and picker failures never upload", async t => {
    for (const selection of [null, [], Object.assign(new Error("cancel"), { code: "DOCUMENT_PICKER_CANCELED" }), Object.assign(new Error("cancel"), { code: "OPERATION_CANCELED" })]) {
        const f = fixture(t, selection);
        assert.equal(await createImageUploader(f.api)(), null);
        assert.equal(f.calls.length, 0);
    }
    const f = fixture(t, new Error("permission denied"));
    await assert.rejects(createImageUploader(f.api)(), /permission denied/);
    assert.equal(f.calls.length, 0);
    await assert.rejects(createImageUploader({ metro: { findByProps() {} } })(), /недоступен/);
});

test("rejects unsupported types, remote URIs, missing sizes and size overflow before upload", async t => {
    for (const extra of [{ type: "image/svg+xml" }, { type: "application/octet-stream" }, { type: "constructor" }, { uri: "https://example.org/a.png" }, { size: null }, { size: NaN }, { size: -1 }, { size: 0 }, { size: MAX_IMAGE_BYTES + 1 }, { size: 1.5 }, { isVirtual: true }, { error: "metadata failed" }]) {
        const f = fixture(t, image(extra));
        await assert.rejects(createImageUploader(f.api)());
        assert.equal(f.calls.length, 0);
    }
    const f = fixture(t, image({ size: MAX_IMAGE_BYTES }));
    assert.equal(await createImageUploader(f.api)(), catbox);
});

test("falls back after network errors and invalid provider URLs", async t => {
    for (const first of [new Error("offline"), "https://evil.test/x.png", "https://files.catbox.moe.evil.test/x.png", "http://files.catbox.moe/a.png", "https://files.catbox.moe/a.svg", "https://files.catbox.moe/a.png?x=1"]) {
        const f = fixture(t);
        t.mock.method(globalThis, "fetch", async (...args: any[]) => {
            f.calls.push(args);
            if (f.calls.length === 1) { if (first instanceof Error) throw first; return reply(first); }
            return reply(JSON.stringify({ url: img402, expiresAt: null }));
        });
        assert.equal(await createImageUploader(f.api)(), img402);
        assert.equal(f.calls[1][0], "https://img402.dev/api/free");
        assert.deepEqual(f.calls[1][1].body.parts, [["image", { uri: "content://media/images/123", type: "image/png", name: "presence.png" }]]);
    }
});

test("rejects invalid img402 responses and unexpected expiration", async t => {
    for (const payload of [null, {}, { url: "https://evil.test/a.png", expiresAt: null }, { url: img402 }, { url: img402, expiresAt: new Date(Date.now() + 86400000).toISOString() }]) {
        const f = fixture(t);
        t.mock.method(globalThis, "fetch", async () => reply(JSON.stringify(payload)));
        await assert.rejects(createImageUploader(f.api)(), /Не удалось загрузить/);
    }
    const f = fixture(t, image({ size: 2_000_000 }));
    let count = 0;
    t.mock.method(globalThis, "fetch", async () => ++count === 1 ? reply("fail", 503) : reply(JSON.stringify({ url: img402, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() })));
    assert.equal(await createImageUploader(f.api)(), img402);
});

test("does not send files exceeding img402's decimal byte limit to fallback", async t => {
    const f = fixture(t, image({ size: 10_000_001 }));
    t.mock.method(globalThis, "fetch", async (...args: any[]) => { f.calls.push(args); return reply("failed", 503); });
    await assert.rejects(createImageUploader(f.api)(), /10 000 000/);
    assert.equal(f.calls.length, 1);
});

test("bounds nonresponsive fetch and response body, even if native fetch ignores abort", async t => {
    for (const bodyHangs of [false, true]) {
        const f = fixture(t);
        t.mock.method(globalThis, "fetch", (...args: any[]) => {
            f.calls.push(args);
            if (bodyHangs) return Promise.resolve({ ok: true, text: () => new Promise(() => {}) } as any);
            return new Promise(() => {});
        });
        await assert.rejects(createImageUploader(f.api, { timeoutMs: 5 })(), /Не удалось загрузить/);
        assert.equal(f.calls.length, 2);
        assert.ok(f.calls.every(call => call[1].signal.aborted));
    }
});
