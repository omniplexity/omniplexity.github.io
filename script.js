/* ====== CONFIG ====== */
const API_URL = "https://rossie-chargeful-plentifully.ngrok-free.dev/v1/chat/completions";
const MODEL = "local-model";

/* ===== ELEMENTS ===== */
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const loginBtn = document.getElementById("login-btn");
const loginUser = document.getElementById("login-username");
const loginPass = document.getElementById("login-password");

const messages = document.getElementById("messages");
const themeBtn = document.getElementById("theme-toggle");
const promptInput = document.getElementById("prompt");
document.getElementById("send").onclick = send;

/* ====== LOGIN (Front-end only for now) ====== */
loginBtn.onclick = () => {
  if (!loginUser.value.trim() || !loginPass.value.trim()) {
    alert("Enter username and password");
    return;
  }

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
};

/* ====== THEME ====== */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

/* ====== CHAT ====== */
function add(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addThinking() {
  const div = document.createElement("div");
  div.className = "msg ai thinking";
  div.textContent = "Thinking...";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function send() {
  const text = promptInput.value.trim();
  if (!text) return;

  add(text, "user");
  promptInput.value = "";

  const thinkingBubble = addThinking();

  const body = {
    model: MODEL,
    messages: [{ role: "user", content: text }],
    stream: false
  };

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "No reply";

    thinkingBubble.remove();
    add(reply, "ai");

  } catch (e) {
    thinkingBubble.remove();
    add("Error: " + e.message, "ai");
  }
}

/* ====== FLUX BACKGROUND ====== */
const canvas = document.getElementById("network-canvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;

const nodes = [];
for (let i = 0; i < 70; i++) {
  nodes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5
  });
}

function animateNetwork() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";

  nodes.forEach(n => {
    n.x += n.vx;
    n.y += n.vy;

    if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
    if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

    ctx.beginPath();
    ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
    ctx.fill();

    nodes.forEach(n2 => {
      const dx = n.x - n2.x;
      const dy = n.y - n2.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) {
        ctx.globalAlpha = 1 - dist / 120;
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  });

  requestAnimationFrame(animateNetwork);
}

animateNetwork();
