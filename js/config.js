// OmniAI WebUI Configuration

const LOCAL_API_BASE_URL = "http://127.0.0.1:8787"; // Local development backend
const PRODUCTION_API_URL = "https://rossie-chargeful-plentifully.ngrok-free.dev"; // Production tunnel

// Environment detection
function isGitHubPages() {
    return window.location.hostname === 'omniplexity.github.io' ||
           window.location.hostname.endsWith('.github.io');
}

function isLocalhost() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
}

function getApiBaseUrl() {
    const stored = localStorage.getItem('apiBaseUrl');
    if (stored) return stored;

    // On GitHub Pages, use production tunnel URL
    if (isGitHubPages()) {
        return PRODUCTION_API_URL;
    }

    // Local development default
    return LOCAL_API_BASE_URL;
}

function setApiBaseUrl(url) {
    if (url) {
        localStorage.setItem('apiBaseUrl', url);
    } else {
        localStorage.removeItem('apiBaseUrl');
    }
}

function hasBackendConfigured() {
    return getApiBaseUrl() !== null;
}

function clearBackendConfig() {
    localStorage.removeItem('apiBaseUrl');
}