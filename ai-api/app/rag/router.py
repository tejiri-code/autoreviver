from fastapi import APIRouter
from pydantic import BaseModel
from app.rag.search import extract_part_intent, semantic_search, index_listing

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    vehicle: dict = {}
    top_k: int = 10


class IndexRequest(BaseModel):
    listing_id: str
    listing: dict


@router.post("/semantic")
def search(req: SearchRequest):
    intent = extract_part_intent(req.query)
    hits = semantic_search(req.query, top_k=req.top_k)
    return {"intent": intent, "results": hits, "query": req.query}


@router.post("/index")
def index(req: IndexRequest):
    index_listing(req.listing_id, req.listing)
    return {"status": "indexed", "listing_id": req.listing_id}


@router.post("/intent")
def intent_only(body: dict):
    return extract_part_intent(body.get("query", ""))
