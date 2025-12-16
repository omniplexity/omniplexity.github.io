// Pick a sane default backend depending on where the page is served:
// - On GitHub Pages, use the public ngrok URL (HTTPS to avoid mixed content).
// - Locally (localhost/127.0.0.1), use the local tunnel ingress.
const resolveDefaultBackendUrl = () => {
    const host = window.location.hostname;
    if (host && host.endsWith("github.io")) {
        return "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";
    }
    if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost/api/chat";
    }
    // Fallback to the ngrok URL for any other host.
    return "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";
};

const defaultBackendURL = resolveDefaultBackendUrl();



const ensureChatPath = (urlObj) => {

    if (!/\/api\/chat\/?$/.test(urlObj.pathname)) {

        urlObj.pathname = "/api/chat";

    }

    return urlObj;

};



const messagesEl = document.getElementById("messages");

const composerEl = document.getElementById("composer");

const promptEl = document.getElementById("prompt");

const sendBtn = document.getElementById("sendBtn");

const statusBadge = document.getElementById("statusBadge");

const statusText = document.getElementById("statusText");

const themeToggle = document.getElementById("themeToggle");

const logoutBtn = document.getElementById("logoutBtn");

const settingsToggle = document.getElementById("settingsToggle");

const hubWrapper = document.getElementById("hubWrapper");

const controlPanel = document.getElementById("controlPanel");

const hubBackdrop = document.getElementById("hubBackdrop");

const modelSelect = document.getElementById("modelSelect");

const systemPromptEl = document.getElementById("systemPrompt");

const tempSlider = document.getElementById("tempSlider");

const tempValue = document.getElementById("tempValue");

const topPSlider = document.getElementById("topPSlider");

const topPValue = document.getElementById("topPValue");

const maxTokensInput = document.getElementById("maxTokensInput");

const useSearchToggle = document.getElementById("useSearchToggle");

const gradStartPicker = document.getElementById("gradStartPicker");

const gradEndPicker = document.getElementById("gradEndPicker");

const gradStartHex = document.getElementById("gradStartHex");

const gradEndHex = document.getElementById("gradEndHex");

const gradAngle = document.getElementById("gradAngle");

const gradAngleValue = document.getElementById("gradAngleValue");

const applyThemeBtn = document.getElementById("applyThemeBtn");

const themePreset = document.getElementById("themePreset");

const reloadModelsBtn = document.getElementById("reloadModelsBtn");

const activeStatusEl = document.getElementById("activeStatus");

const sessionStatusEl = document.getElementById("sessionStatus");

const closeHubBtn = document.getElementById("closeHubBtn");

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));

const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const clearChatBtn = document.getElementById("clearChatBtn");

const resetThemeBtn = document.getElementById("resetThemeBtn");

const createUserBtn = document.getElementById("createUserBtn");

const usersListEl = document.getElementById("usersList");

const adminTabs = Array.from(document.querySelectorAll(".admin-tab"));

const fallbackModels = [];

const toastEl = document.getElementById("toast");

let toastTimer = null;

let sendBtnDefaultText = sendBtn ? sendBtn.textContent : "Send";

const messageLog = [];

// Force the backend URL to the known ngrok endpoint; override any stale stored value
const storedBackend = defaultBackendURL;
let currentUser = null;



const escapeHTML = (text) =>

    text

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;");



const formatInline = (text) => {

    const escaped = escapeHTML(text);

    const withCode = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    const withBold = withCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    const withItalics = withBold.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    return withItalics.replace(/\n/g, "<br>");

};



const renderContent = (text) => {

    if (!text) return "<p></p>";



    const blockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    let html = "";

    let cursor = 0;

    let match;



    while ((match = blockRegex.exec(text)) !== null) {

        const [full, lang, code] = match;

        const before = text.slice(cursor, match.index);

        if (before.trim() !== "") {

            html += `<p>${formatInline(before)}</p>`;

        }



        const languageClass = lang ? ` class="language-${lang}"` : "";

        html += `<pre class="code-block"><code${languageClass}>${escapeHTML(

            code.trimEnd()

        )}</code></pre>`;

        cursor = match.index + full.length;

    }



    const after = text.slice(cursor);

    if (after.trim() !== "" || html === "") {

        html += `<p>${formatInline(after)}</p>`;

    }



    return html;

};



