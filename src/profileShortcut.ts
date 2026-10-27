import { observeComponent, recordMatch, setHookCount } from "./diagnostics";
const KEY = "rps-profile-shortcut";
const groups = [new Set(["quests", "задания"]), new Set(["shop", "магазин"]), new Set(["settings", "настройки"])];

// Inspect element props only. Never invoke Discord components or hooks while matching.
function describe(root: any) {
    const labels = new Set<string>();
    let clickable = false, remaining = 40;
    function visit(value: any, depth: number) {
        if (--remaining < 0 || depth > 5 || value == null) return;
        if (typeof value === "string") { labels.add(value.trim().toLowerCase()); return; }
        if (Array.isArray(value)) { value.forEach(v => visit(v, depth + 1)); return; }
        const type = value.type ?? value;
        const typeName = type?.displayName || type?.name || type?.render?.name;
        if (typeName === "QuestsIcon") labels.add("quests");
        if (typeName === "ShopIcon" || typeName === "CollectiblesShopEntryButton") labels.add("shop");
        if (typeName === "SettingsIcon") labels.add("settings");
        const p = value.props;
        if (!p) return;
        clickable ||= typeof p.onPress === "function";
        for (const name of ["label", "text", "title", "accessibilityLabel", "icon", "Icon", "children"]) visit(p[name], depth + 1);
    }
    visit(root, 0);
    return { labels, clickable };
}

export function isProfileActionRow(element: any): boolean {
    const children = element?.props?.children;
    if (!Array.isArray(children) || children.some(c => c?.key === KEY)) return false;
    const visible = children.flat(2).filter(c => c != null && c !== false);
    if (visible.length !== 3) return false;
    const descriptions = visible.map(describe);
    return descriptions.filter(d => d.clickable).length >= 2 && groups.every(group => descriptions.some(d => [...d.labels].some(label => group.has(label))));
}

export function createProfileShortcut(api: any, renderSettings: () => any) {
    const { React, ReactNative: RN } = api.metro.common;
    let active = false, editing = false;
    const unpatch: (() => void)[] = [];
    function openSettings() {
        try {
            // Match Revenge's settings/patches/shared.tsx: the profile's local
            // navigator need not be a stack or own the custom settings route.
            const navigation = api.metro.findByProps("getRootNavigationRef")?.getRootNavigationRef();
            if (typeof navigation?.navigate !== "function") throw new Error("Root navigation unavailable");
            navigation.navigate("BUNNY_CUSTOM_PAGE", { title: "Rich Presence Studio", render: renderSettings });
        } catch (e) {
            api.logger?.error?.("RPS settings navigation", e);
            RN.Alert?.alert?.("Rich Presence Studio", "Не удалось открыть настройки RPS. Открой их через Revenge → Plugins → Rich Presence Studio.");
        }
    }
    function Shortcut() {
        return React.createElement(RN.Pressable, {
            accessibilityRole: "button", accessibilityLabel: "Rich Presence Studio — настроить статус",
            onPress: openSettings,
            hitSlop: { top: 6, bottom: 6, left: 4, right: 4 },
            style: { minWidth: 56, height: 44, flex: 1, alignSelf: "flex-start", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 6 }
        }, React.createElement(RN.Text, { style: { color: "#aeb8ff", fontSize: 24, lineHeight: 24, height: 24, includeFontPadding: false, textAlign: "center" } }, "✦"),
        React.createElement(RN.Text, { style: { color: "#eeeeee", fontSize: 12, lineHeight: 16, fontWeight: "600", includeFontPadding: false, marginTop: 4 } }, "RPS"));
    }
    function inject(_args: unknown[], element: any) {
        if (!active || editing) return;
        try {
            observeComponent(element);
            if (!isProfileActionRow(element)) return;
            recordMatch();
            editing = true;
            return React.cloneElement(element, {}, ...element.props.children, React.createElement(Shortcut, { key: KEY }));
        } catch (e) { api.logger?.error?.("RPS profile shortcut", e); }
        finally { editing = false; }
    }
    return {
        start() {
            if (active || !api.patcher?.after) return;
            active = true;
            try {
                const jsx = api.metro.findByProps("jsx", "jsxs");
                for (const method of ["jsx", "jsxs"]) if (typeof jsx?.[method] === "function") unpatch.push(api.patcher.after(method, jsx, inject));
                if (typeof React.createElement === "function") unpatch.push(api.patcher.after("createElement", React, inject));
                setHookCount(unpatch.length);
            } catch (e) { this.stop(); api.logger?.error?.("RPS profile shortcut unavailable", e); }
        },
        stop() { active = false; for (const undo of unpatch.splice(0).reverse()) undo(); setHookCount(0); }
    };
}
