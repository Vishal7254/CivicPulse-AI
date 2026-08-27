from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "CivicPulse AI Backend is Running"}