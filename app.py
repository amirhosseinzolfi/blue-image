from flask import Flask, render_template, request, send_file, send_from_directory, jsonify, session, redirect, url_for
from flask_socketio import SocketIO, emit
from rembg import remove
from PIL import Image
import os
import requests
import json
import random
import re
import concurrent.futures
import logging
from huggingface_hub import InferenceClient
from g4f.client import Client
from openai import OpenAI
from werkzeug.serving import WSGIRequestHandler
from werkzeug.utils import secure_filename
import imghdr
import time
import uuid
import queue
import threading
# Import rich for beautiful console output
from rich.console import Console
from rich.logging import RichHandler

app = Flask(__name__)
app.secret_key = "change_this_secret_key"  # Needed for session usage
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Create a task queue for image generation
task_queue = queue.Queue()
# Track active generation tasks and users
active_tasks = {}
task_status = {}
total_queued_images = 0

# Continue with existing client setup
client = InferenceClient()
dify_api_url = "http://localhost/v1/workflows/run"
dify_api_key = "app-KTzRHpWPjGuTeaX967geUAfx"
dalle_client = OpenAI(base_url='https://fresedgpt.space/v1', api_key='fresed-20D08BG9uGitZJLn09Rg5VrNjUk3FN')
g4f_client = Client()

# Set up rich console
console = Console()

# Configure logging with rich
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True, console=console, show_path=False)]
)
logger = logging.getLogger("image-generator")

# Increase server timeout
WSGIRequestHandler.protocol_version = "HTTP/1.1"

# Add request timeout configuration
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour session lifetime

# Add timeout to requests
REQUESTS_TIMEOUT = 30  # 30 seconds timeout for external requests

# Add allowed image types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def log_message(message, level="info", category=None, **kwargs):
    """Log a message with rich formatting and optional metadata"""
    if category:
        message = f"[bold cyan]{category.upper()}:[/bold cyan] {message}"
    
    log_func = getattr(logger, level)
    log_func(message, extra={"markup": True, **kwargs})
    
    # Add visual separator for major events
    if kwargs.get("important"):
        console.rule(style="dim")

def log_generation_start(prompt, model, task_id=None):
    """Log the start of image generation with details"""
    task_info = f"[magenta](Task: {task_id[:8]}...)[/magenta]" if task_id else ""
    log_message(
        f"Generating image with [yellow]{model}[/yellow] {task_info}",
        category="generation", 
    )
    log_message(f"Prompt: [italic]\"{prompt}\"[/italic]", level="debug", category="prompt")

def log_generation_complete(filename, elapsed=None):
    """Log successful image generation"""
    time_info = f" [green]({elapsed:.2f}s)[/green]" if elapsed else ""
    log_message(
        f"Image saved: [blue]{os.path.basename(filename)}[/blue]{time_info}", 
        category="generation"
    )

def generate_image_dalle(prompt, index, folder_path, image_number, task_id=None):
    start_time = time.time()
    log_generation_start(prompt, "DALL-E 3", task_id)
    
    response = dalle_client.images.generate(
        model="dall-e-3", 
        prompt=prompt, 
        size="1024x768",
        timeout=REQUESTS_TIMEOUT
    )
    
    image_url = response.data[0].url
    saved_path = save_image_from_url(image_url, prompt, index, folder_path, "dalle", image_number)
    
    elapsed = time.time() - start_time
    log_generation_complete(saved_path, elapsed)
    
    # Emit result if task_id is provided
    if task_id and saved_path:
        relative_path = os.path.relpath(saved_path, os.path.join(app.root_path, 'images')).replace('\\', '/')
        socketio.emit('image_generated', {
            'task_id': task_id,
            'prompt': prompt,
            'image_path': relative_path,
            'download_path': relative_path,
            'model': "dalle"  # Include model info
        })
    
    return saved_path

def generate_image_g4f(prompt, index, folder_path, model, image_number, width, height, task_id=None):
    start_time = time.time()
    log_generation_start(prompt, model, task_id)
    
    response = g4f_client.images.generate(
        model=model, 
        prompt=prompt, 
        response_format="url", 
        width=width, 
        height=height,
        timeout=REQUESTS_TIMEOUT
    )
    
    image_url = response.data[0].url
    saved_path = save_image_from_url(image_url, prompt, index, folder_path, model, image_number)
    
    elapsed = time.time() - start_time
    log_generation_complete(saved_path, elapsed)
    
    # Emit result if task_id is provided
    if task_id and saved_path:
        relative_path = os.path.relpath(saved_path, os.path.join(app.root_path, 'images')).replace('\\', '/')
        socketio.emit('image_generated', {
            'task_id': task_id,
            'prompt': prompt,
            'image_path': relative_path,
            'download_path': relative_path,
            'model': model  # Include model info
        })
    
    return saved_path

