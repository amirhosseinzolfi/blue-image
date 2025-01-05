from flask import Flask, render_template, request, send_file, send_from_directory, jsonify
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

app = Flask(__name__)

client = InferenceClient()
dify_api_url = "http://localhost/v1/workflows/run"
dify_api_key = "app-KTzRHpWPjGuTeaX967geUAfx"
dalle_client = OpenAI(base_url='https://fresedgpt.space/v1', api_key='fresed-20D08BG9uGitZJLn09Rg5VrNjUk3FN')
g4f_client = Client()

logging.basicConfig(level=logging.INFO)

def log_and_print(message):
    logging.info(message)
    print(message)

def generate_image_dalle(prompt, index, folder_path, image_number):
    log_and_print(f"Generating image with DALL-E 3 for prompt: {prompt}")
    response = dalle_client.images.generate(model="dall-e-3", prompt=prompt, size="1024x768")
    image_url = response.data[0].url
    return save_image_from_url(image_url, prompt, index, folder_path, "dalle", image_number)

def generate_image_g4f(prompt, index, folder_path, model, image_number, width, height):
    log_and_print(f"Generating image with {model} for prompt: {prompt}")
    response = g4f_client.images.generate(model=model, prompt=prompt, response_format="url", width=width, height=height)
    image_url = response.data[0].url
    return save_image_from_url(image_url, prompt, index, folder_path, model, image_number)

def save_image_from_url(image_url, prompt, index, folder_path, model, image_number):
    log_and_print(f"Saving image from URL: {image_url}")
    image_response = requests.get(image_url)
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
    response = requests.post(dify_api_url, headers=headers, json=data)
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

def get_ai_prompts(user_input):
    """Get image prompts from AI using G4F"""
    log_and_print(f"Getting AI prompts for input: {user_input}")
    chat_client = Client()
    
    system_message = """- **AI chatbot name:** *VisionSpark*

            - **AI chatbot tasks:** 
            1. Read and understand any user’s text input describing the desired image and strategy.
            2. Generate exactly 5 carefully crafted prompts based on the user’s description.
            3. Return these prompts as a JSON object with the key `"prompts"` and an array of strings.
            4. Make sure there’s no extra text or explanation—only the exact JSON structure.

            #### **AI chat bot instruction prompt**

            Hey VisionSpark, here’s what I need you to do for each user query:

            1. **Analyze the User’s Description**  
            - Check what the user wants in their image (like colors, themes, mood, style, objects).

            2. **Generate 5 Detailed Prompts**  
            - Create five distinct image-prompts that fit the user’s description.
            - Keep them short, clear, and focused on the key elements (style, colors, subject).
            - Each prompt must be a single concise sentence or phrase.

            3. **Output Only the JSON**  
            - Return the prompts in a JSON object with the structure:
                \{
                "prompts": [
                    "prompt1",
                    "prompt2",
                    "prompt3",
                    "prompt4",
                    "prompt5"
                ]
                \}
            - Don’t include any extra text or formatting—just the JSON.

            4. **Maintain Consistency**  
            - Always ensure the prompts align with the user’s request.
            - Make sure the prompts are creative but match the user’s details.
            - Avoid repeating the same words or phrases in multiple prompts.

            5. **No Extra Details**  
            - Don’t add disclaimers or explanations—just deliver the final JSON with the five prompts.

            That’s it. Stick to these steps and keep it simple!"""
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Generate 5 creative image prompts based on: {user_input}"}
    ]
    
    try:
        response = chat_client.chat.completions.create(
            messages=messages,
            model="gpt-4o"
        )
        ai_response = response.choices[0].message.content
        log_and_print(f"generated AI prompts: {ai_response}")
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

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        user_input = request.form['user_input']
        model = request.form.get('model', 'stabilityai/stable-diffusion-2-1-base')
        num_images = int(request.form.get('num_images', 1))
        width = int(request.form.get('width', 512))
        height = int(request.form.get('height', 512))
        generation_mode = request.form.get('generation_mode', 'standard')

        log_and_print(f"Received POST request with user_input: {user_input}, model: {model}, num_images: {num_images}, width: {width}, height: {height}, mode: {generation_mode}")

        prompts = []
        if generation_mode == 'standard':
            prompts = [user_input]
        elif generation_mode == 'dify':
            prompts = get_dify_prompts(user_input)
        elif generation_mode == 'variation':
            prompts = [f"{user_input} variation {i+1}" for i in range(num_images)]
        elif generation_mode == 'various':
            prompts = get_ai_prompts(user_input)
            if not prompts:
                return render_template('index.html', error="Failed to generate AI prompts", user_input=user_input)

        if prompts:
            folder_path, folder_name = create_folder(user_input)
            image_prompt_list = generate_images(prompts, folder_path, model, num_images, width, height)
            previous_images = load_previous_images()
            image_prompt_list.extend(previous_images)
            image_prompt_list.sort(key=lambda x: x.get('created_time', 0), reverse=True)
            return render_template('index.html', image_prompt_list=image_prompt_list, user_input=user_input)
        else:
            return render_template('index.html', error="No prompts generated", user_input=user_input)

    # Load previous images on GET request
    previous_images = load_previous_images()
    log_and_print("Loaded previous images")
    return render_template('index.html', image_prompt_list=previous_images)

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
    log_and_print(f"Loaded previous images: {image_prompt_list}")
    return image_prompt_list

@app.route('/remove_bg', methods=['POST'])
def remove_bg():
    image_path = request.json.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'error': 'No image path provided'})

    try:
        # Correct the path to the image
        image_path = image_path.replace('/download/', '')
        input_path = os.path.join('images', image_path)
        output_path = input_path.replace('.jpeg', '_no_bg.png')

        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)

        return jsonify({'success': True, 'new_image_path': output_path})
    except Exception as e:
        log_and_print(f"Error removing background: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/images/<path:filename>')
def serve_image(filename):
    log_and_print(f"Serving image: {filename}")
    return send_from_directory('images', filename)

@app.route('/download/<path:filename>')
def download_image(filename):
    log_and_print(f"Downloading image: {filename}")
    return send_file(os.path.join('images', filename), as_attachment=True)

if __name__ == '__main__':
    if not os.path.exists('images'):
        os.makedirs('images')
    log_and_print("Starting app on port 13300")
    app.run(debug=True, port=13300)