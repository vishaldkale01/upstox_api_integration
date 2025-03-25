from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load FinBERT
model_name = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def get_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    
    labels = ["Negative", "Neutral", "Positive"]
    sentiment = labels[torch.argmax(probs).item()]
    
    return sentiment

# Example
news_text = "BankNifty is showing strong bearsish momentum as FIIs increase their investments."
print(get_sentiment(news_text))  # Output: "Positive"