def sanitize_filename(text, max_length=70):
    """
    Sanitize text to be used as a filename by:
    1. Removing invalid characters
    2. Replacing separators with underscores
    3. Truncating to max_length
    """
    # Remove invalid filename characters
    text = re.sub(r'[\\/*?:"<>|]', '', text)
    # Replace sequences of spaces, commas and other separators with a single underscore
    text = re.sub(r'[\s,;.]+', '_', text)
    # Remove any other non-alphanumeric characters except underscores and hyphens
    text = re.sub(r'[^\w-]', '', text)
    # Truncate to max_length characters
    if len(text) > max_length:
        text = text[:max_length]
    # Ensure the filename doesn't end with an underscore or hyphen
    text = text.rstrip('_-')
    # If somehow the filename is empty, use a default
    if not text:
        text = "image"
    return text

def save_image_from_url(image_url, prompt, index, folder_path, model, image_number):
    """Download an image from URL and save it with a sanitized filename"""
    log_message(f"Downloading image from external source", category="download")
    
    image_response = requests.get(image_url, timeout=REQUESTS_TIMEOUT)
    
    # Sanitize the prompt for use in filename and truncate it to avoid path length issues
    sanitized_prompt = sanitize_filename(prompt)
    base_filename = f"{sanitized_prompt}_{index+1}_{model}_{image_number}.jpeg"
    image_filename = os.path.join(folder_path, base_filename)
    
    # Check if the file already exists and add a prefix if it does
    if os.path.exists(image_filename):
        prefix = 1
        while os.path.exists(os.path.join(folder_path, f"{prefix}_{base_filename}")):
            prefix += 1
        image_filename = os.path.join(folder_path, f"{prefix}_{base_filename}")
    
    with open(image_filename, 'wb') as f:
        f.write(image_response.content)
    
    log_message(f"Downloaded image saved: [blue]{os.path.basename(image_filename)}[/blue]", category="download")
    return image_filename

def generate_images_for_prompt(prompt, index, folder_path, model, num_images, width, height, task_id=None):
    images_filenames = []
    g4f_models = [
        "dall-e-3", "midjourney", "flux", "sdxl", "sdxl-lora", "sd-3", 
        "playground-v2.5", "flux-pro", "flux-dev", "flux-realism", 
        "flux-anime", "flux-3d", "flux-4o", "any-dark"
    ]
    if model in g4f_models:
        generate_func = generate_image_g4f
        for i in range(num_images):
            # Update task status before generation
            if task_id:
                update_task_status(task_id, f"Generating image {i+1}/{num_images} for: {prompt}")
            image_filename = generate_func(prompt, index, folder_path, model, i+1, width, height, task_id)
            images_filenames.append(image_filename)
    else:
        for i in range(num_images):
            unique_prompt = f"{prompt} variation {i+1}"
            seed = random.randint(1, 1000000)
            # Update task status before generation
            if task_id:
                update_task_status(task_id, f"Generating image {i+1}/{num_images} for: {unique_prompt}")
            log_message(f"Generating image with {model} for prompt: {unique_prompt} with seed: {seed}", category="generation")
            image = client.text_to_image(prompt=unique_prompt, model=model, height=height, width=width, seed=seed)
            image_filename = os.path.join(folder_path, f"{sanitize_folder_name(prompt)}_{index+1}_{model}_{i+1}.jpeg")
            image.save(image_filename, format='JPEG')
            log_message(f"Image saved as: {image_filename}", category="generation")
            images_filenames.append(image_filename)
            # Emit result immediately after generation
            if task_id:
                relative_path = os.path.relpath(image_filename, os.path.join(app.root_path, 'images')).replace('\\', '/')
                socketio.emit('image_generated', {
                    'task_id': task_id,
                    'prompt': unique_prompt,
                    'image_path': relative_path,
                    'download_path': relative_path,
                    'model': model  # Include model info
                })
    return images_filenames
                
def sanitize_folder_name(query):
    """Sanitize string for use as a folder name"""
    return sanitize_filename(query, max_length=100)

