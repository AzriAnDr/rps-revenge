import test from "node:test";
import assert from "node:assert/strict";
import { createProfileShortcut, isProfileActionRow } from "../src/profileShortcut";
const element = (type: any, props: any, ...children: any[]) => ({ type, key: props?.key, props: { ...props, ...(children.length ? { children } : {}) } });
const row = (labels = ["Задания", "Магазин", "Настройки"]) => element("View", {}, ...labels.map(label => element("Button", { label, onPress() {} })));
test("matches the three profile actions, not arbitrary settings or text", () => {
    assert.ok(isProfileActionRow(row()));
    assert.ok(isProfileActionRow(row(["Quests", "Shop", "Settings"])));
    assert.equal(isProfileActionRow(row(["Home", "Shop", "Settings"])), false);
    const textOnly = row(); textOnly.props.children.forEach((c: any) => delete c.props.onPress);
    assert.equal(isProfileActionRow(textOnly), false);
    assert.equal(isProfileActionRow({ props: { children: null } }), false);
});
test("matches observed Discord icons with hidden labels and a separate shop component", () => {
    function QuestsIcon() {} function SettingsIcon() {} function CollectiblesShopEntryButton() {}
    const observed = element("View", {}, null, [
        element("Button", { onPress() {}, icon: QuestsIcon }),
        element(CollectiblesShopEntryButton, {}),
        element("Button", { onPress() {} }, element(SettingsIcon, {}))
    ]);
    assert.ok(isProfileActionRow(observed));
    observed.props.children[1][1] = element("OtherButton", {});
    assert.equal(isProfileActionRow(observed), false);
});
// Small state/effect harness: exercise the actual injected component and its
// press/back/unload handlers without pretending to render a native Android UI.
function fixture() {
    const hooks: any[] = [], cleanups: any[] = []; let removed = 0, open = false, mounted = false;
    const React = {
        Fragment: "Fragment", createElement: element,
        cloneElement: (e: any, p: any, ...children: any[]) => element(e.type, { ...e.props, ...p }, ...children),
        useState: () => [open, (value: boolean) => { open = value; }],
        useEffect: (effect: () => any) => { if (!mounted) { mounted = true; cleanups.push(effect()); } }
    };
    const api: any = {
        metro: {
            common: { React, ReactNative: { Pressable: "Pressable", Text: "Text", View: "View", SafeAreaView: "SafeAreaView", Modal: "Modal" } },
            findByProps: (prop: string) => { assert.equal(prop, "jsx"); return { jsx() {}, jsxs() {} }; }
        },
        patcher: { after: (_method: string, _obj: any, cb: any) => { hooks.push(cb); return () => { removed++; }; } }
    };
    const render = () => null, shortcut = createProfileShortcut(api, render);
    shortcut.start(); shortcut.start(); assert.equal(hooks.length, 3);
    const original = row(), enhanced = hooks[0]([], original);
    const component = enhanced.props.children[3].type;
    return { hooks, cleanups, shortcut, original, enhanced, component, render, removed: () => removed };
}

test("shortcut preserves actions and opens its own editor without a navigation route", () => {
    const f = fixture();
    assert.equal(f.original.props.children.length, 3); assert.equal(f.enhanced.props.children.length, 4);
    assert.equal(f.enhanced.props.children[0], f.original.props.children[0]);
    assert.equal(f.hooks[1]([], f.enhanced), undefined);
    let output = f.component();
    assert.equal(output.props.children[1], false);
    output.props.children[0].props.onPress();
    output = f.component();
    const modal = output.props.children[1];
    assert.equal(modal.type, "Modal"); assert.equal(modal.props.visible, true);
    assert.equal(modal.props.children[0].props.children[1].type, f.render);
    modal.props.onRequestClose();
    assert.equal(f.component().props.children[1], false);
    f.shortcut.stop(); assert.equal(f.removed(), 3);
});

test("close button and plugin unload dismiss editor; stale button cannot reopen it", () => {
    const f = fixture(), button = f.component().props.children[0];
    button.props.onPress();
    const modal = f.component().props.children[1];
    const header = modal.props.children[0].props.children[0];
    header.props.children[1].props.onPress();
    assert.equal(f.component().props.children[1], false);
    button.props.onPress(); assert.equal(f.component().props.children[1].type, "Modal");
    f.shortcut.stop();
    assert.equal(f.component().props.children[1], false);
    button.props.onPress(); assert.equal(f.component().props.children[1], false);
    assert.equal(f.hooks[0]([], row()), undefined);
    for (const cleanup of f.cleanups) cleanup();
});
