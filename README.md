
# AI Image Generator with Flask

Hey there! This project is a Flask-powered web app for generating AI images. It supports a variety of models (through `Hugging Face`, OpenAI’s `DALL-E 3` proxy, or `g4f` models like Midjourney, flux, etc.) and includes extra features like background removal, prompt generation, concurrency, and storing your preferences locally.

**Why is it cool?**  
- Type in your prompt and generate images right in your browser.  
- Switch between multiple models on the fly.  
- Remove backgrounds from existing images using `rembg`.  
- Generate multiple images per prompt and store them in a grid view.  
- Built-in concurrency for faster generation when using multiple prompts.  
- Grab new prompts from external APIs or have the AI come up with 5 variations (yay creativity!).  
- Saves your generated images so you can easily browse them in the future.

---

## Table of Contents

- [AI Image Generator with Flask](#ai-image-generator-with-flask)
  - [Table of Contents](#table-of-contents)
  - [Project Features](#project-features)
  - [Project Structure](#project-structure)
  - [Installation and Setup](#installation-and-setup)
  - [Configuration \& Environment Variables](#configuration--environment-variables)
  - [Usage Guide](#usage-guide)
  - [Additional Features](#additional-features)
  - [Troubleshooting \& Common Issues](#troubleshooting--common-issues)
  - [FAQ](#faq)

---

## Project Features

1. **Multi-Model Support**  
   - Supports a bunch of text-to-image models: from Hugging Face’s stable diffusion variations, flux, midjourney (via `g4f`), to a custom base URL for DALL-E 3 calls.

2. **Background Removal**  
   - Quickly remove backgrounds from generated images or any local images with a single click (thanks to `rembg`).

3. **Different Prompt Modes**  
   - **Standard**: Uses your exact prompt.  
   - **Using Dify**: Calls a Dify API to generate creative prompts.  
   - **Image Variation**: Appends “variation 1, 2…” etc. to your prompt.  
   - **Various AI Prompts**: Generates 5 different prompts automatically via `g4f`.

4. **Concurrent Generation**  
   - Prompts can be processed in parallel for speed, using `ThreadPoolExecutor`.

5. **Local Image Storage**  
   - All images are saved in the `static/images` folder and conveniently listed on the home page in descending order (newest first).

6. **UI Goodies**  
   - Right-click context menu on each image for quick actions (download, copy prompt, remove background).  
   - Built-in preference storage (localStorage) so you don’t have to keep re-entering your chosen model, size, or mode.  
   - Hover tooltips showing the prompt for each generated image.

---

## Project Structure

```
├── static
│   ├── css
│   │   └── styles.css        # All the styling for the app
│   ├── js
│   │   └── scripts.js        # Handles modals, context menus, localStorage, etc.
│   └── images                # Directory for storing the generated images
├── templates
│   └── index.html            # Main HTML page rendered by Flask
├── app.py                    # Our main Flask application with all routes
├── requirements.txt          # All Python dependencies
├── LICENSE                   # (Optional) You can include a license here
└── README.md                 # You're reading this right now!
```

---

## Installation and Setup

1. **Clone the repo** or download it as a ZIP.  
   ```bash
   git clone https://github.com/yourname/AI-Image-Generator.git
   cd AI-Image-Generator
   ```
2. **Create a virtual environment (optional but recommended)**  
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```
3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```
4. **Check or Update environment variables** (if using external APIs). By default, some sample keys are in `app.py`, but you might want to replace them with your own. See the [Configuration](#configuration--environment-variables) section for details.

5. **Run the Flask app**  
   ```bash
   python app.py
   ```
   This will spin up a web server on **http://127.0.0.1:13300**.  
   Open that in your browser and start generating images.

---

## Configuration & Environment Variables

A few environment variables or code constants might need adjusting if you’re hooking up real keys:

- **`dify_api_url`**: Where the Dify API lives. Default is something like `http://localhost/v1/workflows/run`.
- **`dify_api_key`**: The API key to call Dify endpoints.  
- **`fresed-20D08BG9uGitZJLn09Rg5VrNjUk3FN`**: Example key for calling DALL-E 3 via custom base URL (`fresedgpt.space`). This obviously won’t work for production unless you have a valid key.
- **`g4f_client`**: If you have a custom setup for `g4f`, you can configure it accordingly.

You can set them up in the code directly or use environment variables (like with a `.env` file + `python-dotenv`, if you want). If you’re just experimenting locally, the defaults might be good enough.

---

## Usage Guide

1. **Open the interface**  
   Go to http://127.0.0.1:13300 in your browser (or the IP/port you specified).

2. **Enter a prompt**  
   For example, “A purple robotic cat floating in space, cartoon style”.

3. **Choose your Model**  
   - `dall-e-3` (through g4f or the custom proxy in `app.py`)  
   - `midjourney` (again, through g4f)  
   - `flux`, `sdxl`, `sd-xl-lora`, and other variants from the dropdown.  
   - Or a Hugging Face model like `stabilityai/stable-diffusion-2-1-base`.

4. **Select the Number of Images, Width, and Height**  
   - `num_images`: 1, 2, 3, or up to 10.  
   - `width` & `height`: in multiples of 64, e.g., 512×512 or 1024×768.  

5. **Choose the Generation Mode**  
   - **Standard**: Uses exactly your prompt.  
   - **Dify**: Calls your Dify API to get a curated list of prompts.  
   - **Image Variation**: Appends "variation 1, 2, etc.” to your prompt.  
   - **Various AI Prompts**: Asks g4f to produce 5 unique prompts for your description.

6. **Hit “Generate”**  
   - The app might show a quick “Processing Images...” alert, then refresh with your new images.  
   - Scroll down to see the newly generated images. They appear in a grid with the newest ones at the top.

7. **Interact with Images**  
   - **Left-click**: Opens a bigger preview in a modal.  
   - **Right-click** (desktop) / hold-press (mobile): Brings up a context menu with:
     - **Download**: Saves the image to your computer.  
     - **Copy Prompt**: Copies the associated prompt to your clipboard.  
     - **Remove Background**: Uses `rembg` to remove the background and saves a separate `_no_bg.png` version.

---

## Additional Features

1. **Concurrency**  
   - The code uses `concurrent.futures.ThreadPoolExecutor` so multiple prompts can be processed faster. This is super helpful if you pass multiple items to generate at once.

2. **Previous Images**  
   - On startup or refresh, the app looks inside `static/images` for all previously generated images and displays them. So if you relaunch or refresh, your older images don’t vanish.

3. **Prompt Parsing**  
   - If using Dify, the code tries to parse JSON from that API. If it fails, it gracefully handles it.  
   - If using `Various AI Prompts`, it uses g4f to try generating a JSON with five prompts. If that fails, it splits the lines so you at least get something.

4. **Preference Memory**  
   - Your selected model, number of images, dimensions, and generation mode are remembered in your browser’s localStorage. So if you come back later, your settings are still there.

---

## Troubleshooting & Common Issues

1. **g4f not found on PyPI**  
   - The `g4f` library is sometimes installed via GitHub or a custom source. If you see errors like _“No module named g4f”_, check their GitHub page or documentation on how to install it properly.

2. **API Keys or Endpoints Not Working**  
   - If you’re trying to use Dify or a custom DALL-E 3 URL and get errors, make sure your base URL and API keys are correct in `app.py`.  
   - Check your logs in the terminal. If the key is invalid, the request might fail or return a 401/403 error.

3. **Large Images / Timeouts**  
   - Some models might take longer for higher resolutions or bigger batch sizes. If your server times out, you can tweak Flask’s config or try smaller images.

4. **Background Removal Errors**  
   - The `rembg` library may fail on certain image formats or corrupted images. Double-check that your generated image is valid. Also confirm that `rembg` is installed properly (`pip install rembg`).

5. **Permission Issues (on Linux/Mac)**  
   - If you see “Permission denied” or can’t save images into `static/images`, ensure that folder has correct read/write permissions.

---

## FAQ

**Q:** **Can I run this on a remote server?**  
**A:** Absolutely. You can deploy it on any VM or hosting that supports Flask. Just forward port `13300` (or whichever you pick). For production, you might want to use gunicorn, etc.

**Q:** **What about Docker?**  
**A:** Yes, you can containerize it. Just create a Dockerfile with `FROM python:3.X`, copy your files, install the requirements, and set the container to run `python app.py`. Expose the needed port, done.

**Q:** **Is there a limit to how many images I can create?**  
**A:** Technically no, but keep in mind your disk space. The images can pile up in `static/images`.

**Q:** **How do I get more advanced prompts, like controlling camera angles or styles?**  
**A:** Just type them in your prompt! Or let the AI generate them using the “Various AI Prompts” mode. If your chosen model supports a wide variety of keywords (like midjourney or stable diffusion), you can go crazy.

