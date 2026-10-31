import { createStudioController, StudioActivity } from "./shared/controllerCore";
import { recordPresence } from "./diagnostics";

export const SOCKET_ID = "RichPresenceStudio@Revenge";
export const PID = 156313;

/** No account tokens, separate gateway connection, Node module, or music bridge. */
export function createRuntime(api: any) {
    const dispatcher = api.metro.common.FluxDispatcher;
    let lastActivity: StudioActivity | null = null;
    let desiredActivity: StudioActivity | null = null;
    let yieldingToDesktop = false;
    let sessionStore: any;
    let sessionListener: (() => void) | undefined;
    let installed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let verification: ReturnType<typeof setTimeout> | undefined;
    let pendingLogout = false;
    let pendingReconnect = false;
    let appStateSubscription: { remove(): void } | undefined;
    const subscriptions: [string, () => void][] = [];
    const user = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? null;
    function desktopHasActivity(): boolean {
        try {
            const sessions = api.metro.findByStoreName?.("SessionsStore")?.getSessions?.();
            if (!sessions || typeof sessions !== "object") return false;
            return Object.values(sessions).some((session: any) => {
                const client = session?.clientInfo?.client ?? session?.client_info?.client;
                if (client !== "desktop" || session.status === "offline" || session.status === "invisible") return false;
                return Array.isArray(session.activities) && session.activities.some((item: any) =>
                    typeof item?.application_id === "string" && item.application_id.length > 0 && item.type !== 4);
            });
        } catch { return false; }
    }
    const priorityMessage = () => yieldingToDesktop
        ? "Активность на ПК имеет приоритет. Телефон ожидает; выбранный профиль сохранён."
        : "Карточка передана клиенту Discord. Видимость другим пользователям ещё не подтверждена.";
    function publish(activity: StudioActivity | null) {
        desiredActivity = activity;
        yieldingToDesktop = !!activity && desktopHasActivity();
        const outgoing = yieldingToDesktop ? null : activity;
        if (!outgoing && !lastActivity) {
            recordPresence(yieldingToDesktop ? "desktop-priority" : "cleared");
            return;
        }
        send(outgoing);
        if (yieldingToDesktop) recordPresence("desktop-priority");
    }
    function send(activity: StudioActivity | null) {
        // Initializing this mobile module registers the LOCAL_ACTIVITY_UPDATE handler.
        const actions = api.metro.findByProps("SET_ACTIVITY");
        if (!actions?.SET_ACTIVITY || !dispatcher?.dispatch) {
            if (!activity && !lastActivity) return;
            throw new Error("Эта версия Discord не предоставляет API активности. Обнови Revenge/Discord до совместимой версии.");
        }
        dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID, pid: PID });
        lastActivity = activity;
        if (verification !== undefined) clearTimeout(verification);
        recordPresence(activity ? "dispatched" : "cleared");
        if (activity) verification = setTimeout(() => {
            verification = undefined;
            if (!installed || lastActivity !== activity) return;
            try {
                const store = api.metro.findByStoreName?.("SelfPresenceStore");
                if (typeof store?.getActivities !== "function") { recordPresence("verification-unavailable"); return; }
                const activities = store.getActivities();
                if (!Array.isArray(activities)) { recordPresence("verification-unavailable"); return; }
                const found = activities.some((item: any) => item?.application_id === activity.application_id && item?.name === activity.name && item?.type === activity.type);
                recordPresence(found ? "local-confirmed" : "local-missing");
                if (!found) controller.reportRuntimeError("Discord не добавил карточку в локальный список активности. Скопируй диагностику RPS; сохранённые профили не потеряны.");
            } catch { recordPresence("verification-unavailable"); }
        }, 1000);
    }
    const controller = createStudioController({
        read: () => api.plugin.storage.studioData,
        write: data => { api.plugin.storage.studioData = data; },
        publish,
        getUserId: user,
        getSharingEnabled: () => true,
        getConflict: () => false,
        getPublishMessage: priorityMessage,
        resolveAsset: async (appId, asset) => {
            const manager = api.metro.findByProps("fetchAssetIds");
            if (!manager?.fetchAssetIds) throw new Error("В этой версии Discord не найден обработчик картинок Rich Presence.");
            let timeout: ReturnType<typeof setTimeout> | undefined;
            try {
                const value = await Promise.race([
                    manager.fetchAssetIds(appId, [asset]),
                    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Discord не ответил при проверке картинки за 15 секунд.")), 15000); })
                ]);
                if (typeof value?.[0] !== "string" || !value[0]) throw new Error("Discord не принял картинку. Укажи прямую публичную ссылку или ключ Art Asset.");
                return value[0];
            } finally { if (timeout !== undefined) clearTimeout(timeout); }
        }
    });
    function error(e: unknown) {
        controller.reportRuntimeError(e instanceof Error ? e.message : "Ошибка мобильной интеграции.");
    }
    function schedule(logout: boolean, reconnect: boolean) {
        pendingLogout ||= logout;
        pendingReconnect ||= reconnect;
        if (timer !== undefined) clearTimeout(timer);
        // Never dispatch recursively from inside a Flux event listener.
        timer = setTimeout(() => {
            timer = undefined;
            if (!installed) return;
            const logout = pendingLogout, reconnect = pendingReconnect;
            pendingLogout = pendingReconnect = false;
            try {
                if (logout) controller.onLogout();
                else {
                    controller.refreshEnvironment();
                    if (desiredActivity && controller.getSnapshot().activeProfile) {
                        const shouldYield = desktopHasActivity();
                        if (reconnect || shouldYield !== yieldingToDesktop) {
                            publish(desiredActivity);
                            controller.reportRuntimeMessage(priorityMessage());
                        }
                    }
                }
            } catch (e) { error(e); }
        }, 0);
    }
    return {
        controller,
        start() {
            if (installed) return;
            installed = true;
            try {
                controller.start();
                sessionStore = api.metro.findByStoreName?.("SessionsStore");
                sessionListener = () => schedule(false, false);
                sessionStore?.addChangeListener?.(sessionListener);
                appStateSubscription = api.metro.common.ReactNative?.AppState?.addEventListener?.("change", (state: string) => {
                    if (state === "active" && controller.getSnapshot().restoreOnStart) schedule(false, true);
                });
                for (const [event, logout, reconnect] of [
                    ["LOGOUT", true, false], ["CONNECTION_OPEN", false, true], ["CURRENT_USER_UPDATE", false, false],
                    ["SESSIONS_REPLACE", false, false]
                ] as const) {
                    const handler = () => schedule(logout, reconnect);
                    dispatcher.subscribe(event, handler);
                    subscriptions.push([event, handler]);
                }
            } catch (e) { error(e); }
        },
        stop() {
            installed = false;
            if (sessionListener) sessionStore?.removeChangeListener?.(sessionListener);
            sessionListener = undefined;
            sessionStore = undefined;
            appStateSubscription?.remove();
            appStateSubscription = undefined;
            if (timer !== undefined) clearTimeout(timer);
            if (verification !== undefined) clearTimeout(verification);
            for (const [event, handler] of subscriptions.splice(0)) dispatcher.unsubscribe(event, handler);
            try { controller.stop(); } catch (e) { api.logger?.error?.(e); }
        }
    };
}
