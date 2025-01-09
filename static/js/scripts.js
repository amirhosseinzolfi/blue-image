document.addEventListener('DOMContentLoaded', function () {
    // Add mode selector handling
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
    const deleteImageOption = document.getElementById('delete-image');
    let currentImagePath = '';
    let currentPrompt = '';

    // Load saved mode preference
    const savedMode = localStorage.getItem('generation_mode');
    if (savedMode) {
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
    if (savedGenerationMode) document.getElementById('generation_mode').value = savedGenerationMode;

    // Save mode preference when changed
    modeSelector.addEventListener('change', function() {
        localStorage.setItem('generation_mode', this.value);
    });

    function showAlert(message, type, duration = null) {
        const alertBox = document.getElementById('alert');
        const alertText = document.getElementById('alert-text');

        // Clear any existing fade-out timeouts
        if (alertBox.timeoutId) {
            clearTimeout(alertBox.timeoutId);
        }

        // Update alert content
        alertText.textContent = message;
        alertBox.className = `alert ${type} show`;
        alertBox.style.display = 'flex';

        // Only set auto-hide for success messages or when duration is specified
        if (duration && (type === 'success' || type === 'error')) {
            alertBox.timeoutId = setTimeout(() => {
                alertBox.classList.remove('show');
                setTimeout(() => {
                    alertBox.style.display = 'none';
                }, 300);
            }, duration);
        }
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        const mode = document.getElementById('generation_mode').value;
        const steps = [
            {
                delay: 0,
                message: 'شروع فرآیند تولید تصویر...', 
                type: 'info'
            },
            {
                delay: 2000,
                message: mode === 'standard' ? 'در حال تولید تصویر...' :
                         mode === 'note cover' ? 'در حال تولید طرح جلد...' :
                         mode === 'variation' ? 'در حال ایجاد تنوع تصاویر...' :
                         mode === 'various' ? 'در حال تولید نسخه‌های مختلف...' :
                         'در حال پردازش...',
                type: 'info'
            }
        ];

        // Process main steps
        steps.forEach(step => {
            setTimeout(() => {
                showAlert(step.message, step.type);
            }, step.delay);
        });

        // Add form data and submit
        setTimeout(() => {
            // Instead of form.submit(), do an AJAX fetch
            const formData = new FormData(form);
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
                            // Create a new wrapper
                            const wrapper = document.createElement('div');
                            wrapper.className = 'image-wrapper';
                            // Create new image element
                            const newImg = document.createElement('img');
                            newImg.src = `/images/${imgPath}`;
                            newImg.className = 'preview-image';
                            newImg.dataset.imagePath = `/download/${imgPath}`;
                            newImg.dataset.prompt = item.prompt;
                            // Create tooltip
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

    closeAlertButton.addEventListener('click', function () {
        alertBox.style.display = 'none';
    });

    document.querySelectorAll('.preview-image').forEach(image => {
        image.addEventListener('click', function () {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            
            modalImg.src = this.src;
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        });
    });

    closeModal.addEventListener('click', function () {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            // Restore body scroll
            document.body.style.overflow = '';
        }, 300);
    });

    // Close modal on outside click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    });

    // Prevent modal close when clicking on image
    document.querySelector('.modal-content').addEventListener('click', function (e) {
        e.stopPropagation();
    });

    document.querySelectorAll('.preview-image').forEach(image => {
        image.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            currentImagePath = this.getAttribute('data-image-path');
            currentPrompt = this.getAttribute('data-prompt');

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Get mouse position adjusted for scrolling
            let posX = event.clientX + window.scrollX;
            let posY = event.clientY + window.scrollY;

            // Adjust position to ensure the menu doesn't go out of bounds
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

    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target === modal || event.target === closeModal) {
            modal.style.display = 'none';
        } else if (!contextMenu.contains(event.target)) {
            contextMenu.style.display = 'none';
        }
    });

    downloadImageOption.addEventListener('click', function () {
        window.location.href = currentImagePath;
        contextMenu.style.display = 'none';
    });

    copyPromptOption.addEventListener('click', function () {
        navigator.clipboard.writeText(currentPrompt).then(() => {
            showAlert('دستور کپی شد!', 'success', 4000);
        }).catch(err => {
            showAlert('ناموفق در کپی دستور.', 'error', 4000);
        });
        contextMenu.style.display = 'none';
    });

    removeBgOption.addEventListener('click', function () {
        const bgRemovalSteps = [
            {
                delay: 0,
                message: 'شروع فرآیند حذف پس‌زمینه...',
                type: 'info'
            },
            {
                delay: 2000,
                message: 'در حال بارگیری تصویر...',
                type: 'info'
            },
            {
                delay: 4000,
                message: 'در حال تحلیل تصویر...',
                type: 'info'
            },
            {
                delay: 6000,
                message: 'در حال پردازش و حذف پس‌زمینه...',
                type: 'info'
            }
        ];

        contextMenu.style.display = 'none';

        // Process background removal steps
        bgRemovalSteps.forEach(step => {
            setTimeout(() => {
                showAlert(step.message, step.type);
            }, step.delay);
        });

        fetch('/remove_bg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_path: currentImagePath })
        })
        .then(response => {
            showAlert('در حال آماده‌سازی تصویر نهایی...', 'info');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Create new image wrapper and image element
                const imagesContainer = document.querySelector('.images');
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'image-wrapper';
                
                const newImage = document.createElement('img');
                newImage.className = 'preview-image';
                const cacheBuster = Date.now();
                newImage.src = `/images/${data.new_image_path}?t=${cacheBuster}`;
                newImage.setAttribute('data-image-path', `/download/${data.new_image_path}`);
                newImage.setAttribute('data-prompt', `${currentPrompt} (بدون پس‌زمینه)`);
                
                // Add loading event for the new image
                newImage.onload = function() {
                    showAlert('پس‌زمینه با موفقیت حذف شد!', 'success', 4000);
                };

                // Add error event for the new image
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

    deleteImageOption.addEventListener('click', function () {
        fetch('/delete_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_path: currentImagePath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove image from DOM
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

    // Helper function to attach event listeners to images
    function attachImageEventListeners(imageElement) {
        imageElement.addEventListener('click', function () {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            
            modalImg.src = this.src;
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
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

    // Attach event listeners to existing images
    document.querySelectorAll('.preview-image').forEach(image => {
        attachImageEventListeners(image);
    });

    // Check for success message in URL params when page loads
    document.addEventListener('DOMContentLoaded', function() {
        const imageList = document.querySelector('.images');
        if (imageList) {
            const imageCount = imageList.querySelectorAll('.image-wrapper').length;
            if (imageCount > 0) {
                showAlert(`${imageCount} تصویر با موفقیت تولید شد!`, 'success', 5000);
            }
        }
    });

    // Add infinite scroll handling
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

    // Add scroll event listener
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 1000) {
            loadMoreImages();
        }
    });
});