const appendMessage = (role, text, pending = false) => {

    const message = document.createElement("div");

    message.className = `message ${role}${pending ? " pending" : ""}`;



    const bubble = document.createElement("div");

    bubble.className = "bubble";

    bubble.innerHTML = renderContent(text);



    const meta = document.createElement("div");

    meta.className = "bubble-meta";

    const now = new Date();

    const timeLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    meta.textContent = `${role === "user" ? "You" : "Model"} | ${timeLabel}`;



    message.appendChild(bubble);

    message.appendChild(meta);

    messagesEl.appendChild(message);

    messagesEl.scrollTop = messagesEl.scrollHeight;



    return { message, bubble };

};



const setAssistantReply = (bubbleRef, text, isError = false) => {

    bubbleRef.bubble.innerHTML = renderContent(text);

    bubbleRef.message.classList.remove("pending");

    if (isError) {

        bubbleRef.message.classList.add("error");

    } else {

        bubbleRef.message.classList.remove("error");

    }

    messagesEl.scrollTop = messagesEl.scrollHeight;

};



const setStatus = (state, text) => {

    statusBadge.classList.remove("error", "connecting");

    if (state === "error") statusBadge.classList.add("error");

    if (state === "connecting") statusBadge.classList.add("connecting");

    statusText.textContent = text;

};



const buildApiUrl = (path) => {

    try {

        const u = new URL(backendURL);

        u.pathname = path;

        u.search = "";

        return u.toString();

    } catch {

        return null;

    }

};



const showToast = (message, type = "info") => {

    if (!toastEl) return;

    toastEl.textContent = message;

    toastEl.className = `toast ${type}`;

    toastEl.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toastEl.classList.remove("show");

    }, 4000);

};



const normalizeBackendUrl = (candidate) => {
    if (!candidate) throw new Error("Backend URL is empty");
    let normalized = candidate.trim();
    if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }
    // If the page is served over HTTPS and we're not targeting localhost, force HTTPS to avoid mixed-content blocks.
    const pageIsHttps = window.location.protocol === "https:";
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(normalized);
    if (pageIsHttps && !isLocal) {
        normalized = normalized.replace(/^http:\/\//i, "https://");
    }
    const url = new URL(normalized);
    ensureChatPath(url);
    return url.toString();
};

let backendURL = "";

const seedBackendUrl = () => {
    try {
        backendURL = normalizeBackendUrl(defaultBackendURL);
        localStorage.setItem("backendURL", backendURL);
    } catch {
        backendURL = "";
    }
};

seedBackendUrl();

let theme = localStorage.getItem("theme") || "light";

const settings = {

    model: localStorage.getItem("model") || "",

    systemPrompt: localStorage.getItem("systemPrompt") || "",

    temperature: parseFloat(localStorage.getItem("temperature") || "0.7"),

    topP: parseFloat(localStorage.getItem("topP") || "1.0"),

    maxTokens: parseInt(localStorage.getItem("maxTokens") || "512", 10),

    useSearch: localStorage.getItem("useSearch") === "true",

    gradientStart: localStorage.getItem("gradientStart") || "#0b84ff",

    gradientEnd: localStorage.getItem("gradientEnd") || "#0c9eff",

    gradientAngle: parseInt(localStorage.getItem("gradientAngle") || "140", 10),

};



const themePresets = {

    aurora: { start: "#0b84ff", end: "#7c3aed", angle: 135, mode: "dark" },

    sunrise: { start: "#ff7e5f", end: "#feb47b", angle: 120, mode: "light" },

    midnight: { start: "#0f172a", end: "#1e293b", angle: 180, mode: "dark" },

    forest: { start: "#0b8a6f", end: "#1fc59b", angle: 145, mode: "light" },

    ocean: { start: "#0066ff", end: "#00c6ff", angle: 150, mode: "light" },

    citrus: { start: "#f9d423", end: "#ff4e50", angle: 110, mode: "light" },

};



