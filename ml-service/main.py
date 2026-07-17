from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
from typing import Optional
import httpx

from insights.quality_check import score_quality_from_bytes
from rag import get_rag

app = FastAPI(
    title="Angadi ML Service",
    version="0.3.0",
    description="Heuristics + stubs. Quality check uses OpenCV. RAG is a dummy keyword pipeline.",
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


class RagQueryRequest(BaseModel):
    query: str
    source: Optional[str] = None  # heatmap | freshness | inventory | market | admin
    topK: int = 3


class RagIngestDoc(BaseModel):
    id: str
    source: str
    topic: str
    text: str


class RagIngestRequest(BaseModel):
    docs: list[RagIngestDoc]


class RagHeatmapRequest(BaseModel):
    weight: str = "density"  # density | orders | price
    region: str = "Chennai"
    competitorCount: int = 0


@app.get("/health")
def health():
    rag = get_rag()
    return {
        "status": "ok",
        "service": "angadi-ml",
        "qualityCheck": "opencv-heuristic",
        "rag": {"mode": "dummy", "docs": len(rag.docs)},
    }


@app.post("/rag/query")
def rag_query(body: RagQueryRequest):
    """Dummy RAG retrieve + template answer (heatmap / insights / chat later)."""
    result = get_rag().query(body.query, source=body.source, top_k=body.topK)
    return {
        "answer": result.answer,
        "citations": result.citations,
        "mode": result.mode,
        "retrieved": result.retrieved,
    }


@app.post("/rag/heatmap")
def rag_heatmap(body: RagHeatmapRequest):
    """Dummy brief for competitor / admin heatmap widgets."""
    result = get_rag().heatmap_brief(
        weight=body.weight,
        region=body.region,
        competitor_count=body.competitorCount,
    )
    return {
        "answer": result.answer,
        "citations": result.citations,
        "mode": result.mode,
        "retrieved": result.retrieved,
        "weight": body.weight,
        "region": body.region,
    }


@app.post("/rag/ingest")
def rag_ingest(body: RagIngestRequest):
    """Append docs into the in-memory dummy corpus (lost on restart)."""
    n = get_rag().ingest([d.model_dump() for d in body.docs])
    return {"ingested": n, "total": len(get_rag().docs), "mode": "dummy"}


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
