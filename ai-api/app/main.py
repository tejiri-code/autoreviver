from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.fitment.router import router as fitment_router
from app.vision.router import router as vision_router
from app.trust.router import router as trust_router
from app.rag.router import router as rag_router

app = FastAPI(title="AutoReviver AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fitment_router, prefix="/fitment", tags=["Fitment"])
app.include_router(vision_router, prefix="/vision", tags=["Vision"])
app.include_router(trust_router, prefix="/trust", tags=["Trust"])
app.include_router(rag_router, prefix="/search", tags=["Search"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "autoreviver-ai"}
