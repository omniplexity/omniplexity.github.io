(() => {
    const FALLBACK_BACKEND_CHAT_URL = "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";

    const resolveDefaultBackendUrl = () => {
        const host = window.location.hostname;
        if (host && host.endsWith("github.io")) {
            return FALLBACK_BACKEND_CHAT_URL;
        }
        if (host === "localhost" || host === "127.0.0.1") {
            return `http://${host}:8000/api/chat`;
        }
        return FALLBACK_BACKEND_CHAT_URL;
    };

    const ensureChatPath = (urlObj) => {
        if (!/\/api\/chat\/?$/.test(urlObj.pathname)) {
            urlObj.pathname = "/api/chat";
        }
        return urlObj;
    };

    const normalizeBackendUrl = (candidate) => {
        if (!candidate) throw new Error("Backend URL is empty");
        let normalized = candidate.trim();
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = `https://${normalized}`;
        }
        const pageIsHttps = window.location.protocol === "https:";
        const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(normalized);
        if (pageIsHttps && !isLocal) {
            normalized = normalized.replace(/^http:\/\//i, "https://");
        }
        const url = new URL(normalized);
        ensureChatPath(url);
        url.search = "";
        return url.toString();
    };

    const getStoredBackendUrl = () => {
        const stored = localStorage.getItem("backendURL");
        const fallback = resolveDefaultBackendUrl();
        try {
            const normalized = normalizeBackendUrl(stored || fallback);
            if (normalized && normalized !== stored) {
                localStorage.setItem("backendURL", normalized);
            }
            return normalized;
        } catch {
            return "";
        }
    };

    const setStoredBackendUrl = (candidate) => {
        const normalized = normalizeBackendUrl(candidate);
        localStorage.setItem("backendURL", normalized);
        return normalized;
    };

    window.BackendConfig = {
        resolveDefaultBackendUrl,
        normalizeBackendUrl,
        getStoredBackendUrl,
        setStoredBackendUrl,
    };
})();
