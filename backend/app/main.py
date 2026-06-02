from fastapi import FastAPI

app = FastAPI(title="Verity API")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "verity"}
