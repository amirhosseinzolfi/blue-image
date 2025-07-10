document.addEventListener('DOMContentLoaded', function () {
    // References to DOM elements
    const modeSelector = document.getElementById('generation_mode');
    const form = document.getElementById('imageForm');
    const alertBox = document.getElementById('alert');
    const alertText = document.getElementById('alert-text');
    const closeAlertButton = document.getElementById('close-alert');
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModalButton = document.querySelector('.close-modal'); // Renamed for clarity
    const contextMenu = document.getElementById('context-menu');
    const downloadImageOption = document.getElementById('download-image');
    const copyPromptOption = document.getElementById('copy-prompt');
    const removeBgOption = document.getElementById('remove-bg');
    const variationImageOption = document.getElementById('variation-image');
    const deleteImageOption = document.getElementById('delete-image');
    const queueStatusElement = document.getElementById('queue-status');
    const queueCountElement = document.getElementById('queue-count');
    const currentTaskMessageElement = document.getElementById('current-task-message');
    const imagesContainer = document.querySelector('.images');
    const uploadLabel = document.querySelector('.upload-label');
    const fileInput = document.getElementById('image-upload');
    const formToggleBtn = document.getElementById('formToggleBtn');
    const optionsRow = document.getElementById('optionsRow');
    const formOptionsIndicator = document.getElementById('formOptionsIndicator');
    const minimalLoader = document.getElementById('minimal-loader');
    const circleProgress = document.getElementById('circle-progress');
    const circleCounter = document.getElementById('circle-counter');
    const userInput = document.getElementById('user_input'); // Main prompt input
    let chatModeActiveInPopup = false; // To track if chat UI is active in popup
    let currentChatTaskId = null; // To track the task ID of the current chat submission

    // Prompt Popup Elements
    const promptPopup = document.getElementById('prompt-popup');
    const popupPromptTextarea = document.getElementById('popup-prompt-textarea');
    const popupSubmitButton = document.getElementById('popup-submit-button');
    const closePromptPopupButton = document.getElementById('close-prompt-popup');
    const promptSuggestions = document.getElementById('prompt-suggestions');

    // Add styles for the suggestions popup and chat UI
    const style = document.createElement('style');
    style.textContent = `
        .prompt-suggestions {
            display: none;
            width: calc(100% - 40px);
            max-height: 0;
            overflow: hidden;
            background: rgba(30, 30, 40, 0.95);
            border-radius: 8px;
            margin: -5px auto 15px;
            transition: max-height 0.3s ease, opacity 0.3s ease;
            opacity: 0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10;
            position: relative;
        }
        
        .prompt-suggestions.active {
            display: block;
            max-height: 200px;
            opacity: 1;
            padding: 10px 0;
        }
        
        .suggestion-item {
            padding: 8px 16px;
            cursor: pointer;
            transition: background 0.2s;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            direction: rtl;
            text-align: right;
            position: relative;
        }
        
        .suggestion-item:hover {
            background: rgba(187, 134, 252, 0.15);
        }
        
        .suggestion-item::before {
            content: '⟐';
            margin-left: 8px;
            color: #bb86fc;
            opacity: 0.7;
            font-size: 12px;
        }

        /* Chat UI Styles */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 60vh;
            overflow-y: auto;
            padding: 0;
            margin-bottom: 15px;
            background: rgba(30, 30, 40, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .chat-messages {
            display: flex;
            flex-direction: column;
            padding: 15px;
            overflow-y: auto;
            flex: 1;
            gap: 15px;
        }
        
        .message {
            display: flex;
            flex-direction: column;
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 15px;
            line-height: 1.5;
            animation: message-appear 0.3s ease;
        }
        
        .user-message {
            align-self: flex-end;
            background: linear-gradient(45deg, #4b0ca3, #6923d0);
            color: white;
            border-bottom-right-radius: 4px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        .ai-message {
            align-self: flex-start;
            background: rgba(44, 44, 44, 0.8);
            color: #e0e0e0;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .ai-message img {
            max-width: 100%;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }
        
        .message-time {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 5px;
            align-self: flex-end;
        }
        
        .chat-input-container {
            display: flex;
            padding: 10px;
            background: rgba(30, 30, 40, 0.5);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0 0 12px 12px;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 15px;
            border: none;
            border-radius: 20px;
            background: rgba(44, 44, 44, 0.8);
            color: #e0e0e0;
            font-size: 14px;
            outline: none;
            margin-right: 5px; /* was 10px */
            direction: rtl;
            text-align: right;
        }
        
        .chat-send-btn {
            background: linear-gradient(45deg, #4b0ca3, #6923d0);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        .chat-send-btn:hover {
            transform: scale(1.05);
            background: linear-gradient(45deg, #3700b3, #5b1cb8);
        }
        
        .chat-send-btn:active {
            transform: scale(0.95);
        }
        
        .chat-mode-toggle {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(44, 44, 44, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e0e0e0;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .chat-mode-toggle:hover {
            background: rgba(75, 12, 163, 0.3);
            color: #bb86fc;
        }
        
        .chat-mode-toggle.active {
            background: rgba(75, 12, 163, 0.5);
            color: white;
        }
        
        @keyframes message-appear {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Initialize Socket.IO connection
    const socket = io();

    // Track state
    let activeTasks = {};
    let queueSize = 0;
    let totalImagesInQueue = 0;
    let isGenerating = false;
    let currentImagePath = '';
    let currentPrompt = '';
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;

    const MAX_RECENT_PROMPTS = 7; // Max number of recent prompts to store/display

    // Helper function to create model badge
    function createModelBadge(modelName) {
        const badge = document.createElement('div');
        badge.className = 'model-badge';
        const modelClass = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (modelClass) {
            badge.classList.add(modelClass);
        }
        let displayName = modelName;
        if (displayName.includes('/')) {
            displayName = displayName.split('/').pop();
        }
        if (displayName.length > 15) {
            const parts = displayName.split('-');
            displayName = parts.length > 1 ? parts.map(p => p.charAt(0)).join('') + '-' + parts[parts.length - 1] : displayName.substring(0, 15) + '…';
        }
        badge.textContent = displayName;
        return badge;
    }

    // Helper function to extract model name from image path
    function extractModelFromPath(path) {
        try {
            const filename = path.split('/').pop();
            const parts = filename.split('_');
            if (parts.length >= 3) {
                return parts[parts.length - 2];
            }
        } catch (e) {
            console.error("Error extracting model from path:", e);
        }
        return "unknown";
    }

    // Show alert helper
    function showAlert(message, type, duration = null) {
        if (shouldSkipAlert(message, type)) return;

        if (alertBox.timeoutId) {
            clearTimeout(alertBox.timeoutId);
        }
        alertText.textContent = trimMessage(message);
        alertBox.className = `alert ${type}`;
        alertBox.classList.toggle('auto-dismiss', !!duration);
        if (duration) {
            alertBox.style.setProperty('--dismiss-duration', `${duration}ms`);
        }
        alertBox.style.display = 'flex';
        setTimeout(() => alertBox.classList.add('show'), 10);

        if (duration) {
            alertBox.timeoutId = setTimeout(() => {
                alertBox.classList.remove('show');
                setTimeout(() => { alertBox.style.display = 'none'; }, 300);
            }, duration);
        }
    }

    function shouldSkipAlert(message, type) {
        return (type !== 'error' && (message.includes('در حال بارگذاری') || message.includes('در حال آپلود') || message.includes('درخواست شما در حال پردازش'))) ||
               message.includes('موقعیت') && message.includes('صف') ||
               message.includes('در حال اضافه کردن به صف تولید');
    }

    function trimMessage(message) {
        const maxLength = 120;
        return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
    }

    // Minimal Loader Functions
    function showMinimalLoader(imageCount) {
        if (!minimalLoader || !circleCounter || !circleProgress) return;
        circleCounter.textContent = imageCount;
        updateCircleProgress(10); // Initial visible progress
        minimalLoader.classList.add('visible');
    }

    function updateCircleProgress(percentage) {
        if (!circleProgress) return;
        const validPercentage = Math.max(0, Math.min(100, percentage));
        circleProgress.style.background = `conic-gradient(#bb86fc ${validPercentage}%, rgba(187, 134, 252, 0.2) ${validPercentage}%)`;
    }

    function hideMinimalLoader() {
        if (!minimalLoader) return;
        updateCircleProgress(100);
        setTimeout(() => minimalLoader.classList.remove('visible'), 500);
    }

    // Chat UI Functions
    let chatMode = false;
    let chatHistory = [];
    
    function initChatUI() {
        // Create chat container and elements
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';
        chatContainer.style.display = 'none'; // Initially hidden
        
        const chatMessages = document.createElement('div');
        chatMessages.className = 'chat-messages';
        
        const chatInputContainer = document.createElement('div');
        chatInputContainer.className = 'chat-input-container';
        
        const chatInput = document.createElement('input');
        chatInput.className = 'chat-input';
        chatInput.type = 'text';
        
        const chatSendBtn = document.createElement('button');
        chatSendBtn.className = 'chat-send-btn';
        chatSendBtn.innerHTML = 
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M2 21L23 12L2 3V10L16 12L2 14V21Z"/>' +
            '</svg>';
        
        // Chat mode toggle button (to be placed inside the popup)
        const chatModeToggle = document.createElement('button');
        chatModeToggle.className = 'chat-mode-toggle'; // Use existing style or new one
        chatModeToggle.textContent = 'ورود به حالت گفتگو'; // Initial text
        
        // Append elements
        chatInputContainer.appendChild(chatInput);
        chatInputContainer.appendChild(chatSendBtn);
        chatContainer.appendChild(chatMessages);
        chatContainer.appendChild(chatInputContainer);
        
        const popupContent = promptPopup ? promptPopup.querySelector('.prompt-popup-content') : null;
        if (popupContent) {
            // Insert toggle button before the main prompt textarea or at a suitable place
            const referenceNode = popupContent.querySelector('h2'); // Insert after h2
            if (referenceNode && referenceNode.nextSibling) {
                popupContent.insertBefore(chatModeToggle, referenceNode.nextSibling);
            } else if (referenceNode) {
                popupContent.appendChild(chatModeToggle);
            } else {
                 popupContent.insertBefore(chatModeToggle, popupContent.firstChild);
            }
            popupContent.appendChild(chatContainer); // Add chat container to popup
        }
        
        // Event listeners
        chatModeToggle.addEventListener('click', () => toggleChatModeInPopup(true)); // true to force toggle
        chatSendBtn.addEventListener('click', sendChatMessageViaForm);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessageViaForm();
            }
        });
        
        loadChatHistory();
    }

    // helper to scroll chat messages to bottom
    function scrollChatToBottom() {
        const msgs = promptPopup?.querySelector('.chat-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    function toggleChatModeInPopup(forceToggle = false) {
        if (!promptPopup) return;

        const mainFormGenerationMode = document.getElementById('generation_mode');
        const currentlyInChatMode = mainFormGenerationMode && mainFormGenerationMode.value === 'chat';

        if (forceToggle) {
            chatModeActiveInPopup = !chatModeActiveInPopup;
        } else {
            // Sync with main form's generation_mode if not a force toggle
            chatModeActiveInPopup = currentlyInChatMode;
        }
        
        const chatContainer = promptPopup.querySelector('.chat-container');
        const chatModeToggleBtn = promptPopup.querySelector('.chat-mode-toggle');
        const header = promptPopup?.querySelector('.prompt-popup-content h2');

        if (chatModeActiveInPopup) {
            // Switch to chat mode within popup
            if (popupPromptTextarea) popupPromptTextarea.style.display = 'none';
            if (promptSuggestions) promptSuggestions.style.display = 'none';
            if (popupSubmitButton) popupSubmitButton.style.display = 'none'; // Hide original submit
            if (chatContainer) {
                chatContainer.style.display = 'flex';
                // scroll chat to bottom when chat UI is activated
                scrollChatToBottom();
            }

            if (chatModeToggleBtn) {
                chatModeToggleBtn.textContent = 'بازگشت به حالت نوشتن';
                chatModeToggleBtn.classList.add('active');
            }
            if (header) header.style.display = 'none';    // hide header in chat UI
            if (mainFormGenerationMode && mainFormGenerationMode.value !== 'chat') {
                // mainFormGenerationMode.value = 'chat'; // Sync main form if toggled from popup
            }
        } else {
            // Switch to standard prompt mode within popup
            if (popupPromptTextarea) popupPromptTextarea.style.display = 'block';
            // showSuggestions might be called if textarea is empty
            if (popupPromptTextarea && popupPromptTextarea.value.trim() === '') {
                showSuggestions();
            } else {
                if (promptSuggestions) promptSuggestions.style.display = 'none';
            }
            if (popupSubmitButton) popupSubmitButton.style.display = 'block'; // Show original submit
            if (chatContainer) chatContainer.style.display = 'none';
            if (chatModeToggleBtn) {
                chatModeToggleBtn.textContent = 'ورود به حالت گفتگو';
                chatModeToggleBtn.classList.remove('active');
            }
            if (header) header.style.display = 'block';   // show header back in prompt UI
             if (mainFormGenerationMode && mainFormGenerationMode.value === 'chat' && forceToggle) {
                // If toggled off from popup, maybe revert main form? Or leave it.
                // For now, let popup toggle be independent unless main form changes.
            }
        }
    }

    function sendChatMessageViaForm() {
        const chatInput = promptPopup.querySelector('.chat-input');
        if (!chatInput || !userInput || !form) return;

        const message = chatInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message); 
        userInput.value = message; // Set main form's input to chat message

        const genModeSelect = document.getElementById('generation_mode');
        if (genModeSelect) genModeSelect.value = 'chat'; // Ensure main form is in chat mode

        // Trigger main form submission
        // Simulate the main submit button click to include its logic if any, or directly submit form
        const mainSubmitButton = document.getElementById('submit-button');
        if (mainSubmitButton) {
            // form.requestSubmit(mainSubmitButton); // Preferred way if submit button has specific logic
            mainSubmitButton.click(); // Fallback
        } else {
            form.requestSubmit();
        }
        
        chatInput.value = ''; // Clear chat input
    }
    
    function addMessageToChat(sender, text, imageUrl = null, model = null, originalPromptForImage = null) {
        const chatMessages = promptPopup.querySelector('.chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Only add the textDiv if it's not an AI message with an image
        if (!(sender === 'ai' && imageUrl)) {
            const textDiv = document.createElement('div');
            textDiv.textContent = text;
            messageDiv.appendChild(textDiv);
        }
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl.startsWith('http') ? imageUrl : `/images/${imageUrl}`; // Adjust if path is relative
            img.alt = originalPromptForImage || 'Generated image';
            img.loading = 'lazy';
            img.addEventListener('click', () => openImageModal(img.src)); // Allow modal view
            messageDiv.appendChild(img);

            // Remove model badge display from chat messages
            // (The model information is still saved in the chat history)
        }
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = time;
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        scrollChatToBottom();
        
        saveChatMessage(sender, text, imageUrl, time, model, originalPromptForImage);
    }
    
    function saveChatMessage(sender, text, imageUrl, time, model, originalPromptForImage) {
        chatHistory.push({
            sender,
            text,
            imageUrl,
            time,
            model,
            originalPromptForImage,
            timestamp: Date.now()
        });
        
        if (chatHistory.length > 50) {
            chatHistory = chatHistory.slice(-50);
        }
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
    
    function loadChatHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            try {
                chatHistory = JSON.parse(saved);
                const chatMessagesContainer = promptPopup ? promptPopup.querySelector('.chat-messages') : null;

                if (chatMessagesContainer) {
                    chatMessagesContainer.innerHTML = ''; // Clear existing messages
                    chatHistory.forEach(msg => {
                        // Re-add to UI using the updated addMessageToChat
                        addMessageToChat(
                            msg.sender, 
                            msg.text, 
                            msg.imageUrl, 
                            msg.model, 
                            msg.originalPromptForImage
                        );
                    });
                    if (chatMessagesContainer.children.length > 0) {
                         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                    }
                }
            } catch (e) {
                console.error('Error loading chat history:', e);
                chatHistory = [];
            }
        }
    }

    // Prompt Popup Logic
    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto'; // Reset height
        const minHeight = 100; // px, should match CSS min-height if possible
        textarea.style.height = Math.max(minHeight, textarea.scrollHeight) + 'px';
    }

    function getRecentPrompts() {
        const prompts = localStorage.getItem('recentPrompts');
        return prompts ? JSON.parse(prompts) : [];
    }

    function saveRecentPrompt(promptText) {
        if (!promptText || promptText.trim() === '') return;
        let prompts = getRecentPrompts();
        // Remove existing entry if it's already there to move it to the top
        prompts = prompts.filter(p => p !== promptText.trim());
        prompts.unshift(promptText.trim()); // Add to the beginning
        if (prompts.length > MAX_RECENT_PROMPTS) {
            prompts = prompts.slice(0, MAX_RECENT_PROMPTS);
        }
        localStorage.setItem('recentPrompts', JSON.stringify(prompts));
    }

    function displayRecentPrompts() {
        // Function emptied as recent prompts display is no longer needed
        return;
    }

    function showSuggestions() {
        if (!promptSuggestions || !popupPromptTextarea) return;
        
        const prompts = getRecentPrompts();
        if (prompts.length === 0) return;
        
        // Clear previous suggestions
        promptSuggestions.innerHTML = '';
        
        // Only show suggestions if the textarea is empty
        if (popupPromptTextarea.value.trim() !== '') {
            promptSuggestions.classList.remove('active');
            return;
        }
        
        // Add suggestion items
        prompts.slice(0, 5).forEach(prompt => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = prompt;
            item.addEventListener('click', () => {
                popupPromptTextarea.value = prompt;
                autoResizeTextarea(popupPromptTextarea);
                promptSuggestions.classList.remove('active');
                popupPromptTextarea.focus();
            });
            promptSuggestions.appendChild(item);
        });
        
        // Show suggestions
        promptSuggestions.classList.add('active');
    }
    
    function hideSuggestions() {
        if (!promptSuggestions) return;
        promptSuggestions.classList.remove('active');
    }

    function openPromptPopup() {
        if (!promptPopup || !popupPromptTextarea || !userInput) return;

        popupPromptTextarea.value = userInput.value;

        promptPopup.classList.add('visible');
        document.body.style.overflow = 'hidden'; 
        autoResizeTextarea(popupPromptTextarea);
        
        // Sync popup view with main form's generation_mode
        const mainFormGenerationMode = document.getElementById('generation_mode');
        if (mainFormGenerationMode && mainFormGenerationMode.value === 'chat') {
            if (!chatModeActiveInPopup) toggleChatModeInPopup(true); // Force switch to chat UI
        } else {
            if (chatModeActiveInPopup) toggleChatModeInPopup(true); // Force switch to prompt UI
        }

        if (!chatModeActiveInPopup && popupPromptTextarea.value.trim() === '') {
            setTimeout(showSuggestions, 300); 
        }
        
        if (!chatModeActiveInPopup) {
            setTimeout(() => popupPromptTextarea.focus(), 50);
        } else {
            const chatInput = promptPopup.querySelector('.chat-input');
            if (chatInput) setTimeout(() => chatInput.focus(), 50);
        }
    }

    function closePromptPopup() {
        if (!promptPopup) return;
        hideSuggestions();
        promptPopup.classList.remove('visible');
        document.body.style.overflow = '';
    }

    if (userInput) {
        userInput.addEventListener('focus', (event) => {
            event.preventDefault(); // Prevent default focus behavior if it causes issues
            openPromptPopup();
        });
        userInput.addEventListener('click', (event) => {
            event.preventDefault();
            openPromptPopup();
        });
    }

    if (popupPromptTextarea) {
        popupPromptTextarea.addEventListener('input', () => {
            autoResizeTextarea(popupPromptTextarea);
            
            // Hide suggestions if the user starts typing
            if (popupPromptTextarea.value.trim() !== '') {
                hideSuggestions();
            } else {
                showSuggestions();
            }
        });
        
        // Show suggestions on focus if empty
        popupPromptTextarea.addEventListener('focus', () => {
            if (popupPromptTextarea.value.trim() === '') {
                showSuggestions();
            }
        });
        
        // Hide suggestions when clicking outside of suggestions
        document.addEventListener('click', (event) => {
            if (promptSuggestions && 
                !promptSuggestions.contains(event.target) && 
                event.target !== popupPromptTextarea) {
                hideSuggestions();
            }
        });
    }

    if (popupSubmitButton && form) {
        popupSubmitButton.addEventListener('click', () => {
            // This button is for standard prompt mode. Chat mode uses chatSendBtn.
            if (chatModeActiveInPopup) return; // Should be hidden in chat mode

            if (userInput && popupPromptTextarea) {
                const currentPromptValue = popupPromptTextarea.value;
                userInput.value = currentPromptValue;
                saveRecentPrompt(currentPromptValue); // Save the prompt
            }
            hideSuggestions();
            closePromptPopup();
            const originalSubmitButton = document.getElementById('submit-button');
            if (originalSubmitButton) {
                originalSubmitButton.click();
            } else {
                form.requestSubmit();
            }
        });
    }

    if (closePromptPopupButton) {
        closePromptPopupButton.addEventListener('click', closePromptPopup);
    }

    if (promptPopup) {
        promptPopup.addEventListener('click', (event) => {
            if (event.target === promptPopup) {
                closePromptPopup();
            }
        });
    }

    // Socket.IO event handlers
    socket.on('connect', () => console.log('Connected to server'));

    socket.on('queue_update', (data) => {
        queueSize = data.queue_size;
        totalImagesInQueue = data.total_images || 0;
        if (queueCountElement) queueCountElement.textContent = totalImagesInQueue;
        if (queueStatusElement) {
            queueStatusElement.style.display = (totalImagesInQueue > 0 || Object.keys(activeTasks).length > 0) ? 'block' : 'none';
        }
    });

    socket.on('task_status', (data) => {
        if (data.task_id in activeTasks) {
            activeTasks[data.task_id] = data.status;
            if (currentTaskMessageElement) currentTaskMessageElement.textContent = data.status;
            if (queueStatusElement) queueStatusElement.style.display = 'block';
        }
    });

    socket.on('image_generated', (data) => {
        // Check if this image is for the current chat interaction
        const mainFormGenerationMode = document.getElementById('generation_mode');
        if (chatModeActiveInPopup && mainFormGenerationMode && mainFormGenerationMode.value === 'chat' && data.task_id === currentChatTaskId) {
            addMessageToChat('ai', `تصویر شما برای: "${data.original_user_input || data.prompt}"`, data.image_path, data.model, data.original_user_input || data.prompt);
            
            // Update minimal loader if it was shown for this chat task
            if (circleCounter && circleProgress) {
                let currentCount = parseInt(circleCounter.textContent);
                if (!isNaN(currentCount) && currentCount > 0) {
                    currentCount--;
                    circleCounter.textContent = currentCount;
                    // Assuming 1 image per chat response for progress update
                    const percentage = 100 - ((currentCount / 1) * 100); // Simplified for chat
                    updateCircleProgress(percentage);
                    if (currentCount === 0) {
                        setTimeout(hideMinimalLoader, 1000);
                    }
                }
            }
            return; // Image handled by chat UI
        }

        // Fallback to adding to main image grid if not a chat response or chat UI not active
        if (!imagesContainer) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';

        const newImg = document.createElement('img');
        newImg.src = `/images/${data.image_path}`;
        newImg.className = 'preview-image new-image-animation';
        newImg.dataset.imagePath = `/download/${data.image_path}`;
        newImg.dataset.prompt = data.prompt;
        newImg.dataset.model = data.model || extractModelFromPath(data.image_path);

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = data.prompt;

        const modelBadge = createModelBadge(newImg.dataset.model);

        wrapper.appendChild(newImg);
        wrapper.appendChild(tooltip);
        wrapper.appendChild(modelBadge);

        imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);

        if (circleCounter && circleProgress) {
            let currentCount = parseInt(circleCounter.textContent);
            if (!isNaN(currentCount) && currentCount > 0) {
                currentCount--;
                circleCounter.textContent = currentCount;
                const totalImagesInput = document.getElementById('num_images');
                const totalImages = totalImagesInput ? (parseInt(totalImagesInput.value) || 1) : 1;
                const percentage = 100 - ((currentCount / totalImages) * 100);
                updateCircleProgress(percentage);
                if (currentCount === 0) {
                    setTimeout(hideMinimalLoader, 1000);
                }
            }
        }
    });

    socket.on('task_completed', (data) => {
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            if (data.task_id === currentChatTaskId) { // Reset currentChatTaskId if it completed
                currentChatTaskId = null;
            }
            if (Object.keys(activeTasks).length === 0) {
                hideMinimalLoader();
                showAlert('همه تصاویر با موفقیت ایجاد شدند', 'success', 4000);
                isGenerating = false;
            }
            if (Object.keys(activeTasks).length === 0 && queueSize === 0 && queueStatusElement) {
                queueStatusElement.style.display = 'none';
            }
        }
    });

    socket.on('task_error', (data) => {
        showAlert(`خطا: ${data.error}`, 'error', 5000);
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            if (data.task_id === currentChatTaskId) { // Reset currentChatTaskId on error
                currentChatTaskId = null;
            }
            if (Object.keys(activeTasks).length === 0) {
                hideMinimalLoader();
                isGenerating = false;
            }
        }
    });

    // Load saved preferences
    const preferences = {
        model: localStorage.getItem('model'),
        num_images: localStorage.getItem('num_images'),
        width: localStorage.getItem('width'),
        height: localStorage.getItem('height'),
        generation_mode: localStorage.getItem('generation_mode')
    };
    for (const key in preferences) {
        if (preferences[key] && document.getElementById(key)) {
            document.getElementById(key).value = preferences[key];
        }
    }
    if (modeSelector) {
        if (preferences.generation_mode) modeSelector.value = preferences.generation_mode;
        modeSelector.addEventListener('change', function() {
            localStorage.setItem('generation_mode', this.value);
            const userInputField = document.getElementById('user_input');
            
            // If popup is open, sync its view
            if (promptPopup && promptPopup.classList.contains('visible')) {
                if (this.value === 'chat') {
                    if (!chatModeActiveInPopup) toggleChatModeInPopup(true); // Switch to chat UI
                } else {
                    if (chatModeActiveInPopup) toggleChatModeInPopup(true); // Switch to prompt UI
                }
            }

            if (userInputField) {
                if (this.value === 'bulk') {
                    userInputField.placeholder = "درخواست‌های خود را با ; از هم جدا کنید (مثال: ماشین; طبیعت; مدیتیشن)";
                    if (!userInputField.value.includes(';')) {
                         showAlert('برای تولید انبوه، عبارات خود را با علامت ; از هم جدا کنید', 'info', 5000);
                    }
                } else if (this.value === 'chat') {
                    userInputField.placeholder = "با من گفتگو کنید تا بهترین پرامپت را بسازم...";
                    showAlert('حالت گفتگو فعال شد. متن شما به هوش مصنوعی ارسال می‌شود تا بهترین پرامپت را تولید کند', 'info', 5000);
                } else {
                    userInputField.placeholder = "چی تو ذهنته ؟";
                }
            }
            if (formOptionsIndicator) updateOptionsIndicator();
        });
    }
    
    // Properly handle image upload functionality
    if (uploadLabel && fileInput) {
        // Make the label trigger the file input
        uploadLabel.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files.length || !imagesContainer) return;
            
            // Show loading indicator
            showAlert('در حال آپلود تصاویر...', 'info');
            showMinimalLoader(files.length);
            
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('images', file));
            if (modeSelector) formData.append('generation_mode', modeSelector.value);
            
            try {
                const response = await fetch('/upload_images', { method: 'POST', body: formData });
                const data = await response.json();
                
                if (data.success && data.images) {
                    // Insert uploaded images into the image container
                    data.images.forEach(image => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const newImg = document.createElement('img');
                        newImg.src = `/images/${image.path}`;
                        newImg.className = 'preview-image new-image-animation';
                        newImg.dataset.imagePath = `/download/${image.path}`;
                        newImg.dataset.prompt = image.name || 'Uploaded image';
                        newImg.dataset.model = image.model || 'upload';
                        
                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = image.name || 'Uploaded image';
                        
                        const modelBadge = createModelBadge('Uploaded');
                        
                        wrapper.appendChild(newImg);
                        wrapper.appendChild(tooltip);
                        wrapper.appendChild(modelBadge);
                        
                        // Insert at the beginning of the image container
                        imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);
                    });
                    
                    // Show success message
                    hideMinimalLoader();
                    showAlert(`${data.images.length} تصویر با موفقیت آپلود شد`, 'success', 4000);
                } else {
                    hideMinimalLoader();
                    showAlert(data.error || 'خطا در آپلود تصاویر', 'error', 4000);
                }
            } catch (err) {
                console.error(err);
                hideMinimalLoader();
                showAlert('خطا در آپلود تصاویر', 'error', 4000);
            }
            
            // Reset the file input for future uploads
            fileInput.value = '';
        });
    }
    
    // Close alert
    if (closeAlertButton) {
        closeAlertButton.addEventListener('click', () => {
            alertBox.classList.remove('show');
            setTimeout(() => { alertBox.style.display = 'none'; }, 300);
        });
    }

    // Form submit
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (isGenerating && !promptPopup.classList.contains('visible')) return;
            isGenerating = true;

            // Save preferences to localStorage
            localStorage.setItem('model', document.getElementById('model').value);
            localStorage.setItem('num_images', document.getElementById('num_images').value);
            localStorage.setItem('width', document.getElementById('width').value);
            localStorage.setItem('height', document.getElementById('height').value);

            const numImagesInput = document.getElementById('num_images');
            const userInput = document.getElementById('user_input');
            const numImages = numImagesInput ? (parseInt(numImagesInput.value) || 1) : 1;
            const generationMode = modeSelector ? modeSelector.value : 'default';

            showMinimalLoader(numImages);

            if (generationMode === 'bulk' && userInput) {
                const queries = userInput.value.split(';').filter(q => q.trim() !== '');
                if (queries.length > 0 && circleCounter) {
                    circleCounter.textContent = queries.length * numImages;
                }
                showAlert('درخواست‌های شما با علامت ";" از هم جدا شده‌اند', 'info', 3000);
            }

            fetch('/ajax_generate', { method: 'POST', body: new FormData(form) })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        activeTasks[data.task_id] = 'در صف انتظار';
                        if (document.getElementById('generation_mode').value === 'chat') {
                            currentChatTaskId = data.task_id; // Store task_id for chat
                        }
                    } else {
                        hideMinimalLoader();
                        showAlert(data.error || 'خطا در ارسال درخواست', 'error', 4000);
                        isGenerating = false;
                    }
                })
                .catch(err => {
                    console.error(err);
                    hideMinimalLoader();
                    showAlert('خطا در برقراری ارتباط', 'error', 4000);
                    isGenerating = false;
                });
        });
    }

    // Modal interactions
    function openImageModal(src) {
        if (!modal || !modalImage) return;
        modalImage.src = src;
        modal.style.display = 'block';
        modal.classList.add('show');
        
        // Increase z-index to be higher than chat UI
        modal.style.zIndex = '3000';  // Increased from 2000 to always be on top
        
        // Ensure modal is visible above chat popup
        if (promptPopup && promptPopup.classList.contains('visible')) {
            // Make the popup temporarily have a lower z-index than the modal
            const currentZIndex = window.getComputedStyle(promptPopup).zIndex;
            promptPopup.dataset.originalZIndex = currentZIndex;
            promptPopup.style.zIndex = '2500';
        }
        
        document.body.style.overflow = 'hidden';
    }

    function closeImageModal() {
        if (!modal) return;
        modal.classList.remove('show');
        
        // Restore prompt popup's original z-index if it was changed
        if (promptPopup && promptPopup.dataset.originalZIndex) {
            promptPopup.style.zIndex = promptPopup.dataset.originalZIndex;
            delete promptPopup.dataset.originalZIndex;
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    if (closeModalButton) closeModalButton.addEventListener('click', closeImageModal);
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeImageModal(); });
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) modalContent.addEventListener('click', e => e.stopPropagation());
    }

    // Image click and context menu (Event Delegation)
    if (imagesContainer) {
        imagesContainer.addEventListener('click', function(event) {
            const imageElement = event.target.closest('.preview-image');
            if (imageElement) {
                openImageModal(imageElement.src);
            }
        });

        imagesContainer.addEventListener('contextmenu', function (event) {
            const imageElement = event.target.closest('.preview-image');
            if (imageElement) {
                event.preventDefault();
                currentImagePath = imageElement.dataset.imagePath;
                currentPrompt = imageElement.dataset.prompt;

                if (!contextMenu) return;
                const { clientX, clientY } = event;
                const { scrollX, scrollY, innerWidth, innerHeight } = window;
                const menuWidth = contextMenu.offsetWidth;
                const menuHeight = contextMenu.offsetHeight;

                let posX = clientX + scrollX;
                let posY = clientY + scrollY;

                if (posX + menuWidth > innerWidth + scrollX) posX = innerWidth + scrollX - menuWidth;
                if (posY + menuHeight > innerHeight + scrollY) posY = innerHeight + scrollY - menuHeight;

                contextMenu.style.top = `${posY}px`;
                contextMenu.style.left = `${posX}px`;
                contextMenu.style.display = 'block';
            }
        });
    }

    // Hide context menu
    window.addEventListener('click', function (event) {
        if (contextMenu && !contextMenu.contains(event.target) && contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
    });

    // Context Menu Options
    if (downloadImageOption) {
        downloadImageOption.addEventListener('click', () => {
            if (currentImagePath) window.location.href = currentImagePath;
            if (contextMenu) contextMenu.style.display = 'none';
        });
    }
    if (copyPromptOption) {
        copyPromptOption.addEventListener('click', () => {
            if (currentPrompt) {
                navigator.clipboard.writeText(currentPrompt)
                    .then(() => showAlert('دستور کپی شد!', 'success', 4000))
                    .catch(() => showAlert('ناموفق در کپی دستور.', 'error', 4000));
            }
            if (contextMenu) contextMenu.style.display = 'none';
        });
    }

    if (removeBgOption) {
        removeBgOption.addEventListener('click', function () {
            if (!currentImagePath || !imagesContainer) return;
            contextMenu.style.display = 'none';
            showAlert('شروع فرآیند حذف پس‌زمینه...', 'info');

            fetch('/remove_bg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: currentImagePath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'image-wrapper';
                    const newImage = document.createElement('img');
                    newImage.className = 'preview-image';
                    newImage.src = `/images/${data.new_image_path}?t=${Date.now()}`;
                    newImage.dataset.imagePath = `/download/${data.new_image_path}`;
                    newImage.dataset.prompt = `${currentPrompt} (بدون پس‌زمینه)`;
                    newImage.dataset.model = extractModelFromPath(data.new_image_path);

                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = newImage.dataset.prompt;
                    
                    const modelBadge = createModelBadge(newImage.dataset.model);

                    wrapper.appendChild(newImage);
                    wrapper.appendChild(tooltip);
                    wrapper.appendChild(modelBadge);
                    imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);
                    showAlert('پس‌زمینه با موفقیت حذف شد!', 'success', 4000);
                } else {
                    showAlert(data.error || 'عدم موفقیت در حذف پس‌زمینه.', 'error', 4000);
                }
            })
            .catch(err => {
                showAlert('خطا در حذف پس‌زمینه.', 'error', 4000);
                console.error(err);
            });
        });
    }

    if (variationImageOption) {
        variationImageOption.addEventListener('click', function () {
            if (!currentImagePath || !imagesContainer) return;
            contextMenu.style.display = 'none';
            showAlert('در حال تولید واریاسیون...', 'info');
            const numVariationsInput = document.getElementById('num_images');
            const numVariations = numVariationsInput ? (numVariationsInput.value || 1) : 1;

            fetch('/variation_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: currentImagePath, num_variations: numVariations })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.generated_images) {
                    data.generated_images.forEach(item => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        const newImg = document.createElement('img');
                        newImg.src = item.path.startsWith('http') ? item.path : `/images/${item.path}`;
                        newImg.className = 'preview-image';
                        newImg.dataset.imagePath = item.path.startsWith('http') ? item.path : `/download/${item.path}`;
                        newImg.dataset.prompt = item.prompt || 'Image Variation';
                        newImg.dataset.model = item.model || extractModelFromPath(item.path);

                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = newImg.dataset.prompt;

                        const modelBadge = createModelBadge(newImg.dataset.model);

                        wrapper.appendChild(newImg);
                        wrapper.appendChild(tooltip);
                        wrapper.appendChild(modelBadge);
                        imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);
                    });
                    showAlert('واریاسیون جدید با موفقیت تولید شد!', 'success', 5000);
                } else {
                    showAlert(`خطا در تولید واریاسیون: ${data.error || 'Unknown error'}`, 'error', 4000);
                }
            })
            .catch(err => {
                console.error(err);
                showAlert('خطا در برقراری ارتباط برای واریاسیون', 'error', 4000);
            });
        });
    }

    if (deleteImageOption) {
        deleteImageOption.addEventListener('click', function () {
            if (!currentImagePath) return;
            contextMenu.style.display = 'none';
            fetch('/delete_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: currentImagePath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const imageElement = imagesContainer ? imagesContainer.querySelector(`img[data-image-path="${currentImagePath}"]`) : null;
                    if (imageElement && imageElement.parentNode.classList.contains('image-wrapper')) {
                        imageElement.parentNode.remove();
                    }
                    showAlert('تصویر با موفقیت حذف شد', 'success', 4000);
                } else {
                    showAlert(data.error || 'خطا در حذف تصویر', 'error', 4000);
                }
            })
            .catch(err => {
                console.error(err);
                showAlert('خطا در حذف تصویر', 'error', 4000);
            });
        });
    }
    
    // Add model badges to existing images on page load
    function addModelBadgesToExistingImages() {
        if (!imagesContainer) return;
        imagesContainer.querySelectorAll('.image-wrapper').forEach(wrapper => {
            if (wrapper.querySelector('.model-badge')) return;
            const img = wrapper.querySelector('img.preview-image');
            if (img) {
                const modelName = img.dataset.model || extractModelFromPath(img.dataset.imagePath || img.src);
                const badge = createModelBadge(modelName);
                wrapper.appendChild(badge);
            }
        });
    }
    addModelBadgesToExistingImages();

    // Infinite Scrolling
    function loadMoreImages() {
        if (isLoading || !hasMore || !imagesContainer) return;
        isLoading = true;
        showAlert('در حال بارگذاری تصاویر...', 'info');

        fetch(`/load_images?page=${currentPage + 1}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.images) {
                    data.images.forEach(item => {
                        item.images.forEach(imgPath => {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'image-wrapper';
                            const newImg = document.createElement('img');
                            newImg.src = `/images/${imgPath}`;
                            newImg.className = 'preview-image';
                            newImg.dataset.imagePath = `/download/${imgPath}`;
                            newImg.dataset.prompt = item.prompt;
                            newImg.dataset.model = item.model || extractModelFromPath(imgPath);

                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip';
                            tooltip.textContent = item.prompt;
                            
                            const modelBadge = createModelBadge(newImg.dataset.model);

                            wrapper.appendChild(newImg);
                            wrapper.appendChild(tooltip);
                            wrapper.appendChild(modelBadge);
                            imagesContainer.appendChild(wrapper);
                        });
                    });
                    currentPage++;
                    hasMore = data.has_more;
                    showAlert('تصاویر جدید بارگذاری شد', 'success', 2000);
                } else if (!data.success) {
                    showAlert(data.error || 'خطا در بارگذاری تصاویر بیشتر', 'error', 3000);
                    hasMore = false;
                }
                 if (!data.has_more) {
                    hasMore = false;
                }
            })
            .catch(err => {
                console.error(err);
                showAlert('خطا در بارگذاری تصاویر', 'error', 4000);
            })
            .finally(() => {
                isLoading = false;
            });
    }
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 300) {
            loadMoreImages();
        }
    });

    // Mobile form toggle functionality
    function updateOptionsIndicator() {
        if (!formOptionsIndicator) return;
        const modelSelect = document.getElementById('model');
        const numImagesEl = document.getElementById('num_images');
        const modelName = modelSelect ? modelSelect.options[modelSelect.selectedIndex].text : '';
        const imagesCount = numImagesEl ? numImagesEl.value : '';
        let summary = '';
        if (modelName) {
            summary += modelName.length > 10 ? modelName.substring(0, 8) + '...' : modelName;
        }
        if (imagesCount) {
            summary += summary ? ` | ${imagesCount} تصویر` : `${imagesCount} تصویر`;
        }
        formOptionsIndicator.textContent = summary || 'تنظیمات فعال';
    }

    if (formToggleBtn && optionsRow) {
        formToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            optionsRow.classList.toggle('expanded');
            const isExpanded = optionsRow.classList.contains('expanded');
            this.querySelector('span:first-child').textContent = isExpanded ? 'مخفی کردن تنظیمات' : 'تنظیمات تصویر';
            localStorage.setItem('formExpanded', isExpanded);
            if (formOptionsIndicator) updateOptionsIndicator();
        });

        const savedFormExpandedState = localStorage.getItem('formExpanded');
        if (savedFormExpandedState === 'true') {
            formToggleBtn.classList.add('active');
            optionsRow.classList.add('expanded');
            formToggleBtn.querySelector('span:first-child').textContent = 'مخفی کردن تنظیمات';
        } else if (savedFormExpandedState === 'false') {
            formToggleBtn.classList.remove('active');
            optionsRow.classList.remove('expanded');
            formToggleBtn.querySelector('span:first-child').textContent = 'تنظیمات تصویر';
        } else {
            if (optionsRow.classList.contains('expanded')) {
                formToggleBtn.classList.add('active');
                formToggleBtn.querySelector('span:first-child').textContent = 'مخفی کردن تنظیمات';
            } else {
                formToggleBtn.classList.remove('active');
                formToggleBtn.querySelector('span:first-child').textContent = 'تنظیمات تصویر';
            }
        }
        
        if (formOptionsIndicator) updateOptionsIndicator();

        document.getElementById('model')?.addEventListener('change', updateOptionsIndicator);
        document.getElementById('num_images')?.addEventListener('change', updateOptionsIndicator);
    }

    const successMessageMeta = document.querySelector('meta[name="success-message"]');
    if (successMessageMeta && successMessageMeta.content) {
        showAlert(successMessageMeta.content, 'success', 5000);
    }

    // Initialize Chat UI after other elements are ready
    initChatUI();
    // Ensure correct initial state of popup UI elements based on chatModeActiveInPopup
    toggleChatModeInPopup(); // Call once to set initial state based on flag (which is false)
});
