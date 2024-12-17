// chat.js

// 初始化 globalConfig
let globalConfig = initConfig();

function initConfig() {
    try {
        const storedConfig = localStorage.getItem('chatConfig');
        return storedConfig ? JSON.parse(storedConfig) : {
            sel: 'DeepSeek',
            configs: {
                DeepSeek: { token: '' },
                Gemini: { token: '' },
                OpenAI: { token: '' },
                Claude: { token: '' },
                XAI: { token: '' },
            }
        };
    } catch (error) {
        console.error('Error parsing stored config:', error);
        return {
            sel: 'DeepSeek',
            configs: {
                DeepSeek: { token: '' },
                Gemini: { token: '' },
                OpenAI: { token: '' },
                Claude: { token: '' },
                XAI: { token: '' },
            }
        };
    }
}

function saveConfig() {
    const newApiKey = document.getElementById('api-key').value;
    globalConfig.configs[globalConfig.sel].token = newApiKey;

    const selectedValue = document.getElementById('chatbot-name').value;
    globalConfig.sel = selectedValue;
    document.getElementById('api-key').value = globalConfig.configs[selectedValue].token || '';

    localStorage.setItem('chatConfig', JSON.stringify(globalConfig));
}

function getConfig() {
    const name = globalConfig.sel;
    const token = globalConfig.configs[globalConfig.sel].token;
    switch (globalConfig.sel) {
        case 'DeepSeek':
            return {
                name,
                token,
                url: 'https://api.deepseek.com/chat/completions',
                model: 'deepseek-chat',
            };
        case 'Gemini':
            return {
                name,
                token,
                url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                model: 'gemini-exp-1121',
            };
        case 'OpenAI':
            return {
                name,
                token,
                url: 'https://api.openai.com/v1/engines/davinci-codex/completions',
                model: 'gpt-4o_2024-05-13',
            };
        case 'Claude':
            return {
                name,
                token,
                url: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-opus-20240229',
            };
        case 'XAI':
            return {
                name,
                token,
                url: 'https://api.x.ai/v1',
                model: 'grok-beta',
            };
        default:
            return undefined;
    }
}

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('settings-button').addEventListener('click', showSettings);

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const svrInfo = getConfig();

    if (message === '' || svrInfo === undefined) {
        return;
    }

    addMessageToHistory('You', message);
    messageInput.value = '';
    console.log('svr info:', svrInfo);

    const attachments = await getAttachments();

    try {
        let response;
        if (svrInfo.name === 'Claude') {
            response = await sendClaudeRequest(svrInfo, message, attachments);
        } else {
            response = await sendGenericRequest(svrInfo, message);
        }

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        let chatResponse;
        if (svrInfo.name === 'Claude') {
            chatResponse = data.content[0].text;
        } else {
            chatResponse = data.choices[0].text.trim();
        }
        addMessageToHistory(svrInfo.name, chatResponse);
    } catch (error) {
        console.error('Error:', error);
        addMessageToHistory('System', 'An error occurred while processing your request.');
    }

    // 清除附件
    clearAttachments();
}

async function sendClaudeRequest(svrInfo, message, attachments) {
    const body = {
        model: svrInfo.model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 150
    };

    if (attachments.length > 0) {
        body.messages[0].content = [
            { type: 'text', text: message },
            ...attachments.map(attachment => ({
                type: 'image',
                source: { type: 'base64', media_type: attachment.type, data: attachment.data }
            }))
        ];
    }

    return fetch(svrInfo.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': svrInfo.token,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
    });
}

async function sendGenericRequest(svrInfo, message) {
    return fetch(svrInfo.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${svrInfo.token}`
        },
        body: JSON.stringify({
            model: svrInfo.model,
            messages:           [{"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message}],
"stream": false
        })
    });
}

function addMessageToHistory(sender, message) {
    const chatHistory = document.getElementById('chat-history');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 文件拖放处理代码
document.getElementById('message-input').addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.getElementById('message-input').addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
        addFileIcon(file);
    }
});

function addFileIcon(file) {
    const fileIconContainer = document.createElement('div');
    fileIconContainer.classList.add('file-icon');

    const fileIcon = document.createElement('img');
    fileIcon.src = 'https://via.placeholder.com/50'; // Placeholder image
    fileIcon.alt = file.name;

    const deleteIcon = document.createElement('div');
    deleteIcon.classList.add('delete-icon');
    deleteIcon.textContent = '×';
    deleteIcon.addEventListener('click', () => {
        fileIconContainer.remove();
    });

    fileIconContainer.appendChild(fileIcon);
    fileIconContainer.appendChild(deleteIcon);
    fileIconContainer.dataset.file = JSON.stringify(file);

    document.getElementById('input-container').insertBefore(fileIconContainer, document.getElementById('button-container'));
}

async function getAttachments() {
    const attachments = [];
    const fileIcons = document.querySelectorAll('.file-icon');
    for (const icon of fileIcons) {
        const file = JSON.parse(icon.dataset.file);
        const base64Data = await readFileAsBase64(file);
        attachments.push({
            type: file.type,
            data: base64Data
        });
    }
    return attachments;
}

function clearAttachments() {
    const fileIcons = document.querySelectorAll('.file-icon');
    fileIcons.forEach(icon => icon.remove());
}

function showSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'block';
        document.getElementById('chatbot-name').value = globalConfig.sel;
        document.getElementById('api-key').value = globalConfig.configs[globalConfig.sel].token || '';
    } else {
        console.error('Settings modal not found');
    }
}

document.querySelector('.close-button')?.addEventListener('click', () => {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
});

document.getElementById('chatbot-name').addEventListener('change', function () {
    const selectedValue = this.value;
    saveConfig();

    globalConfig.sel = selectedValue;
    document.getElementById('api-key').value = globalConfig.configs[selectedValue].token || '';
});

document.getElementById('save-settings').addEventListener('click', () => {
    saveConfig();

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
    alert('设置已保存!');
});

// 添加文件读取功能
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 修改 getAttachments 函数以读取文件内容
async function getAttachments() {
    const attachments = [];
    const fileIcons = document.querySelectorAll('.file-icon');
    for (const icon of fileIcons) {
        const file = JSON.parse(icon.dataset.file);
        const base64Data = await readFileAsBase64(file);
        attachments.push({
            type: file.type,
            data: base64Data
        });
    }
    return attachments;
}

// 修改 sendMessage 函数为异步函数
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const svrInfo = getConfig();

    if (message === '' || svrInfo === undefined) {
        return;
    }

    addMessageToHistory('You', message);
    messageInput.value = '';
    console.log('svr info:', svrInfo);

    const attachments = await getAttachments();

    try {
        let response;
        if (svrInfo.name === 'Claude') {
            response = await sendClaudeRequest(svrInfo, message, attachments);
        } else {
            response = await sendGenericRequest(svrInfo, message);
        }

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        let chatResponse;
            chatResponse = data?.choices?.[0]?.message?.content?.trim();
        addMessageToHistory(svrInfo.name, chatResponse);
    } catch (error) {
        console.error('Error:', error,JSON.stringify(error,null,2));
        addMessageToHistory('System', 'An error occurred while processing your request.');
    }

    // 清除附件
    clearAttachments();
}
