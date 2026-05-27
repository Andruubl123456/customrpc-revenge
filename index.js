// CustomRPC para Revenge (Bunny spec 3)
// Usa la API global `revenge` inyectada por el loader

const findByProps = revenge.metro.findByProps;
const { storage } = revenge.plugin;

// Valores por defecto
const defaults = {
    enabled: true,
    appName: "Custom Status",
    appID: "",
    details: "",
    state: "",
    type: 0,
    streamURL: "",
    largeImageKey: "",
    largeImageText: "",
    smallImageKey: "",
    smallImageText: "",
    buttonOneText: "",
    buttonOneURL: "",
    buttonTwoText: "",
    buttonTwoURL: "",
    startTimestamp: "",
    endTimestamp: "",
};

for (const [key, value] of Object.entries(defaults)) {
    if (storage[key] === undefined) storage[key] = value;
}

// Buscar FluxDispatcher de múltiples maneras para mayor compatibilidad
let FluxDispatcher =
    findByProps("dispatch", "subscribe", "_currentDispatchActionType") ||
    findByProps("dispatch", "subscribe", "isDispatching") ||
    findByProps("_dispatch", "subscribe");

if (!FluxDispatcher) {
    console.error("[CustomRPC] No se encontró FluxDispatcher");
}

function createActivity() {
    if (!storage.enabled || !storage.appName) return null;

    const activity = {
        name: storage.appName,
        type: Number(storage.type) || 0,
        flags: 1,
    };

    if (storage.appID && storage.appID.trim()) {
        activity.application_id = storage.appID.trim();
    }
    if (storage.details && storage.details.trim()) {
        activity.details = storage.details.trim();
    }
    if (storage.state && storage.state.trim()) {
        activity.state = storage.state.trim();
    }
    if (storage.type === 1 && storage.streamURL && storage.streamURL.trim()) {
        activity.url = storage.streamURL.trim();
    }

    const start = storage.startTimestamp ? parseInt(storage.startTimestamp) : null;
    const end = storage.endTimestamp ? parseInt(storage.endTimestamp) : null;
    if ((start && !isNaN(start)) || (end && !isNaN(end))) {
        activity.timestamps = {};
        if (start && !isNaN(start)) activity.timestamps.start = start;
        if (end && !isNaN(end)) activity.timestamps.end = end;
    }

    if (storage.largeImageKey || storage.smallImageKey) {
        activity.assets = {};
        if (storage.largeImageKey) {
            activity.assets.large_image = storage.largeImageKey;
            if (storage.largeImageText) activity.assets.large_text = storage.largeImageText;
        }
        if (storage.smallImageKey) {
            activity.assets.small_image = storage.smallImageKey;
            if (storage.smallImageText) activity.assets.small_text = storage.smallImageText;
        }
    }

    const buttons = [];
    const buttonURLs = [];
    if (storage.buttonOneText && storage.buttonOneText.trim()) {
        buttons.push(storage.buttonOneText.trim());
        if (storage.buttonOneURL) buttonURLs.push(storage.buttonOneURL.trim());
    }
    if (storage.buttonTwoText && storage.buttonTwoText.trim()) {
        buttons.push(storage.buttonTwoText.trim());
        if (storage.buttonTwoURL) buttonURLs.push(storage.buttonTwoURL.trim());
    }
    if (buttons.length > 0) {
        activity.buttons = buttons;
        if (buttonURLs.length > 0) activity.metadata = { button_urls: buttonURLs };
    }

    return activity;
}

function setActivity() {
    if (!FluxDispatcher) return;
    try {
        const activity = createActivity();
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: activity,
            socketId: "CustomRPC",
        });
    } catch (e) {
        console.error("[CustomRPC] Error al setear actividad:", e);
    }
}

function clearActivity() {
    if (!FluxDispatcher) return;
    try {
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: null,
            socketId: "CustomRPC",
        });
    } catch (e) {
        console.error("[CustomRPC] Error al limpiar actividad:", e);
    }
}

// ─── UI con React ───────────────────────────────────────────────────────────
const React = revenge.metro.findByProps("createElement", "useState", "useEffect");
const {
    View,
    Text,
    Switch,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} = revenge.metro.findByProps("View", "Text", "Switch");

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        color: "#8e9297",
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#2f3136",
    },
    label: { fontSize: 16, color: "#dcddde" },
    sublabel: { fontSize: 12, color: "#8e9297", marginTop: 2 },
    input: {
        borderWidth: 1,
        borderColor: "#40444b",
        borderRadius: 4,
        padding: 8,
        marginBottom: 8,
        color: "#dcddde",
        backgroundColor: "#2f3136",
        fontSize: 15,
    },
    inputLabel: { fontSize: 13, color: "#8e9297", marginBottom: 4 },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: "#5865f2",
        marginRight: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#5865f2",
    },
    radioLabel: { fontSize: 15, color: "#dcddde" },
});

