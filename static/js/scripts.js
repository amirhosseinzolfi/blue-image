document.addEventListener('DOMContentLoaded', function () {
    // References to DOM elements
    const modeSelector = document.getElementById('generation_mode');
    const form = document.getElementById('imageForm');
    const alertBox = document.getElementById('alert');
    const alertText = document.getElementById('alert-text');
    const closeAlertButton = document.getElementById('close-alert');
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModal = document.querySelector('.close-modal');
    const contextMenu = document.getElementById('context-menu');
    const downloadImageOption = document.getElementById('download-image');
    const copyPromptOption = document.getElementById('copy-prompt');
    const removeBgOption = document.getElementById('remove-bg');
    const variationImageOption = document.getElementById('variation-image');
    const deleteImageOption = document.getElementById('delete-image');
    const queueStatusElement = document.getElementById('queue-status');
    const queueCountElement = document.getElementById('queue-count');
    const currentTaskMessageElement = document.getElementById('current-task-message');

    // Initialize Socket.IO connection
    const socket = io();
    
    // Track active tasks
    let activeTasks = {};
    let queueSize = 0;
    let totalImagesInQueue = 0;

    // Socket.IO event handlers
    socket.on('connect', function() {
        console.log('Connected to server');
    });
    
    socket.on('queue_update', function(data) {
        queueSize = data.queue_size;
        totalImagesInQueue = data.total_images || 0;
        queueCountElement.textContent = totalImagesInQueue; // Show total image count instead of task count
        
        // Update queue status visibility
        if (totalImagesInQueue > 0) {
            queueStatusElement.style.display = 'block';
        } else {
            // Only hide if there are no active tasks
            if (Object.keys(activeTasks).length === 0) {
                queueStatusElement.style.display = 'none';
            }
        }
    });
    
    socket.on('task_status', function(data) {
        // Update task status for the current task
        if (data.task_id in activeTasks) {
            activeTasks[data.task_id] = data.status;
            currentTaskMessageElement.textContent = data.status;
            // Keep the queue status visible as long as there's an active task
            queueStatusElement.style.display = 'block';
        }
    });
    
    socket.on('image_generated', function(data) {
        // Add the newly generated image to the grid immediately
        const imagesContainer = document.querySelector('.images');
        if (imagesContainer) {
            // Create wrapper & image
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';

            const newImg = document.createElement('img');
            newImg.src = `/images/${data.image_path}`;
            newImg.className = 'preview-image new-image-animation';
            newImg.dataset.imagePath = `/download/${data.image_path}`;
            newImg.dataset.prompt = data.prompt;
            newImg.dataset.model = data.model || extractModelFromPath(data.image_path);

            // Tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = data.prompt;
            
            // Add model badge
            const modelBadge = createModelBadge(data.model || extractModelFromPath(data.image_path));
            
            wrapper.appendChild(newImg);
            wrapper.appendChild(tooltip);
            wrapper.appendChild(modelBadge);
            
            // Insert at the beginning of the grid
            if (imagesContainer.firstChild) {
                imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);
            } else {
                imagesContainer.appendChild(wrapper);
            }
            
            // Attach event listeners
            attachImageEventListeners(newImg);
            
            // Show notification for new image
            showAlert(`تصویر جدید برای "${data.prompt}" ایجاد شد`, 'success', 2000);
        }
    });
    
    socket.on('task_completed', function(data) {
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            
            // If no more active tasks and queue is empty, hide queue status
            if (Object.keys(activeTasks).length === 0 && queueSize === 0) {
                queueStatusElement.style.display = 'none';
            }
            
            showAlert('همه تصاویر با موفقیت ایجاد شدند', 'success', 4000);
        }
    });
    
    socket.on('task_error', function(data) {
        showAlert(`خطا: ${data.error}`, 'error', 5000);
        
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
        }
    });

    // Load saved mode preference
    const savedMode = localStorage.getItem('generation_mode');
    if (savedMode && modeSelector) {
        modeSelector.value = savedMode;
    }

    // Load saved preferences
    const savedModel = localStorage.getItem('model');
    const savedNumImages = localStorage.getItem('num_images');
    const savedWidth = localStorage.getItem('width');
    const savedHeight = localStorage.getItem('height');
    const savedGenerationMode = localStorage.getItem('generation_mode');

    if (savedModel) document.getElementById('model').value = savedModel;
    if (savedNumImages) document.getElementById('num_images').value = savedNumImages;
    if (savedWidth) document.getElementById('width').value = savedWidth;
    if (savedHeight) document.getElementById('height').value = savedHeight;
    if (savedGenerationMode && modeSelector) {
        document.getElementById('generation_mode').value = savedGenerationMode;
    }

    // Save mode preference when changed
    if (modeSelector) {
        modeSelector.addEventListener('change', function() {
            localStorage.setItem('generation_mode', this.value);
        });
    }

    // Show alert helper
    function showAlert(message, type, duration = null) {
        // Clear any existing fade-out timeouts
        if (alertBox.timeoutId) {
            clearTimeout(alertBox.timeoutId);
        }

        // Update alert content & display
        alertText.textContent = message;
        alertBox.className = `alert ${type} show`;
        alertBox.style.display = 'flex';

        // Auto-hide logic
        if (duration && (type === 'success' || type === 'error')) {
            alertBox.timeoutId = setTimeout(() => {
                alertBox.classList.remove('show');
                setTimeout(() => {
                    alertBox.style.display = 'none';
                }, 300);
            }, duration);
        }
    }

    // Form submit => image generation
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        // Show initial alert
        const generationMode = document.getElementById('generation_mode').value;
        const numImages = parseInt(document.getElementById('num_images').value) || 1;
        
        // Show more specific alert based on generation mode
        if (generationMode === 'various') {
            showAlert(`در حال اضافه کردن به صف تولید ${numImages} تصویر هوشمند...`, 'info');
        } else if (generationMode === 'note cover') {
            showAlert(`در حال اضافه کردن به صف تولید ${numImages} طرح جلد...`, 'info');
        } else {
            showAlert(`در حال اضافه کردن به صف تولید ${numImages} تصویر...`, 'info');
        }
        
        const formData = new FormData(form);
        
        fetch('/ajax_generate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add task to active tasks with initial status
                activeTasks[data.task_id] = 'در صف انتظار';
                
                // Show queue position
                if (data.queue_position > 1) {
                    showAlert(`درخواست شما در موقعیت ${data.queue_position} صف قرار گرفت`, 'info', 4000);
                } else {
                    showAlert('درخواست شما در حال پردازش است...', 'info', 4000);
                }
            } else {
                showAlert('خطا در ارسال درخواست', 'error', 4000);
            }
        })
        .catch(err => {
            console.error(err);
            showAlert('خطا در برقراری ارتباط', 'error', 4000);
        });
    });

    // Close alert
    closeAlertButton.addEventListener('click', function () {
        alertBox.style.display = 'none';
    });

    // Image preview click => open modal
    document.querySelectorAll('.preview-image').forEach(image => {
        image.addEventListener('click', function () {
            modalImage.src = this.src;
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        });
    });

    // Close modal (X button)
    closeModal.addEventListener('click', function () {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    });

    // Close modal if clicked outside image
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    });

    // Prevent modal close on image click
    document.querySelector('.modal-content').addEventListener('click', function (e) {
        e.stopPropagation();
    });

    // Right-click on any .preview-image => open context menu
    document.querySelectorAll('.preview-image').forEach(image => {
        image.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            currentImagePath = this.getAttribute('data-image-path');
            currentPrompt = this.getAttribute('data-prompt');

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let posX = event.clientX + window.scrollX;
            let posY = event.clientY + window.scrollY;

            if (posX + menuWidth > windowWidth + window.scrollX) {
                posX = windowWidth + window.scrollX - menuWidth;
            }
            if (posY + menuHeight > windowHeight + window.scrollY) {
                posY = windowHeight + window.scrollY - menuHeight;
            }

            contextMenu.style.top = `${posY}px`;
            contextMenu.style.left = `${posX}px`;
            contextMenu.style.display = 'block';
        });
    });

    // Close modal by close button
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Hide context menu if clicked elsewhere
    window.addEventListener('click', function (event) {
        if (event.target === modal || event.target === closeModal) {
            modal.style.display = 'none';
        } else if (!contextMenu.contains(event.target)) {
            contextMenu.style.display = 'none';
        }
    });

    // --------------------
    // Context Menu Options
    // --------------------

    // 1) Download
    downloadImageOption.addEventListener('click', function () {
        window.location.href = currentImagePath;
        contextMenu.style.display = 'none';
    });

    // 2) Copy Prompt
    copyPromptOption.addEventListener('click', function () {
        navigator.clipboard.writeText(currentPrompt)
            .then(() => {
                showAlert('دستور کپی شد!', 'success', 4000);
            })
            .catch(err => {
                showAlert('ناموفق در کپی دستور.', 'error', 4000);
            });
        contextMenu.style.display = 'none';
    });

    // 3) Remove Background
    removeBgOption.addEventListener('click', function () {
        const bgRemovalSteps = [
            { delay: 0,    message: 'شروع فرآیند حذف پس‌زمینه',        type: 'info' },
            { delay: 2000, message: 'در حال بارگیری تصویر',           type: 'info' },
            { delay: 4000, message: 'در حال تحلیل تصویر',             type: 'info' },
            { delay: 6000, message: 'در حال پردازش و حذف پس‌زمینه',   type: 'info' }
        ];

        contextMenu.style.display = 'none';

        bgRemovalSteps.forEach(step => {
            setTimeout(() => {
                showAlert(step.message, step.type);
            }, step.delay);
        });

        fetch('/remove_bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: currentImagePath })
        })
        .then(response => {
            showAlert('در حال آماده‌سازی تصویر نهایی...', 'info');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Insert new "background-removed" image
                const imagesContainer = document.querySelector('.images');
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'image-wrapper';

                const newImage = document.createElement('img');
                newImage.className = 'preview-image';
                const cacheBuster = Date.now();
                newImage.src = `/images/${data.new_image_path}?t=${cacheBuster}`;
                newImage.dataset.imagePath = `/download/${data.new_image_path}`;
                newImage.dataset.prompt = `${currentPrompt} (بدون پس‌زمینه)`;

                newImage.onload = function() {
                    showAlert('پس‌زمینه با موفقیت حذف شد!', 'success', 4000);
                };
                newImage.onerror = function() {
                    showAlert('خطا در بارگذاری تصویر جدید.', 'error', 4000);
                };

                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = `${currentPrompt} (بدون پس‌زمینه)`;

                imageWrapper.appendChild(newImage);
                imageWrapper.appendChild(tooltip);
                imagesContainer.insertBefore(imageWrapper, imagesContainer.firstChild);
                
                attachImageEventListeners(newImage);
            } else {
                showAlert('عدم موفقیت در حذف پس‌زمینه.', 'error', 4000);
            }
        })
        .catch(err => {
            showAlert('خطا در حذف پس‌زمینه.', 'error', 4000);
            console.error(err);
        });
    });

    // 4) Image Variation (NEW)
    variationImageOption.addEventListener('click', function () {
        contextMenu.style.display = 'none';
        // Show immediate alert
        showAlert('در حال تولید واریاسیون...', 'info');
        
        // Example: using num_images as the count of variations
        const numVariations = document.getElementById('num_images').value || 1;

        fetch('/variation_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_path: currentImagePath,
                num_variations: numVariations
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const imagesContainer = document.querySelector('.images');
                // Insert each new variation image
                data.generated_images.forEach(item => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'image-wrapper';

                    const newImg = document.createElement('img');
                    // If your backend returns a local path: /images/{filename}
                    // or if it returns a public URL from OpenAI, adapt accordingly:
                    newImg.src = item.path.startsWith('http') ? item.path : `/images/${item.path}`;
                    newImg.className = 'preview-image';
                    newImg.dataset.imagePath = item.path.startsWith('http')
                        ? item.path
                        : `/download/${item.path}`;
                    newImg.dataset.prompt = item.prompt || 'Image Variation';

                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = newImg.dataset.prompt;

                    wrapper.appendChild(newImg);
                    wrapper.appendChild(tooltip);
                    imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);

                    attachImageEventListeners(newImg);
                });

                showAlert('واریاسیون جدید با موفقیت تولید شد!', 'success', 5000);
            } else {
                showAlert(`خطا در تولید واریاسیون: ${data.error}`, 'error', 4000);
            }
        })
        .catch(err => {
            console.error(err);
            showAlert('خطا در برقراری ارتباط برای واریاسیون', 'error', 4000);
        });
    });

    // 5) Delete Image
    deleteImageOption.addEventListener('click', function () {
        fetch('/delete_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: currentImagePath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the deleted image from DOM
                const imageWrapper = document.querySelector(`img[data-image-path="${currentImagePath}"]`).parentNode;
                imageWrapper.remove();
                showAlert('تصویر با موفقیت حذف شد', 'success', 4000);
            } else {
                showAlert('خطا در حذف تصویر', 'error', 4000);
            }
        })
        .catch(err => {
            console.error(err);
            showAlert('خطا در حذف تصویر', 'error', 4000);
        });
        contextMenu.style.display = 'none';
    });

    // Helper to attach event listeners to newly added images
    function attachImageEventListeners(imageElement) {
        imageElement.addEventListener('click', function () {
            modalImage.src = this.src;
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        });

        imageElement.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            currentImagePath = this.getAttribute('data-image-path');
            currentPrompt = this.getAttribute('data-prompt');

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let posX = event.clientX + window.scrollX;
            let posY = event.clientY + window.scrollY;

            if (posX + menuWidth > windowWidth + window.scrollX) {
                posX = windowWidth + window.scrollX - menuWidth;
            }
            if (posY + menuHeight > windowHeight + window.scrollY) {
                posY = windowHeight + window.scrollY - menuHeight;
            }

            contextMenu.style.top = `${posY}px`;
            contextMenu.style.left = `${posX}px`;
            contextMenu.style.display = 'block';
        });
    }

    // Attach event listeners to existing images (if any)
    document.querySelectorAll('.preview-image').forEach(image => {
        attachImageEventListeners(image);
    });

    // Initial load success message
    (function checkImageCountOnLoad() {
        const imageList = document.querySelector('.images');
        if (imageList) {
            const imageCount = imageList.querySelectorAll('.image-wrapper').length;
            if (imageCount > 0) {
                showAlert(`${imageCount} تصویر با موفقیت تولید شد!`, 'success', 5000);
            }
        }
    })();

    // Add model badges to existing images on page load
    function addModelBadgesToExistingImages() {
        document.querySelectorAll('.image-wrapper').forEach(wrapper => {
            // Skip if it already has a model badge
            if (wrapper.querySelector('.model-badge')) return;
            
            const img = wrapper.querySelector('img');
            if (img) {
                const imagePath = img.getAttribute('data-image-path');
                const modelName = img.getAttribute('data-model') || extractModelFromPath(imagePath);
                const badge = createModelBadge(modelName);
                wrapper.appendChild(badge);
            }
        });
    }
    
    // Call this function on page load
    addModelBadgesToExistingImages();

    // ---------------------------------
    // Infinite Scrolling for more images
    // ---------------------------------
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;

    function loadMoreImages() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        showAlert('در حال بارگذاری تصاویر...', 'info');

        fetch(`/load_images?page=${currentPage + 1}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const imagesContainer = document.querySelector('.images');
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
                            
                            // Add model badge
                            const modelBadge = createModelBadge(item.model || extractModelFromPath(imgPath));
                            
                            wrapper.appendChild(newImg);
                            wrapper.appendChild(tooltip);
                            wrapper.appendChild(modelBadge);
                            
                            imagesContainer.appendChild(wrapper);
                            
                            attachImageEventListeners(newImg);
                        });
                    });
                    
                    currentPage++;
                    hasMore = data.has_more;
                    showAlert('تصاویر جدید بارگذاری شد', 'success', 2000);
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
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 1000) {
            loadMoreImages();
        }
    });

    // References to upload elements
    const uploadButton = document.getElementById('upload-button');
    const fileInput = document.getElementById('image-upload');

    // Ensure both elements exist before attaching event listeners
    if (uploadButton && fileInput) {
        // Click event for upload button to trigger file input
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // Change event for file input to handle selected files
        fileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files.length) return;

            showAlert('در حال آپلود تصاویر...', 'info');

            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('images', file);
            });

            // Include generation_mode if needed
            const generationMode = document.getElementById('generation_mode').value;
            formData.append('generation_mode', generationMode);

            try {
                const response = await fetch('/upload_images', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    const imagesContainer = document.querySelector('.images');

                    data.images.forEach(image => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';

                        const newImg = document.createElement('img');
                        newImg.src = `/images/${image.path}`;
                        newImg.className = 'preview-image';
                        newImg.dataset.imagePath = `/download/${image.path}`;
                        newImg.dataset.prompt = image.name;

                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = image.name;

                        wrapper.appendChild(newImg);
                        wrapper.appendChild(tooltip);
                        imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);

                        attachImageEventListeners(newImg);
                    });

                    showAlert(`${data.images.length} تصویر با موفقیت آپلود شد`, 'success', 4000);
                } else {
                    showAlert(data.error || 'خطا در آپلود تصاویر', 'error', 4000);
                }
            } catch (err) {
                console.error(err);
                showAlert('خطا در آپلود تصاویر', 'error', 4000);
            }

            // Clear the file input
            fileInput.value = '';
        });
    }

    // Helper function to create model badge
    function createModelBadge(modelName) {
        const badge = document.createElement('div');
        badge.className = 'model-badge';
        
        // Add model-specific class for styling
        const modelClass = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (modelClass) {
            badge.classList.add(modelClass);
        }
        
        // Format model name for display
        let displayName = modelName;
        if (displayName.includes('/')) {
            // For Hugging Face models, just show the model name without owner
            displayName = displayName.split('/').pop();
        }
        
        // Shorten very long model names
        if (displayName.length > 15) {
            const parts = displayName.split('-');
            if (parts.length > 1) {
                // Try to create a reasonable abbreviation
                displayName = parts.map(p => p.charAt(0)).join('');
                displayName = displayName + '-' + parts[parts.length - 1];
            } else {
                // Just truncate if we can't abbreviate well
                displayName = displayName.substring(0, 15) + '…';
            }
        }
        
        badge.textContent = displayName;
        return badge;
    }
    
    // Helper function to extract model name from image path
    function extractModelFromPath(path) {
        // Image paths are typically like: prompt_index_model_number.ext
        try {
            const filename = path.split('/').pop();
            const parts = filename.split('_');
            if (parts.length >= 3) {
                return parts[parts.length - 2]; // Model is usually the second-to-last part
            }
        } catch (e) {
            console.error("Error extracting model from path:", e);
        }
        return "unknown";
    }

    // References to new DOM elements
    const generationOverlay = document.getElementById('generation-overlay');
    const generationStatus = document.getElementById('generation-status');
    const generationInspiration = document.getElementById('generation-inspiration');
    const progressFill = document.querySelector('.progress-fill');

    // Inspirational messages to show during generation
    const inspirationMessages = [
        "تصورات شما در حال تبدیل شدن به واقعیت هستند...",
        "هوش مصنوعی در حال پردازش جزئیات تصویر است...",
        "رنگ‌ها و اشکال در حال شکل‌گیری هستند...",
        "در حال خلق یک اثر هنری منحصر به فرد...",
        "تخیل شما به دنیای دیجیتال منتقل می‌شود...",
        "هر پیکسل با دقت طراحی می‌شود...",
        "الگوریتم‌های پیشرفته در حال کار روی ایده شما...",
        "جادوی هوش مصنوعی در حال اتفاق افتادن است...",
        "در حال تبدیل کلمات به تصاویر شگفت‌انگیز...",
        "دنیای جدیدی از تصاویر در حال شکل‌گیری است..."
    ];

    // Track generation state
    let isGenerating = false;
    let inspirationInterval;
    let progressInterval;
    let progressValue = 0;

    // Show generation overlay with animation
    function showGenerationOverlay() {
        // Reset progress
        progressValue = 0;
        progressFill.style.width = '0%';
        
        // Show overlay
        generationOverlay.classList.add('visible');
        
        // Start inspiration message rotation
        let messageIndex = 0;
        generationInspiration.textContent = inspirationMessages[0];
        
        clearInterval(inspirationInterval);
        inspirationInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % inspirationMessages.length;
            
            // Fade out current message
            generationInspiration.style.opacity = 0;
            
            // After fade out, change text and fade in
            setTimeout(() => {
                generationInspiration.textContent = inspirationMessages[messageIndex];
                generationInspiration.style.opacity = 1;
            }, 300);
        }, 5000);
        
        // Simulate progress
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            // Progress moves faster initially, then slows down
            const increment = (100 - progressValue) / 20;
            progressValue = Math.min(progressValue + increment, 95);
            progressFill.style.width = `${progressValue}%`;
        }, 1000);
    }

    // Hide generation overlay with animation
    function hideGenerationOverlay(success = true) {
        // Complete the progress bar
        progressValue = 100;
        progressFill.style.width = '100%';
        
        // Clear intervals
        clearInterval(inspirationInterval);
        clearInterval(progressInterval);
        
        if (success) {
            // Show completion message
            generationStatus.textContent = "تصاویر با موفقیت ساخته شدند!";
            generationInspiration.textContent = "در حال نمایش تصاویر...";
            
            // Show confetti animation
            showConfetti();
            
            // Hide overlay after delay
            setTimeout(() => {
                generationOverlay.classList.remove('visible');
                isGenerating = false;
            }, 1500);
        } else {
            // Show error message
            generationStatus.textContent = "خطا در تولید تصویر";
            generationInspiration.textContent = "لطفا دوباره تلاش کنید";
            
            // Hide overlay after delay
            setTimeout(() => {
                generationOverlay.classList.remove('visible');
                isGenerating = false;
            }, 2000);
        }
    }

    // Create and show confetti animation
    function showConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        const colors = ['#bb86fc', '#03dac6', '#cf6679', '#3700b3', '#ffffff'];
        
        // Create 50 confetti elements
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random position, color, size, and animation
            const size = Math.random() * 10 + 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = Math.random() * 3 + 2;
            const rotation = Math.random() * 360;
            
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${left}%`;
            confetti.style.top = '-20px';
            confetti.style.transform = `rotate(${rotation}deg)`;
            confetti.style.animation = `fall ${duration}s ease-in ${delay}s forwards`;
            
            confettiContainer.appendChild(confetti);
        }
        
        // Remove confetti after animation completes
        setTimeout(() => {
            confettiContainer.style.animation = 'fade-out 1s forwards';
            setTimeout(() => {
                document.body.removeChild(confettiContainer);
            }, 1000);
        }, 5000);
    }

    // Add confetti fall animation to styles
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
        @keyframes fall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(${window.innerHeight}px) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Form submit => image generation
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        if (isGenerating) return; // Prevent multiple submissions
        isGenerating = true;
        
        // Show generation overlay with animation
        showGenerationOverlay();
        
        const generationMode = document.getElementById('generation_mode').value;
        const numImages = parseInt(document.getElementById('num_images').value) || 1;
        const userInput = document.getElementById('user_input').value;
        
        // Update status with specific details based on generation mode
        if (generationMode === 'bulk') {
            const queries = userInput.split(';').filter(q => q.trim() !== '');
            const totalQueries = queries.length;
            
            if (totalQueries > 0) {
                generationStatus.textContent = `در حال پردازش ${totalQueries} درخواست انبوه (${numImages} تصویر برای هر درخواست)`;
                generationInspiration.textContent = queries.map(q => q.trim()).join(' | ');
            } else {
                generationStatus.textContent = `در حال پردازش درخواست انبوه`;
            }
        } else if (generationMode === 'various') {
            generationStatus.textContent = `در حال ساخت ${numImages} تصویر هوشمند...`;
        } else if (generationMode === 'note cover') {
            generationStatus.textContent = `در حال ساخت ${numImages} طرح جلد...`;
        } else {
            generationStatus.textContent = `در حال ساخت ${numImages} تصویر...`;
        }
        
        const formData = new FormData(form);
        
        // Add a hint to help users format bulk queries if in bulk mode
        if (generationMode === 'bulk') {
            // Show hint about separating queries with semicolons
            showAlert('درخواست‌های شما با علامت ";" از هم جدا شده‌اند', 'info', 3000);
        }
        
        fetch('/ajax_generate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add task to active tasks with initial status
                activeTasks[data.task_id] = 'در صف انتظار';
                
                // Keep overlay visible until images are generated
                // The overlay will be hidden when the task_completed event is received
            } else {
                hideGenerationOverlay(false);
                showAlert('خطا در ارسال درخواست', 'error', 4000);
            }
        })
        .catch(err => {
            console.error(err);
            hideGenerationOverlay(false);
            showAlert('خطا در برقراری ارتباط', 'error', 4000);
        });
    });
    
    // Listen for task completion to hide overlay
    socket.on('task_completed', function(data) {
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            
            // If no more active tasks, hide the generation overlay
            if (Object.keys(activeTasks).length === 0) {
                hideGenerationOverlay(true);
            }
            
            showAlert('همه تصاویر با موفقیت ایجاد شدند', 'success', 4000);
        }
    });
    
    // Listen for task errors to hide overlay
    socket.on('task_error', function(data) {
        showAlert(`خطا: ${data.error}`, 'error', 5000);
        
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            
            // If no more active tasks, hide the generation overlay
            if (Object.keys(activeTasks).length === 0) {
                hideGenerationOverlay(false);
            }
        }
    });

    // Update the status display when receiving task status updates
    socket.on('task_status', function(data) {
        // Update task status for the current task
        if (data.task_id in activeTasks) {
            activeTasks[data.task_id] = data.status;
            
            // Update the generation status text
            generationStatus.textContent = data.status;
            
            // Extract query information from bulk generation status messages
            if (data.status.includes('for query:')) {
                const currentQuery = data.status.split('for query:')[1].trim();
                generationInspiration.textContent = currentQuery;
                generationInspiration.style.fontWeight = 'bold';
            }
            
            // Ensure overlay is visible as long as there's an active task
            if (!generationOverlay.classList.contains('visible')) {
                showGenerationOverlay();
            }
        }
    });

    // Add helper text for the bulk generation mode
    if (modeSelector) {
        modeSelector.addEventListener('change', function() {
            localStorage.setItem('generation_mode', this.value);
            
            // Show hint for bulk mode
            if (this.value === 'bulk') {
                const userInputField = document.getElementById('user_input');
                if (userInputField && !userInputField.value.includes(';')) {
                    userInputField.placeholder = "درخواست‌های خود را با ; از هم جدا کنید (مثال: ماشین; طبیعت; مدیتیشن)";
                    showAlert('برای تولید انبوه، عبارات خود را با علامت ; از هم جدا کنید', 'info', 5000);
                }
            } else {
                const userInputField = document.getElementById('user_input');
                if (userInputField) {
                    userInputField.placeholder = "چی تو ذهنته ؟";
                }
            }
        });
    }

    // References to new DOM elements for the widget
    const generationWidget = document.getElementById('generation-widget');
    const widgetGenerationStatus = document.getElementById('widget-generation-status');
    const widgetInspiration = document.getElementById('widget-inspiration');
    const widgetProgressFill = document.getElementById('widget-progress-fill');
    const minimizeWidgetButton = document.getElementById('minimize-generation-widget');
    const generationNotification = document.getElementById('generation-notification');

    // Track widget state
    let isWidgetMinimized = false;

    // Minimize/maximize widget
    if (minimizeWidgetButton) {
        minimizeWidgetButton.addEventListener('click', function() {
            if (isWidgetMinimized) {
                generationWidget.classList.remove('minimized');
                minimizeWidgetButton.textContent = '_';
                minimizeWidgetButton.title = 'کوچک کردن';
            } else {
                generationWidget.classList.add('minimized');
                minimizeWidgetButton.textContent = '□';
                minimizeWidgetButton.title = 'بزرگ کردن';
            }
            isWidgetMinimized = !isWidgetMinimized;
        });
    }

    // Updated show generation status function - use widget instead of overlay
    function showGenerationWidget() {
        // Reset progress
        progressValue = 0;
        widgetProgressFill.style.width = '0%';
        
        // Show widget
        generationWidget.classList.add('visible');
        
        // Adjust position in case notification is visible
        adjustWidgetPosition();
        
        // Start inspiration message rotation
        let messageIndex = 0;
        widgetInspiration.textContent = inspirationMessages[0];
        
        clearInterval(inspirationInterval);
        inspirationInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % inspirationMessages.length;
            
            // Fade out current message
            widgetInspiration.style.opacity = 0;
            
            // After fade out, change text and fade in
            setTimeout(() => {
                widgetInspiration.textContent = inspirationMessages[messageIndex];
                widgetInspiration.style.opacity = 1;
            }, 300);
        }, 5000);
        
        // Simulate progress
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            // Progress moves faster initially, then slows down
            const increment = (100 - progressValue) / 20;
            progressValue = Math.min(progressValue + increment, 95);
            widgetProgressFill.style.width = `${progressValue}%`;
        }, 1000);
    }

    // Updated hide generation status function - use widget instead of overlay
    function hideGenerationWidget(success = true) {
        // Complete the progress bar
        progressValue = 100;
        widgetProgressFill.style.width = '100%';
        
        // Clear intervals
        clearInterval(inspirationInterval);
        clearInterval(progressInterval);
        
        if (success) {
            // Show completion notification
            showCompletionNotification();
            
            // Hide widget after delay
            setTimeout(() => {
                generationWidget.classList.remove('visible');
                isGenerating = false;
            }, 1000);
        } else {
            // Show error in the widget
            widgetGenerationStatus.textContent = "خطا در تولید تصویر";
            widgetInspiration.textContent = "لطفا دوباره تلاش کنید";
            
            // Hide widget after delay
            setTimeout(() => {
                generationWidget.classList.remove('visible');
                isGenerating = false;
            }, 2000);
        }
    }

    // Show completion notification
    function showCompletionNotification() {
        generationNotification.classList.add('visible');
        
        // Adjust widget position if it's visible
        if (document.getElementById('generation-widget').classList.contains('visible')) {
            adjustWidgetPosition();
        }
        
        // Hide notification after 5 seconds
        setTimeout(() => {
            generationNotification.classList.remove('visible');
            
            // Reset widget position
            setTimeout(adjustWidgetPosition, 300);
        }, 5000);
        
        // Show confetti animation
        showConfetti();
    }

    // Replace form submit event handler with updated widget functions
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        if (isGenerating) return; // Prevent multiple submissions
        isGenerating = true;
        
        // Show generation widget instead of overlay
        showGenerationWidget();
        
        const generationMode = document.getElementById('generation_mode').value;
        const numImages = parseInt(document.getElementById('num_images').value) || 1;
        const userInput = document.getElementById('user_input').value;
        
        // Update status with specific details based on generation mode
        if (generationMode === 'bulk') {
            const queries = userInput.split(';').filter(q => q.trim() !== '');
            const totalQueries = queries.length;
            
            if (totalQueries > 0) {
                widgetGenerationStatus.textContent = `${totalQueries} درخواست انبوه (${numImages} تصویر برای هر درخواست)`;
                widgetInspiration.textContent = queries.map(q => q.trim()).join(' | ');
            } else {
                widgetGenerationStatus.textContent = `درخواست انبوه`;
            }
        } else if (generationMode === 'various') {
            widgetGenerationStatus.textContent = `تولید ${numImages} تصویر هوشمند`;
        } else if (generationMode === 'note cover') {
            widgetGenerationStatus.textContent = `تولید ${numImages} طرح جلد`;
        } else {
            widgetGenerationStatus.textContent = `تولید ${numImages} تصویر`;
        }

        const formData = new FormData(form);
        
        // Add a hint to help users format bulk queries if in bulk mode
        if (generationMode === 'bulk') {
            // Show hint about separating queries with semicolons
            showAlert('درخواست‌های شما با علامت ";" از هم جدا شده‌اند', 'info', 3000);
        }
        
        fetch('/ajax_generate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add task to active tasks with initial status
                activeTasks[data.task_id] = 'در صف انتظار';
                
                // Keep widget visible until images are generated
                // The widget will be hidden when the task_completed event is received
            } else {
                hideGenerationWidget(false);
                showAlert('خطا در ارسال درخواست', 'error', 4000);
            }
        })
        .catch(err => {
            console.error(err);
            hideGenerationWidget(false);
            showAlert('خطا در برقراری ارتباط', 'error', 4000);
        });
    });

    // Update the socket.io handlers to use widget instead of overlay
    socket.on('task_completed', function(data) {
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            
            // If no more active tasks, hide the generation widget
            if (Object.keys(activeTasks).length === 0) {
                hideGenerationWidget(true);
            }
            
            showAlert('همه تصاویر با موفقیت ایجاد شدند', 'success', 4000);
        }
    });

    socket.on('task_error', function(data) {
        showAlert(`خطا: ${data.error}`, 'error', 5000);
        
        // Remove task from active tasks
        if (data.task_id in activeTasks) {
            delete activeTasks[data.task_id];
            
            // If no more active tasks, hide the generation widget
            if (Object.keys(activeTasks).length === 0) {
                hideGenerationWidget(false);
            }
        }
    });

    socket.on('task_status', function(data) {
        // Update task status for the current task
        if (data.task_id in activeTasks) {
            activeTasks[data.task_id] = data.status;
            
            // Update the generation status text
            widgetGenerationStatus.textContent = data.status;
            
            // Extract query information from bulk generation status messages
            if (data.status.includes('for query:')) {
                const currentQuery = data.status.split('for query:')[1].trim();
                widgetInspiration.textContent = currentQuery;
                widgetInspiration.style.fontWeight = 'bold';
            }
            
            // Ensure widget is visible as long as there's an active task
            if (!generationWidget.classList.contains('visible')) {
                showGenerationWidget();
            }
        }
    });

    // Enhanced widget position adjustment for better responsiveness
    function adjustWidgetPosition() {
        const widget = document.getElementById('generation-widget');
        const notification = document.getElementById('generation-notification');
        
        if (!widget || !notification) return;
        
        // Check if screen width is mobile
        if (window.innerWidth <= 480) {
            // On mobile, ensure the widget stays at the bottom
            widget.style.bottom = "10px";
            
            // If notification is visible, move the widget up
            if (notification.classList.contains('visible')) {
                const notifHeight = notification.offsetHeight + 10; // 10px spacing
                widget.style.bottom = `${notifHeight}px`;
            }
        } else {
            // On desktop, reset to default
            widget.style.bottom = "20px";
            
            // If notification is visible, move the widget up
            if (notification.classList.contains('visible')) {
                const notifHeight = notification.offsetHeight + 10; // 10px spacing
                widget.style.bottom = `${notifHeight}px`;
            }
        }
    }

    // Enhanced notification handling
    function showCompletionNotification() {
        const notification = document.getElementById('generation-notification');
        notification.classList.add('visible');
        
        // Adjust widget position if it's visible
        if (document.getElementById('generation-widget').classList.contains('visible')) {
            adjustWidgetPosition();
        }
        
        // Hide notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
            
            // Reset widget position
            setTimeout(adjustWidgetPosition, 300);
        }, 5000);
        
        // Show confetti animation
        showConfetti();
    }

    // Add resize listener to adjust widget position when window size changes
    window.addEventListener('resize', adjustWidgetPosition);
});
