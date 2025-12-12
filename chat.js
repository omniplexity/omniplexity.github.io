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
const backendInput = document.getElementById("backendUrlInput");
const saveBackendBtn = document.getElementById("saveBackendBtn");
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const themeToggle = document.getElementById("themeToggle");

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

const loadBackendUrl = () => {
    const stored = localStorage.getItem("backendURL");
    try {
        if (stored) return normalizeBackendUrl(stored);
    } catch {
        // fall through to default
    }
    try {
        return normalizeBackendUrl(defaultBackendURL);
    } catch {
        return "";
    }
};

let backendURL = loadBackendUrl();
let theme = localStorage.getItem("theme") || "light";

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
    if (!backendURL) {
        setStatus("error", "Set backend URL");
        return;
    }
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

if (backendInput) {
    backendInput.value = backendURL;
}

if (saveBackendBtn) {
    saveBackendBtn.addEventListener("click", () => {
        const candidate = backendInput.value.trim();
        if (!candidate) {
            setStatus("error", "Set backend URL");
            return;
        }
        try {
            backendURL = normalizeBackendUrl(candidate);
            backendInput.value = backendURL;
            localStorage.setItem("backendURL", backendURL);
            checkBackend();
        } catch (err) {
            setStatus("error", err.message || "Invalid URL");
        }
    });
}

const ensureBackendConfigured = () => {
    if (!backendURL) {
        setStatus("error", "Set backend URL");
        return false;
    }
    try {
        backendURL = normalizeBackendUrl(backendURL);
        localStorage.setItem("backendURL", backendURL);
        if (backendInput) backendInput.value = backendURL;
    } catch {
        setStatus("error", "Invalid backend URL");
        return false;
    }
    return true;
};

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
            body: JSON.stringify({ message: input })
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();
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
