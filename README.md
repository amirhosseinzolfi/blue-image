# AI Image Generator with Flask

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/flask-2.3.2-green)](https://palletsprojects.com/p/flask/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

## Overview

AI Image Generator is a Flask-powered web application for generating AI images with multiple models – from Hugging Face’s stable diffusion to DALL-E 3 (via a custom proxy) and g4f-supported models like Midjourney. Enjoy features such as background removal, smart prompt generation, and concurrent image creation.

## Key Features

- **Multi-Model Support**: Switch seamlessly between models like DALL-E 3, Midjourney, Flux, Stable Diffusion, and more.
- **Background Removal**: Easily remove image backgrounds using [rembg](https://github.com/danielgatis/rembg).
- **Dynamic Prompt Generation**: Choose from standard prompts, AI-generated variations, or creative note cover prompts.
- **Concurrent Processing**: Speed up image generation with parallel processing using ThreadPoolExecutor.
- **Persistent Storage**: Automatically save and display your generated images in a user-friendly grid.
- **Interactive UI**: Right-click options for downloading, copying prompts, and editing images on the fly.
- **Customizable Settings**: Save your preferences locally for models, sizes, and generation modes.

## Project Structure

```
├── static
│   ├── css
│   │   └── styles.css         # App styling
│   ├── js
│   │   └── scripts.js         # Client-side interactions & localStorage
│   └── images                 # Generated images
├── templates
│   └── index.html             # Main application template
├── app.py                     # Flask application
├── requirements.txt           # Python dependencies
├── LICENSE                    # Project license
└── README.md                  # Project documentation
```

## Installation

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/yourname/AI-Image-Generator.git
   cd AI-Image-Generator
   ```

2. **Set Up a Virtual Environment** (optional but recommended)  
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

## Configuration & Environment Variables

Adjust configuration either in the source code or by using environment variables. Key parameters include:
- **dify_api_url** and **dify_api_key** for external prompt generation.
- **Custom API keys** for OpenAI and Hugging Face.

For a production setup, consider using a `.env` file with [python-dotenv](https://github.com/theskumar/python-dotenv).

## Usage

1. **Run the Application**  
   ```bash
   python app.py
   ```
   The app will start on [http://127.0.0.1:13300](http://127.0.0.1:13300).

2. **Generate Images**  
   - Enter a creative prompt.
   - Select a model, image count, and dimensions.
   - Choose a generation mode (Standard, Dify, AI Prompts, Note Cover).
   - Click "Generate" and watch your images get created!

3. **Interact with Your Images**  
   - Left-click for a full preview.
   - Right-click for a context menu to download, copy the prompt, or remove the background.

## Troubleshooting

- **Module Not Found**: Ensure all dependencies in `requirements.txt` are installed.
- **API Errors**: Verify your API keys and endpoints; check for typos in configurations.
- **Permission Issues**: Adjust file and folder permissions if images cannot be saved.

## FAQ

**Can I deploy this app remotely?**  
Yes, the application can be deployed on any cloud or VM service that supports Python and Flask.

**How do I scale image generation?**  
Consider using container orchestration with Docker and Gunicorn for handling multiple requests.

**What if I need custom prompts?**  
Use the "Various AI Prompts" mode to generate multiple creative prompts for your images.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your improvements.

## License

Distributed under the MIT License. See `LICENSE` for details.

