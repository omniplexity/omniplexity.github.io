const backendURL = "https://rossie-chargeful-plentifully.ngrok-free.dev"; 
// Example: "https://abcd1234.ngrok.io"
// You can switch this to "http://localhost:8000" for local testing.

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
