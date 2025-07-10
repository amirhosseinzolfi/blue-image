# PWA Implementation Guide

This web application has been configured as a Progressive Web App (PWA), which allows users to install it on their Android devices and use it like a native app.

## What's been added

1. **manifest.json** - Defines how the app appears when installed on a device
2. **service-worker.js** - Enables offline functionality and caching
3. **pwa-init.js** - Handles service worker registration and installation prompts
4. **pwa.css** - Styles for PWA-specific elements
5. **Meta tags** - Added to index.html for PWA support

## Required Icons

You need to create icons in the following sizes and place them in the `/static/icons/` directory:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

You can use an online tool like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) to create these icons from a single image.

## Testing the PWA

1. Deploy your application to a web server with HTTPS (required for PWAs)
2. Open the website in Chrome on an Android device
3. You should see an "Add to Home Screen" banner or an install button in the app
4. Click it to install the app on your device

## Customization

- Edit the `manifest.json` file to change the app name, colors, and other properties
- Modify the `service-worker.js` file to adjust caching strategies
- Update the splash screen in `index.html` to match your branding

## Troubleshooting

If the PWA installation option doesn't appear:
- Make sure you're using HTTPS
- Verify that all required icons are available
- Check the browser console for any errors related to the service worker or manifest
- Use Chrome's Lighthouse tool to audit your PWA implementation

## Further Improvements

- Add push notifications
- Implement background sync
- Enhance offline capabilities
- Add more advanced caching strategies