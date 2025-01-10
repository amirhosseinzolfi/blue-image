from flask import Flask, render_template, request, send_file, send_from_directory, jsonify, session, redirect, url_for
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

app = Flask(__name__)
app.secret_key = "change_this_secret_key"  # Needed for session usage

client = InferenceClient()
dify_api_url = "http://localhost/v1/workflows/run"
dify_api_key = "app-KTzRHpWPjGuTeaX967geUAfx"
dalle_client = OpenAI(base_url='https://fresedgpt.space/v1', api_key='fresed-20D08BG9uGitZJLn09Rg5VrNjUk3FN')
g4f_client = Client()

logging.basicConfig(level=logging.INFO)

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

def log_and_print(message):
    logging.info(message)
    print(message)

def generate_image_dalle(prompt, index, folder_path, image_number):
    time.sleep(2)  # Add delay before generation
    log_and_print(f"Generating image with DALL-E 3 for prompt: {prompt}")
    response = dalle_client.images.generate(
        model="dall-e-3", 
        prompt=prompt, 
        size="1024x768",
        timeout=REQUESTS_TIMEOUT
    )
    time.sleep(1)  # Add delay after generation
    image_url = response.data[0].url
    return save_image_from_url(image_url, prompt, index, folder_path, "dalle", image_number)

def generate_image_g4f(prompt, index, folder_path, model, image_number, width, height):
    time.sleep(2)  # Add delay before generation
    log_and_print(f"Generating image with {model} for prompt: {prompt}")
    response = g4f_client.images.generate(
        model=model, 
        prompt=prompt, 
        response_format="url", 
        width=width, 
        height=height,
        timeout=REQUESTS_TIMEOUT
    )
    time.sleep(1)  # Add delay after generation
    image_url = response.data[0].url
    return save_image_from_url(image_url, prompt, index, folder_path, model, image_number)

def save_image_from_url(image_url, prompt, index, folder_path, model, image_number):
    time.sleep(1)  # Add delay before download
    log_and_print(f"Saving image from URL: {image_url}")
    image_response = requests.get(image_url, timeout=REQUESTS_TIMEOUT)
    base_filename = f"{prompt.replace(' ', '_')}_{index+1}_{model}_{image_number}.jpeg"
    image_filename = os.path.join(folder_path, base_filename)
    
    # Check if the file already exists and add a prefix if it does
    if os.path.exists(image_filename):
        prefix = 1
        while os.path.exists(os.path.join(folder_path, f"{prefix}_{base_filename}")):
            prefix += 1
        image_filename = os.path.join(folder_path, f"{prefix}_{base_filename}")
    
    with open(image_filename, 'wb') as f:
        f.write(image_response.content)
    log_and_print(f"Image saved as: {image_filename}")
    return image_filename

def generate_images_for_prompt(prompt, index, folder_path, model, num_images, width, height):
    images_filenames = []
    g4f_models = [
        "dall-e-3", "midjourney", "flux", "sdxl", "sdxl-lora", "sd-3", 
        "playground-v2.5", "flux-pro", "flux-dev", "flux-realism", 
        "flux-anime", "flux-3d", "flux-4o", "any-dark"
    ]
    if model in g4f_models:
        generate_func = generate_image_g4f
        for i in range(num_images):
            image_filename = generate_func(prompt, index, folder_path, model, i+1, width, height)
            images_filenames.append(image_filename)
    else:
        for i in range(num_images):
            unique_prompt = f"{prompt} variation {i+1}"
            seed = random.randint(1, 1000000)
            log_and_print(f"Generating image with {model} for prompt: {unique_prompt} with seed: {seed}")
            image = client.text_to_image(prompt=unique_prompt, model=model, height=height, width=width, seed=seed)
            image_filename = os.path.join(folder_path, f"{sanitize_folder_name(prompt)}_{index+1}_{model}_{i+1}.jpeg")
            image.save(image_filename, format='JPEG')
            log_and_print(f"Image saved as: {image_filename}")
            images_filenames.append(image_filename)
    return images_filenames

