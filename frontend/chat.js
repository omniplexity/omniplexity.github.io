const backendURL = "http://10.0.0.198:11434"; 
// Example: "https://abcd1234.ngrok.io"
// You can switch this to "http://localhost:8000" for local testing.

document.getElementById("sendBtn").addEventListener("click", async () => {
    const prompt = document.getElementById("prompt").value;

    const formData = new FormData();
    formData.append("prompt", prompt);

    const response = await fetch(`${backendURL}/api/ai/chat`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    document.getElementById("responseArea").innerText = data.response;
});

document.getElementById("visionBtn").addEventListener("click", async () => {
    const prompt = document.getElementById("prompt").value;
    const imageFile = document.getElementById("imageUpload").files[0];

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("image", imageFile);

    const response = await fetch(`${backendURL}/api/ai/vision`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    document.getElementById("responseArea").innerText = data.response;
});
