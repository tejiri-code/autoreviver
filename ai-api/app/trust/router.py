from fastapi import APIRouter
from pydantic import BaseModel
from app.trust.scorer import score_seller, score_listing

router = APIRouter()


class SellerScoreRequest(BaseModel):
    seller: dict


class ListingScoreRequest(BaseModel):
    listing: dict
    seller_score: int = 60
    duplicate_flag: str = "CLEAN"


@router.post("/seller")
def trust_seller(req: SellerScoreRequest):
    return score_seller(req.seller)


@router.post("/listing")
def trust_listing(req: ListingScoreRequest):
    return score_listing(req.listing, req.seller_score, req.duplicate_flag)