def create_folder(query):
    folder_path = os.path.join('images')
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    log_message(f"Using folder: {folder_path}", category="folder")
    return folder_path, 'images'

def get_dify_prompts(user_input):
    log_message(f"Fetching Dify prompts for input: {user_input}", category="dify")
    headers = {
        "Authorization": f"Bearer {dify_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "inputs": {
            "query": user_input
        },
        "response_mode": "blocking",
        "user": "abc-123"
    }
    response = requests.post(dify_api_url, headers=headers, json=data, timeout=REQUESTS_TIMEOUT)
    if response.status_code == 200:
        response_data = response.json()
        if response_data.get("data", {}).get("status") == "failed":
            log_message(f"Dify prompt generation failed: {response_data.get('data', {}).get('error', 'Unknown error')}", category="dify")
            return []
        outputs = response_data.get("data", {}).get("outputs", None)
        if outputs:
            text_output = outputs.get("text", "")
            return parse_dify_output(text_output)
    log_message("Failed to fetch Dify prompts", category="dify")
    return []

def parse_dify_output(text_output):
    try:
        parsed_output = json.loads(text_output)
        prompts = []
        if isinstance(parsed_output, dict):
            if 'answer' in parsed_output:
                for item in parsed_output['answer']:
                    prompt = item.get('prompt', '').strip()
                    if prompt:
                        prompts.append(prompt)
            else:
                for key in sorted(parsed_output.keys()):
                    prompt = parsed_output[key].strip()
                    if prompt:
                        prompts.append(prompt)
        elif isinstance(parsed_output, list):
            for item in parsed_output:
                prompt = item.get('prompt', '').strip()
                if prompt:
                    prompts.append(prompt)
        log_message(f"Parsed Dify prompts: {prompts}", category="dify")
        return prompts[:5]
    except json.JSONDecodeError:
        prompts = text_output.split('\n')
        prompts = [p.strip() for p in prompts if p.strip()]
        log_message(f"Parsed Dify prompts: {prompts}", category="dify")
        return prompts[:5]

def shorten_prompt(prompt):
    prompt_clean = re.sub(r'[^\w\s]', '', prompt)
    shortened_prompt = ' '.join(prompt_clean.split()[:5])
    return shortened_prompt[:30] + "..." if len(shortened_prompt) > 30 else shortened_prompt

import g4f
from g4f.client import Client
import json

def get_ai_prompts(user_input: str, num_prompts: int = 5) -> list:
    """Get image prompts from AI using G4F"""
    log_message(f"Getting {num_prompts} AI prompts for input: {user_input}", category="ai")
    chat_client = Client()
    
    system_message = r"""- you are an AI chat bot that generates creative and optimized and efficient image prompts based on analying carefully user input.
            - Your task is to generate creative image prompts based on the user's description.
    
            1. **Analyze the User's Description**  
            - Read and understand any user's text input describing the desired image and strategy.
            - Check what the user wants in their image (like colors, themes, mood, style, objects).
    
            2. **Generate Detailed Prompts**  
            - Generate the requested number of image prompts based on the user's needs and input.
            - Consider generating variety of prompts that are unique and covers all user needs.
            - Generate different aspects of the user input and generate prompts based on that.
            - Keep them short, clear, and focused on the key elements (style, colors, subject).
            - Each prompt must be a single concise sentence or phrase.
    
            3. **Output Only the JSON**  
            - Return the prompts in a JSON object with the structure:
                {
                "prompts": [
                    "prompt1",
                    "prompt2",
                    "prompt3",
                    ...etc. (matching the number requested)
                ]
                }
            - Don't include any extra text or formatting—just the JSON.
    
            4. **Maintain Consistency**  
            - Always ensure the prompts align with the user's request and need.
            - Make sure the prompts are creative and aren't similar to each other but match the user's details.
            - Avoid repeating the same words or phrases in multiple prompts.
            That's it. Stick to these steps and keep it simple!"""
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Generate {num_prompts} creative image prompts based on: {user_input}"}
    ]
    
    try:
        response = chat_client.chat.completions.create(
            messages=messages,
            model="gpt-4o"
        )
        ai_response = response.choices[0].message.content
        log_message(f"generated AI prompts: {ai_response}", category="ai")
        
        # Remove ```json and ``` if present
        if (ai_response.strip().startswith("```json") and ai_response.strip().endswith("```")):
            ai_response = ai_response.strip()[7:-3].strip()
        
        # Try to parse JSON response
        try:
            result = json.loads(ai_response)
            if isinstance(result, dict) and "prompts" in result:
                return result["prompts"][:num_prompts]  # Limit to requested number
        except json.JSONDecodeError:
            log_message(f"Failed to parse AI response as JSON: {ai_response}", category="ai")
            
        # Fallback: try to extract prompts from text response
        prompts = [line.strip() for line in ai_response.split('\n') if line.strip()]
        return prompts[:num_prompts]  # Limit to requested number
        
    except Exception as e:
        log_message(f"Error getting AI prompts: {e}", category="ai")
        return []

