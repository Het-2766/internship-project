import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pdfplumber
import docx2txt

from nlp.parser import analyze_resume

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for communication with Node.js

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(filepath, extension):
    text = ""
    if extension == 'txt':
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    elif extension == 'pdf':
        try:
            with pdfplumber.open(filepath) as pdf:
                pages_text = [page.extract_text() for page in pdf.pages if page.extract_text()]
                text = "\n".join(pages_text)
        except Exception as e:
            print(f"Error extracting PDF: {e}")
    elif extension == 'docx':
        try:
            text = docx2txt.process(filepath)
        except Exception as e:
            print(f"Error extracting DOCX: {e}")
    return text

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Python AI NLP Engine"})

@app.route('/analyze', methods=['POST'])
def analyze():
    # Handle text sent directly via JSON
    if request.is_json:
        data = request.get_json()
        resume_text = data.get('text', '')
        if not resume_text or len(resume_text.strip()) == 0:
            return jsonify({"error": "No text provided in request body"}), 400
        
        analysis = analyze_resume(resume_text)
        return jsonify(analysis)

    # Handle file uploads (PDF, DOCX, TXT)
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            ext = filename.rsplit('.', 1)[1].lower()
            text = extract_text_from_file(filepath, ext)
            
            # Clean up uploaded file immediately
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"Failed to delete temp file {filepath}: {e}")

            if not text or len(text.strip()) == 0:
                return jsonify({"error": "Failed to extract text from the document. Ensure it is not empty or scanned image."}), 422
            
            analysis = analyze_resume(text)
            return jsonify(analysis)
        
        return jsonify({"error": "File type not supported. Use PDF, DOCX, or TXT."}), 400

    return jsonify({"error": "Invalid request. Provide a JSON body with 'text' or upload a 'file'."}), 400

if __name__ == '__main__':
    # Get port from environment or use 5000 as default
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Python AI Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
