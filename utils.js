(() => {
    const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" };

    const getBackendConfig = () => window.BackendConfig || null;

    const getStoredBackendUrl = () => {
        const cfg = getBackendConfig();
        return cfg ? cfg.getStoredBackendUrl() : "";
    };

    const setStoredBackendUrl = (candidate) => {
        const cfg = getBackendConfig();
        if (!cfg) throw new Error("Backend config missing");
        return cfg.setStoredBackendUrl(candidate);
    };

    const normalizeBackendUrl = (candidate) => {
        const cfg = getBackendConfig();
        if (!cfg) throw new Error("Backend config missing");
        return cfg.normalizeBackendUrl(candidate);
    };

    const buildApiUrl = (path, baseUrl) => {
        const root = baseUrl || getStoredBackendUrl();
        if (!root) return null;
        try {
            const u = new URL(root);
            u.pathname = path;
            u.search = "";
            return u.toString();
        } catch {
            return null;
        }
    };

    const ngrokFetch = (url, options = {}) => {
        return fetch(url, {
            ...options,
            headers: { ...(options.headers || {}), ...NGROK_HEADERS },
        });
    };

    window.OmniUtils = {
        NGROK_HEADERS,
        getBackendConfig,
        getStoredBackendUrl,
        setStoredBackendUrl,
        normalizeBackendUrl,
        buildApiUrl,
        ngrokFetch,
    };
})();
