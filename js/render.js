// OmniAI WebUI DOM Rendering Helpers
// Only contains functions used by app.js for rendering UI elements

// ============================================
// CONVERSATIONS LIST
// ============================================

function renderConversations(conversations) {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    list.innerHTML = '';

    if (!conversations || conversations.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-conversations';
        emptyLi.innerHTML = '<span class="conversation-title" style="color: var(--muted); font-style: italic;">No conversations yet</span>';
        list.appendChild(emptyLi);
        return;
    }

    conversations.forEach(conv => {
        const li = document.createElement('li');
        li.dataset.id = conv.id;

        const title = document.createElement('span');
        title.className = 'conversation-title';
        title.textContent = conv.title || 'Untitled Chat';
        title.addEventListener('click', () => {
            if (window.selectConversation) {
                window.selectConversation(conv.id);
            }
        });

        const actions = document.createElement('div');
        actions.className = 'conversation-actions';

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.renameConversation) {
                window.renameConversation(conv.id, conv.title);
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn-danger';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.deleteConversation) {
                window.deleteConversation(conv.id);
            }
        });

        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(title);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

// ============================================
// MESSAGE RENDERING
// ============================================

function createMessageCard(msg, index) {
    const card = document.createElement('div');
    card.className = `message-card ${msg.role}`;
    card.dataset.messageIndex = index;

    // Header/meta section
    const header = document.createElement('div');
    header.className = 'message-header';

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    if (msg.role === 'assistant') {
        const modelInfo = document.createElement('span');
        modelInfo.className = 'message-model';
        modelInfo.textContent = msg.model || 'Assistant';
        meta.appendChild(modelInfo);

        if (msg.elapsed_time) {
            const timing = document.createElement('span');
            timing.className = 'message-timing';
            timing.textContent = `${msg.elapsed_time}s`;
            meta.appendChild(timing);
        }

        if (msg.usage) {
            const tokens = document.createElement('span');
            tokens.className = 'message-tokens';
            tokens.textContent = `${msg.usage.total_tokens || 'N/A'} tokens`;
            meta.appendChild(tokens);
        }
    } else {
        const roleInfo = document.createElement('span');
        roleInfo.className = 'message-model';
        roleInfo.textContent = 'You';
        meta.appendChild(roleInfo);
    }

    header.appendChild(meta);

    // Content section
    const content = document.createElement('div');
    content.className = 'message-content';

    if (msg.role === 'assistant' && msg.content === '') {
        card.classList.add('streaming');
        content.innerHTML = '<div class="skeleton-placeholder"></div>';
    } else {
        content.innerHTML = renderMessageContent(msg.content);
    }

    // Actions section (hover)
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn copy-btn';
    copyBtn.innerHTML = '<span title="Copy">Copy</span>';
    copyBtn.addEventListener('click', () => copyMessageToClipboard(msg.content));
    actions.appendChild(copyBtn);

    if (msg.role === 'assistant') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'action-btn regen-btn';
        regenBtn.innerHTML = '<span title="Regenerate">Retry</span>';
        regenBtn.addEventListener('click', () => {
            if (window.retryMessageAtIndex) {
                window.retryMessageAtIndex(index);
            }
        });
        actions.appendChild(regenBtn);
    }

    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(actions);

    return card;
}

function renderMessageContent(content) {
    if (!content) return '';

    // Escape HTML first
    let escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Process code blocks
    escaped = escaped.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);

        return `<div class="code-block" data-code-id="${codeId}">
            <div class="code-header">
                <span class="code-lang">${language}</span>
                <div class="code-actions">
                    <button class="code-copy-btn" onclick="copyCodeBlock('${codeId}')">Copy</button>
                </div>
            </div>
            <pre><code class="language-${language}" id="${codeId}">${code.trim()}</code></pre>
        </div>`;
    });

    // Process inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Process line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}

// Global function for code block copy
window.copyCodeBlock = function(codeId) {
    const codeEl = document.getElementById(codeId);
    if (codeEl) {
        copyMessageToClipboard(codeEl.textContent);
        const block = codeEl.closest('.code-block');
        const btn = block?.querySelector('.code-copy-btn');
        if (btn) {
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        }
    }
};

function copyMessageToClipboard(content) {
    if (!content) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).then(() => {
            if (window.showToast) {
                window.showToast('Copied to clipboard', 'success', 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(content);
        });
    } else {
        fallbackCopy(content);
    }
}

function fallbackCopy(content) {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        if (window.showToast) {
            window.showToast('Copied to clipboard', 'success', 2000);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
}

// ============================================
// PROVIDER/MODEL DROPDOWNS
// ============================================

function renderProviders(providers) {
    const select = document.getElementById('provider-select');
    if (!select) return;

    select.innerHTML = '<option value="">Provider</option>';

    if (providers && providers.length > 0) {
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.provider_id;
            option.textContent = provider.name;
            select.appendChild(option);
        });
    }

    // Restore selected provider
    const selected = getSelectedProvider();
    if (selected) {
        const optionExists = select.querySelector(`option[value="${selected}"]`);
        if (optionExists) {
            select.value = selected;
            select.dispatchEvent(new Event('change'));
        } else {
            setSelectedProvider('');
        }
    }
}

function renderModels(models) {
    const select = document.getElementById('model-select');
    if (!select) return;

    select.innerHTML = '<option value="">Model</option>';

    if (models && models.length > 0) {
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            select.appendChild(option);
        });
        select.disabled = false;
    } else {
        select.disabled = true;
    }

    // Restore selected model
    const selected = getSelectedModel();
    if (selected) {
        const optionExists = select.querySelector(`option[value="${selected}"]`);
        if (optionExists) {
            select.value = selected;
        }
    }
}

// ============================================
// FILE EXTENSIONS (for code save)
// ============================================

function getFileExtension(lang) {
    const extensions = {
        javascript: 'js', js: 'js',
        typescript: 'ts', ts: 'ts',
        python: 'py', py: 'py',
        java: 'java',
        cpp: 'cpp', c: 'c',
        csharp: 'cs', cs: 'cs',
        html: 'html', css: 'css',
        json: 'json', xml: 'xml',
        yaml: 'yaml', yml: 'yml',
        markdown: 'md', md: 'md',
        sql: 'sql',
        bash: 'sh', shell: 'sh', sh: 'sh',
        go: 'go',
        rust: 'rs', rs: 'rs',
        php: 'php',
        ruby: 'rb', rb: 'rb',
        swift: 'swift',
        kotlin: 'kt', kt: 'kt',
        dart: 'dart', scala: 'scala',
        perl: 'pl', pl: 'pl',
        lua: 'lua', r: 'r',
        matlab: 'm',
        julia: 'jl', jl: 'jl'
    };
    return extensions[lang?.toLowerCase()] || 'txt';
}

function saveCodeAsFile(code, lang) {
    const extension = getFileExtension(lang);
    const filename = `code.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
