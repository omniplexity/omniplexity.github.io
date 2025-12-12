// Your backend root URL (change this when ngrok updates)
const backendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";

const messagesEl = document.getElementById("messages");
const composerEl = document.getElementById("composer");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");

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

composerEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = promptEl.value.trim();
    if (!input) return;

    appendMessage("user", input);
    promptEl.value = "";

    const assistantBubble = appendMessage("assistant", "Thinking...", true);
    sendBtn.disabled = true;

    try {
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
    } catch (error) {
        setAssistantReply(
            assistantBubble,
            `Error: ${error.message}`,
            true
        );
    } finally {
        sendBtn.disabled = false;
        promptEl.focus();
    }
});
