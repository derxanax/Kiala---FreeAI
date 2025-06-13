document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const messageInput = document.getElementById('message-input-grok');
    const sendButton = document.getElementById('send-button-grok');
    const attachFileButton = document.getElementById('attach-file-btn');
    const chatMessagesContainer = document.getElementById('chat-messages-grok');
    const typingIndicator = document.getElementById('typing-indicator-grok');
    const sidebar = document.querySelector('.sidebar-grok');
    const sidebarToggleButtons = document.querySelectorAll('.sidebar-toggle-grok-btn');
    const newChatButton = document.getElementById('new-chat-btn-id');
    const historyListContainer = document.getElementById('history-list-grok');
    const currentChatTitle = document.getElementById('current-chat-title');
    const chatMenuButtonInternal = document.getElementById('chat-menu-btn-internal');

    // Language selector dropdown
    const languageDropdown = document.getElementById('language-select');

    const menuButtons = document.querySelectorAll('.menu-grok-btn');
    const contentViews = document.querySelectorAll('.content-view');

    // Settings View Elements
    const themeSelect = document.getElementById('theme-select');
    const denseModeToggle = document.getElementById('dense-mode-toggle');
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const toggleApiKeyVisibilityButton = document.getElementById('toggle-api-key-visibility');
    const saveApiKeyButton = document.getElementById('save-api-key-btn');
    const systemPromptInput = document.getElementById('system-prompt-input');
    const saveSystemPromptButton = document.getElementById('save-system-prompt-btn');
    const clearHistoryAllButton = document.getElementById('clear-history-all-btn');
    const providerSelect = document.getElementById('provider-select');

    // Profile View Elements
    const usernameInput = document.getElementById('username-input');
    const userAvatarPreview = document.getElementById('user-avatar-preview');
    const kialaVersionDisplay = document.getElementById('kiala-version-display');
    const exportChatsButton = document.getElementById('export-chats-btn');
    const importChatsInput = document.getElementById('import-chats-input');


    // Chat Header Actions
    const clearCurrentChatButton = document.getElementById('clear-current-chat-btn');
    const moreOptionsButton = document.getElementById('more-options-btn');
    const moreOptionsDropdown = document.getElementById('more-options-dropdown-id');

    // Modals
    const renameChatModal = document.getElementById('rename-chat-modal');
    const renameChatInput = document.getElementById('rename-chat-input');
    const confirmRenameChatButton = document.getElementById('confirm-rename-chat-btn');
    const cancelRenameChatButton = document.getElementById('cancel-rename-chat-btn');
    const closeModalButtons = document.querySelectorAll('.close-modal-grok');

    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationModalTitle = document.getElementById('confirmation-modal-title');
    const confirmationModalText = document.getElementById('confirmation-modal-text');
    const confirmationModalConfirmButton = document.getElementById('confirmation-modal-confirm-btn');
    const confirmationModalCancelButton = document.getElementById('confirmation-modal-cancel-btn');
    
    const toastContainer = document.getElementById('toast-container-grok');

    // State Management
    let chatHistory = [];
    let activeChatId = null;
    let userSettings = {
        theme: 'grok-dark',
        denseMode: false,
        geminiApiKey: '',
        globalSystemPrompt: "You are a polite and friendly assistant to Kiala, who is happy to answer questions asked.",
        userAvatarInitials: 'You',
        provider: 'gemini',
        language: 'en'
    };
    let isGeminiResponding = false;
    let currentConfirmationAction = null;

    // Internationalization current language
    let currentLanguage = 'en';

    const KIALA_VERSION = "0.1A";


    // Local storage function
    const LS_KIALA_HISTORY = 'kialaChatHistory_v0.1A';
    const LS_KIALA_SETTINGS = 'kialaUserSettings_v0.1A';

    function saveChatHistoryToLS() {
        try {
            localStorage.setItem(LS_KIALA_HISTORY, JSON.stringify(chatHistory));
        } catch (e) {
            console.error("Error saving chat history to localStorage:", e);
            showToast(t("toast.error"), "error");
        }
    }

    function loadChatHistoryFromLS() {
        const storedHistory = localStorage.getItem(LS_KIALA_HISTORY);
        if (storedHistory) {
            try {
                const parsedHistory = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory) && 
                    (parsedHistory.length === 0 || (parsedHistory[0] && typeof parsedHistory[0].id !== 'undefined'))) {
                    chatHistory = parsedHistory;
                    const activeFound = chatHistory.find(ch => ch.isActive);
                    if (activeFound) {
                        activeChatId = activeFound.id;
                    } else if (chatHistory.length > 0) {
                        chatHistory[0].isActive = true;
                        activeChatId = chatHistory[0].id;
                    }
                } else {
                    console.warn("The saved chat history is in an invalid format. The default one is being used.");
                    initializeDefaultChat();
                }
            } catch (e) {
                console.error("Error parsing chat history from localStorage:", e);
                initializeDefaultChat();
            }
        } else {
            initializeDefaultChat();
        }
    }
    
    function initializeDefaultChat() {
        chatHistory = [{
            id: Date.now(),
            title: "First Dialogue with Kiala",
            messages: [{
                sender: 'bot',
                text: `Hi! How can I help you today?`,
                prompts: ["Tell us more about yourself", "What are your options?", "What is 2 + 2?"]
            }],
            isActive: true,
            systemInstruction: null,
            lastActivity: Date.now()
        }];
        activeChatId = chatHistory[0].id;
        saveChatHistoryToLS();
    }

    function saveUserSettingsToLS() {
        try {
            localStorage.setItem(LS_KIALA_SETTINGS, JSON.stringify(userSettings));
        } catch (e) {
            console.error("Error saving settings to localStorage:", e);
            showToast(t("toast.error"), "error");
        }
    }

    function loadUserSettingsFromLS() {
        const storedSettings = localStorage.getItem(LS_KIALA_SETTINGS);
        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings);
                userSettings = { ...userSettings, ...parsedSettings };
            } catch (e) {
                console.error("Error parsing settings from localStorage:", e);
            }
        }
        applyUserSettings();
    }
    
    function applyUserSettings() {
        setTheme(userSettings.theme);
        if (themeSelect) themeSelect.value = userSettings.theme;

        if (denseModeToggle) denseModeToggle.checked = userSettings.denseMode;
        document.body.classList.toggle('dense-mode', userSettings.denseMode);

        if (geminiApiKeyInput) geminiApiKeyInput.value = userSettings.geminiApiKey || '';
        
        if (systemPromptInput) systemPromptInput.value = userSettings.globalSystemPrompt || '';

        if (usernameInput) usernameInput.value = userSettings.userAvatarInitials || 'You';
        if (userAvatarPreview) userAvatarPreview.textContent = getAvatarInitials(userSettings.userAvatarInitials || 'You');

        if (providerSelect) providerSelect.value = userSettings.provider || 'gemini';

        // Language
        currentLanguage = userSettings.language || 'en';
        if (languageDropdown) {
            const currentFlag = languageDropdown.querySelector('.language-current img');
            const currentText = languageDropdown.querySelector('.language-current span');
            if (currentFlag && currentText) {
                currentFlag.src = `/static/img/flags/${currentLanguage}.svg`;
                currentText.textContent = currentLanguage === 'ru' ? 'Русский' : currentLanguage === 'by' ? 'Беларуская' : 'English';
            }
        }
    }

    function setTheme(themeName) {
        document.body.classList.remove('light-theme', 'dark-theme');
        
        if (themeName === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
            userSettings.theme = 'system'; 
        } else if (themeName === 'grok-light') {
            document.body.classList.add('light-theme');
            userSettings.theme = 'grok-light';
        } else { 
            document.body.classList.add('dark-theme');
            userSettings.theme = 'grok-dark';
        }
        if (themeSelect) themeSelect.value = userSettings.theme;
        saveUserSettingsToLS();
    }

    sidebarToggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open-grok');
        });
    });
    
    document.addEventListener('click', (event) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open-grok')) {
            if (!sidebar.contains(event.target) && !event.target.closest('.sidebar-toggle-grok-btn')) {
                sidebar.classList.remove('open-grok');
            }
        }
        if (moreOptionsDropdown && moreOptionsDropdown.classList.contains('visible')) {
            if (!moreOptionsButton.contains(event.target) && !moreOptionsDropdown.contains(event.target)) {
                moreOptionsDropdown.classList.remove('visible');
            }
        }
    });

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            let newHeight = messageInput.scrollHeight;
            const maxHeight = parseInt(getComputedStyle(messageInput).maxHeight, 10) || 150; 
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                messageInput.style.overflowY = 'auto';
            } else {
                messageInput.style.overflowY = 'hidden';
            }
            messageInput.style.height = newHeight + 'px';
            
            sendButton.disabled = messageInput.value.trim() === '' || isGeminiResponding;
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    handleSendMessage();
                }
            }
        });
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }
    if (attachFileButton) {
        attachFileButton.addEventListener('click', () => {
            showToast("The file attachment feature is under development.", "info");
        });
    }

    async function handleSendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '' || !activeChatId || isGeminiResponding) return;

        isGeminiResponding = true;
        sendButton.disabled = true;
        sendButton.querySelector('i').classList.remove('fa-arrow-up');
        sendButton.querySelector('i').classList.add('fa-spinner', 'fa-spin');

        const currentChat = chatHistory.find(ch => ch.id === activeChatId);
        if (!currentChat) {
            showToast("Error: Active chat not found.", "error");
            isGeminiResponding = false;
            updateSendButtonState();
            return;
        }

        addMessageToChat(activeChatId, 'user', messageText);
        renderCurrentChatMessages();
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.dispatchEvent(new Event('input'));
        messageInput.focus();

        if (currentChat.messages.length > 0) {
            const lastBotMessageIndex = currentChat.messages.slice().reverse().findIndex(m => m.sender === 'bot');
            if (lastBotMessageIndex !== -1) {
                const actualIndex = currentChat.messages.length - 1 - lastBotMessageIndex;
                if (currentChat.messages[actualIndex].prompts) {
                    delete currentChat.messages[actualIndex].prompts;
                    const lastMessageElement = chatMessagesContainer.lastElementChild;
                    if (lastMessageElement) {
                        const promptsContainer = lastMessageElement.querySelector('.suggested-prompts-grok');
                        if (promptsContainer) promptsContainer.remove();
                    }
                }
            }
        }
        
        showTyping();

        try {
            const historyForApi = currentChat.messages
                .slice(-10) 
                .filter(msg => msg.sender !== 'user' || msg.text.trim() !== messageText)
                .map(msg => ({ sender: msg.sender, text: msg.text }));

            const provider = userSettings.provider || 'gemini';
            let botResponseText = '';
            if (provider === 'gemini') {
                const apiKeyToUse = userSettings.geminiApiKey;
                const systemPromptToUse = currentChat.systemInstruction || userSettings.globalSystemPrompt;
                if (!apiKeyToUse) {
                    throw new Error("Gemini API key is not installed. Please add it in Settings.");
                }
                botResponseText = await fetchGeminiResponse(messageText, historyForApi, apiKeyToUse, systemPromptToUse);
            } else if (provider === 'qwen') {
                botResponseText = await fetchQwenResponse(messageText);
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            addMessageToChat(activeChatId, 'bot', botResponseText);

        } catch (error) {
            console.error("Error sending message or receiving response:", error);
            let errorMessage = "There was an error connecting to Kiala. Please try again.";
            if (error.message && error.message.includes("API key")) {
                 errorMessage = error.message; 
            } else if (error.message && error.message.includes("quota")) {
                errorMessage = "Gemini API request limit reached. Please check your quota or try again later.";
            }
            addMessageToChat(activeChatId, 'bot', `⚠️ ${errorMessage}`);
            showToast(errorMessage, "error", 5000);
        } finally {
            hideTyping();
            renderCurrentChatMessages(); 
            saveChatHistoryToLS(); 
            isGeminiResponding = false;
            updateSendButtonState();
            sendButton.querySelector('i').classList.remove('fa-spinner', 'fa-spin');
            sendButton.querySelector('i').classList.add('fa-arrow-up');
        }
    }

    async function fetchGeminiResponse(message, historyForApi, apiKey, systemInstruction) {
        const response = await fetch('/api/ask_gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message, 
                chatHistory: historyForApi,
                apiKey: apiKey,
                systemInstruction: systemInstruction
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to get error details from the server." }));
            console.error("Error from Kiala API:", response.status, errorData);
            throw new Error(errorData.error || `The server responded with an error: ${response.status}`);
        }
        const data = await response.json();
        return data.reply;
    }
    
    async function fetchQwenResponse(message) {
        const response = await fetch('http://localhost:3700/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to get error details from the Qwen server." }));
            console.error("Error from Qwen API:", response.status, errorData);
            throw new Error(errorData.error || `The Qwen server responded with an error: ${response.status}`);
        }
        const data = await response.json();
        return data.response || ' '; // Qwen returns field 'response'
    }
    
    function addMessageToChat(chatId, sender, text, prompts = null) {
        const chat = chatHistory.find(ch => ch.id === chatId);
        if (chat) {
            const message = { 
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                sender, 
                text: text || " ", 
                timestamp: Date.now() 
            };
            if (prompts && Array.isArray(prompts) && prompts.length > 0) {
                message.prompts = prompts;
            }
            chat.messages.push(message);

            if (chat.title.startsWith("New chat") && sender === 'user' && chat.messages.filter(m => m.sender === 'user').length === 1) {
                const newTitle = text.substring(0, 35) + (text.length > 35 ? "..." : "");
                if (newTitle.trim()) { 
                    chat.title = newTitle;
                    renderHistoryList(); 
                    if (chat.id === activeChatId && currentChatTitle) {
                        currentChatTitle.textContent = chat.title; 
                    }
                }
            }
            chat.lastActivity = Date.now();
        }
    }

    function appendMessageToDOM(sender, text, prompts = null, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-grok', sender === 'user' ? 'user-grok' : 'bot-grok');
        if (messageId) messageDiv.dataset.messageId = messageId;

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar-grok', sender === 'user' ? 'user-avatar' : 'bot-avatar');
        avatarDiv.textContent = sender === 'user' ? getAvatarInitials(userSettings.userAvatarInitials) : 'K';
        avatarDiv.title = sender === 'user' ? userSettings.userAvatarInitials : 'Kiala';


        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content-grok');
        
        if (sender === 'bot' && text) {
            try {
                let textToParse = String(text);
                const preProcessedText = textToParse.replace(/\\n/g, '\n');

                console.log("DEBUG: Text for marked.parse:", preProcessedText);
                console.log("DEBUG: Text type for marked.parse:", typeof preProcessedText);

                const rawHtml = marked.parse(preProcessedText, { breaks: true, gfm: true }); 
                contentDiv.innerHTML = DOMPurify.sanitize(rawHtml, {
                    USE_PROFILES: { html: true }, 
                    ADD_TAGS: ['pre', 'code'], 
                    ADD_ATTR: ['class'] 
                });
            } catch (e) {
                console.error("Markdown rendering error:", e); 
                contentDiv.textContent = text; 
            }
        } else if (text) { 
            contentDiv.textContent = text;
        } else {
            contentDiv.textContent = ""; 
        }


        if (prompts && prompts.length > 0) {
            const promptsContainer = document.createElement('div');
            promptsContainer.classList.add('suggested-prompts-grok');
            prompts.forEach(promptText => {
                const promptButton = document.createElement('button');
                promptButton.classList.add('prompt-btn-grok');
                promptButton.textContent = promptText;
                promptButton.addEventListener('click', () => {
                    messageInput.value = promptText;
                    messageInput.dispatchEvent(new Event('input')); 
                    handleSendMessage(); 
                });
                promptsContainer.appendChild(promptButton);
            });
            contentDiv.appendChild(promptsContainer);
        }
        
        if (sender === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        }
        chatMessagesContainer.appendChild(messageDiv);
        setTimeout(() => {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 50);
    }

    function showTyping() {
        if (typingIndicator) {
            typingIndicator.classList.add('visible');
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
    function hideTyping() {
        if (typingIndicator) {
            typingIndicator.classList.remove('visible');
        }
    }
    
    function updateSendButtonState() {
        if (messageInput && sendButton) {
            sendButton.disabled = messageInput.value.trim() === '' || isGeminiResponding;
        }
    }

    function getAvatarInitials(name) {
        if (!name || typeof name !== 'string') return "U";
        const words = name.trim().split(/\s+/);
        if (words.length === 0 || words[0] === "") return "U";
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
    }

    function renderHistoryList() {
        if (!historyListContainer) return;
        historyListContainer.innerHTML = ''; 
        if (chatHistory.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.textContent = "Chat history is empty";
            emptyLi.style.padding = "10px 12px";
            emptyLi.style.color = "var(--text-secondary)";
            emptyLi.style.fontSize = "13px";
            historyListContainer.appendChild(emptyLi);
            return;
        }

        chatHistory.sort((a, b) => (b.lastActivity || b.id) - (a.lastActivity || a.id)); 

        chatHistory.forEach(chat => {
            const li = document.createElement('li');
            li.classList.add('history-item-grok');
            li.dataset.chatId = chat.id;

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('history-item-title');
            titleSpan.textContent = chat.title || "Untitled";
            titleSpan.title = chat.title || "Untitled"; 
            li.appendChild(titleSpan);

            const deleteIcon = document.createElement('i');
            deleteIcon.classList.add('fas', 'fa-times', 'delete-chat-icon-history');
            deleteIcon.title = "Delete this chat";
            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation(); 
                confirmAction(
                    "Delete chat?",
                    `Are you sure you want to delete the chat? "${chat.title || 'Untitled'}"? This action is irreversible.`,
                    () => deleteChat(chat.id),
                    "Delete"
                );
            });
            li.appendChild(deleteIcon);


            if (chat.id === activeChatId) {
                li.classList.add('active-history');
            }
            li.addEventListener('click', () => {
                if (chat.id !== activeChatId) {
                    activateChat(chat.id);
                }
                if (window.innerWidth <= 768 && sidebar.classList.contains('open-grok')) {
                    sidebar.classList.remove('open-grok');
                }
            });
            historyListContainer.appendChild(li);
        });
    }

    function renderCurrentChatMessages() {
        if (!chatMessagesContainer) return;
        chatMessagesContainer.innerHTML = ''; 
        const chat = chatHistory.find(ch => ch.id === activeChatId);
        if (chat && chat.messages) {
            if (currentChatTitle) currentChatTitle.textContent = chat.title || "Kiala";
            chat.messages.forEach(msg => {
                appendMessageToDOM(msg.sender, msg.text, msg.prompts, msg.id);
            });
        } else if (currentChatTitle) {
            currentChatTitle.textContent = "Kiala";
             appendMessageToDOM('bot', "Select a chat from the list or create a new one.");
        }
        updateSendButtonState(); 
    }
    
    function activateChat(chatId) {
        if (!chatId) return;

        const newActiveChat = chatHistory.find(ch => ch.id === chatId);
        if (!newActiveChat) {
            console.warn(`Chat with ID ${chatId} not found for activation.`);
            if (chatHistory.length > 0) {
                activeChatId = chatHistory[0].id;
                chatHistory[0].isActive = true;
            } else {
                createNewChat(false); 
                return; 
            }
        } else {
            activeChatId = chatId;
            chatHistory.forEach(ch => ch.isActive = (ch.id === chatId));
            if (newActiveChat) newActiveChat.lastActivity = Date.now(); 
        }
        
        saveChatHistoryToLS(); 
        renderHistoryList(); 
        renderCurrentChatMessages(); 
        
        if (messageInput) messageInput.focus();
        
        activateContentView('chat-view');
        if (chatMenuButtonInternal) {
            menuButtons.forEach(btn => btn.classList.remove('active-tab-grok'));
            chatMenuButtonInternal.classList.add('active-tab-grok');
        }
    }

    if (newChatButton) {
        newChatButton.addEventListener('click', () => createNewChat());
    }

    function createNewChat(switchToChatView = true) {
        const newChatId = Date.now();
        const newChatNumber = chatHistory.filter(c => c.title && c.title.startsWith("New chat")).length + 1;
        const newChat = {
            id: newChatId,
            title: "New chat " + newChatNumber,
            messages: [{ 
                sender: 'bot', 
                text: "Ready for new challenges! What shall we talk about?", 
                prompts: ["Latest AI News", "Help with Python Code", "Dinner Ideas"] 
            }],
            isActive: true, 
            systemInstruction: null, 
            lastActivity: newChatId
        };

        const currentActive = chatHistory.find(ch => ch.isActive);
        if (currentActive) currentActive.isActive = false;

        chatHistory.unshift(newChat); 
        activeChatId = newChatId;
        
        saveChatHistoryToLS();
        renderHistoryList();
        
        if (switchToChatView) {
            activateContentView('chat-view'); 
        }
        renderCurrentChatMessages(); 

        if (window.innerWidth <= 768 && sidebar.classList.contains('open-grok')) {
            sidebar.classList.remove('open-grok');
        }
        if (messageInput) messageInput.focus();
        showToast(`Created "${newChat.title}"`, "success", 2000);
    }

    function renameChat(chatIdToRename) {
        const chat = chatHistory.find(ch => ch.id === chatIdToRename);
        if (!chat) return;

        renameChatInput.value = chat.title;
        renameChatModal.classList.add('visible');
        renameChatInput.focus();
        renameChatInput.select();

        const newConfirmBtn = confirmRenameChatButton.cloneNode(true);
        confirmRenameChatButton.parentNode.replaceChild(newConfirmBtn, confirmRenameChatButton);
        confirmRenameChatButton = newConfirmBtn; 

        const newCancelBtn = cancelRenameChatButton.cloneNode(true);
        cancelRenameChatButton.parentNode.replaceChild(newCancelBtn, cancelRenameChatButton);
        cancelRenameChatButton = newCancelBtn;

        confirmRenameChatButton.onclick = () => {
            const newTitle = renameChatInput.value.trim();
            if (newTitle && newTitle !== chat.title) {
                chat.title = newTitle;
                chat.lastActivity = Date.now(); 
                saveChatHistoryToLS();
                renderHistoryList();
                if (chat.id === activeChatId && currentChatTitle) {
                    currentChatTitle.textContent = newTitle;
                }
                showToast("Chat has been renamed.", "success");
            }
            renameChatModal.classList.remove('visible');
        };
        cancelRenameChatButton.onclick = () => {
            renameChatModal.classList.remove('visible');
        };
    }

    function deleteChat(chatIdToDelete) {
        const chatIndex = chatHistory.findIndex(ch => ch.id === chatIdToDelete);
        if (chatIndex === -1) return;

        const deletedChatTitle = chatHistory[chatIndex].title;
        chatHistory.splice(chatIndex, 1);
        saveChatHistoryToLS();
        
        showToast(`Chat "${deletedChatTitle}" removed.`, "info");

        if (chatIdToDelete === activeChatId) {
            activeChatId = null; 
            if (chatHistory.length > 0) {
                chatHistory.sort((a, b) => (b.lastActivity || b.id) - (a.lastActivity || a.id));
                activateChat(chatHistory[0].id);
            } else {
                createNewChat(false); 
            }
        }
        renderHistoryList(); 
    }

    if (clearCurrentChatButton) {
        clearCurrentChatButton.addEventListener('click', () => {
            if (!activeChatId) return;
            const chat = chatHistory.find(ch => ch.id === activeChatId);
            if (!chat || chat.messages.length === 0) {
                showToast("There are no messages to delete in this chat.", "info");
                return;
            }
            confirmAction(
                "Clear messages?",
                `Are you sure you want to delete all messages in the chat? "${chat.title || 'Untitled'}"? The chat name will be saved.`,
                () => {
                    if (chat) {
                        chat.messages = [{
                            sender: 'bot',
                            text: "The message history for this chat has been cleared. What should we talk about now?",
                            prompts: ["Start over", "Ask me a question", "Tell me a joke"]
                        }];
                        chat.lastActivity = Date.now();
                        saveChatHistoryToLS();
                        renderCurrentChatMessages();
                        showToast("Messages in the current chat have been cleared.", "success");
                    }
                },
                "Clear"
            );
        });
    }

    if (moreOptionsButton) {
        moreOptionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            moreOptionsDropdown.classList.toggle('visible');
        });
    }
    if (moreOptionsDropdown) {
        moreOptionsDropdown.addEventListener('click', (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (action === 'rename-chat') {
                if (activeChatId) renameChat(activeChatId);
            } else if (action === 'delete-chat') {
                if (activeChatId) {
                    const chat = chatHistory.find(ch => ch.id === activeChatId);
                    if (chat) {
                         confirmAction(
                            "Delete current chat?",
                            `Are you sure you want to delete the chat? "${chat.title || 'Untitled'}"? This action is irreversible.`,
                            () => deleteChat(activeChatId),
                            "Delete"
                        );
                    }
                }
            }
            moreOptionsDropdown.classList.remove('visible'); 
        });
    }
            
    function activateContentView(viewId) {
        contentViews.forEach(v => v.classList.remove('active-view'));
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active-view');
        }
        menuButtons.forEach(btn => {
            btn.classList.toggle('active-tab-grok', btn.dataset.tab === viewId.replace('-view', ''));
        });
    }

    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetViewId = button.dataset.tab + "-view";
            activateContentView(targetViewId);
            if (window.innerWidth <= 768 && sidebar.classList.contains('open-grok')) {
                sidebar.classList.remove('open-grok');
            }
        });
    });

    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }
    if (denseModeToggle) {
        denseModeToggle.addEventListener('change', (e) => {
            userSettings.denseMode = e.target.checked;
            document.body.classList.toggle('dense-mode', userSettings.denseMode);
            saveUserSettingsToLS();
            if (chatMessagesContainer && document.getElementById('chat-view').classList.contains('active-view')) {
                chatMessagesContainer.scrollTo({ top: chatMessagesContainer.scrollHeight, behavior: 'smooth' });
            }
        });
    }
    if (geminiApiKeyInput && saveApiKeyButton && toggleApiKeyVisibilityButton) {
        toggleApiKeyVisibilityButton.addEventListener('click', () => {
            const icon = toggleApiKeyVisibilityButton.querySelector('i');
            if (geminiApiKeyInput.type === 'password') {
                geminiApiKeyInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                geminiApiKeyInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
        saveApiKeyButton.addEventListener('click', () => {
            userSettings.geminiApiKey = geminiApiKeyInput.value.trim();
            saveUserSettingsToLS();
            showToast("Gemini API key saved.", userSettings.geminiApiKey ? "success" : "warning");
        });
    }
    if (systemPromptInput && saveSystemPromptButton) {
        saveSystemPromptButton.addEventListener('click', () => {
            userSettings.globalSystemPrompt = systemPromptInput.value.trim();
            saveUserSettingsToLS();
            showToast("Global instruction for Kiala has been saved.", "success");
        });
    }
    if (clearHistoryAllButton) {
        clearHistoryAllButton.addEventListener('click', () => {
            confirmAction(
                "Clear ALL history?",
                "Are you sure you want to delete ALL chats? This action is irreversible and will affect all your conversations.",
                () => {
                    chatHistory = [];
                    activeChatId = null;
                    saveChatHistoryToLS(); 
                    createNewChat(false); 
                    renderHistoryList(); 
                    renderCurrentChatMessages(); 
                    showToast("All chat history has been deleted.", "success", 3000);
                },
                "Clear all"
            );
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const initials = usernameInput.value.trim().substring(0, 3); 
            usernameInput.value = initials; 
            userSettings.userAvatarInitials = initials || "You";
            userAvatarPreview.textContent = getAvatarInitials(userSettings.userAvatarInitials);
            saveUserSettingsToLS();
        });
    }
    if (kialaVersionDisplay) { 
        kialaVersionDisplay.textContent = `V.${KIALA_VERSION}`;
    }

    function openModal(modalElement) {
        if(modalElement) modalElement.classList.add('visible');
    }
    function closeModal(modalElement) {
        if(modalElement) modalElement.classList.remove('visible');
    }
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal-grok'));
        });
    });
    [renameChatModal, confirmationModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) { 
                    closeModal(modal);
                    if (modal === confirmationModal && currentConfirmationAction) {
                        currentConfirmationAction = null; 
                    }
                }
            });
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (renameChatModal.classList.contains('visible')) closeModal(renameChatModal);
            if (confirmationModal.classList.contains('visible')) {
                closeModal(confirmationModal);
                currentConfirmationAction = null;
            }
            if (moreOptionsDropdown && moreOptionsDropdown.classList.contains('visible')) {
                moreOptionsDropdown.classList.remove('visible');
            }
             if (window.innerWidth <= 768 && sidebar.classList.contains('open-grok')) {
                sidebar.classList.remove('open-grok');
            }
        }
    });

    function confirmAction(title, text, onConfirm, confirmButtonText = "Confirm", confirmButtonClass = "modal-btn-danger") {
        confirmationModalTitle.textContent = title;
        confirmationModalText.textContent = text;
        confirmationModalConfirmButton.textContent = confirmButtonText;
        
        confirmationModalConfirmButton.classList.remove('modal-btn-danger', 'modal-btn-primary', 'modal-btn-safe'); 
        if(confirmButtonText.toLowerCase() === "delete" || confirmButtonText.toLowerCase() === "clear all"){
            confirmationModalConfirmButton.className = 'modal-actions-grok_button modal-btn-danger';
        } else {
             confirmationModalConfirmButton.className = 'modal-actions-grok_button'; 
        }

        openModal(confirmationModal);
        currentConfirmationAction = onConfirm; 
    }

    if (confirmationModalConfirmButton) {
        confirmationModalConfirmButton.addEventListener('click', () => {
            if (typeof currentConfirmationAction === 'function') {
                currentConfirmationAction();
            }
            closeModal(confirmationModal);
            currentConfirmationAction = null;
        });
    }
    if (confirmationModalCancelButton) {
        confirmationModalCancelButton.addEventListener('click', () => {
            closeModal(confirmationModal);
            currentConfirmationAction = null;
        });
    }
    
    function showToast(message, type = 'info', duration = 3000) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.classList.add('toast-grok', type); 

        const icon = document.createElement('i');
        icon.classList.add('fas');
        if (type === 'success') icon.classList.add('fa-check-circle');
        else if (type === 'error') icon.classList.add('fa-times-circle');
        else if (type === 'warning') icon.classList.add('fa-exclamation-triangle');
        else icon.classList.add('fa-info-circle'); 
        toast.appendChild(icon);

        const text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(text);

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOutRight 0.3s ease-in forwards'; 
            setTimeout(() => {
                 if (toast.parentNode) { 
                    toast.remove();
                 }
            }, 300); 
        }, duration);
    }

    if (exportChatsButton) {
        exportChatsButton.addEventListener('click', () => {
            if (chatHistory.length === 0) {
                showToast("There are no chats to export.", "warning");
                return;
            }
            try {
                const jsonData = JSON.stringify(chatHistory, null, 2); 
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                a.href = url;
                a.download = `kiala_chats_export_${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Chat history has been exported.", "success");
            } catch (e) {
                console.error("Error exporting chats:", e);
                showToast("Failed to export chats.", "error");
            }
        });
    }

    if (importChatsInput) {
        importChatsInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (Array.isArray(importedData) && 
                            (importedData.length === 0 || (importedData[0] && typeof importedData[0].id !== 'undefined' && importedData[0].messages))) {
                            
                            confirmAction(
                                "Import chats",
                                `Are you sure you want to import? ${importedData.length} chat(s)? Current history will be REPLACED.`,
                                () => {
                                    chatHistory = importedData;
                                    const activeImported = chatHistory.find(ch => ch.isActive);
                                    if (activeImported) {
                                        activeChatId = activeImported.id;
                                    } else if (chatHistory.length > 0) {
                                        chatHistory[0].isActive = true; 
                                        activeChatId = chatHistory[0].id;
                                    } else {
                                        activeChatId = null; 
                                    }
                                    saveChatHistoryToLS();
                                    renderHistoryList();
                                    if (activeChatId) {
                                        activateChat(activeChatId); 
                                    } else {
                                        createNewChat(false); 
                                    }
                                    showToast(`Imported ${chatHistory.length} chat(s).`, "success");
                                },
                                "Import"
                            );
                        } else {
                            throw new Error("The file is not in the correct format for a Kiala story.");
                        }
                    } catch (err) {
                        console.error("Error importing chats:", err);
                        showToast(`Import error: ${err.message}`, "error", 5000);
                    } finally {
                        importChatsInput.value = ''; 
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    if (providerSelect) {
        providerSelect.addEventListener('change', (e) => {
            userSettings.provider = e.target.value;
            saveUserSettingsToLS();
            showToast(`Provider switched to ${userSettings.provider.toUpperCase()}.`, 'info');
        });
    }

    async function initializeKiala() {
        console.log("Kiala-V.0.1A: Initializing the interface...");
        // Load language first
        currentLanguage = localStorage.getItem('kiala_language') || 'en';
        userSettings.language = currentLanguage;
        await loadTranslations(currentLanguage);
        loadUserSettingsFromLS(); 
        loadChatHistoryFromLS();  
        
        applyTranslations();
        
        renderHistoryList();
        if (activeChatId) {
            activateChat(activeChatId); 
        } else if (chatHistory.length > 0) {
            activateChat(chatHistory[0].id); 
        } else {
            createNewChat();
        }

        if (userSettings.theme === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                if (userSettings.theme === 'system') { 
                    setTheme('system'); 
                }
            });
        }
        
        if (messageInput) {
            messageInput.dispatchEvent(new Event('input'));
        }

        showToast(`Kiala ${KIALA_VERSION} ready to work!`, "info", 2500);
        console.log("Kiala-V.0.1A: Initialization complete.");
    }

    // Internationalization (i18n)
    const translationsCache = {};

    async function loadTranslations(lang) {
        if (translationsCache[lang]) {
            return translationsCache[lang];
        }
        try {
            const resp = await fetch(`/static/i18n/${lang}.json`);
            if (!resp.ok) throw new Error(`Failed to load translations for ${lang}`);
            const data = await resp.json();
            translationsCache[lang] = data;
            return data;
        } catch (e) {
            console.error("i18n load error:", e);
            return {};
        }
    }

    function t(key) {
        const dict = translationsCache[currentLanguage] || {};
        return dict[key] || key;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.getAttribute('data-i18n');
            if (k) el.textContent = t(k);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const k = el.getAttribute('data-i18n-placeholder');
            if (k) el.setAttribute('placeholder', t(k));
        });
    }

    // Language dropdown interactions
    if (languageDropdown) {
        const currentBtn = languageDropdown.querySelector('.language-current');
        const optionsList = languageDropdown.querySelector('.language-options');

        if (currentBtn) {
            currentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                languageDropdown.classList.toggle('open');
            });
        }
        if (optionsList) {
            optionsList.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', async () => {
                    const selLang = li.getAttribute('data-lang');
                    languageDropdown.classList.remove('open');
                    if (!selLang || selLang === currentLanguage) return;
                    currentLanguage = selLang;
                    userSettings.language = selLang;
                    saveUserSettingsToLS();
                    localStorage.setItem('kiala_language', selLang);
                    const flagImg = languageDropdown.querySelector('.language-current img');
                    const flagText = languageDropdown.querySelector('.language-current span');
                    if (flagImg) flagImg.src = `/static/img/flags/${selLang}.svg`;
                    if (flagText) flagText.textContent = li.textContent.trim().split(' ').slice(1).join(' ');
                    await loadTranslations(selLang);
                    applyTranslations();
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (!languageDropdown.contains(e.target)) {
                languageDropdown.classList.remove('open');
            }
        });
    }

    initializeKiala();
});