const getHealthUrl = () => {
    try {
        const url = new URL(backendURL);
        // Prefer an authenticated ping so we learn about CORS/cookie issues
        url.pathname = "/api/auth/me";
        url.search = "";
        return url.toString();
    } catch {
        return null;
    }
};

const getRootHealthUrl = () => {
    try {
        const url = new URL(backendURL);
        url.pathname = "/";
        url.search = "";
        return url.toString();
    } catch {
        return null;
    }
};

const markBackendReachable = (message = "Connected to backend") => {
    setStatus("ok", message);
};

const handleHealthResponse = (res, label) => {
    // Opaque or status 0 (e.g., no-cors) still means the server responded.
    if (res.type === "opaque" || res.status === 0) {
        markBackendReachable("Backend reachable");
        return true;
    }
    // Treat any non-5xx response as reachable so users don't see false negatives.
    if (res.status < 500) {
        if (res.status === 401) {
            markBackendReachable("Backend reachable (login required)");
        } else if (res.status === 404 || res.status === 405) {
            markBackendReachable(`${label} reachable (${res.status})`);
        } else {
            markBackendReachable();
        }
        return true;
    }
    return false;
};



const checkBackend = async ({ toast = true } = {}) => {
    if (!ensureBackendConfigured()) return;
    const healthUrl = getHealthUrl();
    const fallbackUrl = getRootHealthUrl();
    if (!healthUrl) {
        setStatus("error", "Invalid backend URL");
        if (toast) showToast("Invalid backend URL", "error");
        return;
    }
    setStatus("connecting", "Checking backend...");
    try {
        const res = await fetch(healthUrl, { method: "GET", credentials: "omit" });
        if (!handleHealthResponse(res, healthUrl)) {
            setStatus("error", `Backend ${res.status}`);
            if (toast) showToast(`Backend error ${res.status}`, "error");
            console.warn("Backend health check failed", healthUrl, res.status);
        }
    } catch (err) {
        // Try a root-level GET as a fallback (avoids auth edge cases)
        if (fallbackUrl) {
            try {
                const res = await fetch(fallbackUrl, { method: "GET", credentials: "omit" });
                if (handleHealthResponse(res, fallbackUrl)) return;
                setStatus("error", `Backend ${res.status}`);
                if (toast) showToast(`Backend error ${res.status}`, "error");
                console.warn("Backend fallback health failed", fallbackUrl, res.status);
                return;
            } catch (err2) {
                console.warn("Backend fallback health error", fallbackUrl, err2);
            }
        }
        // As a last resort, try a no-cors ping which yields an opaque response on success.
        const opaqueTarget = fallbackUrl || healthUrl;
        if (opaqueTarget) {
            try {
                const res = await fetch(opaqueTarget, { method: "GET", mode: "no-cors" });
                // If we got here without throwing, treat as reachable.
                handleHealthResponse(res, opaqueTarget);
                return;
            } catch (err3) {
                console.warn("Backend opaque health error", opaqueTarget, err3);
            }
        }
        setStatus("error", "Backend unreachable");
        if (toast) showToast(`Backend unreachable: ${err.message}`, "error");
        console.warn("Backend health check error", healthUrl, err);
    }
};

let healthPollTimer = null;

const startHealthPolling = () => {
    if (healthPollTimer) clearInterval(healthPollTimer);
    healthPollTimer = setInterval(() => checkBackend({ toast: false }), 30000);
};



const ensureBackendConfigured = () => {

    if (!backendURL) {

        setStatus("error", "Set backend URL");

        return false;

    }

    try {

        backendURL = normalizeBackendUrl(backendURL || defaultBackendURL);

        localStorage.setItem("backendURL", backendURL);

    } catch {

        setStatus("error", "Invalid backend URL");

        return false;

    }

    return true;

};



