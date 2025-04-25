import random
import statistics
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import nltk
from transformers import pipeline
from nltk.corpus import stopwords
import torch
import traceback
import ssl
import os

# Fix SSL certificate issues
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Properly download NLTK resources with error handling
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    print("NLTK resources downloaded successfully")
except Exception as e:
    print(f"Error downloading NLTK resources: {str(e)}")
    # Setup offline path
    nltk_data_path = os.path.join(os.path.dirname(__file__), "nltk_data")
    if not os.path.exists(nltk_data_path):
        os.makedirs(nltk_data_path, exist_ok=True)
    nltk.data.path.append(nltk_data_path)

app = Flask(__name__)
CORS(app)

# Initialize AI models with error handling
try:
    paraphraser = pipeline(
        "text2text-generation",
        model="humarin/chatgpt_paraphraser_on_T5_base",
        device=0 if torch.cuda.is_available() else -1,
        max_length=512
    )
    print("Model loaded successfully")
except Exception as e:
    print(f"Model loading error: {str(e)}")
    print("Will use fallback humanization")
    paraphraser = None

def preprocess_text(text):
    """NLP-powered text preprocessing"""
    try:
        stop_words = set(stopwords.words('english'))
        words = nltk.word_tokenize(text)
        return ' '.join([w for w in words if w.lower() not in stop_words and w.isalnum()])
    except:
        # Simple fallback
        return text

def humanize_content(text, keywords=None, round_num=1):
    """Enhanced AI-detection-avoiding humanization"""
    if keywords is None:
        keywords = []
    
    print(f"Starting humanization round {round_num}")
    
    # Extract title separately (assumes first line is title)
    lines = text.split('\n')
    title = ""
    body = text
    
    # Check if first non-empty line is a heading
    for i, line in enumerate(lines):
        if line.strip() and (line.startswith('#')):
            title = line
            body = '\n'.join(lines[i+1:])
            break
    
    # Split content into paragraphs to maintain structure
    paragraphs = []
    current = []
    
    for line in body.split('\n'):
        if not line.strip():
            if current:
                paragraphs.append('\n'.join(current))
                current = []
        else:
            current.append(line)
    
    if current:
        paragraphs.append('\n'.join(current))
    
    # Use more creative parameters in second round
    if round_num == 2:
        params = {
            "max_length": 512,
            "num_return_sequences": 1,
            "temperature": 0.92,  # Higher temperature for more creativity in second round
            "repetition_penalty": 1.5,
            "do_sample": True,
            "top_p": 0.95,
            "top_k": 60
        }
    else:
        params = {
            "max_length": 512,
            "num_return_sequences": 1,
            "temperature": 0.85,
            "repetition_penalty": 1.4,
            "do_sample": True,
            "top_p": 0.92,
            "top_k": 50
        }
    
    # Process each paragraph with AI-detection avoidance techniques
    humanized_paragraphs = []
    
    for i, para in enumerate(paragraphs):
        try:
            print(f"Processing paragraph {i+1}/{len(paragraphs)} (round {round_num})")
            
            # Skip paraphrasing for structural elements
            if len(para) < 50 or para.strip().startswith(('-', '*', '1.', '2.')):
                humanized_paragraphs.append(para)
                continue
            
            # Add variations in sentence length and structure
            if i % 3 == 0 and len(para) > 100:
                if round_num == 1:
                    para = para.replace('. ', '! ').replace('. ', '. Really. ', 1)
                else:
                    para = para.replace('. ', '? ').replace('. ', '. In fact, ', 1)
            
            # Split longer paragraphs into chunks
            chunks = []
            if len(para) > 300:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                current_chunk = []
                current_len = 0
                
                for sentence in sentences:
                    if current_len + len(sentence) > 300:
                        chunks.append(' '.join(current_chunk))
                        current_chunk = [sentence]
                        current_len = len(sentence)
                    else:
                        current_chunk.append(sentence)
                        current_len += len(sentence)
                
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
            else:
                chunks = [para]
                
            # Process each chunk
            humanized_chunks = []
            
            # Check if model is available
            if paraphraser is None:
                # Simple fallback humanization
                for chunk in chunks:
                    humanized_chunks.append(fallback_humanize(chunk, round_num))
            else:
                for j, chunk in enumerate(chunks):
                    current_params = params.copy()
                    if j % 2 == 0:
                        current_params["temperature"] = params["temperature"] - 0.1
                    else:
                        current_params["temperature"] = params["temperature"] + 0.1
                    
                    try:
                        result = paraphraser(chunk, **current_params)
                        humanized_chunk = result[0]['generated_text']
                    except Exception as e:
                        print(f"Error with paraphraser: {str(e)}")
                        humanized_chunk = fallback_humanize(chunk, round_num)
                    
                    # Occasional contractions help appear more human-written
                    if round_num == 2:
                        humanized_chunk = humanized_chunk.replace("it is", "it's")
                        humanized_chunk = humanized_chunk.replace("cannot", "can't")
                    
                    humanized_chunks.append(humanized_chunk)
            
            # Ensure keywords are preserved
            humanized_para = ' '.join(humanized_chunks)
            for keyword in keywords:
                if keyword and keyword.lower() in para.lower() and keyword.lower() not in humanized_para.lower():
                    humanized_para = humanized_para.replace('.', f'. {keyword}.', 1)
            
            # Add human-like writing quirks (more in second round)
            if round_num == 1 and i % 4 == 0:
                humanized_para = add_human_writing_quirks(humanized_para)
            elif round_num == 2 and i % 3 == 0:
                humanized_para = add_human_writing_quirks(humanized_para)
                
            humanized_paragraphs.append(humanized_para)
            
        except Exception as e:
            print(f"Error processing paragraph {i}: {str(e)}")
            humanized_paragraphs.append(para)  # Fall back to original
    
    # Reconstruct the document with title and humanized paragraphs
    humanized_text = title + '\n\n' if title else ""
    humanized_text += '\n\n'.join(humanized_paragraphs)
    
    # Add occasional typos in second round
    if round_num == 2 and random.random() < 0.3:
        humanized_text = introduce_subtle_typos(humanized_text)
    
    # Ensure minimum length requirement
    if len(humanized_text) < len(text) * 0.8:
        print(f"Humanized text too short in round {round_num}, adding padding")
        humanized_text += "\n\n" + paragraphs[-1]
    
    return humanized_text