def get_note_cover_prompts(user_input: str, num_prompts: int = 5) -> list:
    """Get note cover image prompts from AI with specific instructions."""
    log_message(f"Getting {num_prompts} note cover prompts for input: {user_input}", category="note cover")
    chat_client = Client()
    
    system_message = f"""
        You are notes image cover generator, an AI assistant expert in crafting creative and efficient and optimized  prompts for ai image generators and Midjourney. When a user provides a topic and concept for a note cover image, your task is to generate {num_prompts} unique and optimized prompts. Ensure each prompt effectively incorporates main concepts and keywords of note topic.
        Uniqueness: Each of the {num_prompts} prompts must be unique and not similar to each other. Use different combinations, and interpretations of the user's input. Vary the artistic styles, settings, moods, and perspectives across the prompts to inspire diverse visual outcomes.
        Generate a **high-quality prompt** for creating a **minimal, modern, and 3D-style illustration cover image for a knowledge base note, as specified by the user. The cover image should be tailored to the note's concept which user gives. 
        1. **Note Concept**  
        Use the provided note concept as the basis for the visual concept in the prompt.

        2. **Design Requirements**  
        - **Style**: Minimal, modern, with 3D illustration effects.
        - **Theme**: The image should visually represent the core idea or focus of the note.
        - **Color Scheme**: based on the note concept and topic use a suitable and related mood and color theme and Use a clean, professional color palette that complements the modern aesthetic.
        - **Layout**: Maintain a balanced composition with a focus on simplicity and professionalism and conceptuality.
        Clarity and Conciseness: Keep each prompt clear, concise, and to the point. Aim for a length of one to two sentences per prompt.

        Midjourney Optimization: Structure the prompts in a way that Midjourney can easily interpret and utilize effectively. Avoid ambiguity and overly complex sentence structures.

        Formatting and Output: Return the generated prompts as a JSON object with the key "prompts" and an array of strings. Do not include any introductory or explanatory text. The output should strictly adhere to the following JSON format:

        {{
        "prompts": [
            "prompt1",
            "prompt2",
            "prompt3",
            ... (exactly {num_prompts} prompts)
        ]
        }}

        Avoid any repetitive phrases or design concepts across the prompts to ensure diversity. Your sole output should be the JSON object containing exactly {num_prompts} prompts."""

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Generate {num_prompts} creative note cover prompts based on: {user_input}"}
    ]
    
    try:
        response = chat_client.chat.completions.create(
            messages=messages,
            model="gpt-4o"
        )
        ai_response = response.choices[0].message.content
        log_message(f"generated note cover prompts: {ai_response}", category="note cover")
        
        # Remove ```json and ``` if present
        if ai_response.strip().startswith("```json") and ai_response.strip().endswith("```"):
            ai_response = ai_response.strip()[7:-3].strip()
        
        # Try to parse JSON response
        try:
            result = json.loads(ai_response)
            if isinstance(result, dict) and "prompts" in result:
                return result["prompts"][:num_prompts]  # Limit to requested number
        except json.JSONDecodeError:
            log_message(f"Failed to parse AI response as JSON: {ai_response}", category="note cover")
            
        # Fallback: try to extract prompts from text response
        prompts = [line.strip() for line in ai_response.split('\n') if line.strip()]
        return prompts[:num_prompts]  # Limit to requested number
        
    except Exception as e:
        log_message(f"Error getting note cover prompts: {e}", category="note cover")
        return []

IMAGES_PER_PAGE = 12  # Number of images to load per batch

@app.route('/load_images', methods=['GET'])
def load_images():
    page = int(request.args.get('page', 1))
    offset = (page - 1) * IMAGES_PER_PAGE
    
    image_list = load_image_batch(offset, IMAGES_PER_PAGE)
    return jsonify({
        'success': True,
        'has_more': len(image_list) == IMAGES_PER_PAGE,
        'images': image_list
    })

