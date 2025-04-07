# AI Image Generator with Flask

[![Python Version](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/Flask-2.3.2-green)](https://palletsprojects.com/p/flask/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)

---

## Overview

**AI Image Generator with Flask** is a full-featured web application that uses Flask to let you generate, customize, and manage AI-created images. The app leverages multiple AI models (including Hugging Face's Stable Diffusion, DALL-E 3 via a custom proxy, and g4f-supported methods like Midjourney) and integrates additional functionalities like background removal, dynamic prompt creation, and concurrent processing.

Whether you are an artist, developer, or enthusiast, this app offers a user-friendly interface to experiment with cutting-edge AI image generation.

---

## Key Features

- **Multi-Model Support**:  
  Switch effortlessly between multiple image generation models:
  - DALL-E 3 (custom API proxy)
  - Midjourney, Flux, SD variations (via g4f)
  - Stable Diffusion (Hugging Face based)
  
- **Background Removal**:  
  Instantly remove image backgrounds using the [rembg](https://github.com/danielgatis/rembg) tool.

- **Dynamic & Intelligent Prompt Generation**:  
  Generate prompts in various modes:
  - **Standard**: Uses your provided prompt verbatim.
  - **Dify Mode**: Fetch creative alternative prompts via a remote Dify API.
  - **AI Prompts**: Utilize g4f to generate multiple creative variations.
  - **Note Cover**: Produce optimized prompts for creating visually striking note covers.

- **Concurrent Processing**:  
  Boost performance by processing multiple prompts in parallel using Python’s ThreadPoolExecutor.

- **Persistent Local Storage**:  
  Automatically store generated images locally and display them in a neatly arranged grid view. Previous images reload on app restart.

- **Interactive User Interface**:  
  Enjoy features such as:
  - Right-click context menus for downloading images, copying prompts, and removing backgrounds.
  - LocalStorage-based preference saving for models, image dimensions, and generation modes.

- **Detailed Task Management and Logging**:  
  Real-time updates on generation status, task queues, and logging with visually enhanced output via Rich.

---

## Project Structure

```
├── static
│   ├── css
│   │   └── styles.css         # Custom app styling (UI/UX enhancements)
│   ├── js
│   │   └── scripts.js         # Client-side scripts for modals, context menus, and settings
│   └── images                 # Directory for all generated images
├── templates
│   └── index.html             # Main HTML template rendered by Flask
├── app.py                     # Main Flask application with API endpoints and task queue processing
├── requirements.txt           # Essential Python dependencies
├── LICENSE                    # Project license (MIT)
└── README.md                  # Project documentation (you are reading this!)
```

---

## Installation

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/yourname/AI-Image-Generator.git
   cd AI-Image-Generator
   ```
   
2. **Prepare a Virtual Environment** (recommended)  
   ```bash
   python -m venv venv
   source venv/bin/activate  # For Windows: venv\Scripts\activate
   ```
   
3. **Install Dependencies**  
   ```bash
   pip install -r requirements.txt
   ```
   
4. **(Optional) Configure Environment Variables**  
   Set up a `.env` file with your API keys and custom endpoints (e.g., `DIFY_API_URL`, `DIFY_API_KEY`, `OPENAI_API_KEY`) using [python-dotenv](https://github.com/theskumar/python-dotenv).  
   ```bash
   pip install python-dotenv
   ```

---

## Configuration & Environment Variables

Modify configuration settings directly in the source or set them as environment variables. Key configurations include:

- **dify_api_url** and **dify_api_key**:  
  Used for generating alternative creative prompts via Dify.

- **Custom API Keys** for:
  - OpenAI (for DALL-E 3 interactions)
  - Hugging Face (for Stable Diffusion and other models)

For production, it is highly recommended to externalize sensitive configurations using environment variables.

---

## Usage

1. **Run the Application**  
   ```bash
   python app.py
   ```
   The server will launch at [http://127.0.0.1:13300](http://127.0.0.1:13300).

2. **Generate Your Images**  
   - **Input Prompt**: Type your creative prompt (e.g., "A futuristic cityscape at sunset").
   - **Select a Model**: Choose from the dropdown (e.g., DALL-E 3, Midjourney, Stable Diffusion).
   - **Set Image Parameters**: Define image count, dimensions (e.g., 512×512), etc.
   - **Choose Generation Mode**:  
     - Standard, Dify (for creative alternative prompts), Various AI Prompts, or Note Cover.
   - **Click Generate**: Watch as the app processes your request and displays the resulting images.

3. **Image Interaction**  
   - **Preview**: Click on an image for a larger view.
   - **Context Menu Actions**: Right-click an image to download, copy its prompt, or trigger background removal.

4. **Real-Time Task Updates**  
   The app employs a task queue system to manage image generation; you will receive real-time status updates via web notifications on progress and task completion.

---

## Advanced Usage

- **Bulk Generation**:  
  Input multiple semicolon-separated prompts to initiate bulk image generation.

- **Custom Prompt Generation**:  
  Utilize the AI-driven prompt generators (for both standard images and note covers) to explore creative directions without manually refining your prompt.

- **Integration with External Services**:  
  Leverage integrated APIs to extend functionality—ideal for artists and developers aiming to build on top of AI-generated imagery.

- **Scalability Options**:  
  Deploy the app using a WSGI server (like Gunicorn) behind a reverse proxy to scale for production use.

---

## Troubleshooting

- **Dependency Issues**:  
  Ensure all packages from `requirements.txt` are installed correctly. Use `pip freeze` to verify installations.

- **API/Endpoint Errors**:  
  Double-check your API keys, endpoints, and network connectivity. Consult logs (displayed in the console with Rich formatting) for detailed error messages.

- **File Permission Problems**:  
  Verify that the `images` folder has proper read/write permissions, especially on Linux/macOS systems.

- **Performance Hurdles**:  
  Consider reducing image resolutions or using smaller batch sizes if experiencing slow generation or timeouts.

---

## Frequently Asked Questions (FAQ)

**Q:** Can I deploy the app on a cloud server?  
**A:** Yes, it can run on any server with Python and Flask support. For production, configure it with Gunicorn and a reverse proxy like Nginx.

**Q:** What image models are supported out-of-the-box?  
**A:** The app supports multiple models via APIs—DALL-E 3, Midjourney (via g4f), Flux, and various Hugging Face models.

**Q:** How is prompt generation handled?  
**A:** You can use predefined modes that either use your raw prompt or generate creative alternatives using AI services and external APIs.

**Q:** Is concurrent processing implemented?  
**A:** Yes, the app utilizes Python's concurrent.futures for parallel image generation, ensuring efficient handling of multi-prompt requests.

---

## Contributing

Contributions and suggestions are highly welcome! If you would like to improve the project:
- Fork the repository.
- Create a new branch for your feature/bug fix.
- Submit a pull request with a detailed explanation of your changes.

For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is distributed under the MIT License. See the [LICENSE](./LICENSE) file for complete details.

---

## Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Hugging Face API](https://huggingface.co/)
- [RemBg GitHub](https://github.com/danielgatis/rembg)
- [g4f Documentation](https://github.com/)

Enjoy exploring the future of AI image generation!

