import time, os

print("Chatbot starting...")
print(f"API_URL: {os.getenv('API_URL', 'http://backend:8000')}")

while True:
    time.sleep(60)