def load_image_batch(offset, limit):
    image_list = []
    static_dir = os.path.join(app.root_path, 'images')
    
    all_images = []
    for root, dirs, files in os.walk(static_dir):
        for file in files:
            if file.endswith((".jpeg", ".png")):
                file_path = os.path.join(root, file)
                created_time = os.path.getctime(file_path)
                relative_path = os.path.relpath(file_path, static_dir).replace('\\', '/')
                
                # Extract model name from filename (format: prompt_index_model_number.ext)
                parts = file.rsplit('_', 3)
                prompt = parts[0].replace('_', ' ')
                model = parts[2] if len(parts) > 2 else "unknown"
                
                all_images.append({
                    'prompt': prompt,
                    'images': [relative_path],
                    'created_time': created_time,
                    'model': model  # Include model name
                })
    
    # Sort by creation time and apply pagination
    sorted_images = sorted(all_images, key=lambda x: x['created_time'], reverse=True)
    return sorted_images[offset:offset + limit]

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        user_input = request.form['user_input']
        model = request.form.get('model', 'stabilityai/stable-diffusion-2-1-base')
        num_images = int(request.form.get('num_images', 1))
        width = int(request.form.get('width', 512))
        height = int(request.form.get('height', 512))
        generation_mode = request.form.get('generation_mode', 'various')

        log_message(f"Received POST request with user_input: {user_input}, model: {model}, num_images: {num_images}, width: {width}, height: {height}, mode: {generation_mode}", category="request")

        session['status'] = 'در حال آماده‌سازی'
        folder_path, folder_name = create_folder(user_input)
        image_prompt_list = []

        if generation_mode == 'note cover':
            session['status'] = 'در حال تولید طرح جلد'
            cover_prompts = get_note_cover_prompts(user_input, num_images)
            if not cover_prompts:
                session['error'] = "ناموفق در تولید دستورات طرح جلد"
                session['user_input'] = user_input
                return redirect(url_for('index'))
            
            session['status'] = 'در حال تولید تصاویر طرح جلد'
            for prompt in cover_prompts:
                prompt_images = generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height)
                if prompt_images:
                    relative_image_paths = [os.path.relpath(path, os.path.join(app.root_path, 'images')).replace('\\', '/') for path in prompt_images]
                    image_prompt_list.append({'prompt': prompt, 'images': relative_image_paths})

        elif generation_mode == 'various':
            session['status'] = 'در حال تولید دستورات هوشمند'
            ai_prompts = get_ai_prompts(user_input, num_images)
            if not ai_prompts:
                session['error'] = "ناموفق در تولید دستورات هوش مصنوعی"
                session['user_input'] = user_input
                return redirect(url_for('index'))
            
            session['status'] = 'در حال تولید تصاویر متنوع'
            for prompt in ai_prompts:
                prompt_images = generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height)
                if prompt_images:
                    relative_image_paths = [os.path.relpath(path, os.path.join(app.root_path, 'images')).replace('\\', '/') for path in prompt_images]
                    image_prompt_list.append({'prompt': prompt, 'images': relative_image_paths})

        else:
            # Handle standard mode
            prompts = [user_input]
            image_prompt_list = generate_images(prompts, folder_path, model, num_images, width, height)

        # Common post-processing for all modes
        session['status'] = 'در حال ذخیره‌سازی نتایج'
        previous_images = load_previous_images()
        image_prompt_list.extend(previous_images)
        image_prompt_list.sort(key=lambda x: x.get('created_time', 0), reverse=True)
        
        session['status'] = 'اتمام فرآیند'
        session['image_prompt_list'] = image_prompt_list
        session['user_input'] = user_input
        session.pop('status', None)
        return render_template('index.html',
                               image_prompt_list=[],
                               error=None)

    # Handle GET request
    initial_images = load_image_batch(0, IMAGES_PER_PAGE)
    return render_template('index.html', 
                         image_prompt_list=initial_images,
                         has_more=len(initial_images) == IMAGES_PER_PAGE)

