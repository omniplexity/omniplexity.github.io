// Your backend root URL (change this when ngrok updates)
// Leave blank to force setting via the UI input.
const defaultBackendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";

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
const settingsToggle = document.getElementById("settingsToggle");
const hubWrapper = document.getElementById("hubWrapper");
const controlPanel = document.getElementById("controlPanel");
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

    message.appendChild(bubble);
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

const normalizeBackendUrl = (candidate) => {
    if (!candidate) throw new Error("Backend URL is empty");

    let normalized = candidate.trim();
    if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }

    const url = new URL(normalized);
    ensureChatPath(url);
    return url.toString();
};

let backendURL = "";
try {
    backendURL = normalizeBackendUrl(defaultBackendURL);
} catch {
    backendURL = "";
}
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

const getHealthUrl = () => {
    try {
        const url = new URL(backendURL);
        url.pathname = "/";
        url.search = "";
        return url.toString();
    } catch {
        return null;
    }
};

const checkBackend = async () => {
    if (!ensureBackendConfigured()) return;
    const healthUrl = getHealthUrl();
    if (!healthUrl) {
        setStatus("error", "Invalid backend URL");
        return;
    }
    setStatus("connecting", "Checking backend...");
    try {
        const res = await fetch(healthUrl, { method: "GET" });
        if (res.ok) {
            setStatus("ok", "Connected to backend");
        } else {
            setStatus("error", `Backend ${res.status}`);
        }
    } catch (err) {
        setStatus("error", "Backend unreachable");
    }
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
        gradAngleValue.textContent = `${settings.gradientAngle}°`;
    }
};

syncSettingsUI();
applyGradient();

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

    const assistantBubble = appendMessage("assistant", "Thinking...", true);
    sendBtn.disabled = true;

    try {
        setStatus("connecting", "Sending...");
        const response = await fetch(backendURL, {
            method: "POST",
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
        setStatus("ok", "Connected to backend");
    } catch (error) {
        setAssistantReply(
            assistantBubble,
            `Error: ${error.message}`,
            true
        );
        setStatus("error", "Request failed");
    } finally {
        sendBtn.disabled = false;
        promptEl.focus();
    }
});

checkBackend();

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

// SETTINGS PANEL
if (settingsToggle && controlPanel && hubWrapper) {
    let hubPinned = false;

    const openPanel = () => {
        controlPanel.classList.add("open");
        controlPanel.setAttribute("aria-hidden", "false");
    };
    const closePanel = () => {
        controlPanel.classList.remove("open");
        controlPanel.setAttribute("aria-hidden", "true");
    };

    settingsToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        hubPinned = !hubPinned;
        hubPinned ? openPanel() : closePanel();
    });

    hubWrapper.addEventListener("mouseenter", () => {
        if (!hubPinned) openPanel();
    });
    hubWrapper.addEventListener("mouseleave", () => {
        if (!hubPinned) closePanel();
    });

    document.addEventListener("click", (e) => {
        if (!hubPinned) return;
        if (hubWrapper && !hubWrapper.contains(e.target)) {
            hubPinned = false;
            closePanel();
        }
    });
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
        settings.model = modelSelect.value;
        persistSettings();
    });
}

if (systemPromptEl) {
    systemPromptEl.addEventListener("input", () => {
        settings.systemPrompt = systemPromptEl.value;
        persistSettings();
    });
}

if (tempSlider && tempValue) {
    tempSlider.addEventListener("input", () => {
        settings.temperature = parseFloat(tempSlider.value);
        tempValue.textContent = settings.temperature.toFixed(1);
        persistSettings();
    });
}

if (topPSlider && topPValue) {
    topPSlider.addEventListener("input", () => {
        settings.topP = parseFloat(topPSlider.value);
        topPValue.textContent = settings.topP.toFixed(2);
        persistSettings();
    });
}

if (maxTokensInput) {
    maxTokensInput.addEventListener("input", () => {
        const val = parseInt(maxTokensInput.value || "0", 10);
        settings.maxTokens = Number.isNaN(val) ? 0 : val;
        persistSettings();
    });
}

if (useSearchToggle) {
    useSearchToggle.addEventListener("change", () => {
        settings.useSearch = useSearchToggle.checked;
        persistSettings();
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
        gradAngleValue.textContent = `${settings.gradientAngle}°`;
        persistSettings();
    });
}

if (applyThemeBtn) {
    applyThemeBtn.addEventListener("click", () => {
        applyGradient();
        persistSettings();
    });
}
