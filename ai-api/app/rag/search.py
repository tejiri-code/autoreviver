"""
Semantic search using sentence-transformers + ChromaDB.
Intent extraction uses HuggingFace Inference API.
"""

import os
import re
import requests
import json

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_TEXT_MODEL = os.getenv("HF_TEXT_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
HF_HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

_embed_model = None
_chroma_client = None
_collection = None


def get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer

        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def get_collection():
    global _chroma_client, _collection
    if _chroma_client is None:
        import chromadb

        _chroma_client = chromadb.PersistentClient(path="/app/chroma")
        _collection = _chroma_client.get_or_create_collection("listings")
    return _collection


def extract_part_intent(query: str) -> dict:
    """Use HF LLM to extract structured intent from natural language query."""
    prompt = f"""[INST] Extract automotive part search intent from this query.

Query: "{query}"

Return ONLY valid JSON with these keys (use null if not mentioned):
- part_category (string, e.g. "headlight", "bumper", "caliper")
- make (string, e.g. "Ford", "VW")
- model (string, e.g. "Fiesta", "Golf")
- year (integer or null)
- side (string: "left"/"right"/"front"/"rear" or null)
- fuel_type (string or null)

Return only the JSON object. [/INST]"""

    url = f"https://api-inference.huggingface.co/models/{HF_TEXT_MODEL}"
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 150, "temperature": 0.1, "return_full_text": False},
    }
    try:
        resp = requests.post(url, headers=HF_HEADERS, json=payload, timeout=30)
        if resp.status_code == 200:
            text = resp.json()[0].get("generated_text", "")
            parsed = _parse_json(text)
            if parsed:
                return parsed
    except Exception:
        pass

    return _regex_fallback(query)


def _regex_fallback(query: str) -> dict:
    q = query.lower()
    sides = {"left": "left", "right": "right", "front": "front", "rear": "rear",
             "passenger": "left", "driver": "right", "offside": "right", "nearside": "left"}
    makes = ["ford", "vw", "volkswagen", "vauxhall", "bmw", "audi", "toyota",
             "nissan", "honda", "mercedes", "mini", "seat", "skoda", "hyundai", "kia"]
    parts = ["headlight", "bumper", "wing mirror", "door", "bonnet", "caliper",
             "alternator", "radiator", "starter", "seat", "wheel", "tyre", "sensor"]

    intent = {"part_category": None, "make": None, "model": None, "year": None, "side": None}

    for make in makes:
        if make in q:
            intent["make"] = make.title()
            break

    for part in parts:
        if part in q:
            intent["part_category"] = part
            break

    for side_kw, side_val in sides.items():
        if side_kw in q:
            intent["side"] = side_val
            break

    year_match = re.search(r"\b(19|20)\d{2}\b", query)
    if year_match:
        intent["year"] = int(year_match.group())

    return intent


def index_listing(listing_id: str, listing: dict):
    """Add or update a listing in the vector index."""
    model = get_embed_model()
    collection = get_collection()

    text = f"{listing.get('title', '')} {listing.get('description', '')} {listing.get('part_category', '')} {listing.get('make', '')} {listing.get('model', '')}"
    embedding = model.encode(text).tolist()

    collection.upsert(
        ids=[listing_id],
        embeddings=[embedding],
        metadatas=[{
            "listing_id": listing_id,
            "make": listing.get("make", ""),
            "model": listing.get("model", ""),
            "part_category": listing.get("part_category", ""),
            "side": listing.get("side", ""),
        }],
        documents=[text],
    )


def semantic_search(query: str, top_k: int = 10) -> list:
    model = get_embed_model()
    collection = get_collection()

    embedding = model.encode(query).tolist()
    results = collection.query(query_embeddings=[embedding], n_results=top_k)

    hits = []
    for i, meta in enumerate(results["metadatas"][0]):
        hits.append({
            "listing_id": meta.get("listing_id"),
            "score": float(results["distances"][0][i]) if results.get("distances") else 0,
            "metadata": meta,
        })
    return hits


def _parse_json(text: str) -> dict | None:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None
