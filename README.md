
# AI Image Generator with Flask

Hey there! This project is basically a Flask web app that lets you generate images using a bunch of different AI models. You can type in prompts, pick your favorite model, and get a cool image back—**all in your browser**.

It also has some neat extras, like:
- Removing the background of an existing image (using `rembg`).
- Generating variations of your prompts.
- Pulling prompts from external APIs (`Dify` or our built-in `g4f` prompt generator).
- Storing and displaying previously generated images.
- A handy context menu for each image (like copying the prompt, downloading, or removing the background).
- Storing your preferences (model, image size, etc.) so you don’t have to keep re-entering them.

## Table of Contents
- [AI Image Generator with Flask](#ai-image-generator-with-flask)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Requirements](#requirements)
  - [Installation and Setup](#installation-and-setup)
  - [Running the App](#running-the-app)
  - [Usage](#usage)
    - [Interacting with Images](#interacting-with-images)
  - [Notes and Tips](#notes-and-tips)
  - [License](#license)

---

## Project Structure

Here's a quick look at how the project’s files are organized:

```
.
├── static
│   ├── css
│   │   └── styles.css         # The main CSS for our frontend
│   ├── js
│   │   └── scripts.js         # JavaScript for the UI (modal, context menu, etc.)
│   └── images                 # This folder will hold any generated images
├── templates
│   └── index.html             # The main HTML template for our app
├── app.py                     # The main Flask application
├── requirements.txt           # All the Python libraries we need
├── LICENSE                    # (Optional) A license file
└── README.md                  # You are reading this right now
```

---

## Requirements

You’ll need Python 3.7+ (or higher). The main Python libraries are:

- **Flask** for the web server
- **requests** for making HTTP calls
- **Pillow (PIL)** for image handling
- **rembg** for background removal
- **huggingface_hub** for HF model inference
- **openai** for the DALL-E 3 calls (through a custom base URL)
- **g4f** for alternative text-to-image models
- plus a few built-in Python modules like `os`, `json`, `logging`, etc.

A full list is in `requirements.txt`.

---

## Installation and Setup

1. **Clone or download** this repo.
2. Open a terminal in the project folder (where `app.py` is).
3. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate   # or venv\Scripts\activate on Windows
   ```
4. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. (Optional) If you have any environment-specific API keys (like Dify or custom LLM keys), you can set them up in the code or as environment variables. By default, some sample keys are placed in `app.py`.

---

## Running the App

After installing everything, you can fire up the Flask server by doing:
```bash
python app.py
```

This starts your local web server at **http://127.0.0.1:13300**. Pop that address into your browser, and you’ll see the AI Image Generator interface.

---

## Usage

1. **Type** in your prompt in the text box at the top (something like: "a futuristic city with neon lights at night").
2. **Pick** a model from the dropdown. You can try `dall-e-3`, `midjourney`, `flux`, or the default `Stable Diffusion 2.1 Base` from Hugging Face, etc.
3. **Adjust** the number of images, width, and height.  
   - For example, set `num_images = 2` to generate two images for the same prompt.
   - Adjust the size to something like 768x768 if you want square images.
4. **Select** the generation mode:
   - `Standard` just uses your prompt directly.
   - `Using Dify` tries to fetch prompt ideas from a Dify API (if configured).
   - `Image Variation` appends "variation 1, 2..." etc. to your prompt.
   - `Various AI Prompts` tries to generate five unique prompts for your given idea using `g4f` chat.
5. **Hit Generate**. The page will refresh after a short wait, and your newly created images will appear at the bottom.

### Interacting with Images
- **Click** an image to see it in a larger modal window.
- **Right-click** (or long-press, on mobile) to open the context menu with these options:
  1. **Download** the image to your device.
  2. **Copy Prompt** to your clipboard.
  3. **Remove Background** using `rembg`.

---

## Notes and Tips

- All generated images are saved in `static/images`. They’ll remain there unless you manually remove them.
- If you generate a bunch of images, you can scroll through them in the grid. The newest are shown first.
- Some models (like `dall-e-3` or `flux`) may need special keys or might not work if your environment is not properly set up. If that happens, check your credentials or code in `app.py`.
- The background removal feature saves the new image as a `.png` file with `_no_bg.png` appended to the original image filename. It also shows up in the grid with the updated preview.

---

## License

This project is under the [MIT License](./LICENSE) if you choose to add the included file. Feel free to use it, modify it, and share it.

---
```

---

## **requirements.txt**

```txt
Flask==2.3.3
requests==2.31.0
Pillow==9.5.0
rembg==2.0.32
huggingface_hub==0.17.3
openai==0.27.8
# g4f is not officially on PyPI at the moment; 
# you might need to install it from its GitHub or a custom repository.
# If you do have it, specify the version or 
# just add the line below (knowing you have to fetch it another way):
g4f
```

*(You might have to install `g4f` from GitHub or a local file, depending on how you set it up. If you encounter errors about `g4f`, look up their docs or GitHub page for installation info.)*

---

