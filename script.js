const API_URL = "https://rossie-chargeful-plentifully.ngrok-free.dev/v1/chat/completions";
const MODEL = "local-model";

const messages = document.getElementById("messages");
const prompt = document.getElementById("prompt");
document.getElementById("send").onclick = send;

function add(text, who){
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function send(){
  const text = prompt.value.trim();
  if(!text) return;
  add(text, "user");
  prompt.value = "";

  const body = {
    model: MODEL,
    messages: [{ role: "user", content: text }],
    stream: false
  };

  try{
    const r = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "No reply";
    add(reply, "ai");
  }catch(e){
    add("Error: "+e.message, "ai");
  }
}
