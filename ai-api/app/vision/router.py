import json
from fastapi import APIRouter, UploadFile, File, Form
from app.vision.listing_generator import generate_listing, hash_image, check_duplicate

router = APIRouter()


@router.post("/generate-listing")
async def generate_listing_endpoint(
    image: UploadFile = File(...),
    part_number: str = Form(default=""),
    donor_vehicle: str = Form(default="{}"),
    existing_hashes: str = Form(default="[]"),
):
    image_bytes = await image.read()
    donor = json.loads(donor_vehicle) if donor_vehicle else {}
    hashes_list = json.loads(existing_hashes) if existing_hashes else []

    new_hashes = hash_image(image_bytes)
    duplicate_check = check_duplicate(new_hashes, hashes_list)
    listing = generate_listing(image_bytes, part_number, donor)

    listing_score = _score_listing(listing, duplicate_check)

    return {
        "listing": listing,
        "image_hashes": new_hashes,
        "duplicate_check": duplicate_check,
        "listing_score": listing_score,
    }


def _score_listing(listing: dict, duplicate_check: dict) -> dict:
    score = 0
    missing = []

    if listing.get("title"):
        score += 15
    if listing.get("description") and len(listing["description"]) > 50:
        score += 20
    if listing.get("condition"):
        score += 10
    if listing.get("compatible_vehicles") and listing["compatible_vehicles"]:
        score += 20
    if listing.get("suggested_price_gbp_min"):
        score += 10
    if listing.get("condition_notes"):
        score += 10

    if not listing.get("compatible_vehicles"):
        missing.append("Compatible vehicles list")
    if not listing.get("condition_notes"):
        missing.append("Condition detail")

    if duplicate_check.get("flag") == "DUPLICATE":
        score = max(0, score - 30)
        missing.append("Unique photo required — duplicate image detected")

    return {
        "score": round(score / 95, 2),
        "missing": missing,
        "recommendation": "Add missing fields to improve buyer confidence." if missing else "Listing looks complete.",
    }
