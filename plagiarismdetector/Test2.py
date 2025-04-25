import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import re
import time

# Configuration
DETECTION_MODEL = "Hello-SimpleAI/chatgpt-detector-roberta"
REWRITE_MODEL = "facebook/bart-large-cnn"
MAX_TOKENS = 400  # Reduced for safety
MAX_ITERATIONS = 3

# Initialize models locally
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load detection model
try:
    detection_tokenizer = AutoTokenizer.from_pretrained(DETECTION_MODEL)
    detection_model = AutoModelForSequenceClassification.from_pretrained(DETECTION_MODEL).to(device)
except Exception as e:
    print(f"Error loading detection model: {str(e)}")
    exit(1)

# Load rewrite model
try:
    rewrite_pipe = pipeline(
        "text2text-generation",
        model=REWRITE_MODEL,
        device=device,
        torch_dtype=torch.bfloat16 if device == "cuda" else None
    )
except Exception as e:
    print(f"Error loading rewrite model: {str(e)}")
    exit(1)

def chunk_text(text, tokenizer, max_tokens=MAX_TOKENS):
    """Improved chunking with sentence boundary awareness"""
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence_length = len(tokenizer.encode(sentence))
        if current_length + sentence_length > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

def detect_ai(text):
    """Local AI detection with error handling"""
    try:
        inputs = detection_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        ).to(device)
        
        with torch.no_grad():
            outputs = detection_model(**inputs)
        
        probs = torch.softmax(outputs.logits, dim=1)
        return probs[0][1].item()  # Return "AI-generated" probability
        
    except Exception as e:
        print(f"Detection error: {str(e)}")
        return None

def rewrite_content(text):
    """Improved rewriting with structure preservation"""
    try:
        response = rewrite_pipe(
            f"Paraphrase while maintaining technical terms and markdown: {text}",
            max_length=len(text.split()) + 100,
            temperature=0.7,
            repetition_penalty=1.2,
            do_sample=True
        )
        return response[0]['generated_text']
    except Exception as e:
        print(f"Rewrite error: {str(e)}")
        return text

def process_content(text, threshold=0.25):
    """Full processing pipeline with safety checks"""
    original_length = len(text.split())
    
    for iteration in range(MAX_ITERATIONS):
        # Detection phase
        chunks = chunk_text(text, detection_tokenizer)
        scores = []
        
        for chunk in chunks:
            score = detect_ai(chunk)
            if score is not None:
                scores.append(score)
        
        if not scores:
            print("Detection failed, using fallback")
            return text
        
        max_score = max(scores)
        print(f"Iteration {iteration+1}: Max AI Score {max_score*100:.1f}%")
        
        if max_score <= threshold:
            print("Threshold met!")
            return text
        
        # Rewrite phase
        rewritten_chunks = []
        for chunk in chunks:
            rewritten = rewrite_content(chunk)
            rewritten_chunks.append(rewritten)
            time.sleep(1)  # Rate limit protection
            
        new_text = "\n\n".join(rewritten_chunks)
        
        # Quality check
        if len(new_text.split()) < original_length * 0.7:
            print("Quality check failed: content too short")
            return text
            
        text = new_text
    
    print("Max iterations reached")
    return text

# Example usage
if __name__ == "__main__":
    blog_content = """# Discover Karachi: The Heartbeat of Pakistan

Welcome to Karachi, a sprawling metropolis that stands as the largest city in Pakistan and one of the most vibrant urban centers in the world. Known for its rich history, diverse culture, and dynamic lifestyle, Karachi offers something for everyone—making it an ideal destination for all ages. Whether you’re a local or a visiting tourist, Karachi's unique blend of tradition and modernity never fails to impress. 

## A City of Diversity

Karachi is often referred to as the "City of Lights" due to its bustling streets and vibrant nightlife. The city is a melting pot of cultures, with people from various ethnic backgrounds coexisting harmoniously. Its diverse population contributes to an eclectic mix of languages, cuisines, and traditions.

### Culture and Heritage

Walking through the streets of Karachi, you're likely to hear Urdu, Sindhi, Punjabi, Pashto, and English, among others. You can indulge in mouthwatering delicacies ranging from spicy biryani to street-side chaat. For culture enthusiasts, the city boasts numerous museums, galleries, and historical sites, such as the Quaid-e-Azam’s Mausoleum, which is a must-visit for anyone looking to delve into Pakistan’s history.

## Karachi Literature Festival (KLF)

One of the city’s major cultural events is the annual Karachi Literature Festival (KLF). Launched in 2010, KLF has become a prime platform for authors, poets, and literary enthusiasts to come together and celebrate literature in all its forms. The festival attracts thousands of attendees each year, featuring panel discussions, book launches, and poetry recitals. 

Every age group can find something to enjoy at KLF—children can attend storytelling sessions, while adults can engage in thought-provoking discussions led by renowned authors. The festival not only promotes reading and writing but also encourages conversations about critical social issues, making it a cornerstone of Karachi's cultural landscape.

## Attractions for All Ages

Karachi is replete with attractions suitable for families, young adults, and seniors alike. Here are some highlights:

### Fun for Families

1. **Clifton Beach**: Spend a relaxing day at the beach, enjoying camel rides, snacks from local vendors, and breathtaking sunsets.

   

2. **Pakistan Maritime Museum**: This museum is perfect for families, offering interactive exhibits and a chance to explore naval artifacts, making it both educational and fun.

3. **Frere Hall**: A historical site surrounded by gardens, ideal for a leisurely family picnic.

### Entertainment for Young Adults

1. **Dolmen Mall**: A hub for shopping and entertainment, featuring local and international brands, eateries, and cinemas.

2. **Indus Valley School of Art and Architecture**: Attend art exhibitions or workshops, which often host young and budding artists.

3. **Café Culture**: The vibrant café scene in Karachi is perfect for young adults looking to unwind and meet friends.

### Activities for Seniors

1. **Cultural Walks**: Join guided tours through historical neighborhoods to appreciate the city’s colonial architecture.

2. **Art Galleries**: Spend an afternoon at galleries such as the Chawkandi Art Gallery, which often exhibit local talent and provide a serene environment.

3. **Parks and Gardens**: Karachi is home to various parks like Hill Park, offering serene green spaces for leisurely strolls or quiet afternoons.

## Conclusion

Karachi is not just a city; it is an experience that caters to all ages and interests. From its rich history to modern cultural events like the Karachi Literature Festival, the city pulses with energy and potential. Whether you are a foodie, a history buff, or someone simply looking for adventure, Karachi promises an unforgettable journey.

If you ever find yourself in Pakistan, make sure to explore this magnificent city that thrives with hope, resilience, and endless opportunities. Karachi awaits you!"""
    
    final_content = process_content(blog_content)
    print("\nFinal Content:\n")
    print(final_content)