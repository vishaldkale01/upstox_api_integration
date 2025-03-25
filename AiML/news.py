from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from textblob import TextBlob

# Load FinBERT
model_name = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def get_sentiment(text):
    blob = TextBlob(text)
    sentiment_polarity = blob.sentiment.polarity
    print("sentiment_polarity: ", sentiment_polarity)
    if sentiment_polarity > 0:
        sentiment = "Positive"
    elif sentiment_polarity < 0:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"
    
    return sentiment

# Example
news_text = """Breaking News: Banking Sector Gains Momentum as RBI Holds Interest Rates, But Loan Defaults Rise

The Reserve Bank of India (RBI) has decided to keep the repo rate unchanged, signaling confidence in economic stability and boosting market sentiment. This move is expected to support credit growth, as businesses and consumers can continue to borrow at stable interest rates. Bank stocks surged following the announcement, with major private and PSU banks witnessing increased investor interest.

Additionally, banking sector reforms and digital lending initiatives have shown promising results, further strengthening the outlook for financial institutions. Analysts predict that the stability in monetary policy will help banks maintain healthy profit margins and sustain long-term growth.

However, concerns remain as reports indicate a slight increase in loan defaults in the SME sector. Rising NPAs in certain segments have led to cautious optimism among investors, but experts believe that strong liquidity measures and risk management strategies will prevent any major disruptions.

Following the announcement, Bank Nifty opened higher and continued its upward trend, reflecting investor confidence in the sector's resilience despite minor concerns over asset quality.
""" 
print(get_sentiment(news_text))  # Output: "Positive"
