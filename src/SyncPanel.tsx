import type { createMobileSync } from "./lanMobile";
declare const vendetta: any;
const { React, ReactNative: RN } = vendetta.metro.common;
export function SyncPanel({ sync }: { sync: ReturnType<typeof createMobileSync> }) {
    const [code, setCode] = React.useState("");
    const [error, setError] = React.useState("");
    const [, refresh] = React.useState(0);
    React.useEffect(() => sync.subscribe(() => refresh((n: number) => n + 1)), [sync]);
    const button = (title: string, action: () => unknown) => <RN.Pressable accessibilityRole="button" onPress={async () => { try { setError(""); await action(); refresh((n: number) => n + 1); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } }} style={{ backgroundColor: "#5266c8", padding: 12, borderRadius: 8, marginVertical: 6 }}><RN.Text style={{ color: "white" }}>{title}</RN.Text></RN.Pressable>;
    return <RN.View style={{ marginVertical: 18 }}>
        <RN.Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>Синхронизация по Wi-Fi</RN.Text>
        <RN.Text style={{ color: "#b6bbce", marginVertical: 8 }}>На ПК включи Wi-Fi-синхронизацию в редакторе RPS и скопируй код. Здесь должен быть тот же аккаунт Discord. Синхронизируются только сохранённые профили.</RN.Text>
        <RN.TextInput accessibilityLabel="Секретный код подключения" placeholder="Вставь код с ПК" placeholderTextColor="#b6bbce" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry style={{ color: "white", backgroundColor: "#252730", padding: 12, borderRadius: 8 }} />
        {button("Подключить", async () => { await sync.connect(code); setCode(""); })}
        {sync.enabled() && button("Синхронизировать сейчас", () => sync.syncNow())}
        {sync.enabled() && button("Выключить синхронизацию", () => sync.disconnect())}
        <RN.Text accessibilityLiveRegion="polite" style={{ color: error ? "#ffacb5" : "#b6bbce" }}>{error || sync.status()}</RN.Text>
    </RN.View>;
}
