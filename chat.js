// chat.js

// 初始化 globalConfig
let globalConfig = initConfig();

function initConfig(){
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

function saveConfig(){
    const selectedValue = document.getElementById('chatbot-name').value;
    const newApiKey = document.getElementById('api-key').value;

    globalConfig.sel = selectedValue;
    globalConfig.configs[selectedValue].token = newApiKey;

    localStorage.setItem('chatConfig', JSON.stringify(globalConfig));
}

function getConfig(){
    const name = globalConfig.sel;
    const token = globalConfig.configs[selectedValue].token;
    switch( globalConfig.sel){
    case 'DeepSeek': 
        return {
            name,
            token,
            url: 'https://api.deepseek.com',
            model: 'deepseek-chat',
        };
    case 'Gemini': 
        return {
            name,
            token,
            url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            model: 'gemini-exp-1121',
        };
    case 'OpenAI': return {
        name,
        token,
        url: 'https://api.openai.com/v1/engines/davinci-codex/completions',
        model: 'gpt-4o_2024-05-13',
    },
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
    if (message === '' || svrInfo === undefined )
        return;

    addMessageToHistory('You', message);
    messageInput.value = '';

    try {
        const response = await fetch(svrInfo.url, {
            method: 'POST',
            headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${svrInfo.token}`
            },
            body: JSON.stringify({
                prompt: message,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const chatGPTResponse = data.choices[0].text.trim();
        addMessageToHistory(svrInfo.name, chatGPTResponse);
    } catch (error) {
        console.error('Error:', error);
        addMessageToHistory('System', 'An error occurred while processing your request.');
    }
}

function addMessageToHistory(sender, message) {
    const chatHistory = document.getElementById('chat-history');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 文件拖放处理代码保持不变

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

document.getElementById('chatbot-name').addEventListener('change', function() {
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

