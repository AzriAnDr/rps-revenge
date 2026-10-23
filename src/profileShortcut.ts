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
        const p = value.props;
        if (!p) return;
        clickable ||= typeof p.onPress === "function";
        for (const name of ["label", "text", "title", "accessibilityLabel", "children"]) visit(p[name], depth + 1);
    }
    visit(root, 0);
    return { labels, clickable };
}

export function isProfileActionRow(element: any): boolean {
    const children = element?.props?.children;
    if (!Array.isArray(children) || children.length !== 3 || children.some(c => c?.key === KEY)) return false;
    const descriptions = children.map(describe);
    return descriptions.every(d => d.clickable) && groups.every(group => descriptions.some(d => [...d.labels].some(label => group.has(label))));
}

export function createProfileShortcut(api: any, renderSettings: () => any) {
    const { React, ReactNative: RN, NavigationNative } = api.metro.common;
    let active = false, editing = false;
    const unpatch: (() => void)[] = [];
    function Shortcut() {
        const navigation = NavigationNative.useNavigation();
        return React.createElement(RN.Pressable, {
            accessibilityRole: "button", accessibilityLabel: "Rich Presence Studio — настроить статус",
            onPress: () => navigation.push("BUNNY_CUSTOM_PAGE", { title: "Rich Presence Studio", render: renderSettings }),
            style: { minWidth: 56, minHeight: 60, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }
        }, React.createElement(RN.Text, { style: { color: "#aeb8ff", fontSize: 25 } }, "✦"),
        React.createElement(RN.Text, { style: { color: "#eeeeee", fontSize: 12, marginTop: 4 } }, "RPS"));
    }
    function inject(_args: unknown[], element: any) {
        if (!active || editing) return;
        try {
            if (!isProfileActionRow(element)) return;
            editing = true;
            return React.cloneElement(element, {}, ...element.props.children, React.createElement(Shortcut, { key: KEY }));
        } catch (e) { api.logger?.error?.("RPS profile shortcut", e); }
        finally { editing = false; }
    }
    return {
        start() {
            if (active || !api.patcher?.after || !NavigationNative?.useNavigation) return;
            active = true;
            try {
                const jsx = api.metro.findByProps("jsx", "jsxs");
                for (const method of ["jsx", "jsxs"]) if (typeof jsx?.[method] === "function") unpatch.push(api.patcher.after(method, jsx, inject));
                if (typeof React.createElement === "function") unpatch.push(api.patcher.after("createElement", React, inject));
            } catch (e) { this.stop(); api.logger?.error?.("RPS profile shortcut unavailable", e); }
        },
        stop() { active = false; for (const undo of unpatch.splice(0).reverse()) undo(); }
    };
}