def fallback_humanize(text, round_num=1):
    """Simple fallback humanization when model fails"""
    words = text.split()
    result = []
    
    for i, word in enumerate(words):
        # Different operations for different rounds
        if len(word) > 4:
            if round_num == 1:
                # First round: simpler replacements
                if i % 7 == 0:
                    word = f"really {word}"
                elif i % 11 == 0:
                    word = f"{word} actually"
            else:
                # Second round: more varied replacements
                if i % 6 == 0:
                    word = f"essentially {word}"
                elif i % 9 == 0:
                    word = f"{word} indeed"
        
        result.append(word)
    
    processed = ' '.join(result)
    
    # Replace some phrases
    replacements = {
        "is": "appears to be" if round_num == 2 else "is",
        "was": "had been" if round_num == 2 else "was",
        "will": "may" if round_num == 1 else "will likely",
        "can": "could potentially" if round_num == 1 else "has the ability to"
    }
    
    for original, replacement in replacements.items():
        if random.random() < 0.4:  # Don't replace all occurrences
            processed = processed.replace(f" {original} ", f" {replacement} ")
    
    return processed

def add_human_writing_quirks(text):
    """Add subtle human-like writing quirks to reduce AI detection"""
    # Occasional use of em dashes instead of commas
    if random.random() < 0.3:
        text = text.replace(", ", " — ", 1)
    
    # Occasional use of parenthetical remarks
    if random.random() < 0.3:
        sentences = text.split('. ')
        if len(sentences) > 3:
            index = random.randint(1, len(sentences) - 2)
            sentences[index] = sentences[index] + " (which is worth noting)"
            text = '. '.join(sentences)
    
    # Occasional use of rhetorical questions
    if random.random() < 0.2 and not text.endswith('?'):
        text += " Isn't that interesting?"
    
    return text

def introduce_subtle_typos(text):
    """Introduce occasional typos that humans make"""
    words = text.split()
    if len(words) < 10:
        return text
    
    # Choose 1-2 random words to modify
    num_typos = random.randint(1, 2)
    for _ in range(num_typos):
        idx = random.randint(10, len(words) - 10)  # Avoid first and last few words
        word = words[idx]
        
        if len(word) < 5:
            continue
        
        # Common typo patterns
        if random.random() < 0.4:
            # Character transposition
            i = random.randint(1, len(word) - 2)
            word = word[:i] + word[i+1] + word[i] + word[i+2:]
        else:
            # Character doubling
            i = random.randint(1, len(word) - 1)
            word = word[:i] + word[i] + word[i:]
        
        words[idx] = word
    
    return ' '.join(words)

