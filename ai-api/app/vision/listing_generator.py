import os
import base64
import hashlib
import requests
import json
import re
import io

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_IMAGE_MODEL = os.getenv("HF_IMAGE_MODEL", "Salesforce/blip-image-captioning-large")
HF_TEXT_MODEL = os.getenv("HF_TEXT_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")

HF_HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}


def caption_image(image_bytes: bytes) -> str:
    """Send image to HuggingFace BLIP for a basic caption."""
    url = f"https://api-inference.huggingface.co/models/{HF_IMAGE_MODEL}"
    resp = requests.post(url, headers=HF_HEADERS, data=image_bytes, timeout=30)
    if resp.status_code == 200:
        result = resp.json()
        if isinstance(result, list) and result:
            return result[0].get("generated_text", "car part")
    return "used car part"


def generate_listing(image_bytes: bytes, part_number: str, donor_vehicle: dict) -> dict:
    caption = caption_image(image_bytes)

    donor_str = ""
    if donor_vehicle:
        donor_str = f"{donor_vehicle.get('year', '')} {donor_vehicle.get('make', '')} {donor_vehicle.get('model', '')}".strip()

    prompt = f"""[INST] You are an expert automotive parts listing assistant.

Image caption: {caption}
Part number: {part_number or "not provided"}
Donor vehicle: {donor_str or "not provided"}

Generate a professional used car parts marketplace listing. Return ONLY valid JSON with these exact keys:
- title (string, max 80 chars, SEO optimised)
- description (string, 100-150 words, professional tone)
- condition (string: Excellent/Good/Fair/Poor)
- condition_notes (string, 1-2 sentences)
- compatible_vehicles (array of strings)
- suggested_price_gbp_min (integer)
- suggested_price_gbp_max (integer)
- missing_information (array of strings - what buyer should confirm)
- safety_warnings (array of strings, empty if not safety-critical)

Return only the JSON object, no other text. [/INST]"""

    url = f"https://api-inference.huggingface.co/models/{HF_TEXT_MODEL}"
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 600,
            "temperature": 0.3,
            "return_full_text": False,
        },
    }
    resp = requests.post(url, headers=HF_HEADERS, json=payload, timeout=60)

    if resp.status_code == 200:
        raw = resp.json()
        text = raw[0].get("generated_text", "") if isinstance(raw, list) else ""
        listing = _parse_json(text)
        if listing:
            return listing

    # Fallback: structured mock using the caption
    return _fallback_listing(caption, part_number, donor_vehicle, donor_str)


def _parse_json(text: str) -> dict | None:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None


def _fallback_listing(caption: str, part_number: str, donor_vehicle: dict, donor_str: str) -> dict:
    part_hint = caption.lower()
    title = f"Used {caption.title()} — OEM Quality"
    if part_number:
        title += f" | Ref: {part_number}"
    title = title[:80]

    make = donor_vehicle.get("make", "") if donor_vehicle else ""
    model = donor_vehicle.get("model", "") if donor_vehicle else ""
    year = donor_vehicle.get("year", "") if donor_vehicle else ""

    return {
        "title": title,
        "description": (
            f"Used {caption} in good working condition, removed from a {donor_str or 'compatible donor vehicle'}. "
            f"Suitable for selected {make} {model} models. "
            f"All parts are visually inspected before listing. "
            f"Buyer should confirm compatibility with their specific variant before purchasing."
        ),
        "condition": "Good",
        "condition_notes": "Used part in good overall condition. Minor cosmetic wear consistent with age.",
        "compatible_vehicles": [f"{year} {make} {model}".strip()] if make else ["Confirm compatibility with seller"],
        "suggested_price_gbp_min": 20,
        "suggested_price_gbp_max": 60,
        "missing_information": [
            "Confirm exact variant compatibility",
            "Request additional photos if needed",
            "Confirm part number matches your requirement",
        ],
        "safety_warnings": [],
    }


def hash_image(image_bytes: bytes) -> dict:
    try:
        from PIL import Image
        import imagehash

        img = Image.open(io.BytesIO(image_bytes))
        return {
            "phash": str(imagehash.phash(img)),
            "dhash": str(imagehash.dhash(img)),
            "ahash": str(imagehash.average_hash(img)),
        }
    except ModuleNotFoundError:
        digest = hashlib.sha256(image_bytes).hexdigest()
        return {
            "phash": digest[:16],
            "dhash": digest[16:32],
            "ahash": digest[32:48],
        }


def check_duplicate(new_hashes: dict, existing_hashes: list[dict]) -> dict:
    """Compare new image hashes against stored hashes. Returns flag and match info."""
    try:
        from imagehash import hex_to_hash
    except ModuleNotFoundError:
        for stored in existing_hashes:
            if all(new_hashes.get(key) == stored.get(key) for key in ("phash", "dhash", "ahash")):
                return {
                    "flag": "DUPLICATE",
                    "matched_listing_id": stored.get("listing_id"),
                    "matched_seller_id": stored.get("seller_id"),
                    "confidence": "HIGH",
                }
        return {"flag": "CLEAN"}

    new_p = hex_to_hash(new_hashes["phash"])
    new_d = hex_to_hash(new_hashes["dhash"])
    new_a = hex_to_hash(new_hashes["ahash"])

    for stored in existing_hashes:
        try:
            votes = sum([
                (new_p - hex_to_hash(stored["phash"])) <= 8,
                (new_d - hex_to_hash(stored["dhash"])) <= 8,
                (new_a - hex_to_hash(stored["ahash"])) <= 8,
            ])
            if votes >= 2:
                return {
                    "flag": "DUPLICATE",
                    "matched_listing_id": stored.get("listing_id"),
                    "matched_seller_id": stored.get("seller_id"),
                    "confidence": "HIGH" if votes == 3 else "MEDIUM",
                }
        except Exception:
            continue

    return {"flag": "CLEAN"}