@app.route('/ajax_generate', methods=['POST'])
def ajax_generate():
    # Create a unique task ID
    task_id = str(uuid.uuid4())
    
    # Get parameters from form
    params = {
        'user_input': request.form['user_input'],
        'model': request.form.get('model', 'stabilityai/stable-diffusion-2-1-base'),
        'num_images': int(request.form.get('num_images', 1)),
        'width': int(request.form.get('width', 512)),
        'height': int(request.form.get('height', 512)),
        'generation_mode': request.form.get('generation_mode', 'standard')
    }
    
    # Log new task with details
    log_message(
        f"[bold green]New task[/bold green]: {task_id}", 
        category="task",
        important=True
    )
    log_message(
        f"Model: [yellow]{params['model']}[/yellow], "
        f"Mode: [yellow]{params['generation_mode']}[/yellow], "
        f"Images: [yellow]{params['num_images']}[/yellow], "
        f"Size: [yellow]{params['width']}×{params['height']}[/yellow]",
        category="task"
    )
    log_message(f"Prompt: [italic]\"{params['user_input']}\"[/italic]", category="task")
    
    # Add task to queue
    task = {
        'task_id': task_id,
        'params': params,
        'timestamp': time.time()
    }
    task_queue.put(task)
    
    # Calculate image count for this task
    generation_mode = params['generation_mode']
    num_images = params['num_images']
    total_images_in_task = 0
    
    # For bulk mode, count number of queries and multiply
    if generation_mode == 'bulk':
        queries = [q.strip() for q in params['user_input'].split(';') if q.strip()]
        if generation_mode == 'standard':
            total_images_in_task = len(queries) * num_images
        else:
            total_images_in_task = len(queries) * num_images
    # For all other modes
    elif generation_mode == 'note cover' or generation_mode == 'various':
        total_images_in_task = num_images  # Each prompt will generate one image
    else:
        # Standard mode uses the num_images parameter directly
        total_images_in_task = num_images
    
    # Update global counter
    global total_queued_images
    total_queued_images += total_images_in_task
    
    # Emit queue status update with more detailed info
    queue_size = task_queue.qsize()
    socketio.emit('queue_update', {
        'queue_size': queue_size,
        'total_images': total_queued_images
    })
    
    return jsonify({
        'success': True,
        'task_id': task_id,
        'message': f"Task added to queue. Position: {queue_size}",
        'queue_position': queue_size,
        'image_count': total_images_in_task
    })

@socketio.on('connect')
def handle_connect():
    # Send current queue size to newly connected client
    emit('queue_update', {
        'queue_size': task_queue.qsize(),
        'total_images': total_queued_images
    })

@app.route('/upload_images', methods=['POST'])
def upload_images():
    if 'images' not in request.files:
        return jsonify({'success': False, 'error': 'No files uploaded'})

    files = request.files.getlist('images')
    uploaded_images = []

    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to prevent filename collisions
            name, ext = os.path.splitext(filename)
            timestamp = int(time.time() * 1000)
            new_filename = f"{name}_{timestamp}{ext}"
            
            filepath = os.path.join('images', new_filename)
            file.save(filepath)
            
            uploaded_images.append({
                'path': new_filename,
                'name': name
            })

    if uploaded_images:
        return jsonify({
            'success': True,
            'images': uploaded_images
        })
    else:
        return jsonify({
            'success': False,
            'error': 'No valid images uploaded'
        })

def generate_images(prompts, folder_path, model, num_images, width, height):
    image_prompt_list = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_prompt = {executor.submit(generate_images_for_prompt, prompt, i, folder_path, model, num_images, width, height): (prompt, i) for i, prompt in enumerate(prompts)}
        for future in concurrent.futures.as_completed(future_to_prompt):
            prompt, index = future_to_prompt[future]
            try:
                image_paths_full = future.result()
                relative_image_paths = [os.path.relpath(path, os.path.join(app.root_path, 'images')).replace('\\', '/') for path in image_paths_full]
                image_prompt_list.append({'prompt': prompt, 'images': relative_image_paths})
            except Exception as exc:
                log_message(f"Exception generated while processing prompt '{prompt}': {exc}", category="error")
    image_prompt_list.sort(key=lambda x: prompts.index(x['prompt']))
    return image_prompt_list

def load_previous_images():
    image_prompt_list = []
    static_dir = os.path.join(app.root_path, 'images')
    for root, dirs, files in os.walk(static_dir):
        for file in files:
            if file.endswith(".jpeg") or file.endswith(".png"):
                relative_path = os.path.relpath(os.path.join(root, file), static_dir).replace('\\', '/')
                prompt = file.rsplit('_', 3)[0].replace('_', ' ')
                created_time = os.path.getctime(os.path.join(root, file))
                image_prompt_list.append({'prompt': prompt, 'images': [relative_path], 'created_time': created_time})
    image_prompt_list.sort(key=lambda x: x['created_time'], reverse=True)
    log_message("تصاویر قبلی بارگذاری شد", category="load")
    return image_prompt_list

