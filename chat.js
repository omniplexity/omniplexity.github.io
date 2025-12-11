const backendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev";

document.getElementById("sendBtn").addEventListener("click", async () => {
    const prompt = document.getElementById("prompt").value;

    const response = await fetch(`${backendURL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
    });

    const data = await response.json();
    document.getElementById("responseArea").innerText = data.response;
});
