from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
from typing import Optional
import httpx

from insights.quality_check import score_quality_from_bytes

app = FastAPI(
    title="NextGen Commerce ML Service",
    version="0.2.0",
    description="Heuristics + stubs. Quality check uses OpenCV — not a trained spoilage model.",
)


class RecommendRequest(BaseModel):
    productId: str


class ForecastRequest(BaseModel):
    productId: str


class TagImageRequest(BaseModel):
    imageUrl: str


class QualityUrlRequest(BaseModel):
    imageUrl: str
    category: str = "Vegetables"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "nextgen-ml",
        "qualityCheck": "opencv-heuristic",
    }


@app.post("/recommend")
def recommend(body: RecommendRequest):
    return {
        "productId": body.productId,
        "recommendations": [],
        "note": "Not implemented yet — build step 7",
    }


@app.post("/forecast")
def forecast(body: ForecastRequest):
    return {
        "productId": body.productId,
        "forecast": [],
        "note": "Not implemented yet — build step 7",
    }


@app.post("/tag-image")
def tag_image(body: TagImageRequest):
    return {
        "imageUrl": body.imageUrl,
        "tags": [],
        "note": "Not implemented yet — build step 7",
    }


@app.post("/quality-check")
async def quality_check_upload(
    category: str = Form("Vegetables"),
    file: UploadFile = File(...),
):
    """Multipart photo → classical CV quality score (0–1) + components."""
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty image")
    try:
        result = score_quality_from_bytes(data, category)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Quality check failed: {exc}") from exc
    return result


@app.post("/quality-check-url")
async def quality_check_url(body: QualityUrlRequest):
    """Fetch a public image URL and score it with the same OpenCV heuristics."""
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            res = await client.get(str(body.imageUrl))
            res.raise_for_status()
            data = res.content
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Could not fetch image: {exc}") from exc
    try:
        result = score_quality_from_bytes(data, body.category)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Quality check failed: {exc}") from exc
    return result
