async function sendMessage() {
  const input = document.getElementById('userInput');
  const messages = document.getElementById('messages');
  const text = input.value.trim();
  if (!text) return;

  messages.innerHTML += `<div class='user-msg'>${text}</div>`;
  messages.innerHTML += `<div class='thinking'>Thinking...</div>`;
  input.value = '';

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  document.querySelector('.thinking').remove();
  messages.innerHTML += `<div class='bot-msg'>${data.reply}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

function toggleTheme() {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'light' ? 'dark' : 'light';
}
