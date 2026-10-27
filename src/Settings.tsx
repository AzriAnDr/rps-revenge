import type { StudioController, StudioSnapshot } from "./shared/controllerCore";
import { cloneProfile, createProfile, PresenceProfile } from "./shared/model";
import { SyncPanel } from "./SyncPanel";
import { BUILD, diagnosticReport } from "./diagnostics";
import type { createMobileSync } from "./lanMobile";

declare const vendetta: any;
const { React, ReactNative: RN } = vendetta.metro.common;
const { ScrollView, Text, TextInput, Pressable, Switch, View, Alert } = RN;
const colors = { background: "#17181d", panel: "#252730", text: "#f3f4fa", muted: "#b6bbce", accent: "#6476ee", error: "#ffacb5" };
const styles = {
    heading: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 10 },
    text: { color: colors.text, fontSize: 15 },
    hint: { color: colors.muted, fontSize: 13, marginBottom: 10 },
    row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    input: { color: colors.text, backgroundColor: colors.panel, borderColor: "#535869", borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginTop: 6, marginBottom: 12 },
};

function Button({ title, onPress, selected = false, disabled = false, danger = false }: any) {
    return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
        style={{ minHeight: 46, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: selected ? colors.accent : colors.panel, opacity: disabled ? 0.45 : 1 }}>
        <Text style={{ color: danger ? colors.error : colors.text, fontSize: 15 }}>{title}</Text>
    </Pressable>;
}

function Field({ label, value, onChange, placeholder = "", maxLength = 128, url = false, multiline = false }: any) {
    return <View><Text style={styles.text}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={colors.muted} maxLength={maxLength} multiline={multiline}
        autoCapitalize={url ? "none" : "sentences"} autoCorrect={!url} keyboardType={url ? "url" : "default"}
        selectionColor={colors.accent} style={[styles.input, multiline ? { minHeight: 160, textAlignVertical: "top" } : {}]} /></View>;
}

function copy(profile: PresenceProfile): PresenceProfile {
    return { ...profile, buttons: profile.buttons.map(button => ({ ...button })) };
}

