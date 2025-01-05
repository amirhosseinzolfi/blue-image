# AI Image Generator

## Overview
The AI Image Generator is a web application that allows users to generate images based on text prompts using various AI models. The application is built with Flask and provides a user-friendly interface for inputting prompts and displaying generated images.

## Project Structure
```
ai-image-generator
├── static
│   ├── css
│   │   └── styles.css        # Contains all CSS styles for the application
│   ├── js
│   │   └── scripts.js        # Contains JavaScript code for handling UI interactions
│   └── images                # Directory for storing generated images
├── templates
│   └── index.html            # Main HTML template for the application
├── app.py                    # Main application file for setting up Flask server
└── README.md                 # Documentation for the project
```

## Setup Instructions
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd ai-image-generator
   ```

2. **Install Dependencies**
   Make sure you have Python installed. Then, install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   Start the Flask server:
   ```bash
   python app.py
   ```
   The application will be accessible at `http://127.0.0.1:5000`.

## Usage
- Enter a topic in the input field to generate images.
- Select the desired AI model from the dropdown menu.
- Specify the number of images to generate and their dimensions.
- Click the "Generate Images" button to submit the form.
- The generated images will be displayed below the form, along with options to download them.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.