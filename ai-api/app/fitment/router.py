from fastapi import APIRouter
from pydantic import BaseModel
from app.fitment.engine import score_fitment

router = APIRouter()


class FitmentRequest(BaseModel):
    buyer_vehicle: dict
    part_listing: dict


@router.post("/check")
def check_fitment(req: FitmentRequest):
    result = score_fitment(req.buyer_vehicle, req.part_listing)
    return result