const persistSettings = () => {

    localStorage.setItem("model", settings.model);

    localStorage.setItem("systemPrompt", settings.systemPrompt);

    localStorage.setItem("temperature", settings.temperature);

    localStorage.setItem("topP", settings.topP);

    localStorage.setItem("maxTokens", settings.maxTokens);

    localStorage.setItem("useSearch", settings.useSearch);

    localStorage.setItem("gradientStart", settings.gradientStart);

    localStorage.setItem("gradientEnd", settings.gradientEnd);

    localStorage.setItem("gradientAngle", settings.gradientAngle);

};



const applyGradient = () => {

    const angle = settings.gradientAngle;

    const start = settings.gradientStart;

    const end = settings.gradientEnd;

    const gradient = `linear-gradient(${angle}deg, ${start}, ${end})`;

    document.documentElement.style.setProperty("--bg-dynamic", gradient);

};



const updateActiveStatus = () => {

    if (!activeStatusEl && !sessionStatusEl) return;

    const parts = [];

    parts.push(settings.model ? settings.model : "default model");

    parts.push(`temp ${settings.temperature.toFixed(1)}`);

    parts.push(`top_p ${settings.topP.toFixed(2)}`);

    parts.push(`max ${settings.maxTokens}`);

    if (settings.useSearch) parts.push("search on");

    const text = parts.join(" | ");

    if (activeStatusEl) activeStatusEl.textContent = text;

    if (sessionStatusEl) sessionStatusEl.textContent = text;

};



const syncSettingsUI = () => {

    if (modelSelect) modelSelect.value = settings.model;

    if (systemPromptEl) systemPromptEl.value = settings.systemPrompt;

    if (tempSlider && tempValue) {

        tempSlider.value = settings.temperature;

        tempValue.textContent = settings.temperature.toFixed(1);

    }

    if (topPSlider && topPValue) {

        topPSlider.value = settings.topP;

        topPValue.textContent = settings.topP.toFixed(2);

    }

    if (maxTokensInput) maxTokensInput.value = settings.maxTokens;

    if (useSearchToggle) useSearchToggle.checked = settings.useSearch;

    if (gradStartPicker) gradStartPicker.value = settings.gradientStart;

    if (gradEndPicker) gradEndPicker.value = settings.gradientEnd;

    if (gradStartHex) gradStartHex.value = settings.gradientStart;

    if (gradEndHex) gradEndHex.value = settings.gradientEnd;

    if (gradAngle && gradAngleValue) {

        gradAngle.value = settings.gradientAngle;

        gradAngleValue.textContent = `${settings.gradientAngle} deg`;

    }

    updateActiveStatus();

};



syncSettingsUI();

applyGradient();

updateActiveStatus();

if (promptEl) {

    promptEl.focus();

}



composerEl.addEventListener("submit", async (event) => {

    event.preventDefault();



    const input = promptEl.value.trim();

    if (!input) return;

    if (!ensureBackendConfigured()) {

        appendMessage("assistant", "Please set the backend URL first.", false);

        return;

    }



    appendMessage("user", input);

    promptEl.value = "";

    messageLog.push({ role: "user", content: input, ts: Date.now() });



    const assistantBubble = appendMessage("assistant", "Thinking...", true);

    sendBtn.disabled = true;

    if (sendBtn) sendBtn.textContent = "Sending...";



    try {

        setStatus("connecting", "Sending...");

        const response = await fetch(backendURL, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: input,
                model: settings.model || null,
                system_prompt: settings.systemPrompt || null,
                temperature: settings.temperature,
                top_p: settings.topP,
                max_tokens: settings.maxTokens,
                use_search: settings.useSearch,
            })
        });



        let data;



        if (!response.ok) {

            // Try to surface backend error details

            try {

                data = await response.json();

            } catch {

                const text = await response.text();

                throw new Error(`Request failed: ${response.status}${text ? ` - ${text}` : ""}`);

            }

            const detail = data?.detail ? ` - ${data.detail}` : "";

            throw new Error(`Request failed: ${response.status}${detail}`);

        }



        data = data || await response.json();

        const reply = data.response || "I couldn't find a reply.";

        setAssistantReply(assistantBubble, reply);

        messageLog.push({ role: "assistant", content: reply, ts: Date.now() });

        setStatus("ok", "Connected to backend");

        showToast("Reply received", "success");

    } catch (error) {

        setAssistantReply(

            assistantBubble,

            `Error: ${error.message}`,

            true

        );

        setStatus("error", "Request failed");

        showToast(error.message, "error");

    } finally {

        sendBtn.disabled = false;

        if (sendBtn) sendBtn.textContent = sendBtnDefaultText;

        promptEl.focus();

        // Successful send sets status to healthy
        setStatus("ok", "Connected to backend");

    }

});





