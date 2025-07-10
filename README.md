# AI Image Generator with Flask

[![Python Version](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/Flask-2.3.2-green)](https://palletsprojects.com/p/flask/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)

---

<p align="center">
  <img src="documents/screenshot_main_grid.png" alt="Main UI Grid" width="600"/>
</p>

---

## Live Demo

**Try it now:**  
👉 [http://141.98.210.149:15303/](http://141.98.210.149:15303/)

---

## Overview

**AI Image Generator with Flask** is a powerful, extensible web application for generating, customizing, and managing AI-created images. It supports multiple state-of-the-art AI models (including DALL-E 3, Midjourney, Stable Diffusion, and more via g4f and Hugging Face), and provides advanced features such as background removal, dynamic prompt engineering, concurrent processing, and real-time task management.

This project is ideal for artists, developers, educators, and anyone interested in exploring or building on top of AI-powered image generation.

---

## Features

- **Multi-Model Support**  
  - DALL-E 3 (via custom proxy)
  - Midjourney, Flux, SDXL, and more (via g4f)
  - Hugging Face models (e.g., Stable Diffusion, ControlNet, DeepFloyd IF, Animagine XL)
- **Prompt Engineering Modes**  
  - Standard: Use your prompt as-is
  - AI Prompts: Generate creative prompt variations using LLMs
  - Note Cover: Specialized prompts for visually appealing note covers
  - Bulk: Generate images for multiple prompts at once
  - Chat: Interactive, context-aware prompt generation using LangChain

<p align="center">
  <img src="documents/screenshot_settings.png" alt="Settings and Prompt Modes" width="400"/>
</p>

- **Background Removal**  
  - Remove backgrounds from generated or uploaded images using [rembg](https://github.com/danielgatis/rembg)
- **Concurrent Processing**  
  - Efficiently generate multiple images/prompts in parallel using Python’s `ThreadPoolExecutor`
- **Task Queue & Real-Time Updates**  
  - Robust queue system for managing image generation tasks
  - Real-time status updates and notifications via Socket.IO
- **Persistent Local Storage**  
  - All generated images are stored locally and displayed in a responsive grid
- **User-Friendly Interface**  
  - Modern, RTL-friendly UI with context menus, modals, and preference saving
  - Drag-and-drop or multi-file image upload
- **Extensible Backend**  
  - Modular codebase with clear separation (Flask app, chat module, g4f proxy, etc.)
  - Easily add new models, prompt modes, or integrations

---

## Screenshots

### Main Gallery View

<p align="center">
  <img src="documents/screenshot_main_grid.png" alt="Main Gallery" width="600"/>
</p>

### Chat Mode (Conversational Prompting)

<p align="center">
  <img src="documents/screenshot_chat_sketch.png" alt="Chat Mode - Sketch" width="500"/>
  <br>
  <img src="documents/screenshot_chat_teacup.png" alt="Chat Mode - Teacup" width="500"/>
</p>

### Image Preview Modal

<p align="center">
  <img src="documents/screenshot_modal.png" alt="Image Modal Preview" width="600"/>
</p>

---

## Architecture

```
├── app.py                      # Main Flask application (API endpoints, task queue, image generation)
├── chat.py                     # LangChain-based chat/conversation module for prompt engineering
├── templates/
│   ├── index.html              # Main UI template
│   └── chat_bot.py             # FastAPI g4f proxy server (OpenAI-compatible API)
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── scripts.js
│   └── images/                 # All generated and uploaded images
├── requirements.txt            # Python dependencies
├── LICENSE
└── README.md                   # This file
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourname/AI-Image-Generator.git
cd AI-Image-Generator
```

### 2. Set Up a Virtual Environment (Recommended)

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. (Optional) Configure Environment Variables

You can use a `.env` file for API keys and custom endpoints (see [python-dotenv](https://github.com/theskumar/python-dotenv)).

---

## Configuration

- **Model Endpoints & API Keys**:  
  - `OPENAI_API_KEY`, `DIFY_API_KEY`, etc. can be set in `.env` or directly in `app.py`
- **g4f Proxy**:  
  - The app uses a FastAPI-based proxy (`templates/chat_bot.py`) to provide an OpenAI-compatible API for g4f models on port 15206.
- **Image Storage**:  
  - All images are saved in the `static/images/` directory by default.

---

## Usage

### 1. Start the g4f Proxy Server

The Flask app will attempt to start the g4f proxy automatically. If you want to run it manually:

```bash
python templates/chat_bot.py
```

### 2. Run the Flask Application

```bash
python app.py
```

The server will start at [http://127.0.0.1:15303](http://127.0.0.1:15303)  
or use the public demo: [http://141.98.210.149:15303/](http://141.98.210.149:15303/)

### 3. Generate Images

- Enter your prompt (in Persian or English)
- Select the AI model and generation mode
- Adjust image count and dimensions as needed
- Click "تصورش کن" (Imagine it!) to generate images

### 4. Interact with Images

- **Preview**: Click to enlarge
- **Context Menu**: Right-click for download, copy prompt, remove background, or delete
- **Upload**: Use the upload button to add your own images

---

## Advanced Features

- **Bulk Generation**:  
  Enter multiple prompts separated by semicolons for batch processing.
- **AI Prompt Modes**:  
  Use "هوشمند" (AI Prompts), "طرح جلد یادداشت" (Note Cover), or "حالت گفتگو" (Chat) for advanced prompt engineering.
- **LangChain Chat Integration**:  
  The chat mode leverages LangChain for context-aware, conversational prompt generation.
- **Task Queue**:  
  Multiple users/tasks are handled concurrently with real-time progress updates.

---

## Customization & Extensibility

- **Add New Models**:  
  Extend the model dropdown in `index.html` and update backend logic in `app.py` as needed.
- **Integrate New Prompt Modes**:  
  Add new prompt templates and handler functions in `app.py` and `chat.py`.
- **UI/UX**:  
  Modify `static/css/styles.css` and `templates/index.html` for custom branding or layout.

---

## Troubleshooting

- **Missing Dependencies**:  
  Ensure all packages in `requirements.txt` are installed.
- **API/Network Issues**:  
  Check your API keys, endpoints, and network connectivity.
- **File Permissions**:  
  Ensure the `images` directory is writable.
- **g4f Proxy Not Running**:  
  Make sure the proxy server is running on port 15206.
- **LangChain Import Errors**:  
  Use compatible versions of `langchain` and `langchain-openai` as specified in `requirements.txt`.

---

## FAQ

**Q:** Can I use this app in production?  
**A:** Yes, but for production deployments, use a WSGI server (e.g., Gunicorn) and a reverse proxy (e.g., Nginx). Secure your API keys and endpoints.

**Q:** What models are supported?  
**A:** DALL-E 3, Midjourney, Flux, SDXL, Stable Diffusion, and any g4f/Hugging Face compatible models.

**Q:** Can I generate prompts in Persian?  
**A:** Yes, the app will translate and optimize Persian prompts automatically.

**Q:** How does the chat mode work?  
**A:** Chat mode uses LangChain to maintain conversation context and generate highly optimized prompts interactively.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with a clear description

For major changes, open an issue first to discuss your ideas.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [g4f Project](https://github.com/xtekky/gpt4free)
- [RemBg](https://github.com/danielgatis/rembg)
- [Hugging Face](https://huggingface.co/)
- [Socket.IO](https://socket.io/)

---

Enjoy exploring and building with AI-powered image generation!