function LabeledInput({ label, value, onChange, placeholder }) {
    const [useProxy, setProxy] = React.useState(false);
    // Re-render al cambiar storage
    const [local, setLocal] = React.useState(value);
    return (
        <View style={{ marginBottom: 8 }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={local}
                onChangeText={(v) => {
                    setLocal(v);
                    onChange(v);
                }}
                placeholder={placeholder}
                placeholderTextColor="#72767d"
            />
        </View>
    );
}

function RadioButton({ label, selected, onPress }) {
    return (
        <TouchableOpacity style={styles.radioRow} onPress={onPress}>
            <View style={styles.radioCircle}>
                {selected && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function Settings() {
    const [, forceUpdate] = React.useState(0);
    const update = () => forceUpdate((n) => n + 1);

    const types = [
        { label: "🎮 Playing", value: 0 },
        { label: "📺 Streaming", value: 1 },
        { label: "🎧 Listening to", value: 2 },
        { label: "📽️ Watching", value: 3 },
        { label: "🏆 Competing in", value: 5 },
    ];

    function set(key, val) {
        storage[key] = val;
        update();
        setTimeout(setActivity, 100);
    }

    return (
        <ScrollView style={styles.container}>
            {/* General */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚡ General</Text>
                <View style={styles.row}>
                    <View>
                        <Text style={styles.label}>Activar Custom RPC</Text>
                        <Text style={styles.sublabel}>Muestra tu rich presence personalizado</Text>
                    </View>
                    <Switch
                        value={!!storage.enabled}
                        onValueChange={(v) => {
                            storage.enabled = v;
                            update();
                            v ? setActivity() : clearActivity();
                        }}
                    />
                </View>
                <LabeledInput
                    label="Nombre de la aplicación *"
                    value={storage.appName}
                    onChange={(v) => set("appName", v)}
                    placeholder="Ej: Mi Juego"
                />
                <LabeledInput
                    label="Application ID (opcional, del Dev Portal)"
                    value={storage.appID}
                    onChange={(v) => set("appID", v)}
                    placeholder="123456789012345678"
                />
            </View>

            {/* Tipo */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Tipo de actividad</Text>
                {types.map((t) => (
                    <RadioButton
                        key={t.value}
                        label={t.label}
                        selected={storage.type === t.value}
                        onPress={() => set("type", t.value)}
                    />
                ))}
            </View>

            {/* Textos */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📄 Texto del estado</Text>
                <LabeledInput
                    label="Details (primera línea)"
                    value={storage.details}
                    onChange={(v) => set("details", v)}
                    placeholder="Ej: En el menú principal"
                />
                <LabeledInput
                    label="State (segunda línea)"
                    value={storage.state}
                    onChange={(v) => set("state", v)}
                    placeholder="Ej: Jugando solo"
                />
            </View>

            {/* Streaming URL solo si tipo = 1 */}
            {storage.type === 1 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📺 Streaming</Text>
                    <LabeledInput
                        label="URL del stream"
                        value={storage.streamURL}
                        onChange={(v) => set("streamURL", v)}
                        placeholder="https://twitch.tv/..."
                    />
                </View>
            )}

            {/* Imágenes */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🖼️ Imágenes</Text>
                <LabeledInput
                    label="Large Image Key"
                    value={storage.largeImageKey}
                    onChange={(v) => set("largeImageKey", v)}
                    placeholder="Clave de imagen del Dev Portal"
                />
                <LabeledInput
                    label="Large Image Tooltip"
                    value={storage.largeImageText}
                    onChange={(v) => set("largeImageText", v)}
                    placeholder="Texto al hacer hover"
                />
                <LabeledInput
                    label="Small Image Key"
                    value={storage.smallImageKey}
                    onChange={(v) => set("smallImageKey", v)}
                    placeholder="Clave de imagen pequeña"
                />
                <LabeledInput
                    label="Small Image Tooltip"
                    value={storage.smallImageText}
                    onChange={(v) => set("smallImageText", v)}
                    placeholder="Texto al hacer hover"
                />
            </View>

            {/* Botones */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔗 Botones</Text>
                <LabeledInput
                    label="Botón 1 — Texto"
                    value={storage.buttonOneText}
                    onChange={(v) => set("buttonOneText", v)}
                    placeholder="Ej: Unirse al servidor"
                />
                <LabeledInput
                    label="Botón 1 — URL"
                    value={storage.buttonOneURL}
                    onChange={(v) => set("buttonOneURL", v)}
                    placeholder="https://..."
                />
                <LabeledInput
                    label="Botón 2 — Texto"
                    value={storage.buttonTwoText}
                    onChange={(v) => set("buttonTwoText", v)}
                    placeholder="Ej: GitHub"
                />
                <LabeledInput
                    label="Botón 2 — URL"
                    value={storage.buttonTwoURL}
                    onChange={(v) => set("buttonTwoURL", v)}
                    placeholder="https://..."
                />
            </View>

            {/* Timestamps */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Timestamps</Text>
                <LabeledInput
                    label="Start Timestamp (Unix ms, deja vacío para usar hora actual)"
                    value={storage.startTimestamp}
                    onChange={(v) => set("startTimestamp", v)}
                    placeholder="Ej: 1700000000000"
                />
                <LabeledInput
                    label="End Timestamp (Unix ms)"
                    value={storage.endTimestamp}
                    onChange={(v) => set("endTimestamp", v)}
                    placeholder="Vacío = sin fin"
                />
            </View>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

// ─── Export del plugin ───────────────────────────────────────────────────────
export default {
    onLoad() {
        if (storage.enabled && storage.appName) {
            // Pequeño delay para que Discord esté listo
            setTimeout(setActivity, 3500);
        }
    },
    onUnload() {
        clearActivity();
    },
    settings: Settings,
};
