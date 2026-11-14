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

test("recognizes profile icons inside nested memo and forwardRef wrappers", () => {
    function QuestsIcon() {} function SettingsIcon() {} function CollectiblesShopEntryButton() {}
    const memo = (type: any) => ({ $$typeof: Symbol.for("react.memo"), displayName: "Memo", type });
    const forward = (render: any) => ({ $$typeof: Symbol.for("react.forward_ref"), render });
    const observed = element("View", {},
        element("Button", { onPress() {}, icon: memo(forward(QuestsIcon)) }),
        element(memo(CollectiblesShopEntryButton), {}),
        element("Button", { onPress() {} }, element(forward(memo(SettingsIcon)), {})));
    assert.ok(isProfileActionRow(observed));
    observed.props.children[2] = element("Button", { onPress() {}, icon: memo(function OtherIcon() {}) });
    assert.equal(isProfileActionRow(observed), false);
});

test("353.11 IconComponent actions allow optional Conjure and Nitro buttons", () => {
    function QuestsIcon() {} function SettingsIcon() {} function CollectiblesShopEntryButton() {}
    const actions = [
        element("YouScreenNavIcon", { IconComponent: QuestsIcon, onPress() {} }),
        element(CollectiblesShopEntryButton, { navigateToShop() {} }),
        element("YouScreenNavIcon", { IconComponent: SettingsIcon, onPress() {}, testID: "you_tab_settings_button" })
    ];
    for (const extra of [[], [element("ConjureYouScreenButton", {})], [element("ConjureYouScreenButton", {}), element("NitroButton", {})]]) {
        assert.ok(isProfileActionRow(element("YouScreenNavIconMeasurer", {}, ...extra, ...actions)));
    }
    assert.equal(isProfileActionRow(element("View", {}, ...actions.slice(0, 2), element("OtherButton", { onPress() {} }))), false);
});
// Small state/effect harness: exercise the actual injected component and its
// press/back/unload handlers without pretending to render a native Android UI.
function fixture(modern = false) {
    const hooks: any[] = [], cleanups: any[] = []; let removed = 0, open = false, mounted = false;
    const React = {
        Fragment: "Fragment", createElement: element,
        cloneElement: (e: any, p: any, ...children: any[]) => element(e.type, { ...e.props, ...p }, ...children),
        useState: () => [open, (value: boolean) => { open = value; }],
        useEffect: (effect: () => any) => { if (!mounted) { mounted = true; cleanups.push(effect()); } }
    };
    const profile = { default() {} }, runtime = { jsx() {}, jsxs() {} }, otherRuntime = { jsx() {}, jsxs() {} };
    const api: any = {
        metro: {
            common: { React, ReactNative: { Pressable: "Pressable", Text: "Text", View: "View", SafeAreaView: "SafeAreaView", Modal: "Modal" } },
            findByProps: (prop: string) => { assert.equal(prop, "jsx"); return runtime; },
            ...(modern ? { findByPropsAll: () => [runtime, otherRuntime, runtime], findByName: (name: string, defaultExport: boolean) => {
                assert.equal(name, "YouBannerDecorations"); assert.equal(defaultExport, false); return profile;
            } } : {})
        },
        patcher: { after: (_method: string, _obj: any, cb: any) => { hooks.push(cb); return () => { removed++; }; } }
    };
    const render = () => null, shortcut = createProfileShortcut(api, render);
    shortcut.start(); shortcut.start(); assert.equal(hooks.length, modern ? 6 : 3);
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

test("profile render hook reaches cached JSX trees and all hooks are removed", () => {
    const f = fixture(true);
    const original = element("View", {}, element("View", {}, element("YouScreenNavIconMeasurer", {}, ...row().props.children)));
    const enhanced = f.hooks[5]([], original);
    const actions = enhanced.props.children[0].props.children[0].props.children;
    assert.equal(actions.length, 4);
    assert.equal(actions[3].key, "rps-profile-shortcut");
    assert.equal(original.props.children[0].props.children[0].props.children.length, 3);
    const again = f.hooks[5]([], enhanced);
    assert.equal(again, enhanced);
    f.shortcut.stop(); assert.equal(f.removed(), 6);
    assert.equal(f.hooks[5]([], original), undefined);
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