def sanitize_folder_name(query):
    sanitized_name = re.sub(r'[^\w\s-]', '', query).strip().lower()
    sanitized_name = re.sub(r'[-\s]+', '_', sanitized_name)
    return sanitized_name

def create_folder(query):
    folder_path = os.path.join('images')
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    log_and_print(f"Using folder: {folder_path}")
    return folder_path, 'images'

def get_dify_prompts(user_input):
    log_and_print(f"Fetching Dify prompts for input: {user_input}")
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
            log_and_print(f"Dify prompt generation failed: {response_data.get('data', {}).get('error', 'Unknown error')}")
            return []
        outputs = response_data.get("data", {}).get("outputs", None)
        if outputs:
            text_output = outputs.get("text", "")
            return parse_dify_output(text_output)
    log_and_print("Failed to fetch Dify prompts")
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
        log_and_print(f"Parsed Dify prompts: {prompts}")
        return prompts[:5]
    except json.JSONDecodeError:
        prompts = text_output.split('\n')
        prompts = [p.strip() for p in prompts if p.strip()]
        log_and_print(f"Parsed Dify prompts: {prompts}")
        return prompts[:5]

def shorten_prompt(prompt):
    prompt_clean = re.sub(r'[^\w\s]', '', prompt)
    shortened_prompt = ' '.join(prompt_clean.split()[:5])
    return shortened_prompt[:30] + "..." if len(shortened_prompt) > 30 else shortened_prompt

import g4f
from g4f.client import Client
import json

def get_ai_prompts(user_input: str) -> list:
    """Get image prompts from AI using G4F"""
    log_and_print(f"Getting AI prompts for input: {user_input}")
    chat_client = Client()
    
    system_message = r"""- you are an AI chat bot that generates creative and optimized and efficient image prompts based on analying carefully user input.
            - Your task is to generate five distinct and creative image prompts based on the user’s description.
    
            1. **Analyze the User’s Description**  
            - Read and understand any user’s text input describing the desired image and strategy.
            - Check what the user wants in their image (like colors, themes, mood, style, objects).
    
            2. **Generate 5 Detailed Prompts**  
            - Generate 5 image prompts based on the user’s needed and input.
            - consider generating variety of prompts that are unique and covvers all user need.
            - generate diffrent aspects of the user input and generate prompts based on that.
            - Keep them short, clear, and focused on the key elements (style, colors, subject).
            - Each prompt must be a single concise sentence or phrase.
    
            3. **Output Only the JSON**  
            - Return the prompts in a JSON object with the structure:
                {
                "prompts": [
                    "prompt1",
                    "prompt2",
                    "prompt3",
                    "prompt4",
                    "prompt5"
                ]
                }
            - Don’t include any extra text or formatting—just the JSON.
    
            4. **Maintain Consistency**  
            - Always ensure the prompts align with the user’s request and need.
            - Make sure the prompts are creative and arnt similar each other but match the user’s details.
            - Avoid repeating the same words or phrases in multiple prompts.

            That’s it. Stick to these steps and keep it simple!"""
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Generate 5 creative image prompts based on: {user_input}"}
    ]
    
    try:
        response = chat_client.chat.completions.create(
            messages=messages,
            model="gemini-1.5-flash"
        )
        ai_response = response.choices[0].message.content
        log_and_print(f"generated AI prompts: {ai_response}")
        
        # Remove ```json and ``` if present
        if (ai_response.strip().startswith("```json") and ai_response.strip().endswith("```")):
            ai_response = ai_response.strip()[7:-3].strip()
        
        # Try to parse JSON response
        try:
            result = json.loads(ai_response)
            if isinstance(result, dict) and "prompts" in result:
                return result["prompts"]
        except json.JSONDecodeError:
            log_and_print(f"Failed to parse AI response as JSON: {ai_response}")
            
        # Fallback: try to extract prompts from text response
        prompts = [line.strip() for line in ai_response.split('\n') if line.strip()]
        return prompts[:5]
        
    except Exception as e:
        log_and_print(f"Error getting AI prompts: {e}")
        return []