@app.route('/remove_bg', methods=['POST'])
def remove_bg():
    image_path = request.json.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'error': 'مسیر تصویر ارائه نشده'})

    try:
        log_message("شروع فرآیند حذف پس‌زمینه", category="background")
        time.sleep(2)  # Initial delay
        
        image_path = image_path.replace('/download/', '')
        input_path = os.path.join('images', image_path)
        
        log_message("در حال بارگذاری تصویر", category="background")
        time.sleep(1)  # Loading delay
        input_image = Image.open(input_path)
        
        log_message("در حال پردازش و حذف پس‌زمینه", category="background")
        time.sleep(2)  # Processing delay
        output_image = remove(input_image)
        
        filename_without_ext = os.path.splitext(image_path)[0]
        output_filename = f"{filename_without_ext}_no_bg.png"
        output_path = os.path.join('images', output_filename)
        
        log_message("در حال ذخیره‌سازی تصویر نهایی", category="background")
        time.sleep(1)  # Saving delay
        output_image.save(output_path)

        time.sleep(1)  # Final delay
        return jsonify({
            'success': True, 
            'new_image_path': output_filename
        })
    except Exception as e:
        log_message(f"خطا در حذف پس‌زمینه: {e}", category="error")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/delete_image', methods=['POST'])
def delete_image():
    image_path = request.json.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'error': 'مسیر تصویر ارائه نشده'})

    try:
        # Clean up the path
        image_path = image_path.replace('/download/', '')
        full_path = os.path.join('images', image_path)
        
        # Check if file exists
        if os.path.exists(full_path):
            os.remove(full_path)
            log_message(f"Image deleted: {full_path}", category="delete")
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'فایل یافت نشد'})
    except Exception as e:
        log_message(f"Error deleting image: {e}", category="error")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/images/<path:filename>')
def serve_image(filename):
    log_message(f"در حال ارائه تصویر: {filename}", category="serve")
    return send_from_directory('images', filename)

@app.route('/download/<path:filename>')
def download_image(filename):
    log_message(f"در حال دانلود تصویر: {filename}", category="download")
    return send_file(os.path.join('images', filename), as_attachment=True)

# Add new functions for task queue management
def update_task_status(task_id, status_message):
    """Update and broadcast task status to clients"""
    task_status[task_id] = status_message
    socketio.emit('task_status', {
        'task_id': task_id,
        'status': status_message
    })

