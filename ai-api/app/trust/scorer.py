"""
Trust scoring for sellers and listings.
Pure deterministic logic — no LLM involved.
"""

SAFETY_CRITICAL_KEYWORDS = {
    "airbag", "brake", "caliper", "tyre", "wheel", "suspension",
    "steering", "seatbelt", "abs", "battery", "headlight"
}


def score_seller(seller: dict) -> dict:
    score = 60  # baseline
    signals = {"positive": [], "risk": []}

    if seller.get("company_verified"):
        score += 15
        signals["positive"].append("Companies House verified")

    if seller.get("vat_verified"):
        score += 10
        signals["positive"].append("VAT number verified")

    if seller.get("total_sales", 0) > 50:
        score += 10
        signals["positive"].append(f"{seller['total_sales']} completed sales")

    if seller.get("return_policy"):
        score += 5
        signals["positive"].append("Return policy stated")

    wrong_claims = seller.get("wrong_part_claims", 0)
    if wrong_claims > 5:
        score -= wrong_claims * 3
        signals["risk"].append(f"{wrong_claims} wrong-part claims on record")

    disputes = seller.get("unresolved_disputes", 0)
    if disputes > 0:
        score -= disputes * 10
        signals["risk"].append(f"{disputes} unresolved disputes")

    score = max(0, min(100, score))

    return {
        "seller_score": score,
        "signals": signals,
        "risk_level": _risk_level(score),
    }


def score_listing(listing: dict, seller_score: int, duplicate_flag: str) -> dict:
    score = seller_score * 0.4
    signals = {"positive": [], "risk": []}

    if listing.get("title") and len(listing.get("title", "")) > 10:
        score += 10
        signals["positive"].append("Title present")

    if listing.get("description") and len(listing.get("description", "")) > 80:
        score += 10
        signals["positive"].append("Description provided")

    if listing.get("oem_number") or listing.get("part_number"):
        score += 15
        signals["positive"].append("Part number provided")

    if listing.get("donor_vehicle"):
        score += 10
        signals["positive"].append("Donor vehicle specified")

    if listing.get("condition"):
        score += 5
        signals["positive"].append("Condition graded")

    if listing.get("image_count", 0) >= 3:
        score += 10
        signals["positive"].append("Multiple images uploaded")
    elif listing.get("image_count", 0) == 1:
        signals["risk"].append("Only one image — request additional photos")

    if duplicate_flag == "DUPLICATE":
        score -= 30
        signals["risk"].append("Duplicate image detected — possible fraud")

    part_name = str(listing.get("part_category", "")).lower()
    is_safety_critical = any(kw in part_name for kw in SAFETY_CRITICAL_KEYWORDS)
    if is_safety_critical:
        score -= 5
        signals["risk"].append("Safety-critical part — extra verification recommended")

    score = max(0, min(100, score))

    return {
        "trust_score": round(score / 100, 2),
        "risk_level": _risk_level(score),
        "is_safety_critical": is_safety_critical,
        "signals": signals,
        "recommendations": _recommendations(signals["risk"], is_safety_critical),
    }


def _risk_level(score: int) -> str:
    if score >= 75:
        return "low"
    if score >= 50:
        return "medium"
    return "high"


def _recommendations(risks: list, safety_critical: bool) -> list:
    recs = []
    if safety_critical:
        recs.append("Have this part inspected by a qualified mechanic before fitting.")
    if any("duplicate" in r.lower() for r in risks):
        recs.append("Do not purchase — contact AutoReviver support.")
    if any("image" in r.lower() for r in risks):
        recs.append("Request additional photos from the seller before purchasing.")
    if any("dispute" in r.lower() for r in risks):
        recs.append("Review seller history carefully before proceeding.")
    return recs
