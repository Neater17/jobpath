from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

# Request schemas for the recommendation/ML API surface.
CareerPathKey = Literal[
    "business_intelligence",
    "data_stewardship",
    "data_engineering",
    "data_science",
    "ai_engineering",
    "applied_research",
]
CertificationSignalKey = Literal[
    "sql_certification",
    "python_certification",
    "governance_certification",
]


class RecommendationQuestion(BaseModel):
    id: str
    text: Optional[str] = None
    competencies: List[str]


class RecommendationRequest(BaseModel):
    selectedPathKey: Optional[CareerPathKey] = None
    selectedCareerName: Optional[str] = None
    iHave: List[str] = Field(default_factory=list)
    iHaveNot: List[str] = Field(default_factory=list)
    questions: List[RecommendationQuestion] = Field(default_factory=list)
    explainabilityMethod: Literal["auto", "shap", "lime"] = "auto"
    includeExplainability: bool = True


class CertificationSignal(BaseModel):
    key: CertificationSignalKey
    label: str
    value: float


class RecommendationSummaryInput(BaseModel):
    completionRate: float
    haveRate: float
    answeredCount: int
    totalQuestions: int
    source: Literal["backend"] = "backend"


class ScoreRequest(BaseModel):
    featureVector: List[float]
    certificationSignals: List[CertificationSignal] = Field(default_factory=list)
    selectedPathKey: Optional[CareerPathKey] = None
    selectedCareerName: Optional[str] = None
    explainabilityMethod: Literal["auto", "shap", "lime"] = "auto"
    includeExplainability: bool = True
    summary: RecommendationSummaryInput


class CareerGapRequest(BaseModel):
    pathKey: CareerPathKey
    careerName: str
    featureVector: List[float]


class RetrainRequest(BaseModel):
    datasetPath: Optional[str] = None
