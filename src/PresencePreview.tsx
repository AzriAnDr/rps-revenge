import { PresenceProfile, validateProfile } from "./shared/model";

declare const vendetta: any;
const { React, ReactNative: RN } = vendetta.metro.common;
const { View, Text, Image } = RN;
const typeNames: Record<number, string> = { 0: "Играет", 2: "Слушает", 3: "Смотрит", 5: "Соревнуется" };
const text = { color: "#f3f4fa", fontSize: 14 };

function Picture({ value, small = false, label }: { value: string; small?: boolean; label: string }) {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [value]);
    const external = /^https?:\/\//i.test(value);
    const size = small ? 28 : 76;
    return <View accessibilityLabel={label} style={{ width: size, height: size, borderRadius: small ? 14 : 10, backgroundColor: "#353844", alignItems: "center", justifyContent: "center", overflow: "hidden", ...(small ? { position: "absolute", right: -4, bottom: -4, borderWidth: 3, borderColor: "#252730" } : {}) }}>
        {external && !failed
            ? <Image source={{ uri: value }} resizeMode="cover" style={{ width: size, height: size }} onError={() => setFailed(true)} />
            : <Text style={{ color: "#aeb8ff", fontSize: small ? 14 : 20 }}>{value && !external ? "ASSET" : "✦"}</Text>}
    </View>;
}

/** Draft-only rendering: never publishes, saves or opens arbitrary URLs. */
export function PresencePreview({ profile }: { profile: PresenceProfile }) {
    const invalid = new Set(validateProfile(profile).map(issue => issue.field));
    return <View accessibilityLabel="Предпросмотр карточки активности" style={{ backgroundColor: "#252730", borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <Text style={[text, { fontWeight: "700", marginBottom: 12 }]}>{typeNames[profile.type]}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ marginRight: 16, marginBottom: 5 }}>
                <Picture value={invalid.has("largeImage") ? "" : profile.largeImage.trim()} label={profile.largeText || "Большая картинка"} />
                {!!profile.smallImage && <Picture value={invalid.has("smallImage") ? "" : profile.smallImage.trim()} label={profile.smallText || "Маленькая иконка"} small />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[text, { fontWeight: "700" }]}>{profile.name || "Название активности"}</Text>
                {!!profile.details && <Text style={text}>{profile.details}</Text>}
                {!!profile.state && <Text style={text}>{profile.state}</Text>}
                {profile.timer === "elapsed" && profile.type !== 5 && <Text style={[text, { color: "#b6bbce" }]}>◷ 00:00 с момента применения</Text>}
            </View>
        </View>
        {profile.buttons.filter(button => button.label).map((button, index) => <View key={index} style={{ backgroundColor: "#393c49", borderRadius: 6, padding: 10, marginTop: 8 }}><Text style={[text, { textAlign: "center" }]}>{button.label}</Text></View>)}
        <Text style={{ color: "#b6bbce", fontSize: 12, marginTop: 12 }}>Предпросмотр черновика. Ключи Art Asset отмечены ASSET; оформление и анимация GIF в Discord могут отличаться.</Text>
    </View>;
}
