from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load FinBERT
model_name = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def preprocess_text(text):
    """Preprocess the input text for better model performance."""
    # Example preprocessing: remove special characters and lowercase
    text = text.replace("\n", " ").strip()
    return text

def analyze_sentiment(text, confidence_threshold=0.6):
    """
    Analyze sentiment of the given text using FinBERT.
    
    Args:
        text (str): The input text to analyze.
        confidence_threshold (float): Minimum confidence for a valid prediction.
    
    Returns:
        str: Predicted sentiment label.
        list: Probabilities for each sentiment class.
    """
    # Preprocess the text
    text = preprocess_text(text)
    
    # Tokenize input text
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    
    # Run through the model
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Get sentiment scores
    logits = outputs.logits
    probabilities = torch.nn.functional.softmax(logits, dim=-1).squeeze().tolist()
    labels = ['positive', 'negative', 'neutral']
    
    # Get the predicted label and confidence
    max_prob = max(probabilities)
    sentiment = labels[torch.argmax(torch.tensor(probabilities))]
    
    # Apply confidence threshold
    if max_prob < confidence_threshold:
        sentiment = "uncertain"
    
    return sentiment, probabilities

# Example
news_text = """
India’s retail credit market is experiencing a slowdown, with the latest TransUnion CIBIL Credit Market Indicator (CMI) report showing a decline in credit demand and supply.
India’s retail credit market is experiencing a slowdown, with the latest TransUnion CIBIL Credit Market Indicator (CMI) showing a decline in credit demand and supply.

The CMI value for December 2024 stood at 101, down from 103 in the previous quarter, marking one of the slowest growth rates in recent years, according to the report.

The slowdown has hit private banks the hardest, with their CMI value dropping to a three-year low of 92.

NBFCs, on the other hand, maintained a stronger position with a 22 percent year-on-year (YoY) growth and a CMI of 103.

NTC customers hit

The report highlighted a continued decline in consumption-driven lending, with a significant impact on new-to-credit (NTC) consumers.

While public sector banks (PSUs) reported a 2 percent YoY growth in accounts disbursed, private sector banks saw a steep 23 percent decline.

Despite the overall slowdown, personal loan credit performance stabilised for the first time since June 2023, suggesting a potential recovery in this segment.

However, home loan and credit card originations continued to decline, according to the report.

Borrowers from semi-urban and rural areas accounted for 51 percent of the demand, reflecting a 2 percent year-on-year growth, while younger consumers (below 25 years) maintained a stable share of 21 percent.
""" 

sentiment, probabilities = analyze_sentiment(news_text)
print(f"Sentiment: {sentiment}")
print(f"Probabilities: {probabilities}")