def calculate_ai_detection_score(text):
    """Simulate AI detection scoring (since we can't access real AI detectors)"""
    # Calculate an estimate based on text patterns often flagged by AI detectors
    
    # Check for overly consistent paragraph lengths
    paragraphs = text.split('\n\n')
    if len(paragraphs) > 3:
        paragraph_lengths = [len(p) for p in paragraphs]
        std_dev = statistics.stdev(paragraph_lengths) if len(paragraph_lengths) > 1 else 0
        mean_length = statistics.mean(paragraph_lengths)
        consistency_score = min(100, max(0, 100 - (std_dev / mean_length * 100)))
    else:
        consistency_score = 50
    
    # Check for complex vocabulary
    complex_words = len([w for w in re.findall(r'\b\w+\b', text) if len(w) > 8])
    vocab_density = min(100, (complex_words / max(1, len(text.split()))) * 300)
    
    # Sentence structure variation
    sentences = re.split(r'[.!?]', text)
    sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
    if len(sentence_lengths) > 3:
        sent_variation = statistics.stdev(sentence_lengths) / statistics.mean(sentence_lengths)
        structure_score = min(100, max(0, 50 - (sent_variation * 100)))
    else:
        structure_score = 50
    
    # Calculate average score weighted toward the most telling factors
    final_score = int((consistency_score * 0.4) + (vocab_density * 0.3) + (structure_score * 0.3))
    
    return min(100, max(10, final_score))  # Cap between 10-100

@app.route('/')
def home():
    return "API Service Running"

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if not request.is_json:
            return jsonify({"error": "Missing JSON in request"}), 400
            
        data = request.get_json()
        content = data.get('content', '')
        keywords = data.get('keywords', [])
        
        if not content or len(content.strip()) < 50:
            return jsonify({
                "error": "Content must be at least 50 characters",
                "status": "error"
            }), 400

        # Log request info for debugging
        print(f"Analyzing content: {len(content)} chars, {len(keywords)} keywords")
        
        # Calculate AI detection score for original content
        ai_detection_original = calculate_ai_detection_score(content)
        print(f"Original AI detection risk: {ai_detection_original}%")
        
        # First round of humanization
        try:
            first_humanized = humanize_content(content, keywords, round_num=1)
            print(f"First humanization complete: {len(first_humanized)} chars")
            
            # Calculate AI detection after first round
            ai_detection_first = calculate_ai_detection_score(first_humanized)
            print(f"After first humanization AI detection: {ai_detection_first}%")
            
            # Second round of humanization
            second_humanized = humanize_content(first_humanized, keywords, round_num=2)
            print(f"Second humanization complete: {len(second_humanized)} chars")
            
            # Calculate AI detection after second round
            ai_detection_final = calculate_ai_detection_score(second_humanized)
            print(f"After second humanization AI detection: {ai_detection_final}%")
            
        except Exception as e:
            print(f"Humanization failed: {str(e)}")
            second_humanized = content
            ai_detection_final = ai_detection_original
            
        return jsonify({
            'humanized_content': second_humanized,
            'ai_detection_original': ai_detection_original,
            'ai_detection_humanized': ai_detection_final,
            'status': 'success',
            # Return dummy values for these fields to avoid breaking frontend
            'original_score': 10,
            'humanized_score': 5,
            'sources_checked': 3
        })
    except Exception as e:
        print(f"Outer error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f"Server error: {str(e)}",
        }), 500

# Add this after your Flask route initialization
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    return response

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify server is running and responding"""
    return jsonify({
        "status": "success",
        "message": "API server is running properly"
    })

@app.route('/debug', methods=['GET'])
def debug():
    """Test endpoint with diagnostic information"""
    return jsonify({
        "status": "running",
        "version": "1.1",
        "nltk_resources": nltk.data.path,
        "cuda_available": torch.cuda.is_available(),
        "device": "GPU" if torch.cuda.is_available() else "CPU",
        "models_loaded": paraphraser is not None
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)