export function Settings({ controller, sync }: { controller: StudioController; sync?: ReturnType<typeof createMobileSync>; }) {
    const [snapshot, setSnapshot] = React.useState(() => controller.getSnapshot()) as [StudioSnapshot, (value: StudioSnapshot) => void];
    const [draft, setDraft] = React.useState(() => copy(controller.getSnapshot().profiles[0] ?? createProfile())) as [PresenceProfile, (value: any) => void];
    const [baseline, setBaseline] = React.useState(() => JSON.stringify(draft));
    const [error, setError] = React.useState("");
    const [notice, setNotice] = React.useState("");
    const [json, setJson] = React.useState("");
    const dirty = JSON.stringify(draft) !== baseline;
    React.useEffect(() => {
        const refresh = () => setSnapshot(controller.getSnapshot());
        const unsubscribe = controller.subscribe(refresh);
        refresh();
        return unsubscribe;
    }, [controller]);
    React.useEffect(() => {
        const current = snapshot.profiles.find(profile => profile.id === draft.id);
        if (JSON.stringify(draft) !== baseline) return;
        if (current && JSON.stringify(current) !== baseline) {
            setDraft(copy(current)); setBaseline(JSON.stringify(current));
        } else if (!current) {
            const next = snapshot.profiles[0] ?? createProfile();
            setDraft(copy(next)); setBaseline(JSON.stringify(next));
        }
    }, [snapshot.profiles]);

    async function run(action: () => unknown) {
        setError(""); setNotice("");
        try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    }
    function select(profile: PresenceProfile) {
        setDraft(copy(profile)); setBaseline(JSON.stringify(profile)); setError(""); setNotice("");
    }
    function replaceDraft(action: () => void) {
        if (!dirty) { void run(action); return; }
        Alert.alert("Несохранённые изменения", "Перейти и отменить изменения в редакторе?", [
            { text: "Остаться", style: "cancel" },
            { text: "Отменить изменения", style: "destructive", onPress: () => void run(action) }
        ]);
    }
    function patch(field: keyof PresenceProfile, value: unknown) { setDraft((current: PresenceProfile) => ({ ...current, [field]: value })); }
    function save() { controller.saveProfile(draft); setBaseline(JSON.stringify(draft)); }
    const field = (key: keyof PresenceProfile, label: string, maxLength = 128, url = false, placeholder = "") =>
        <Field label={label} value={draft[key]} onChange={(value: string) => patch(key, value)} maxLength={maxLength} url={url} placeholder={placeholder} />;

    return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Rich Presence Studio</Text>
        <Text style={styles.hint}>Сборка {BUILD}</Text>
        <Button title="Копировать диагностику RPS" onPress={() => void run(() => { vendetta.metro.common.clipboard.setString(diagnosticReport()); setNotice("Диагностика скопирована. В ней версия, названия компонентов и этап отправки; профилей и кодов подключения нет."); })} />
        <Text style={styles.hint}>Профили хранятся на этом устройстве. Можно включить синхронизацию по Wi-Fi или переносить JSON вручную.</Text>
        {sync && <SyncPanel sync={sync} />}
        <Text accessibilityLiveRegion="polite" style={{ color: snapshot.phase === "error" ? colors.error : colors.text, marginBottom: 12 }}>{snapshot.message}</Text>
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" selectable style={{ color: colors.error, marginBottom: 12 }}>{error}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={styles.hint}>{notice}</Text>}
        {!snapshot.sharingEnabled && <Text style={{ color: colors.error, marginBottom: 12 }}>Показ активности в Discord выключен или его настройку не удалось определить. Проверь настройки конфиденциальности активности.</Text>}
        {snapshot.conflict && <Text style={{ color: colors.error, marginBottom: 12 }}>Обнаружена другая пользовательская активность. Отключи её, если карточки конфликтуют.</Text>}

        <Text style={styles.heading}>Сохранённые профили</Text>
        <View style={styles.row}>{snapshot.profiles.map(profile => <Button key={profile.id} title={`${profile.label}${snapshot.activeProfile?.id === profile.id ? " · активен" : ""}`} selected={profile.id === draft.id}
            onPress={() => { if (profile.id !== draft.id) replaceDraft(() => select(profile)); }} />)}</View>
        <View style={styles.row}>
            <Button title="Новый" onPress={() => replaceDraft(() => select(createProfile()))} />
            <Button title="Дублировать" onPress={() => void run(() => { const next = cloneProfile(draft); controller.saveProfile(next); select(next); })} />
            <Button title="Удалить" danger disabled={!snapshot.profiles.some(profile => profile.id === draft.id)} onPress={() => Alert.alert("Удалить профиль?", `«${draft.label}» будет удалён. Если он активен, показ выключится.`, [
                { text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => void run(() => { controller.removeProfile(draft.id); select(controller.getSnapshot().profiles[0] ?? createProfile()); }) }
            ])} />
        </View>

        <Text style={styles.heading}>Редактор{dirty ? " · есть изменения" : ""}</Text>
        {field("label", "Название профиля", 60)}
        {field("name", "Название активности")}
        {field("details", "Подробности")}
        {field("state", "Состояние")}
        {field("applicationId", "Application ID", 21, true, "Пустое поле — стандартное приложение")}
        <Text style={styles.hint}>Стандартный ID уже задан в новом профиле. Для своих Art Assets укажи ID своего приложения.</Text>
        <Text style={styles.text}>Тип активности</Text>
        <View style={[styles.row, { marginTop: 8 }]}>{([[0, "Играет"], [2, "Слушает"], [3, "Смотрит"], [5, "Соревнуется"]] as const).map(([value, label]) =>
            <Button key={value} title={label} selected={draft.type === value} onPress={() => patch("type", value)} />)}</View>
        <Text style={styles.heading}>Изображения</Text>
        <Text style={styles.hint}>Вставь прямую http(s)-ссылку на изображение или ключ Art Asset. Ссылка на страницу сайта не подойдёт.</Text>
        {field("largeImage", "Большое изображение: URL / ключ", 512, true)}
        {field("largeText", "Подпись большого изображения")}
        {field("smallImage", "Маленькое изображение: URL / ключ", 512, true)}
        {field("smallText", "Подпись маленького изображения")}

        <Text style={styles.heading}>Кнопки · максимум 2</Text>
        <Text style={styles.hint}>Обычные emoji можно вставлять прямо в текст кнопки. Заполни и текст, и URL. Собственные кнопки Discord может не показывать тебе.</Text>
        {draft.buttons.map((button, index) => <View key={index} style={{ marginBottom: 12 }}>
            <Field label={`Кнопка ${index + 1}: emoji и текст`} value={button.label} maxLength={31} onChange={(value: string) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, label: value } : item))} />
            <Field label={`Кнопка ${index + 1}: URL`} value={button.url} maxLength={512} url onChange={(value: string) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, url: value } : item))} />
            <Button title={`Убрать кнопку ${index + 1}`} danger onPress={() => patch("buttons", draft.buttons.filter((_, i) => i !== index))} />
        </View>)}
        <Button title="Добавить кнопку" disabled={draft.buttons.length >= 2} onPress={() => patch("buttons", [...draft.buttons, { label: "", url: "" }])} />
        <Text style={styles.heading}>Таймер</Text>
        <View style={styles.row}><Button title="Без таймера" selected={draft.timer === "none"} onPress={() => patch("timer", "none")} /><Button title="С момента применения" selected={draft.timer === "elapsed"} onPress={() => patch("timer", "elapsed")} /></View>
        {draft.type === 5 && <Text style={styles.hint}>Для типа «Соревнуется» таймер не отображается.</Text>}
        <View style={[styles.row, { marginTop: 18 }]}>
            <Button title="Сохранить" onPress={() => void run(save)} />
            <Button title={snapshot.phase === "applying" ? "Применяется…" : "Применить"} selected disabled={snapshot.phase === "applying"} onPress={() => void run(async () => { const applied = copy(draft); await controller.applyProfile(applied); setBaseline(JSON.stringify(applied)); })} />
            <Button title="Выключить" danger onPress={() => void run(() => controller.disable())} />
        </View>
        <Text style={styles.hint}>«Сохранить» сохраняет редактор. «Применить» сохраняет и отправляет карточку в Discord.</Text>
        <Text accessibilityLiveRegion="polite" selectable style={{ color: error || snapshot.phase === "error" ? colors.error : colors.text, marginBottom: 12 }}>{error || snapshot.message}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12 }}><Text style={[styles.text, { flex: 1 }]}>Автоматически восстанавливать карточку</Text><Switch accessibilityLabel="Автоматически восстанавливать карточку" value={snapshot.restoreOnStart} onValueChange={(value: boolean) => void run(() => controller.setRestoreOnStart(value))} /></View>
        <Text style={styles.hint}>Восстанавливает карточку при запуске Discord и возвращении из фона. Если Android остановит Discord, плагин не сможет поддерживать показ до следующего запуска.</Text>

        <Text style={styles.heading}>Перенос профилей</Text>
        <Text style={styles.hint}>Экспорт содержит сохранённые профили. Сначала сохрани изменения. Импорт добавляет профили, сохраняя существующие.</Text>
        <Field label="JSON профилей" value={json} onChange={setJson} multiline url maxLength={1048577} placeholder="Вставь JSON с ПК или другого телефона" />
        <View style={styles.row}>
            <Button title="Импортировать JSON" onPress={() => void run(() => { controller.importProfiles(json); setNotice("Профили добавлены. Выбери нужный выше."); })} />
            <Button title="Показать экспорт" onPress={() => void run(() => setJson(controller.exportProfiles()))} />
            <Button title="Копировать экспорт" onPress={() => void run(async () => {
                const exported = controller.exportProfiles(); setJson(exported);
                const clipboard = vendetta.metro.common.clipboard;
                if (!clipboard?.setString) throw new Error("Буфер обмена недоступен. Скопируй JSON из поля вручную.");
                await clipboard.setString(exported); setNotice("Экспорт скопирован в буфер обмена.");
            })} />
        </View>
    </ScrollView>;
}

export default Settings;
