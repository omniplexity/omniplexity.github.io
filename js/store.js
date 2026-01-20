// OmniAI WebUI Local Storage State Management

const STORAGE_KEYS = {
    // Provider/Model
    PROVIDER: 'selectedProvider',
    MODEL: 'selectedModel',
    TEMPERATURE: 'temperature',
    TOP_P: 'topP',
    MAX_TOKENS: 'maxTokens',
    CONVERSATION_ID: 'currentConversationId',
    API_BASE_URL: 'apiBaseUrl',

    // Appearance
    THEME: 'theme',
    FONT_SIZE: 'fontSize',
    LAYOUT: 'layout',

    // Chat Behavior
    AUTO_SCROLL: 'autoScroll',
    ENTER_SEND: 'enterToSend',
    SHOW_TIMESTAMPS: 'showTimestamps',
    STREAM_RESPONSE: 'streamResponse',

    // Provider Defaults
    REMEMBER_PROVIDER: 'rememberProvider',
    REMEMBER_MODEL: 'rememberModel',
};

// ============================================
// Provider/Model settings
// ============================================
function getSelectedProvider() {
    return localStorage.getItem(STORAGE_KEYS.PROVIDER) || '';
}

function setSelectedProvider(providerId) {
    if (getSetting('rememberProvider')) {
        localStorage.setItem(STORAGE_KEYS.PROVIDER, providerId);
    }
}

function getSelectedModel() {
    return localStorage.getItem(STORAGE_KEYS.MODEL) || '';
}

function setSelectedModel(modelId) {
    if (getSetting('rememberModel')) {
        localStorage.setItem(STORAGE_KEYS.MODEL, modelId);
    }
}

// ============================================
// Generation settings
// ============================================
function getTemperature() {
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
    return stored ? parseFloat(stored) : 0.7;
}

function setTemperature(temp) {
    localStorage.setItem(STORAGE_KEYS.TEMPERATURE, temp.toString());
}

function getTopP() {
    const stored = localStorage.getItem(STORAGE_KEYS.TOP_P);
    return stored ? parseFloat(stored) : 1.0;
}

function setTopP(topP) {
    localStorage.setItem(STORAGE_KEYS.TOP_P, topP.toString());
}

function getMaxTokens() {
    const stored = localStorage.getItem(STORAGE_KEYS.MAX_TOKENS);
    return stored ? parseInt(stored, 10) : null;
}

function setMaxTokens(maxTokens) {
    if (maxTokens) {
        localStorage.setItem(STORAGE_KEYS.MAX_TOKENS, maxTokens.toString());
    } else {
        localStorage.removeItem(STORAGE_KEYS.MAX_TOKENS);
    }
}

// Get all generation settings as object
function getGenerationSettings() {
    return {
        temperature: getTemperature(),
        top_p: getTopP(),
        max_tokens: getMaxTokens(),
    };
}

// Set all generation settings from object
function setGenerationSettings(settings) {
    if (settings.temperature !== undefined) setTemperature(settings.temperature);
    if (settings.top_p !== undefined) setTopP(settings.top_p);
    if (settings.max_tokens !== undefined) setMaxTokens(settings.max_tokens);
}

// ============================================
// Current conversation
// ============================================
function getCurrentConversationId() {
    return localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID) || null;
}

function setCurrentConversationId(conversationId) {
    if (conversationId) {
        localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    }
}

// ============================================
// App Settings (with defaults)
// ============================================
const SETTING_DEFAULTS = {
    // Appearance
    theme: 'dark',
    fontSize: 'medium',
    layout: 'comfortable',

    // Chat Behavior
    autoScroll: true,
    enterToSend: true,
    showTimestamps: false,
    streamResponse: true,

    // Provider Defaults
    rememberProvider: true,
    rememberModel: true,
};

function getSetting(key) {
    const storageKey = STORAGE_KEYS[key.toUpperCase()] || `setting_${key}`;
    const stored = localStorage.getItem(storageKey);

    if (stored === null) {
        return SETTING_DEFAULTS[key];
    }

    // Parse booleans
    if (stored === 'true') return true;
    if (stored === 'false') return false;

    return stored;
}

function setSetting(key, value) {
    const storageKey = STORAGE_KEYS[key.toUpperCase()] || `setting_${key}`;
    localStorage.setItem(storageKey, value.toString());

    // Apply setting immediately if it affects the UI
    applySettingToUI(key, value);
}

function getAllSettings() {
    const settings = {};
    for (const key of Object.keys(SETTING_DEFAULTS)) {
        settings[key] = getSetting(key);
    }
    return settings;
}

// ============================================
// Apply settings to UI
// ============================================
function applySettingToUI(key, value) {
    switch (key) {
        case 'theme':
            document.documentElement.setAttribute('data-theme', value);
            if (value === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            }
            break;
        case 'fontSize':
            document.documentElement.setAttribute('data-font-size', value);
            break;
        case 'layout':
            document.documentElement.setAttribute('data-layout', value);
            break;
    }
}

function applyAllSettings() {
    const settings = getAllSettings();
    for (const [key, value] of Object.entries(settings)) {
        applySettingToUI(key, value);
    }
}

// ============================================
// API Base URL
// ============================================
function getStoredApiBaseUrl() {
    return localStorage.getItem(STORAGE_KEYS.API_BASE_URL);
}

function setStoredApiBaseUrl(url) {
    if (url) {
        localStorage.setItem(STORAGE_KEYS.API_BASE_URL, url);
    } else {
        localStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
    }
}

// Apply settings on load
if (typeof document !== 'undefined') {
    applyAllSettings();
}