def process_task_queue():
    """Background thread to process tasks in the queue"""
    while True:
        try:
            # Get the next task from the queue
            task = task_queue.get(block=True)
            task_id = task['task_id']
            
            try:
                # Mark task as active and update status
                active_tasks[task_id] = True
                update_task_status(task_id, 'Starting image generation')
                
                # Extract task parameters
                user_input = task['params']['user_input']
                model = task['params'].get('model', 'stabilityai/stable-diffusion-2-1-base')
                num_images = int(task['params'].get('num_images', 1))
                width = int(task['params'].get('width', 512))
                height = int(task['params'].get('height', 512))
                generation_mode = task['params'].get('generation_mode', 'standard')
                
                # Log task processing
                log_message(
                    f"[bold blue]Processing task[/bold blue]: {task_id[:8]}...", 
                    category="queue",
                    important=True
                )
                
                # Create folder for images
                folder_path, folder_name = create_folder(user_input)
                
                # Track images to subtract from total count
                task_image_count = 0
                
                # Handle bulk generation mode
                if generation_mode == 'bulk':
                    # Split input by semicolons and filter out empty strings
                    queries = [q.strip() for q in user_input.split(';') if q.strip()]
                    query_count = len(queries)
                    
                    if query_count == 0:
                        log_message("[bold red]No valid queries found in bulk input[/bold red]", category="error")
                        socketio.emit('task_error', {
                            'task_id': task_id,
                            'error': "No valid queries found"
                        })
                        continue
                    
                    log_message(f"Processing {query_count} queries in bulk mode", category="bulk")
                    update_task_status(task_id, f'Processing {query_count} queries in bulk mode')
                    
                    for i, query in enumerate(queries):
                        query_folder_path, _ = create_folder(query)
                        update_task_status(task_id, f'Generating image {i+1}/{query_count} for query: {query}')
                        log_message(f"Bulk processing query {i+1}/{query_count}: '{query}'", category="bulk")
                        
                        # Use standard generation for each query
                        prompt_images = generate_images_for_prompt(query, 0, query_folder_path, model, num_images, width, height, task_id)
                        task_image_count += len(prompt_images)
                
                # Handle other generation modes
                elif generation_mode == 'note cover':
                    log_message(f"Generating {num_images} note cover prompts", category="processing")
                    update_task_status(task_id, f'Generating {num_images} note cover prompts')
                    cover_prompts = get_note_cover_prompts(user_input, num_images)
                    if not cover_prompts:
                        log_message("[bold red]Failed to generate note cover prompts[/bold red]", category="error")
                        socketio.emit('task_error', {
                            'task_id': task_id,
                            'error': "Failed to generate note cover prompts"
                        })
                        continue
                    
                    task_image_count = len(cover_prompts)
                    for i, prompt in enumerate(cover_prompts):
                        update_task_status(task_id, f'Generating image {i+1}/{len(cover_prompts)} for note cover')
                        generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height, task_id)
                
                elif generation_mode == 'various':
                    log_message(f"Generating {num_images} AI prompts", category="processing")
                    update_task_status(task_id, f'Generating {num_images} AI prompts')
                    ai_prompts = get_ai_prompts(user_input, num_images)
                    if not ai_prompts:
                        log_message("[bold red]Failed to generate AI prompts[/bold red]", category="error")
                        socketio.emit('task_error', {
                            'task_id': task_id,
                            'error': "Failed to generate AI prompts"
                        })
                        continue
                    
                    task_image_count = len(ai_prompts)
                    for i, prompt in enumerate(ai_prompts):
                        update_task_status(task_id, f'Generating image {i+1}/{len(ai_prompts)} for various prompts')
                        generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height, task_id)
                
                else:
                    # Standard mode
                    task_image_count = num_images
                    log_message(f"Generating {num_images} images for standard prompt", category="processing")
                    update_task_status(task_id, f'Generating {num_images} images for standard prompt')
                    generate_images_for_prompt(user_input, 0, folder_path, model, num_images, width, height, task_id)
                
                # Task completed successfully
                update_task_status(task_id, 'Completed')
                log_message(
                    f"[bold green]Task completed[/bold green]: {task_id[:8]}...",
                    category="queue",
                    important=True
                )
                socketio.emit('task_completed', {
                    'task_id': task_id,
                    'message': 'All images generated successfully'
                })
                
            except Exception as e:
                log_message(f"[bold red]Error processing task[/bold red] {task_id[:8]}...: {str(e)}", 
                           category="error",
                           important=True)
                socketio.emit('task_error', {
                    'task_id': task_id,
                    'error': str(e)
                })
                
            finally:
                # Mark task as completed and remove from active tasks
                if task_id in active_tasks:
                    del active_tasks[task_id]
                if task_id in task_status:
                    del task_status[task_id]
                task_queue.task_done()
                
                # Update total image count
                global total_queued_images
                total_queued_images = max(0, total_queued_images - task_image_count)
                
                # Show queue stats
                queue_size = task_queue.qsize()
                log_message(
                    f"Queue stats: [yellow]{queue_size}[/yellow] tasks, [yellow]{total_queued_images}[/yellow] images remaining",
                    category="queue"
                )
                
                # Emit updated queue info
                socketio.emit('queue_update', {
                    'queue_size': queue_size,
                    'total_images': total_queued_images
                })
                
        except Exception as e:
            log_message(f"[bold red]Error in queue processor[/bold red]: {str(e)}", category="error", important=True)
            time.sleep(5)  # Wait before retrying

# Start the queue processor thread
queue_processor_thread = threading.Thread(target=process_task_queue)
queue_processor_thread.daemon = True
queue_processor_thread.start()

if __name__ == '__main__':
    if not os.path.exists('images'):
        os.makedirs('images')
    
    console.rule("[bold green]AI Image Generator[/bold green]", style="green")
    log_message(f"Starting server on port [yellow]15303[/yellow]", category="server", important=True)

    port = int(os.environ.get("PORT", 15303))
    socketio.run(
        app,
        debug=True, 
        host='0.0.0.0', 
        port=port,
        allow_unsafe_werkzeug=True
    )
