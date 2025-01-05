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

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        showAlert('Processing Images...', 'info');
        setTimeout(() => {
            form.submit();
        }, 100);

        // Add generation mode to form data
        const modeInput = document.createElement('input');
        modeInput.type = 'hidden';
        modeInput.name = 'generation_mode';
        modeInput.value = modeSelector.value;
        this.appendChild(modeInput);

        // Save preferences on form submit
        localStorage.setItem('model', document.getElementById('model').value);
        localStorage.setItem('num_images', document.getElementById('num_images').value);
        localStorage.setItem('width', document.getElementById('width').value);
        localStorage.setItem('height', document.getElementById('height').value);
        localStorage.setItem('generation_mode', document.getElementById('generation_mode').value);
    });

    closeAlertButton.addEventListener('click', function () {
        alertBox.style.display = 'none';
    });

    function showAlert(message, type) {
        alertText.textContent = message;
        alertBox.className = `alert ${type} show`;
        alertBox.style.display = 'flex';
    }

    document.querySelectorAll('.preview-image').forEach(image => {
        image.addEventListener('click', function () {
            modal.style.display = 'block';
            modalImage.src = this.src;
        });

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
            showAlert('Prompt copied to clipboard!', 'success');
        }).catch(err => {
            showAlert('Failed to copy prompt.', 'error');
        });
        contextMenu.style.display = 'none';
    });

    removeBgOption.addEventListener('click', function () {
        fetch('/remove_bg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_path: currentImagePath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Background removed successfully!', 'success');
                // Update the image source to the new image with removed background
                document.querySelector(`img[data-image-path="${currentImagePath}"]`).src = `/images/${data.new_image_path}`;
            } else {
                showAlert('Failed to remove background.', 'error');
            }
        })
        .catch(err => {
            showAlert('Error occurred while removing background.', 'error');
        });
        contextMenu.style.display = 'none';
    });
});
