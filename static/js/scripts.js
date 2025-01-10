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
    const variationImageOption = document.getElementById('variation-image'); // NEW
    const deleteImageOption = document.getElementById('delete-image');

    let currentImagePath = '';
    let currentPrompt = '';

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
        
        const mode = modeSelector ? modeSelector.value : 'standard';
        const steps = [
            { delay: 0,    message: 'شروع فرآیند تولید تصویر', type: 'info' },
            { delay: 2000, message: 
                mode === 'standard'  ? 'در حال تولید تصویر' :
                mode === 'note cover' ? 'در حال تولید کاور نوت' :
                mode === 'variation' ? 'آنالیز نیاز با هوش مصنوعی' :
                mode === 'various'   ? 'در حال تولید پرامت های مختلف' :
                                        'در حال پردازش',
              type: 'info'
            }
        ];

        // Show step-by-step alerts
        steps.forEach(step => {
            setTimeout(() => {
                showAlert(step.message, step.type);
            }, step.delay);
        });

        // AJAX form submit
        setTimeout(() => {
            const formData = new FormData(form);
            formData.set('generation_mode', mode); // Ensure mode is sent to server
            fetch('/ajax_generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const imagesContainer = document.querySelector('.images');
                    data.image_prompt_list.forEach(item => {
                        item.images.forEach(imgPath => {
                            // Create wrapper & image
                            const wrapper = document.createElement('div');
                            wrapper.className = 'image-wrapper';

                            const newImg = document.createElement('img');
                            newImg.src = `/images/${imgPath}`;
                            newImg.className = 'preview-image';
                            newImg.dataset.imagePath = `/download/${imgPath}`;
                            newImg.dataset.prompt = item.prompt;

                            // Tooltip
                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip';
                            tooltip.textContent = item.prompt;

                            wrapper.appendChild(newImg);
                            wrapper.appendChild(tooltip);
                            imagesContainer.insertBefore(wrapper, imagesContainer.firstChild);
                            attachImageEventListeners(newImg);
                        });
                    });
                    showAlert(`${data.image_prompt_list.length} دستور جدید تولید شد!`, 'success', 4000);
                } else {
                    showAlert('خطا در تولید تصویر', 'error', 4000);
                }
            })
            .catch(err => {
                console.error(err);
                showAlert('خطا در برقراری ارتباط', 'error', 4000);
            });
        }, 2500);
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
                            
                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip';
                            tooltip.textContent = item.prompt;
                            
                            wrapper.appendChild(newImg);
                            wrapper.appendChild(tooltip);
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
});