def get_note_cover_prompts(user_input: str) -> list:
    """Get note cover image prompts from AI with specific instructions."""
    log_and_print(f"Getting note cover prompts for input: {user_input}")
    chat_client = Client()
    
    system_message = r"""
        You are notes image cover generator, an AI assistant expert in crafting creative and efficient and optimized  prompts for ai image generators and Midjourney. When a user provides a topic and concept for a note cover image, your task is to generate five unique and optimized prompts. Ensure each prompt effectively incorporates main concepts and keywords of note topic.
        Uniqueness : Each of the five prompts must be unique and not similar to each other. combinations, and interpretations of the user's input. Vary the artistic styles, settings, moods, and perspectives across the prompts to inspire diverse visual outcomes.
        Generate a **high-quality prompt** for creating a **minimal, modern, and 3D-style illustration cover image for a knowledge base note, as specified by the user. The cover image should be in a tailored to the note's concept which user give. 
        1. **Note Concept**  
        Use the provided note concept as the basis for the visual concept in the prompt.

        2. **Design Requirements**  
        - **Style**: Minimal, modern, with 3D illustration effects.
        - **Theme**: The image should visually represent the core idea or focus of the note.
        - **Color Scheme**: based on the note concept and topic use a suitable and related mood and color theme and Use a clean, professional color palette that complements the modern aesthetic.
        - **Layout**: Maintain a balanced composition with a focus on simplicity and professionalism and conceptuality.
        Clarity and Conciseness: Keep each prompt clear, concise, and to the point. Aim for a length of one to two sentences per prompt.

        Midjourney Optimization: Structure the prompts in a way that Midjourney can easily interpret and utilize effectively. Avoid ambiguity and overly complex sentence structures.

        Formatting and Output: Return the five generated prompts as a JSON object with the key "prompts" and an array of strings. Do not include any introductory or explanatory text. The output should strictly adhere to the following JSON format:

        {
        "prompts": [
            "prompt1",
            "prompt2",
            "prompt3",
            "prompt4",
            "prompt5"
        ]
        }

        Avoid any repetitive phrases or design concepts across the five prompts to ensure diversity. Your sole output should be the JSON object containing the five prompts."""

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Generate 5 creative note cover prompts based on: {user_input}"}
    ]
    
    try:
        response = chat_client.chat.completions.create(
            messages=messages,
            model="gemini-1.5-flash"
        )
        ai_response = response.choices[0].message.content
        log_and_print(f"generated note cover prompts: {ai_response}")
        
        # Remove ```json and ``` if present
        if ai_response.strip().startswith("```json") and ai_response.strip().endswith("```"):
            ai_response = ai_response.strip()[7:-3].strip()
        
        # Try to parse JSON response
        try:
            result = json.loads(ai_response)
            if isinstance(result, dict) and "prompts" in result:
                return result["prompts"]
        except json.JSONDecodeError:
            log_and_print(f"Failed to parse AI response as JSON: {ai_response}")
            
        # Fallback: try to extract prompts from text response
        prompts = [line.strip() for line in ai_response.split('\n') if line.strip()]
        return prompts[:5]
        
    except Exception as e:
        log_and_print(f"Error getting note cover prompts: {e}")
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
                prompt = file.rsplit('_', 3)[0].replace('_', ' ')
                all_images.append({
                    'prompt': prompt,
                    'images': [relative_path],
                    'created_time': created_time
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

        log_and_print(f"Received POST request with user_input: {user_input}, model: {model}, num_images: {num_images}, width: {width}, height: {height}, mode: {generation_mode}")

        session['status'] = 'در حال آماده‌سازی'
        folder_path, folder_name = create_folder(user_input)
        image_prompt_list = []

        if generation_mode == 'note cover':
            session['status'] = 'در حال تولید طرح جلد'
            cover_prompts = get_note_cover_prompts(user_input)
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
            ai_prompts = get_ai_prompts(user_input)
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
    user_input = request.form['user_input']
    model = request.form.get('model', 'stabilityai/stable-diffusion-2-1-base')
    num_images = int(request.form.get('num_images', 1))
    width = int(request.form.get('width', 512))
    height = int(request.form.get('height', 512))
    generation_mode = request.form.get('generation_mode', 'standard')

    folder_path, folder_name = create_folder(user_input)
    image_prompt_list = []

    if generation_mode == 'note cover':
        cover_prompts = get_note_cover_prompts(user_input)
        if cover_prompts:
            for prompt in cover_prompts:
                prompt_images = generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height)
                if prompt_images:
                    relative_image_paths = [os.path.relpath(path, os.path.join(app.root_path, 'images')).replace('\\', '/') for path in prompt_images]
                    image_prompt_list.append({'prompt': prompt, 'images': relative_image_paths})

    elif generation_mode == 'various':
        ai_prompts = get_ai_prompts(user_input)
        if ai_prompts:
            for prompt in ai_prompts:
                prompt_images = generate_images_for_prompt(prompt, 0, folder_path, model, 1, width, height)
                if prompt_images:
                    relative_image_paths = [os.path.relpath(path, os.path.join(app.root_path, 'images')).replace('\\', '/') for path in prompt_images]
                    image_prompt_list.append({'prompt': prompt, 'images': relative_image_paths})

    else:
        # Handle standard mode
        prompts = [user_input]
        image_prompt_list = generate_images(prompts, folder_path, model, num_images, width, height)

    return jsonify({
        'success': True,
        'image_prompt_list': image_prompt_list
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
                log_and_print(f"Exception generated while processing prompt '{prompt}': {exc}")
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
    log_and_print("تصاویر قبلی بارگذاری شد")
    return image_prompt_list

@app.route('/remove_bg', methods=['POST'])
def remove_bg():
    image_path = request.json.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'error': 'مسیر تصویر ارائه نشده'})

    try:
        log_and_print("شروع فرآیند حذف پس‌زمینه")
        time.sleep(2)  # Initial delay
        
        image_path = image_path.replace('/download/', '')
        input_path = os.path.join('images', image_path)
        
        log_and_print("در حال بارگذاری تصویر")
        time.sleep(1)  # Loading delay
        input_image = Image.open(input_path)
        
        log_and_print("در حال پردازش و حذف پس‌زمینه")
        time.sleep(2)  # Processing delay
        output_image = remove(input_image)
        
        filename_without_ext = os.path.splitext(image_path)[0]
        output_filename = f"{filename_without_ext}_no_bg.png"
        output_path = os.path.join('images', output_filename)
        
        log_and_print("در حال ذخیره‌سازی تصویر نهایی")
        time.sleep(1)  # Saving delay
        output_image.save(output_path)

        time.sleep(1)  # Final delay
        return jsonify({
            'success': True, 
            'new_image_path': output_filename
        })
    except Exception as e:
        log_and_print(f"خطا در حذف پس‌زمینه: {e}")
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
            log_and_print(f"Image deleted: {full_path}")
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'فایل یافت نشد'})
    except Exception as e:
        log_and_print(f"Error deleting image: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/images/<path:filename>')
def serve_image(filename):
    log_and_print(f"در حال ارائه تصویر: {filename}")
    return send_from_directory('images', filename)

@app.route('/download/<path:filename>')
def download_image(filename):
    log_and_print(f"در حال دانلود تصویر: {filename}")
    return send_file(os.path.join('images', filename), as_attachment=True)