// THEME TOGGLE

const applyTheme = (value) => {

    const mode = value === "dark" ? "dark" : "light";

    // Set on both html and body to ensure CSS selector matches

    document.documentElement.setAttribute("data-theme", mode);

    document.body.setAttribute("data-theme", mode);

    document.documentElement.classList.toggle("theme-dark", mode === "dark");

    document.body.classList.toggle("theme-dark", mode === "dark");

    localStorage.setItem("theme", mode);

    if (themeToggle) {

        themeToggle.textContent = mode === "dark" ? "Light" : "Dark";

    }

};



applyTheme(theme);



if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        theme = theme === "dark" ? "light" : "dark";

        applyTheme(theme);

    });

}



// SETTINGS PANEL (sticky side-drawer)

if (settingsToggle && controlPanel) {

    const openPanel = () => {

        controlPanel.classList.add("open");

        controlPanel.setAttribute("aria-hidden", "false");

        if (hubBackdrop) {

            hubBackdrop.classList.add("show");

            hubBackdrop.setAttribute("aria-hidden", "false");

        }

    };

    const closePanel = () => {

        controlPanel.classList.remove("open");

        controlPanel.setAttribute("aria-hidden", "true");

        if (hubBackdrop) {

            hubBackdrop.classList.remove("show");

            hubBackdrop.setAttribute("aria-hidden", "true");

        }

    };



    settingsToggle.addEventListener("click", (e) => {

        e.stopPropagation();

        if (controlPanel.classList.contains("open")) {

            closePanel();

        } else {

            openPanel();

        }

    });



    if (closeHubBtn) {

        closeHubBtn.addEventListener("click", closePanel);

    }



    if (hubBackdrop) {

        hubBackdrop.addEventListener("click", closePanel);

    }



    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {

            closePanel();

        }

    });

}



const activateTab = (name) => {

    tabButtons.forEach((btn) => {

        const active = btn.getAttribute("data-tab") === name;

        btn.classList.toggle("active", active);

    });

    tabPanels.forEach((panel) => {

        const match = panel.getAttribute("data-tab-panel") === name;

        if (match) {

            panel.removeAttribute("hidden");

        } else {

            panel.setAttribute("hidden", "");

        }

    });

};



if (tabButtons.length) {

    tabButtons.forEach((btn) => {

        btn.addEventListener("click", () => {

            activateTab(btn.getAttribute("data-tab"));

        });

    });

    activateTab("model");

}



const updateColorFromHex = (hexInput, colorPicker, key) => {

    const val = hexInput.value.trim();

    const valid = /^#([0-9A-Fa-f]{6})$/.test(val);

    if (valid) {

        settings[key] = val;

        colorPicker.value = val;

    }

};



if (modelSelect) {

    modelSelect.addEventListener("change", () => {

        settings.model = modelSelect.value.trim();

        persistSettings();

        updateActiveStatus();

    });

}



if (systemPromptEl) {

    systemPromptEl.addEventListener("input", () => {

        settings.systemPrompt = systemPromptEl.value;

        persistSettings();

        updateActiveStatus();

    });

}



if (tempSlider && tempValue) {

    tempSlider.addEventListener("input", () => {

        settings.temperature = parseFloat(tempSlider.value);

        tempValue.textContent = settings.temperature.toFixed(1);

        persistSettings();

        updateActiveStatus();

    });

}



