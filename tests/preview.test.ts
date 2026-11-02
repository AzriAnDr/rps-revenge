import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createProfile } from "../src/shared/model";

const element = (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children } });
const React = { createElement: element, useState: () => [false, () => {}], useEffect() {} };
const api = { metro: { common: { React, ReactNative: { Text: "Text", View: "View", Image: "Image" } } } };
const bundled = await build({ entryPoints: ["src/PresencePreview.tsx"], bundle: true, write: false, format: "cjs", jsxFactory: "React.createElement" });
const module: any = { exports: {} };
new Function("vendetta", "exports", "module", bundled.outputFiles[0].text)(api, module.exports, module);
const preview = (profile: any) => module.exports.PresencePreview({ profile });
function expand(node: any): any {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props.children) } };
}
const flatten = (node: any): any[] => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === "object" ? [node, ...flatten(node.props?.children)] : [node];

test("preview renders unsaved text, images, buttons and elapsed placeholder", () => {
    const p = { ...createProfile(), name: "Draft 🐾", details: "Details", state: "State", type: 3, largeImage: "https://files.catbox.moe/abc.gif", smallImage: "https://i.img402.dev/icon.png", timer: "elapsed", buttons: [{ label: "Hello", url: "https://example.com" }] };
    const nodes = flatten(expand(preview(p)));
    for (const expected of ["Draft 🐾", "Details", "State", "Смотрит", "Hello", "◷ 00:00 с момента применения"]) assert.ok(nodes.includes(expected), expected);
    assert.deepEqual(nodes.filter(n => n?.type === "Image").map(n => n.props.source.uri), [p.largeImage, p.smallImage]);
    assert.equal(nodes.some(n => n?.props?.onPress), false, "preview never publishes or opens links");
});

test("preview rejects local/bad image URLs and represents application asset keys", () => {
    const nodes = flatten(expand(preview({ ...createProfile(), largeImage: "http://127.0.0.1/private.png", smallImage: "my_icon" })));
    assert.equal(nodes.filter(n => n?.type === "Image").length, 0);
    assert.ok(nodes.includes("ASSET"));
});

test("competing activity and disabled timers do not show elapsed time", () => {
    for (const change of [{ type: 5, timer: "elapsed" }, { type: 0, timer: "none" }]) {
        assert.equal(flatten(expand(preview({ ...createProfile(), ...change }))).includes("◷ 00:00 с момента применения"), false);
    }
});
