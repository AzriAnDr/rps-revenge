/* SPDX-License-Identifier: GPL-3.0-or-later */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const MIME_TYPES = Object.keys(MIME_EXTENSIONS);

function providerUrl(provider: string, text: string, size: number): string {
    if (text.length > 16384) throw new Error("Слишком большой ответ хостинга.");
    if (provider === "Catbox") {
        const url = text.trim();
        if (!/^https:\/\/files\.catbox\.moe\/[a-zA-Z0-9]+\.(png|jpe?g|gif|webp)$/.test(url)) throw new Error("Catbox не вернул прямую ссылку на картинку.");
        return url;
    }
    const value = JSON.parse(text);
    if (!value || typeof value.url !== "string" || !/^https:\/\/i\.img402\.dev\/[a-zA-Z0-9_-]+\.(png|jpe?g|gif|webp)$/.test(value.url)) throw new Error("img402 не вернул прямую ссылку на картинку.");
    if (size <= 1_000_000 && value.expiresAt !== null) throw new Error("img402 ограничил срок хранения маленькой картинки.");
    if (size > 1_000_000 && value.expiresAt !== null && (typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) < Date.now() + 29 * 86400000)) throw new Error("img402 вернул слишком короткий срок хранения.");
    return value.url;
}

async function pickImage(api: any): Promise<any | null> {
    // Discord exposes its bundled native libraries through Metro, not Revenge's API.
    // Document picker preserves animated files and gives content:// URIs on Android.
    const find = (...props: string[]) => api.metro.findByProps(...props);
    // Property pairs used by VendettaPlugins' shared deps.ts for Discord's bundles.
    const picker = find("pickSingle", "isCancel") ?? find("pick", "saveDocuments");
    const cropPicker = picker ? undefined : find("openPicker");
    if (!picker && !cropPicker) throw new Error("В этой версии Discord недоступен выбор файла. Вставь прямую ссылку вручную.");
    try {
        const result = picker
            ? await (picker.pickSingle ?? picker.pick).call(picker, { type: MIME_TYPES, allowMultiSelection: false, mode: "import" })
            : await cropPicker.openPicker({ mediaType: "photo", multiple: false, cropping: false, includeBase64: false });
        if (result == null || (Array.isArray(result) && result.length === 0)) return null;
        if (Array.isArray(result) && result.length !== 1) throw new Error("Выбери одну картинку.");
        return Array.isArray(result) ? result[0] : result;
    } catch (error: any) {
        if (picker?.isCancel?.(error) || ["DOCUMENT_PICKER_CANCELED", "OPERATION_CANCELED", "E_PICKER_CANCELLED"].includes(error?.code)) return null;
        throw error;
    }
}

/** Native metadata is required: unknown file sizes must not bypass the limit. */
export function createImageUploader(api: any, options: { timeoutMs?: number } = {}) {
    return async (): Promise<string | null> => {
        const image = await pickImage(api);
        if (!image) return null;
        if (image.error || image.isVirtual) throw new Error("Не удалось прочитать локальный файл картинки.");
        const uri = image.fileCopyUri || image.uri || image.path;
        const mime = image.type ?? image.mime;
        const extension = typeof mime === "string" && MIME_TYPES.includes(mime.toLowerCase()) ? MIME_EXTENSIONS[mime.toLowerCase()] : undefined;
        if (!extension) throw new Error("Поддерживаются PNG, JPEG, GIF и WebP. SVG и другие файлы не загружаются.");
        if (!Number.isSafeInteger(image.size) || image.size < 1 || image.size > MAX_IMAGE_BYTES) throw new Error("Выбери картинку с известным размером от 1 байта до 10 МиБ.");
        if (typeof uri !== "string" || !/^(content:\/\/.+|file:\/\/\/.+|\/.+)$/.test(uri) || /[\r\n\0]/.test(uri)) throw new Error("Не удалось прочитать локальный файл картинки.");
        const fileUri = uri.startsWith("/") ? `file://${uri}` : uri;
        const errors: string[] = [];
        for (const provider of ["Catbox", "img402"]) {
            const abort = new AbortController();
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                if (provider === "img402" && image.size > 10_000_000) throw new Error("Запасной хостинг принимает до 10 000 000 байт.");
                const body = new FormData();
                if (provider === "Catbox") body.append("reqtype", "fileupload");
                // RN FormData serializes URI file parts; Blob/file bytes are not needed.
                body.append(provider === "Catbox" ? "fileToUpload" : "image", { uri: fileUri, type: mime.toLowerCase(), name: `presence.${extension}` } as any);
                const upload = async () => {
                    const response = await fetch(provider === "Catbox" ? "https://catbox.moe/user/api.php" : "https://img402.dev/api/free", { method: "POST", body, signal: abort.signal, redirect: "error" });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return providerUrl(provider, await response.text(), image.size);
                };
                // Some RN fetch implementations ignore abort: race bounds waiting too.
                return await Promise.race([upload(), new Promise<never>((_, reject) => {
                    timer = setTimeout(() => { abort.abort(); reject(new Error("Хостинг не ответил за 30 секунд.")); }, options.timeoutMs ?? 30000);
                })]);
            } catch (error) {
                errors.push(`${provider}: ${error instanceof Error ? error.message : "Ошибка сети"}`);
            } finally { if (timer !== undefined) clearTimeout(timer); }
        }
        throw new Error(`Не удалось загрузить картинку. ${errors.join("; ")}. После сетевого сбоя файл мог сохраниться на хостинге. Можно повторить позже или вставить прямую ссылку.`);
    };
}