if (topPSlider && topPValue) {

    topPSlider.addEventListener("input", () => {

        settings.topP = parseFloat(topPSlider.value);

        topPValue.textContent = settings.topP.toFixed(2);

        persistSettings();

        updateActiveStatus();

    });

}



if (maxTokensInput) {

    maxTokensInput.addEventListener("input", () => {

        const val = parseInt(maxTokensInput.value || "0", 10);

        settings.maxTokens = Number.isNaN(val) ? 0 : val;

        persistSettings();

        updateActiveStatus();

    });

}



if (useSearchToggle) {

    useSearchToggle.addEventListener("change", () => {

        settings.useSearch = useSearchToggle.checked;

        persistSettings();

        updateActiveStatus();

    });

}



if (gradStartPicker && gradStartHex) {

    gradStartPicker.addEventListener("input", () => {

        settings.gradientStart = gradStartPicker.value;

        gradStartHex.value = settings.gradientStart;

        persistSettings();

    });

    gradStartHex.addEventListener("input", () => {

        updateColorFromHex(gradStartHex, gradStartPicker, "gradientStart");

        persistSettings();

    });

}



if (gradEndPicker && gradEndHex) {

    gradEndPicker.addEventListener("input", () => {

        settings.gradientEnd = gradEndPicker.value;

        gradEndHex.value = settings.gradientEnd;

        persistSettings();

    });

    gradEndHex.addEventListener("input", () => {

        updateColorFromHex(gradEndHex, gradEndPicker, "gradientEnd");

        persistSettings();

    });

}



if (gradAngle && gradAngleValue) {

    gradAngle.addEventListener("input", () => {

        settings.gradientAngle = parseInt(gradAngle.value || "0", 10);

        gradAngleValue.textContent = `${settings.gradientAngle} deg`;

        persistSettings();

    });

}



if (applyThemeBtn) {

    applyThemeBtn.addEventListener("click", () => {

        applyGradient();

        persistSettings();

        updateActiveStatus();

    });

}



if (resetThemeBtn) {

    resetThemeBtn.addEventListener("click", () => {

        settings.gradientStart = "#0b84ff";

        settings.gradientEnd = "#0c9eff";

        settings.gradientAngle = 140;

        themePreset.value = "";

        syncSettingsUI();

        applyGradient();

        persistSettings();

        updateActiveStatus();

    });

}



if (themePreset) {

    themePreset.addEventListener("change", () => {

        const preset = themePresets[themePreset.value];

        if (!preset) return;

        settings.gradientStart = preset.start;

        settings.gradientEnd = preset.end;

        settings.gradientAngle = preset.angle;

        if (preset.mode) {

            theme = preset.mode;

            applyTheme(theme);

        }

        syncSettingsUI();

        applyGradient();

        persistSettings();

        updateActiveStatus();

    });

}



const populateModelList = (list) => {

    if (!modelSelect) return;

    modelSelect.innerHTML = "";

    const defaultOpt = document.createElement("option");

    defaultOpt.value = "";

    defaultOpt.textContent = "Default (env)";

    modelSelect.appendChild(defaultOpt);

    list.forEach((id) => {

        const opt = document.createElement("option");

        opt.value = id;

        opt.textContent = id;

        modelSelect.appendChild(opt);

    });

    if (settings.model && !list.includes(settings.model)) {

        const opt = document.createElement("option");

        opt.value = settings.model;

        opt.textContent = settings.model;

        modelSelect.appendChild(opt);

    }

};



// Fetch model list from backend and populate datalist

