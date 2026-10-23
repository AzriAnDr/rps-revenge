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
test("shortcut preserves original actions, opens settings and unpatches on unload", () => {
    const hooks: any[] = [], pushes: any[] = []; let removed = 0;
    const React = { createElement: element, cloneElement: (e: any, p: any, ...children: any[]) => element(e.type, { ...e.props, ...p }, ...children) };
    const api: any = { metro: { common: { React, ReactNative: { Pressable: "Pressable", Text: "Text" }, NavigationNative: { useNavigation: () => ({ push: (...args: any[]) => pushes.push(args) }) } }, findByProps: () => ({ jsx() {}, jsxs() {} }) }, patcher: { after: (_method: string, _obj: any, cb: any) => { hooks.push(cb); return () => { removed++; }; } } };
    const render = () => null, shortcut = createProfileShortcut(api, render);
    shortcut.start(); shortcut.start(); assert.equal(hooks.length, 3);
    const original = row(), enhanced = hooks[0]([], original);
    assert.equal(original.props.children.length, 3); assert.equal(enhanced.props.children.length, 4);
    assert.equal(enhanced.props.children[0], original.props.children[0]);
    assert.equal(hooks[1]([], enhanced), undefined);
    const button = enhanced.props.children[3].type(); button.props.onPress();
    assert.deepEqual(pushes, [["BUNNY_CUSTOM_PAGE", { title: "Rich Presence Studio", render }]]);
    shortcut.stop(); assert.equal(removed, 3); assert.equal(hooks[0]([], original), undefined);
});
