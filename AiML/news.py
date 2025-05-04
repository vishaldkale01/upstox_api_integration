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
US stocks fell sharply on Friday as Wall Street grappled with President Trump's escalating trade war and weighed signs of reinvigorated inflation pressures as consumer sentiment plummets.

The Dow Jones Industrial Average (^DJI) gave up 1.6%, or over 700 points, while the benchmark S&P 500 (^GSPC) fell 2%. The Nasdaq Composite (^IXIC) dropped 2.7% as tech stocks led the declines.

The major averages sank after the release of a hotter-than-expected Personal Consumption Expenditures index reading, which includes the Federal Reserve's preferred inflation gauge of "core" PCE. The reading showed prices increased more than expected last month, rising 0.4% month over month and 2.8% year over year, continuing a stubborn plateau on the path to the Fed's 2% target.

Meanwhile, US consumer sentiment in March plummeted to its lowest level since November 2022. The latest reading from the University of Michigan came in at 57, down from a 64.7 reading in the prior month, as consumers fretted about inflation and broader economy, perhaps most notably in the labor market.
""" 

sentiment, probabilities = analyze_sentiment(news_text)
print(f"Sentiment: {sentiment}")
print(f"Probabilities: {probabilities}")