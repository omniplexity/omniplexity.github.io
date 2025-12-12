// Your backend root URL (change this when ngrok updates)
const backendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev/api/chat";

document.getElementById("sendBtn").addEventListener("click", async () => {
    const input = document.getElementById("prompt").value;

    const response = await fetch(`${backendURL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
    });

    if (!response.ok) {
        document.getElementById("responseArea").innerText =
            `Error: ${response.status}`;
        return;
    }

    const data = await response.json();
    document.getElementById("responseArea").innerText = data.response;
});
