const chatLabels = {
  en: {
    title: 'Blue Rental Assistant',
    intro: 'Hi, I can help with vehicles, insurance, deposits and pick-up information.',
    placeholder: 'Ask a question...',
    send: 'Send',
    open: 'Chat',
    fallback: 'Sorry, I could not answer that just now. Please contact Blue Rental directly.'
  },
  zh: {
    title: 'Blue Rental 助手',
    intro: '你好，我可以回答车型、保险、定金、取还车等常见问题。',
    placeholder: '请输入问题...',
    send: '发送',
    open: '客服',
    fallback: '抱歉，我暂时无法回答这个问题。请直接联系 Blue Rental。'
  }
};

function chatLanguage() {
  return localStorage.getItem('blueRentalLang') === 'zh' ? 'zh' : 'en';
}

function createMessage(text, role) {
  const item = document.createElement('div');
  item.className = `chat-message ${role}`;
  item.textContent = text;
  return item;
}

async function askAssistant(message) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language: chatLanguage() })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Chat request failed');
  return payload.reply;
}

function initChatAssistant() {
  if (document.querySelector('.chat-assistant')) return;

  const labels = chatLabels[chatLanguage()];
  const root = document.createElement('aside');
  root.className = 'chat-assistant';
  root.innerHTML = `
    <button class="chat-toggle" type="button" aria-label="${labels.open}">
      <span>?</span>
      <strong>${labels.open}</strong>
    </button>
    <section class="chat-panel" aria-label="${labels.title}">
      <header>
        <div>
          <strong>${labels.title}</strong>
          <small>Online</small>
        </div>
        <button type="button" class="chat-close" aria-label="Close">x</button>
      </header>
      <div class="chat-messages"></div>
      <form class="chat-form">
        <input name="message" autocomplete="off" placeholder="${labels.placeholder}" required>
        <button type="submit">${labels.send}</button>
      </form>
    </section>
  `;

  document.body.appendChild(root);

  const toggle = root.querySelector('.chat-toggle');
  const panel = root.querySelector('.chat-panel');
  const close = root.querySelector('.chat-close');
  const messages = root.querySelector('.chat-messages');
  const form = root.querySelector('.chat-form');
  const input = form.elements.message;

  messages.appendChild(createMessage(labels.intro, 'assistant'));

  toggle.addEventListener('click', () => {
    root.classList.add('open');
    input.focus();
  });

  close.addEventListener('click', () => {
    root.classList.remove('open');
    toggle.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    messages.appendChild(createMessage(text, 'user'));
    messages.scrollTop = messages.scrollHeight;

    const loading = createMessage('...', 'assistant');
    messages.appendChild(loading);

    try {
      loading.textContent = await askAssistant(text);
    } catch {
      loading.textContent = chatLabels[chatLanguage()].fallback;
    }

    messages.scrollTop = messages.scrollHeight;
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') root.classList.remove('open');
  });
}

initChatAssistant();
