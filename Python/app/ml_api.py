import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .schemas import CareerGapRequest, RecommendationRequest, RetrainRequest, ScoreRequest
from .service import RecommendationMlService

# Keep one service instance for the app lifetime so model data is loaded once.
service = RecommendationMlService()
router = APIRouter(prefix="/ml", tags=["recommendation-ml"])


@router.get("/health")
def ml_health() -> dict:
    return service.health()


@router.get("/model-info")
def model_info() -> dict:
    return service.get_model_info()


@router.get("/snapshot")
def model_snapshot() -> dict:
    return service.get_model_snapshot()


@router.get("/evaluation")
def evaluation() -> dict:
    try:
        return service.get_evaluation()
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/recommend")
def recommend(payload: RecommendationRequest) -> dict:
    return service.recommend(payload.model_dump())


@router.post("/explainability")
def explainability(payload: RecommendationRequest) -> dict:
    return service.explainability(payload.model_dump())


@router.post("/explainability/session")
def explainability_session(payload: RecommendationRequest) -> dict:
    return service.create_explainability_session(payload.model_dump())


@router.get("/explainability/stream")
def explainability_stream(payload: str):
    try:
        request_payload = json.loads(payload)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="Invalid explainability stream payload") from error

    return StreamingResponse(
        service.stream_explainability_events(request_payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/explainability/stream/{session_id}")
def explainability_stream_session(session_id: str):
    try:
        request_payload = service.get_explainability_session_payload(session_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return StreamingResponse(
        service.stream_explainability_events(request_payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/score")
def score(payload: ScoreRequest) -> dict:
    return service.score_feature_vector(payload.model_dump())


@router.post("/career-gaps")
def career_gaps(payload: CareerGapRequest) -> dict:
    return service.career_gaps(payload.model_dump())


@router.post("/retrain")
def retrain(payload: RetrainRequest) -> dict:
    return service.retrain(payload.datasetPath)
