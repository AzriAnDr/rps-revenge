import { createStudioController, StudioActivity } from "./shared/controllerCore";

export const SOCKET_ID = "RichPresenceStudio@Revenge";
export const PID = 156313;

/** No account tokens, separate gateway connection, Node module, or music bridge. */
export function createRuntime(api: any) {
    const dispatcher = api.metro.common.FluxDispatcher;
    let lastActivity: StudioActivity | null = null;
    let installed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingLogout = false;
    let pendingReconnect = false;
    const subscriptions: [string, () => void][] = [];
    const user = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? null;
    function publish(activity: StudioActivity | null) {
        // Initializing this mobile module registers the LOCAL_ACTIVITY_UPDATE handler.
        const actions = api.metro.findByProps("SET_ACTIVITY");
        if (!actions || !dispatcher?.dispatch) {
            if (!activity && !lastActivity) return;
            throw new Error("Эта версия Discord не предоставляет API активности. Обнови Revenge/Discord до совместимой версии.");
        }
        dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID, pid: PID });
        lastActivity = activity;
    }
    const controller = createStudioController({
        read: () => api.plugin.storage.studioData,
        write: data => { api.plugin.storage.studioData = data; },
        publish,
        getUserId: user,
        getSharingEnabled: () => true,
        getConflict: () => false,
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
                    if (reconnect && lastActivity && controller.getSnapshot().activeProfile) publish(lastActivity);
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
                for (const [event, logout, reconnect] of [
                    ["LOGOUT", true, false], ["CONNECTION_OPEN", false, true], ["CURRENT_USER_UPDATE", false, false]
                ] as const) {
                    const handler = () => schedule(logout, reconnect);
                    dispatcher.subscribe(event, handler);
                    subscriptions.push([event, handler]);
                }
            } catch (e) { error(e); }
        },
        stop() {
            installed = false;
            if (timer !== undefined) clearTimeout(timer);
            for (const [event, handler] of subscriptions.splice(0)) dispatcher.unsubscribe(event, handler);
            try { controller.stop(); } catch (e) { api.logger?.error?.(e); }
        }
    };
}