const fetchModels = async () => {

    const url = buildApiUrl("/api/models");

    if (!url) {

        populateModelList([]);

        settings.model = "";

        syncSettingsUI();

        persistSettings();

        updateActiveStatus();

        showToast("Model list unavailable; using default", "error");

        return;

    }

    try {

        const res = await fetch(url, { method: "GET", credentials: "include" });

        if (!res.ok) {

            populateModelList([]);

            settings.model = "";

            syncSettingsUI();

            persistSettings();

            updateActiveStatus();

            showToast("Model list unavailable; using default", "error");

            return;

        }

        const data = await res.json();

        const list = (data.models || []).filter(Boolean);

        const defaultFromApi = data.default_model || "";

        const finalList = list.length ? list : [];

        populateModelList(finalList);

        if (!settings.model) {

            settings.model = defaultFromApi || (finalList.length ? finalList[0] : "");

        } else if (finalList.length && !finalList.includes(settings.model)) {

            settings.model = defaultFromApi && finalList.includes(defaultFromApi)

                ? defaultFromApi

                : finalList[0];

        }

        syncSettingsUI();

        persistSettings();

        updateActiveStatus();

    } catch (err) {

        console.warn("Model fetch failed", err);

        populateModelList([]);

        settings.model = "";

        syncSettingsUI();

        persistSettings();

        updateActiveStatus();

        showToast("Model list unavailable; using default", "error");

    }

};



// seed initial suggestions so the dropdown is never empty

populateModelList(fallbackModels);



if (reloadModelsBtn) {

    reloadModelsBtn.addEventListener("click", () => {

        fetchModels();

    });

}



if (clearChatBtn && messagesEl) {

    clearChatBtn.addEventListener("click", () => {

        messagesEl.innerHTML = "";

    });

}



if (promptEl && composerEl) {

    promptEl.addEventListener("keydown", (e) => {

        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {

            e.preventDefault();

            composerEl.dispatchEvent(new Event("submit"));

        }

    });

}



fetchModels();

// AUTH HELPERS
const ensureAuth = async () => {
    if (!backendURL) return false;
    try {
        const res = await fetch(buildApiUrl('/api/auth/me'), { method: 'GET', credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            currentUser = data;
            adminTabs.forEach(tab => { if (data.is_admin) { tab.removeAttribute('hidden'); } else { tab.setAttribute('hidden', ''); } });
            return true;
        }
        if (res.status === 401) {
            window.location.href = './login.html';
        }
    } catch (err) {
        console.warn('auth check failed', err);
        // If we cannot verify auth (CORS or network), force login to avoid a false "logged-in" state.
        window.location.href = './login.html';
    }
    return false;
};

const logout = async () => {
    try {
        await fetch(buildApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (err) {
        console.warn('logout failed', err);
    }
    window.location.href = './login.html';
};

const refreshUsers = async () => {
    if (!usersListEl) return;
    usersListEl.textContent = 'Loading...';
    try {
        const res = await fetch(buildApiUrl('/api/users'), { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        if (!data.length) {
            usersListEl.textContent = 'No users yet';
            return;
        }
        usersListEl.textContent = data.map(u => `${u.email}${u.is_admin ? ' (admin)' : ''}`).join(', ');
    } catch (err) {
        usersListEl.textContent = 'Error loading users';
    }
};

const createUser = async () => {
    if (!createUserBtn) return;
    const email = document.getElementById('newUserEmail')?.value.trim();
    const password = document.getElementById('newUserPassword')?.value;
    const isAdmin = document.getElementById('newUserIsAdmin')?.checked;
    if (!email || !password) {
        showToast('Email and password required', 'error');
        return;
    }
    createUserBtn.disabled = true;
    try {
        const res = await fetch(buildApiUrl('/api/users'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, is_admin: !!isAdmin })
        });
        if (!res.ok) throw new Error('Failed to create user');
        showToast('User created', 'success');
        refreshUsers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        createUserBtn.disabled = false;
    }
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

if (createUserBtn) {
    createUserBtn.addEventListener('click', createUser);
}

(async () => {
    ensureBackendConfigured();
    await checkBackend();
    startHealthPolling();
    await ensureAuth();
    syncSettingsUI();
    applyGradient();
    updateActiveStatus();
    await fetchModels();
    if (currentUser && currentUser.is_admin) {
        refreshUsers();
    }
})();
