(function() {
    "use strict";

    // Obtener FluxDispatcher de Discord
    let FluxDispatcher = null;
    try {
        const metro = revenge.metro;
        FluxDispatcher =
            metro.findByProps("dispatch", "subscribe", "_currentDispatchActionType") ||
            metro.findByProps("dispatch", "subscribe", "isDispatching") ||
            metro.findByProps("_dispatch", "subscribe");
    } catch(e) {
        console.error("[CustomRPC] No se pudo obtener FluxDispatcher:", e);
    }

    const storage = revenge.plugin.storage;

    // Valores por defecto
    const defaults = {
        enabled: true,
        appName: "Custom App",
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

    for (const key of Object.keys(defaults)) {
        if (storage[key] === undefined) storage[key] = defaults[key];
    }

    function createActivity() {
        if (!storage.enabled || !storage.appName) return null;
        const activity = {
            name: storage.appName,
            type: Number(storage.type) || 0,
            flags: 1,
        };
        if (storage.appID && storage.appID.trim()) activity.application_id = storage.appID.trim();
        if (storage.details && storage.details.trim()) activity.details = storage.details.trim();
        if (storage.state && storage.state.trim()) activity.state = storage.state.trim();
        if (storage.type === 1 && storage.streamURL) activity.url = storage.streamURL.trim();

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

        const buttons = [], buttonURLs = [];
        if (storage.buttonOneText) { buttons.push(storage.buttonOneText); if (storage.buttonOneURL) buttonURLs.push(storage.buttonOneURL); }
        if (storage.buttonTwoText) { buttons.push(storage.buttonTwoText); if (storage.buttonTwoURL) buttonURLs.push(storage.buttonTwoURL); }
        if (buttons.length > 0) {
            activity.buttons = buttons;
            if (buttonURLs.length > 0) activity.metadata = { button_urls: buttonURLs };
        }

        return activity;
    }

    function setActivity() {
        if (!FluxDispatcher) return;
        try {
            FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: createActivity(), socketId: "CustomRPC" });
        } catch(e) { console.error("[CustomRPC] setActivity error:", e); }
    }

    function clearActivity() {
        if (!FluxDispatcher) return;
        try {
            FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null, socketId: "CustomRPC" });
        } catch(e) { console.error("[CustomRPC] clearActivity error:", e); }
    }

    // UI
    const React = revenge.metro.findByProps("createElement", "useState");
    const RN = revenge.metro.findByProps("View", "Text", "Switch", "ScrollView", "TextInput", "TouchableOpacity");
    const { View, Text, Switch, ScrollView, TextInput, TouchableOpacity } = RN;

    function LabeledInput(props) {
        const [val, setVal] = React.useState(props.value || "");
        return React.createElement(View, { style: { marginBottom: 8 } },
            React.createElement(Text, { style: { fontSize: 12, color: "#8e9297", marginBottom: 3 } }, props.label),
            React.createElement(TextInput, {
                style: { borderWidth: 1, borderColor: "#40444b", borderRadius: 4, padding: 8, color: "#dcddde", backgroundColor: "#2f3136", fontSize: 14 },
                value: val,
                onChangeText: function(v) { setVal(v); props.onChange(v); },
                placeholder: props.placeholder || "",
                placeholderTextColor: "#72767d",
            })
        );
    }

    function RadioOption(props) {
        return React.createElement(
            TouchableOpacity,
            { onPress: props.onPress, style: { flexDirection: "row", alignItems: "center", paddingVertical: 6 } },
            React.createElement(View, {
                style: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#5865f2", marginRight: 10, alignItems: "center", justifyContent: "center" }
            }, props.selected ? React.createElement(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5865f2" } }) : null),
            React.createElement(Text, { style: { color: "#dcddde", fontSize: 15 } }, props.label)
        );
    }

    function SectionTitle(props) {
        return React.createElement(Text, { style: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#8e9297", marginBottom: 8, marginTop: 4, letterSpacing: 0.5 } }, props.children);
    }

    function Settings() {
        const [, forceUpdate] = React.useState(0);
        function refresh() { forceUpdate(function(n) { return n + 1; }); }
        function set(key, val) { storage[key] = val; refresh(); setTimeout(setActivity, 150); }

        const types = [
            { label: "🎮 Playing", value: 0 },
            { label: "📺 Streaming", value: 1 },
            { label: "🎧 Listening to", value: 2 },
            { label: "📽️ Watching", value: 3 },
            { label: "🏆 Competing in", value: 5 },
        ];

        return React.createElement(ScrollView, { style: { flex: 1, padding: 16 } },

            // General
            React.createElement(SectionTitle, null, "⚡ General"),
            React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, marginBottom: 8 } },
                React.createElement(View, null,
                    React.createElement(Text, { style: { color: "#dcddde", fontSize: 16 } }, "Activar Custom RPC"),
                    React.createElement(Text, { style: { color: "#8e9297", fontSize: 12 } }, "Muestra tu rich presence")
                ),
                React.createElement(Switch, {
                    value: !!storage.enabled,
                    onValueChange: function(v) { storage.enabled = v; refresh(); v ? setActivity() : clearActivity(); }
                })
            ),
            React.createElement(LabeledInput, { label: "Nombre de la aplicación *", value: storage.appName, onChange: function(v) { set("appName", v); }, placeholder: "Ej: Mi Juego" }),
            React.createElement(LabeledInput, { label: "Application ID (del Dev Portal, opcional)", value: storage.appID, onChange: function(v) { set("appID", v); }, placeholder: "123456789012345678" }),

            // Tipo
            React.createElement(SectionTitle, null, "📝 Tipo de actividad"),
            types.map(function(t) {
                return React.createElement(RadioOption, { key: t.value, label: t.label, selected: storage.type === t.value, onPress: function() { set("type", t.value); } });
            }),

            // Textos
            React.createElement(SectionTitle, null, "📄 Texto del estado"),
            React.createElement(LabeledInput, { label: "Details (primera línea)", value: storage.details, onChange: function(v) { set("details", v); }, placeholder: "Ej: En el menú principal" }),
            React.createElement(LabeledInput, { label: "State (segunda línea)", value: storage.state, onChange: function(v) { set("state", v); }, placeholder: "Ej: Jugando solo" }),

            // Stream URL (solo si tipo = 1)
            storage.type === 1 ? React.createElement(View, null,
                React.createElement(SectionTitle, null, "📺 Streaming"),
                React.createElement(LabeledInput, { label: "URL del stream", value: storage.streamURL, onChange: function(v) { set("streamURL", v); }, placeholder: "https://twitch.tv/..." })
            ) : null,

            // Imágenes
            React.createElement(SectionTitle, null, "🖼️ Imágenes"),
            React.createElement(LabeledInput, { label: "Large Image Key", value: storage.largeImageKey, onChange: function(v) { set("largeImageKey", v); }, placeholder: "Clave del Dev Portal" }),
            React.createElement(LabeledInput, { label: "Large Image Tooltip", value: storage.largeImageText, onChange: function(v) { set("largeImageText", v); }, placeholder: "Texto hover" }),
            React.createElement(LabeledInput, { label: "Small Image Key", value: storage.smallImageKey, onChange: function(v) { set("smallImageKey", v); }, placeholder: "Clave del Dev Portal" }),
            React.createElement(LabeledInput, { label: "Small Image Tooltip", value: storage.smallImageText, onChange: function(v) { set("smallImageText", v); }, placeholder: "Texto hover" }),

            // Botones
            React.createElement(SectionTitle, null, "🔗 Botones"),
            React.createElement(LabeledInput, { label: "Botón 1 — Texto", value: storage.buttonOneText, onChange: function(v) { set("buttonOneText", v); }, placeholder: "Ej: Unirse" }),
            React.createElement(LabeledInput, { label: "Botón 1 — URL", value: storage.buttonOneURL, onChange: function(v) { set("buttonOneURL", v); }, placeholder: "https://..." }),
            React.createElement(LabeledInput, { label: "Botón 2 — Texto", value: storage.buttonTwoText, onChange: function(v) { set("buttonTwoText", v); }, placeholder: "Ej: GitHub" }),
            React.createElement(LabeledInput, { label: "Botón 2 — URL", value: storage.buttonTwoURL, onChange: function(v) { set("buttonTwoURL", v); }, placeholder: "https://..." }),

            // Timestamps
            React.createElement(SectionTitle, null, "⏰ Timestamps"),
            React.createElement(LabeledInput, { label: "Start (Unix ms)", value: storage.startTimestamp, onChange: function(v) { set("startTimestamp", v); }, placeholder: "Vacío = hora actual" }),
            React.createElement(LabeledInput, { label: "End (Unix ms)", value: storage.endTimestamp, onChange: function(v) { set("endTimestamp", v); }, placeholder: "Vacío = sin fin" }),

            React.createElement(View, { style: { height: 60 } })
        );
    }

    module.exports = {
        onLoad: function() {
            if (storage.enabled && storage.appName) setTimeout(setActivity, 3500);
        },
        onUnload: function() {
            clearActivity();
        },
        settings: Settings,
    };
})();
