// PWA initialization script
document.addEventListener('DOMContentLoaded', function() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }

    // Add install prompt functionality
    let deferredPrompt;
    const installButton = document.createElement('button');
    installButton.classList.add('install-button');
    installButton.textContent = 'نصب اپلیکیشن';
    installButton.style.display = 'none';
    
    // Add the install button to the DOM
    document.querySelector('.container').prepend(installButton);

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show the install button
        installButton.style.display = 'block';
    });

    // Install button click handler
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // Clear the saved prompt since it can't be used again
        deferredPrompt = null;
        
        // Hide the install button
        installButton.style.display = 'none';
    });

    // Hide the install button when the app is installed
    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        installButton.style.display = 'none';
    });
});