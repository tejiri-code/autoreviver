"""
Deterministic fitment scoring engine.
LLM is never the source of truth here — structured rules only.
"""

SAFETY_CRITICAL = {
    "airbag", "brake", "brakes", "caliper", "tyre", "tyres", "wheel",
    "wheels", "suspension", "steering", "seatbelt", "headlight",
    "battery", "abs", "ecu"
}


def score_fitment(buyer_vehicle: dict, part_listing: dict) -> dict:
    score = 0
    reasons = []
    warnings = []

    bv = {k: str(v).lower().strip() for k, v in buyer_vehicle.items()}
    pl = {k: str(v).lower().strip() for k, v in part_listing.items()}

    # Make match (20pts)
    if bv.get("make") and pl.get("make") and bv["make"] == pl["make"]:
        score += 20
        reasons.append("Make matches")
    elif bv.get("make") and pl.get("make"):
        score -= 10
        warnings.append(f"Make mismatch: your {bv['make']} vs listing {pl['make']}")

    # Model match (20pts)
    if bv.get("model") and pl.get("model") and bv["model"] in pl["model"]:
        score += 20
        reasons.append("Model matches")
    elif bv.get("model") and pl.get("model"):
        warnings.append("Model may not match — verify before purchase")

    # Year range (20pts)
    try:
        year_from = int(pl.get("year_from", 0))
        year_to = int(pl.get("year_to", 9999))
        buyer_year = int(bv.get("year", 0))
        if buyer_year and year_from <= buyer_year <= year_to:
            score += 20
            reasons.append(f"Year {buyer_year} is within compatible range {year_from}–{year_to}")
        elif buyer_year:
            score -= 5
            warnings.append(f"Year {buyer_year} may be outside compatible range {year_from}–{year_to}")
    except (ValueError, TypeError):
        warnings.append("Year range could not be verified")

    # Part category match (15pts)
    buyer_part = bv.get("part_category", "")
    listing_part = pl.get("part_category", "")
    if buyer_part and listing_part and buyer_part in listing_part:
        score += 15
        reasons.append("Part category matches")

    # Side/position match (10pts)
    buyer_side = bv.get("side", "")
    listing_side = pl.get("side", "")
    if buyer_side and listing_side:
        if buyer_side == listing_side:
            score += 10
            reasons.append("Side/position matches")
        else:
            score -= 15
            warnings.append(f"Side mismatch: you need {buyer_side}, listing is {listing_side}")

    # Fuel type (5pts)
    if bv.get("fuel_type") and pl.get("fuel_type"):
        if pl["fuel_type"] in ("any", "all") or bv["fuel_type"] == pl["fuel_type"]:
            score += 5
            reasons.append("Fuel type compatible")

    # Engine size (5pts)
    if bv.get("engine_size") and pl.get("engine_size"):
        if pl["engine_size"] in ("any", "all") or bv["engine_size"] == pl["engine_size"]:
            score += 5
            reasons.append("Engine size compatible")

    # OEM number match (20pts bonus)
    if bv.get("oem_number") and pl.get("oem_number"):
        if bv["oem_number"] == pl["oem_number"]:
            score += 20
            reasons.append("OEM part number matches exactly")

    # Donor vehicle (10pts)
    if pl.get("donor_make") and bv.get("make") and pl["donor_make"] == bv["make"]:
        score += 10
        reasons.append("Donor vehicle make matches your vehicle")

    # Safety-critical warnings
    for kw in SAFETY_CRITICAL:
        if kw in listing_part or kw in buyer_part:
            warnings.append("Safety-critical part — professional inspection recommended before fitting")
            score = max(score - 5, score)
            break

    score = max(0, min(100, score))

    if score >= 85:
        status = "verified_fit"
    elif score >= 65:
        status = "likely_fit"
    elif score >= 40:
        status = "uncertain"
    else:
        status = "likely_incompatible"

    return {
        "fitment_status": status,
        "confidence": round(score / 100, 2),
        "score": score,
        "reasons": reasons,
        "warnings": warnings,
        "recommended_action": _recommended_action(status, warnings),
    }


def _recommended_action(status: str, warnings: list) -> str:
    if status == "verified_fit":
        return "Part is verified compatible. Review warnings before purchase."
    if status == "likely_fit":
        return "Part is likely compatible. Confirm any outstanding points with the seller."
    if status == "uncertain":
        return "Compatibility is uncertain. Contact the seller with your full vehicle spec before purchasing."
    return "This part is likely incompatible with your vehicle. Search for alternatives."
