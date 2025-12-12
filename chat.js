// Your backend root URL (change this when ngrok updates)
const backendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";

const messagesEl = document.getElementById("messages");
const composerEl = document.getElementById("composer");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");

const appendMessage = (role, text, pending = false) => {
    const message = document.createElement("div");
    message.className = `message ${role}${pending ? " pending" : ""}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    message.appendChild(bubble);
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    return { message, bubble };
};

const setAssistantReply = (bubbleRef, text, isError = false) => {
    bubbleRef.bubble.textContent = text;
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
