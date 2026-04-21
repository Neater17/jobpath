from __future__ import annotations

import json
import math
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, cast

from .catalog import (
    COMPETENCY_LABELS,
    COMPETENCY_ORDER,
    GAP_RECOMMENDATIONS,
    build_career_ladder_entries,
    build_career_profiles,
)
from .explainability import build_career_explainability
from .training_service import resolve_evaluation_path, train_and_persist_recommendation_model

CERTIFICATION_SIGNAL_LABELS = {
    "sql_certification": "PSF-aligned SQL Certification",
    "python_certification": "PSF-aligned Python Certification",
    "governance_certification": "Data Governance Certification",
}
CERTIFICATION_BOOST_SCALE = 0.16
RECOMMENDATION_SCORE_WEIGHTS = {
    "ensemble": 0.75,
    "alignment": 0.25,
}
EXECUTIVE_SIGNAL_COMPETENCIES = (
    "strategy_planning",
    "strategy_implementation",
    "business_agility",
    "stakeholder_management",
    "people_and_performance_management",
    "change_management",
    "portfolio_management",
    "budgeting",
    "systems_thinking",
)
HANDS_ON_SIGNAL_COMPETENCIES = (
    "applications_development",
    "data_engineering",
    "data_analytics",
    "computational_modelling",
    "software_testing",
    "system_integration",
    "statistics_experimentation",
)
LEVEL_SEVEN_EXECUTIVE_SCORE_THRESHOLD = 0.68
LEVEL_SEVEN_EXECUTIVE_STRONG_MIN = 4.0


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def softmax(values: List[float]) -> List[float]:
    if not values:
        return [1.0]
    max_value = max(values)
    exps = [math.exp(value - max_value) for value in values]
    total = sum(exps) or 1.0
    return [value / total for value in exps]


def ensure_distribution(values: List[float]) -> List[float]:
    bounded = [value if math.isfinite(value) and value > 0 else 0.0 for value in values]
    total = sum(bounded)
    if total <= 0:
        equal = 1.0 / max(1, len(bounded))
        return [equal for _ in bounded]
    return [value / total for value in bounded]


def dot(left: List[float], right: List[float]) -> float:
    size = max(len(left), len(right))
    return sum(
        (left[index] if index < len(left) else 0.0) * (right[index] if index < len(right) else 0.0)
        for index in range(size)
    )


def estimate_career_recommendation_confidence(
    *,
    career_score: float,
    top_score: float,
    next_score: float,
    completion_rate: float,
    alignment_score: float,
) -> float:
    bounded_score = clamp01(career_score)
    if top_score <= 0:
        return clamp01(0.25 * completion_rate + 0.25 * alignment_score)

    relative_strength = clamp01(career_score / top_score)
    local_margin = clamp01((career_score - next_score) / max(top_score, 1e-9))
    return clamp01(
        0.35 * bounded_score
        + 0.2 * relative_strength
        + 0.15 * clamp01(completion_rate)
        + 0.2 * clamp01(alignment_score)
        + 0.1 * local_margin
    )


def compute_final_recommendation_score(*, ensemble_score: float, alignment_score: float) -> float:
    return clamp01(
        RECOMMENDATION_SCORE_WEIGHTS["ensemble"] * clamp01(ensemble_score)
        + RECOMMENDATION_SCORE_WEIGHTS["alignment"] * clamp01(alignment_score)
    )


def compute_seniority_evidence(feature_vector: List[float]) -> Dict[str, float]:
    indexed = {
        key: float(feature_vector[index]) if index < len(feature_vector) else 0.0
        for index, key in enumerate(COMPETENCY_ORDER)
    }
    evidence_values = [clamp01(indexed.get(key, 0.0)) for key in EXECUTIVE_SIGNAL_COMPETENCIES]
    if not evidence_values:
        return {
            "score": 0.0,
            "average": 0.0,
            "strongCount": 0.0,
            "maxSignal": 0.0,
        }

    average = sum(evidence_values) / len(evidence_values)
    strong_count = sum(1 for value in evidence_values if value >= 0.58)
    strong_ratio = strong_count / len(evidence_values)
    max_signal = max(evidence_values)
    score = clamp01(0.55 * average + 0.3 * strong_ratio + 0.15 * max_signal)
    return {
        "score": score,
        "average": average,
        "strongCount": float(strong_count),
        "maxSignal": max_signal,
    }


def compute_hands_on_evidence(feature_vector: List[float]) -> Dict[str, float]:
    indexed = {
        key: float(feature_vector[index]) if index < len(feature_vector) else 0.0
        for index, key in enumerate(COMPETENCY_ORDER)
    }
    values = [clamp01(indexed.get(key, 0.0)) for key in HANDS_ON_SIGNAL_COMPETENCIES]
    if not values:
        return {
            "score": 0.0,
            "average": 0.0,
            "strongCount": 0.0,
            "maxSignal": 0.0,
        }

    average = sum(values) / len(values)
    strong_count = sum(1 for value in values if value >= 0.58)
    strong_ratio = strong_count / len(values)
    max_signal = max(values)
    score = clamp01(0.6 * average + 0.25 * strong_ratio + 0.15 * max_signal)
    return {
        "score": score,
        "average": average,
        "strongCount": float(strong_count),
        "maxSignal": max_signal,
    }


def seniority_gate_multiplier(
    level: int,
    executive_evidence_score: float,
    executive_strong_count: float,
    hands_on_evidence_score: float,
) -> float:
    if level < 6:
        return 1.0

    minimum_multiplier = 0.55 if level == 6 else 0.3
    threshold = 0.58 if level == 6 else 0.66
    normalized = clamp01((executive_evidence_score - 0.28) / max(threshold - 0.28, 1e-9))
    if executive_evidence_score >= threshold:
        multiplier = 1.0
    else:
        multiplier = clamp01(minimum_multiplier + (1.0 - minimum_multiplier) * normalized)

    if level < 7:
        return multiplier

    eligible_for_level_seven = (
        executive_evidence_score >= LEVEL_SEVEN_EXECUTIVE_SCORE_THRESHOLD
        and executive_strong_count >= LEVEL_SEVEN_EXECUTIVE_STRONG_MIN
    )
    if not eligible_for_level_seven:
        multiplier = min(multiplier, 0.12)

    executive_gap = max(0.0, hands_on_evidence_score - executive_evidence_score)
    if executive_gap > 0:
        balance_penalty = clamp01(1.0 - executive_gap * 1.35)
        multiplier *= max(0.2 if eligible_for_level_seven else 0.08, balance_penalty)

    return clamp01(multiplier)


def normalize_identifier(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())


CAREER_NAME_ALIASES = {
    normalize_identifier("Machine Learniing Engineer"): "Machine Learning Engineer",
    normalize_identifier("Applied Data/ AI Researcher"): "Applied Data/AI Researcher",
    normalize_identifier("Senior Applied Data Researcher/ AI Researcher"): "Senior Applied Data/AI Researcher",
}


def canonicalize_career_name(value: str) -> str:
    normalized = normalize_identifier(value)
    return CAREER_NAME_ALIASES.get(normalized, value)


class RecommendationMlService:
    def __init__(self, model_path: Optional[str] = None) -> None:
        default_path = Path(__file__).resolve().parents[2] / "backend" / "data" / "recommendation-model.v3.json"
        self.model_path = Path(model_path or os.environ.get("ML_MODEL_PATH") or default_path).resolve()
        self.profiles = build_career_profiles()
        self.ladder_entries = build_career_ladder_entries()
        self.model_payload: Dict[str, Any] = {}
        self.models: Dict[str, Any] = {}
        self.model_info: Dict[str, Any] = {}
        self.sklearn_models: Dict[str, Any] = {}
        self._explainability_sessions: Dict[str, Dict[str, Any]] = {}
        self.reload_model()

    def reload_model(self) -> None:
        payload = json.loads(self.model_path.read_text(encoding="utf-8"))
        self.model_payload = payload
        self.models = payload["models"]
        self.model_info = payload["modelInfo"]
        self.sklearn_models = {}
        if self._model_training_backend() == "sklearn":
            self._load_sklearn_models()

    def _model_training_backend(self) -> str:
        return str(self.model_info.get("trainingBackend") or "custom_python")

    def _load_sklearn_models(self) -> None:
        try:
            import joblib
        except ImportError as error:  # pragma: no cover - depends on environment
            raise RuntimeError(
                "joblib is required to load sklearn-backed recommendation models. "
                "Install Python/requirements.txt before starting the ML service."
            ) from error

        artifact_paths = self.model_info.get("modelArtifacts") or {}
        for key in ("logistic", "randomForest", "gradientBoosting"):
            artifact_path = artifact_paths.get(key) or (self.models.get(key) or {}).get("artifactPath")
            if not artifact_path:
                raise FileNotFoundError(f"Missing sklearn model artifact path for {key}")
            path = Path(str(artifact_path))
            if not path.is_absolute():
                path = (self.model_path.parent / path).resolve()
            if not path.exists():
                raise FileNotFoundError(f"Sklearn model artifact not found: {path}")
            self.sklearn_models[key] = joblib.load(path)

    def _predict_sklearn_model(self, model_key: str, features: List[float]) -> List[float]:
        try:
            import numpy as np
        except ImportError as error:  # pragma: no cover - depends on environment
            raise RuntimeError(
                "numpy is required to score sklearn-backed recommendation models. "
                "Install Python/requirements.txt before starting the ML service."
            ) from error

        estimator = self.sklearn_models.get(model_key)
        if estimator is None:
            raise ValueError(f"Sklearn model '{model_key}' is not loaded")

        classes = [int(value) for value in getattr(estimator, "classes_", [])]
        target_count = max(int(self.model_info.get("classCount") or 0), len(classes), 1)
        raw_probabilities = estimator.predict_proba(np.asarray([features], dtype=float))
        vector = [0.0 for _ in range(target_count)]
        if len(raw_probabilities) > 0:
            for class_index, value in zip(classes, raw_probabilities[0]):
                if 0 <= class_index < len(vector):
                    vector[class_index] = float(value)
        return ensure_distribution(vector)

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "modelPath": str(self.model_path),
            "classCount": self.model_info.get("classCount"),
            "featureCount": self.model_info.get("featureCount"),
            "profileCount": len(self.profiles),
            "ladderEntryCount": len(self.ladder_entries),
            "catalogModelMismatch": self._has_catalog_model_mismatch(),
            "modelClassMode": self._model_class_mode(),
        }

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model": self.model_info,
            "catalog": {
                "profileCount": len(self.profiles),
                "ladderEntryCount": len(self.ladder_entries),
                "modelClassCount": int(self.model_info.get("classCount") or 0),
                "catalogModelMismatch": self._has_catalog_model_mismatch(),
                "modelClassMode": self._model_class_mode(),
            },
            "evaluationPath": str(resolve_evaluation_path(str(self.model_path))),
        }

    def get_evaluation(self) -> Dict[str, Any]:
        evaluation_path = resolve_evaluation_path(str(self.model_path))
        if not evaluation_path.exists():
            raise FileNotFoundError(f"Evaluation file not found: {evaluation_path}")
        return json.loads(evaluation_path.read_text(encoding="utf-8"))

    def retrain(self, _dataset_path: Optional[str] = None) -> Dict[str, Any]:
        self.profiles = build_career_profiles()
        self.ladder_entries = build_career_ladder_entries()
        train_and_persist_recommendation_model(
            dataset_path=_dataset_path,
            model_path=str(self.model_path),
        )
        self.reload_model()
        return {
            "message": "Recommendation model retrained and reloaded",
            "model": self.model_info,
        }

    def recommend(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        questions = self._clean_questions(payload.get("questions") or [])
        if not questions:
            raise ValueError("At least one valid assessment question is required")

        valid_ids = {question["id"] for question in questions}
        i_have = self._clean_answer_ids(payload.get("iHave") or [], valid_ids)
        i_have_not = self._clean_answer_ids(payload.get("iHaveNot") or [], valid_ids)
        i_have_not.difference_update(i_have)

        feature_vector, summary = self._compute_feature_vector(questions, i_have, i_have_not)
        certification_signals = self._compute_certification_signals(questions, i_have)

        return self._score_feature_vector(
            feature_vector=feature_vector,
            certification_signals=certification_signals,
            selected_path_key=payload.get("selectedPathKey"),
            selected_career_name=payload.get("selectedCareerName"),
            explainability_method=payload.get("explainabilityMethod") or "auto",
            include_explainability=bool(payload.get("includeExplainability", True)),
            summary=summary,
        )

    def score_feature_vector(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        summary = payload.get("summary") or {}
        return self._score_feature_vector(
            feature_vector=[clamp01(float(value)) for value in payload.get("featureVector") or []],
            certification_signals=payload.get("certificationSignals") or [],
            selected_path_key=payload.get("selectedPathKey"),
            selected_career_name=payload.get("selectedCareerName"),
            explainability_method=payload.get("explainabilityMethod") or "auto",
            include_explainability=bool(payload.get("includeExplainability", True)),
            summary={
                "completionRate": float(summary.get("completionRate") or 0),
                "haveRate": float(summary.get("haveRate") or 0),
                "answeredCount": int(summary.get("answeredCount") or 0),
                "totalQuestions": int(summary.get("totalQuestions") or 0),
                "source": "backend",
            },
        )

    def explainability(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        questions = self._clean_questions(payload.get("questions") or [])
        if not questions:
            raise ValueError("At least one valid assessment question is required")

        valid_ids = {question["id"] for question in questions}
        i_have = self._clean_answer_ids(payload.get("iHave") or [], valid_ids)
        i_have_not = self._clean_answer_ids(payload.get("iHaveNot") or [], valid_ids)
        i_have_not.difference_update(i_have)

        feature_vector, summary = self._compute_feature_vector(questions, i_have, i_have_not)
        certification_signals = self._compute_certification_signals(questions, i_have)
        scored = self._score_feature_vector(
            feature_vector=feature_vector,
            certification_signals=certification_signals,
            selected_path_key=payload.get("selectedPathKey"),
            selected_career_name=payload.get("selectedCareerName"),
            explainability_method=payload.get("explainabilityMethod") or "auto",
            include_explainability=True,
            summary=summary,
        )
        return {"explainability": scored["result"]["explainability"]}

    def stream_explainability_events(self, payload: Dict[str, Any]):
        try:
            yield self._sse_event("status", {"stage": "starting"})
            explained = self.explainability(payload)
            explainability = explained["explainability"]
            top_career = explainability["topCareer"]
            factors = top_career.get("factors") or []
            strongest_matches = [
                factor
                for factor in factors
                if factor.get("direction") != "negative"
            ][:4]

            yield self._sse_event(
                "meta",
                {
                    "selectedMethod": explainability.get("selectedMethod"),
                    "reason": explainability.get("reason"),
                    "comparison": explainability.get("comparison"),
                    "topCareer": {
                        "method": top_career.get("method"),
                        "careerName": top_career.get("careerName"),
                        "pathKey": top_career.get("pathKey"),
                        "baseScore": top_career.get("baseScore"),
                        "predictedScore": top_career.get("predictedScore"),
                        "reconstructedScore": top_career.get("reconstructedScore"),
                        "quality": top_career.get("quality"),
                    },
                },
            )
            yield self._sse_event(
                "narrative",
                {
                    "narrative": top_career.get("narrative") or "",
                },
            )
            yield self._sse_event(
                "matches",
                {
                    "factors": factors,
                    "strongestMatches": strongest_matches,
                },
            )
            yield self._sse_event("done", {"ok": True})
        except Exception as error:  # pragma: no cover
            yield self._sse_event("failed", {"message": str(error)})

    def create_explainability_session(self, payload: Dict[str, Any]) -> Dict[str, str]:
        self._prune_explainability_sessions()
        session_id = uuid.uuid4().hex
        self._explainability_sessions[session_id] = {
            "payload": payload,
            "createdAt": time.time(),
        }
        return {"sessionId": session_id}

    def get_explainability_session_payload(self, session_id: str) -> Dict[str, Any]:
        self._prune_explainability_sessions()
        session = self._explainability_sessions.pop(session_id, None)
        if session is None:
            raise ValueError("Explainability session not found or expired")
        return cast(Dict[str, Any], session["payload"])

    def _prune_explainability_sessions(self) -> None:
        now = time.time()
        expired = [
            session_id
            for session_id, session in self._explainability_sessions.items()
            if now - float(session.get("createdAt") or 0.0) > 300
        ]
        for session_id in expired:
            self._explainability_sessions.pop(session_id, None)

    def _sse_event(self, event: str, data: Dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    def career_gaps(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        path_key = payload.get("pathKey")
        career_name = payload.get("careerName")
        feature_vector = [clamp01(float(value)) for value in payload.get("featureVector") or []]
        priority_gaps = self._build_priority_gaps(path_key, career_name, feature_vector)
        return {"priorityGaps": priority_gaps}

    def _clean_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cleaned: List[Dict[str, Any]] = []
        seen: set[str] = set()
        competency_set = set(COMPETENCY_ORDER)
        for question in questions:
            if not isinstance(question, dict):
                continue
            question_id = question.get("id")
            if not isinstance(question_id, str) or question_id in seen:
                continue
            competencies = [
                competency for competency in question.get("competencies") or [] if competency in competency_set
            ]
            if not competencies:
                continue
            cleaned.append(
                {
                    "id": question_id,
                    "text": question.get("text") if isinstance(question.get("text"), str) else None,
                    "competencies": list(dict.fromkeys(competencies)),
                }
            )
            seen.add(question_id)
        return cleaned

    def _clean_answer_ids(self, ids: List[Any], valid_ids: set[str]) -> set[str]:
        return {value for value in ids if isinstance(value, str) and value in valid_ids}

    def _compute_feature_vector(
        self,
        questions: List[Dict[str, Any]],
        i_have: set[str],
        i_have_not: set[str],
    ) -> Tuple[List[float], Dict[str, Any]]:
        answered_set = i_have | i_have_not
        answered_count = len(answered_set)
        total_questions = len(questions)
        completion_rate = answered_count / total_questions if total_questions > 0 else 0.0
        have_rate = len(i_have) / answered_count if answered_count > 0 else 0.0

        feature_vector: List[float] = []
        for key in COMPETENCY_ORDER:
            tagged = [question for question in questions if key in question["competencies"]]
            tagged_ids = [question["id"] for question in tagged]
            answered_tagged = len([qid for qid in tagged_ids if qid in answered_set])
            have_tagged = len([qid for qid in tagged_ids if qid in i_have])
            total_tagged = len(tagged_ids)

            no_direct_evidence = total_tagged == 0
            inferred_baseline = clamp01(have_rate * 0.78 + completion_rate * 0.22)
            if no_direct_evidence:
                have_rate_for_competency = inferred_baseline
                coverage_rate = completion_rate
            elif answered_tagged > 0:
                have_rate_for_competency = have_tagged / answered_tagged
                coverage_rate = answered_tagged / total_tagged
            else:
                have_rate_for_competency = inferred_baseline * 0.85
                coverage_rate = 0.0

            feature_vector.append(clamp01(have_rate_for_competency * 0.72 + coverage_rate * 0.28))

        return feature_vector, {
            "completionRate": completion_rate,
            "haveRate": have_rate,
            "answeredCount": answered_count,
            "totalQuestions": total_questions,
            "source": "backend",
        }

    def _normalize_text(self, value: str) -> str:
        return "".join(char.lower() if char.isalnum() else " " for char in value).strip()

    def _compute_certification_signals(
        self,
        questions: List[Dict[str, Any]],
        i_have: set[str],
    ) -> List[Dict[str, Any]]:
        values = {
            "sql_certification": 0.0,
            "python_certification": 0.0,
            "governance_certification": 0.0,
        }
        for question in questions:
            if question["id"] not in i_have:
                continue
            text = self._normalize_text(question.get("text") or "")
            if not text:
                continue
            has_cert_token = any(
                token in text.split()
                for token in ["cert", "certified", "certification", "credential", "badge", "licensed", "psf"]
            )
            if not has_cert_token and "psf" not in text:
                continue
            if any(token in text for token in ["sql", "database", "query"]):
                values["sql_certification"] += 0.6
            if any(token in text for token in ["python", "pandas", "numpy", "scikit", "tensorflow"]):
                values["python_certification"] += 0.6
            if any(token in text for token in ["governance", "quality", "stewardship", "compliance", "lineage"]):
                values["governance_certification"] += 0.6

        return [
            {"key": key, "label": CERTIFICATION_SIGNAL_LABELS[key], "value": clamp01(value)}
            for key, value in values.items()
        ]

    def _predict_tree(self, tree: Dict[str, Any], features: List[float]) -> List[float]:
        feature = tree.get("feature")
        threshold = tree.get("threshold")
        left = tree.get("left")
        right = tree.get("right")
        if feature is None or threshold is None or left is None or right is None:
            return [float(value) for value in tree.get("probs", [1.0])]
        if features[int(feature)] <= float(threshold):
            return self._predict_tree(left, features)
        return self._predict_tree(right, features)

    def _predict_logistic(self, features: List[float]) -> List[float]:
        if self._model_training_backend() == "sklearn":
            return self._predict_sklearn_model("logistic", features)
        model = self.models["logistic"]
        raw = [
            sigmoid(dot([float(value) for value in weights], features) + float(model["bias"][class_index]))
            for class_index, weights in enumerate(model["weights"])
        ]
        return ensure_distribution(raw)

    def _predict_random_forest(self, features: List[float]) -> List[float]:
        if self._model_training_backend() == "sklearn":
            return self._predict_sklearn_model("randomForest", features)
        model = self.models["randomForest"]
        first_tree = model["trees"][0] if model.get("trees") else {"probs": [1.0]}
        aggregate = [0.0 for _ in first_tree.get("probs", [1.0])]
        trees = model.get("trees") or []
        for tree in trees:
            probs = self._predict_tree(tree, features)
            for index, value in enumerate(probs):
                aggregate[index] += float(value)
        averaged = [value / max(1, len(trees)) for value in aggregate]
        return ensure_distribution(averaged)

    def _predict_gradient_boosting(self, features: List[float]) -> List[float]:
        if self._model_training_backend() == "sklearn":
            return self._predict_sklearn_model("gradientBoosting", features)
        model = self.models["gradientBoosting"]
        scores: List[float] = []
        for stumps in model.get("classStumps") or []:
            total = 0.0
            for stump in stumps:
                if features[int(stump["feature"])] <= float(stump["threshold"]):
                    leaf_value = float(stump["leftValue"])
                else:
                    leaf_value = float(stump["rightValue"])
                total += float(model["learningRate"]) * leaf_value
            scores.append(total)
        return ensure_distribution(softmax(scores))

    def _combine_probabilities(
        self,
        logistic: List[float],
        random_forest: List[float],
        gradient_boosting: List[float],
    ) -> List[float]:
        weights = self.model_info.get("ensembleWeights") or {
            "logistic": 0.35,
            "randomForest": 0.45,
            "gradientBoosting": 0.2,
        }
        raw = [
            logistic[index] * float(weights.get("logistic", 0))
            + random_forest[index] * float(weights.get("randomForest", 0))
            + gradient_boosting[index] * float(weights.get("gradientBoosting", 0))
            for index in range(len(logistic))
        ]
        return ensure_distribution(raw)

    def _predict_probabilities(self, features: List[float]) -> Dict[str, List[float]]:
        logistic = self._predict_logistic(features)
        random_forest = self._predict_random_forest(features)
        gradient_boosting = self._predict_gradient_boosting(features)
        ensemble = self._combine_probabilities(logistic, random_forest, gradient_boosting)
        return {
            "logistic": logistic,
            "randomForest": random_forest,
            "gradientBoosting": gradient_boosting,
            "ensemble": ensemble,
        }

    def _model_class_mode(self) -> str:
        model_class_count = int(self.model_info.get("classCount") or 0)
        if model_class_count == len(self.profiles):
            return "profile"
        if model_class_count == len(self.ladder_entries):
            return "ladder_legacy"
        return "mismatch"

    def _has_catalog_model_mismatch(self) -> bool:
        return self._model_class_mode() == "mismatch"

    def _catalog_model_warning(self) -> Optional[Dict[str, Any]]:
        model_class_count = int(self.model_info.get("classCount") or 0)
        profile_count = len(self.profiles)
        ladder_entry_count = len(self.ladder_entries)
        mode = self._model_class_mode()
        if mode == "profile":
            return None
        if mode == "ladder_legacy":
            return {
                "code": "legacy_ladder_class_model",
                "message": (
                    "The loaded recommendation model was trained before shared profile keys were introduced. "
                    "Runtime scoring still works, but repeated roles are not yet sharing one trainable identity "
                    "until you retrain the model."
                ),
                "modelClassCount": model_class_count,
                "profileCount": profile_count,
                "ladderEntryCount": ladder_entry_count,
            }
        return {
            "code": "catalog_model_class_mismatch",
            "message": (
                "The career catalog has changed since the recommendation model was trained. "
                "Predictions for unmatched careers use fallback zero scores until the model is retrained."
            ),
            "modelClassCount": model_class_count,
            "profileCount": profile_count,
            "ladderEntryCount": ladder_entry_count,
        }

    def _align_probability_vector(self, values: List[float], target_count: int) -> List[float]:
        if len(values) == target_count:
            return values
        if len(values) > target_count:
            return ensure_distribution(values[:target_count])
        return ensure_distribution(values + [0.0 for _ in range(target_count - len(values))])

    def _align_feature_importance_vector(self, values: List[float], target_count: int) -> List[float]:
        if len(values) == target_count:
            return values
        if len(values) > target_count:
            return values[:target_count]
        return values + [0.0 for _ in range(target_count - len(values))]

    def _calibrate_confidence(self, raw_confidence: float) -> float:
        calibration = self.model_info.get("confidenceCalibration") or {}
        bounded = clamp01(raw_confidence)
        bins = calibration.get("bins") or []
        for bin_data in bins:
            minimum = float(bin_data.get("min", 0))
            maximum = float(bin_data.get("max", 1))
            if bounded >= minimum and (bounded < maximum or maximum >= 1):
                if int(bin_data.get("count", 0)) > 0:
                    return clamp01(float(bin_data.get("accuracy", calibration.get("fallbackAccuracy", 0.5))))
        return clamp01(float(calibration.get("fallbackAccuracy", 0.5)))

    def _certification_affinity(self, path_key: str) -> Dict[str, float]:
        mapping = {
            "business_intelligence": {
                "sql_certification": 1.0,
                "python_certification": 0.45,
                "governance_certification": 0.55,
            },
            "data_stewardship": {
                "sql_certification": 0.6,
                "python_certification": 0.25,
                "governance_certification": 1.0,
            },
            "data_engineering": {
                "sql_certification": 0.85,
                "python_certification": 0.65,
                "governance_certification": 0.45,
            },
            "data_science": {
                "sql_certification": 0.8,
                "python_certification": 1.0,
                "governance_certification": 0.4,
            },
            "ai_engineering": {
                "sql_certification": 0.55,
                "python_certification": 1.0,
                "governance_certification": 0.55,
            },
            "applied_research": {
                "sql_certification": 0.45,
                "python_certification": 0.9,
                "governance_certification": 0.5,
            },
        }
        return mapping.get(
            path_key,
            {"sql_certification": 0.6, "python_certification": 0.6, "governance_certification": 0.6},
        )

    def _path_scores_from_careers(self, career_scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for score in career_scores:
            grouped.setdefault(score["pathKey"], []).append(score)
        path_scores = []
        for path_key, scores in grouped.items():
            sorted_scores = sorted(
                scores,
                key=lambda item: (
                    float(item.get("finalRecommendationScore", item["ensemble"])),
                    float(item["ensemble"]),
                ),
                reverse=True,
            )
            path_scores.append(
                {
                    "pathKey": path_key,
                    "pathName": sorted_scores[0]["pathName"],
                    "score": float(sorted_scores[0].get("finalRecommendationScore", sorted_scores[0]["ensemble"])),
                    "bestCareer": sorted_scores[0]["careerName"],
                }
            )
        return sorted(path_scores, key=lambda item: item["score"], reverse=True)

    def _career_ranking_sort_key(
        self,
        score: Dict[str, Any],
        selected_path_key: Optional[str],
        selected_career_name: Optional[str],
    ) -> Tuple[float, int, int, int]:
        return (
            float(score.get("finalRecommendationScore", score["ensemble"])),
            float(score["ensemble"]),
            float(score.get("alignmentScore", 0.0)),
            -int(score.get("level") or 0),
        )

    def _profile_lookup(self) -> Dict[str, Dict[str, Any]]:
        return {str(profile["profileKey"]): profile for profile in self.profiles}

    def _ladder_lookup(self) -> Dict[str, Dict[str, Any]]:
        return {
            f"{entry['pathKey']}::{entry['careerName']}": entry
            for entry in self.ladder_entries
        }

    def _find_ladder_entry(
        self, path_key: Optional[str], career_name: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        if not path_key or not career_name:
            return None

        canonical_career_name = canonicalize_career_name(career_name)
        direct = self._ladder_lookup().get(f"{path_key}::{career_name}")
        if direct is not None:
            return direct
        canonical_direct = self._ladder_lookup().get(f"{path_key}::{canonical_career_name}")
        if canonical_direct is not None:
            return canonical_direct

        normalized_career = normalize_identifier(canonical_career_name)
        for entry in self.ladder_entries:
            if str(entry.get("pathKey")) != path_key:
                continue
            if normalize_identifier(str(entry.get("careerName") or "")) == normalized_career:
                return entry
        return None

    def _group_career_scores(self, scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        grouped: Dict[str, Dict[str, Any]] = {}
        for score in scores:
            group_key = str(score.get("profileKey") or f"{score['pathKey']}::{score['careerName']}")
            existing = grouped.get(group_key)
            if existing is None:
                grouped[group_key] = {
                    "profileKey": score.get("profileKey"),
                    "careerName": score["careerName"],
                    "finalRecommendationScore": score["finalRecommendationScore"],
                    "recommendationConfidence": score["recommendationConfidence"],
                    "ensemble": score["ensemble"],
                    "pathKeys": [score["pathKey"]],
                    "pathNames": [score["pathName"]],
                    "entries": [
                        {
                            "pathKey": score["pathKey"],
                            "pathName": score["pathName"],
                            "careerName": score["careerName"],
                            "level": score["level"],
                        }
                    ],
                }
                continue

            if score["pathKey"] not in existing["pathKeys"]:
                existing["pathKeys"].append(score["pathKey"])
            if score["pathName"] not in existing["pathNames"]:
                existing["pathNames"].append(score["pathName"])
            existing["entries"].append(
                {
                    "pathKey": score["pathKey"],
                    "pathName": score["pathName"],
                    "careerName": score["careerName"],
                    "level": score["level"],
                }
            )
            existing["recommendationConfidence"] = max(
                float(existing["recommendationConfidence"]), float(score["recommendationConfidence"])
            )
            existing["finalRecommendationScore"] = max(
                float(existing["finalRecommendationScore"]), float(score["finalRecommendationScore"])
            )
            existing["ensemble"] = max(float(existing["ensemble"]), float(score["ensemble"]))

        grouped_list = list(grouped.values())
        grouped_list.sort(
            key=lambda item: (
                float(item["finalRecommendationScore"]),
                float(item["recommendationConfidence"]),
                float(item["ensemble"]),
                -len(item["pathKeys"]),
            ),
            reverse=True,
        )
        return grouped_list

    def _career_alignment_score(
        self,
        score: Dict[str, Any],
        feature_vector: List[float],
    ) -> float:
        ladder_entry = self._find_ladder_entry(
            str(score.get("pathKey") or ""),
            str(score.get("careerName") or ""),
        )
        if ladder_entry is None:
            return 0.0

        if self._model_class_mode() == "profile":
            profile = self._profile_lookup().get(str(ladder_entry.get("profileKey") or ""))
            weights = cast(Dict[str, float], (profile or {}).get("weights", ladder_entry.get("weights", {})))
        else:
            weights = cast(Dict[str, float], ladder_entry.get("weights", {}))

        total_weight = sum(float(value) for value in weights.values() if float(value) > 0)
        if total_weight <= 0:
            return 0.0

        weighted_match = 0.0
        for index, key in enumerate(COMPETENCY_ORDER):
            weighted_match += float(weights.get(key, 0.0)) * float(
                feature_vector[index] if index < len(feature_vector) else 0.0
            )
        return clamp01(weighted_match / total_weight)

    def _seniority_adjustment(
        self,
        score: Dict[str, Any],
        feature_vector: List[float],
    ) -> Dict[str, float]:
        level = int(score.get("level") or 0)
        executive_evidence = compute_seniority_evidence(feature_vector)
        hands_on_evidence = compute_hands_on_evidence(feature_vector)
        multiplier = seniority_gate_multiplier(
            level,
            executive_evidence["score"],
            executive_evidence["strongCount"],
            hands_on_evidence["score"],
        )
        level_seven_eligible = (
            level < 7
            or (
                executive_evidence["score"] >= LEVEL_SEVEN_EXECUTIVE_SCORE_THRESHOLD
                and executive_evidence["strongCount"] >= LEVEL_SEVEN_EXECUTIVE_STRONG_MIN
            )
        )
        return {
            "executiveEvidenceScore": executive_evidence["score"],
            "executiveEvidenceAverage": executive_evidence["average"],
            "executiveEvidenceStrongCount": executive_evidence["strongCount"],
            "handsOnEvidenceScore": hands_on_evidence["score"],
            "handsOnEvidenceAverage": hands_on_evidence["average"],
            "handsOnEvidenceStrongCount": hands_on_evidence["strongCount"],
            "levelSevenExecutiveEligible": 1.0 if level_seven_eligible else 0.0,
            "seniorityGateMultiplier": multiplier,
        }

    def _build_scored_entries(
        self,
        probabilities: Dict[str, List[float]],
        certification_signal_map: Dict[str, float],
    ) -> Tuple[List[Dict[str, Any]], str]:
        mode = self._model_class_mode()
        scored_entries: List[Dict[str, Any]] = []

        if mode == "profile":
            profile_lookup = self._profile_lookup()
            aligned = {
                key: self._align_probability_vector(values, len(self.profiles))
                for key, values in probabilities.items()
            }
            profile_scores = {
                str(profile["profileKey"]): {
                    "logistic": clamp01(aligned["logistic"][index]),
                    "randomForest": clamp01(aligned["randomForest"][index]),
                    "gradientBoosting": clamp01(aligned["gradientBoosting"][index]),
                    "ensemble": clamp01(aligned["ensemble"][index]),
                }
                for index, profile in enumerate(self.profiles)
            }

            for ladder_entry in self.ladder_entries:
                profile_key = str(ladder_entry["profileKey"])
                affinity = self._certification_affinity(str(ladder_entry["pathKey"]))
                contributions = {
                    "sql_certification": certification_signal_map.get("sql_certification", 0.0)
                    * affinity["sql_certification"]
                    * CERTIFICATION_BOOST_SCALE,
                    "python_certification": certification_signal_map.get("python_certification", 0.0)
                    * affinity["python_certification"]
                    * CERTIFICATION_BOOST_SCALE,
                    "governance_certification": certification_signal_map.get("governance_certification", 0.0)
                    * affinity["governance_certification"]
                    * CERTIFICATION_BOOST_SCALE,
                }
                base_score = profile_scores.get(
                    profile_key,
                    {"logistic": 0.0, "randomForest": 0.0, "gradientBoosting": 0.0, "ensemble": 0.0},
                )
                scored_entries.append(
                    {
                        **ladder_entry,
                        "weights": profile_lookup.get(profile_key, {}).get("weights", ladder_entry.get("weights", {})),
                        "logistic": base_score["logistic"],
                        "randomForest": base_score["randomForest"],
                        "gradientBoosting": base_score["gradientBoosting"],
                        "ensemble": base_score["ensemble"],
                        "boostedEnsemble": clamp01(base_score["ensemble"] + sum(contributions.values())),
                        "certificationContributions": contributions,
                    }
                )
            return scored_entries, mode

        aligned = {
            key: self._align_probability_vector(values, len(self.ladder_entries))
            for key, values in probabilities.items()
        }
        for index, ladder_entry in enumerate(self.ladder_entries):
            affinity = self._certification_affinity(str(ladder_entry["pathKey"]))
            contributions = {
                "sql_certification": certification_signal_map.get("sql_certification", 0.0)
                * affinity["sql_certification"]
                * CERTIFICATION_BOOST_SCALE,
                "python_certification": certification_signal_map.get("python_certification", 0.0)
                * affinity["python_certification"]
                * CERTIFICATION_BOOST_SCALE,
                "governance_certification": certification_signal_map.get("governance_certification", 0.0)
                * affinity["governance_certification"]
                * CERTIFICATION_BOOST_SCALE,
            }
            scored_entries.append(
                {
                    **ladder_entry,
                    "logistic": clamp01(aligned["logistic"][index]),
                    "randomForest": clamp01(aligned["randomForest"][index]),
                    "gradientBoosting": clamp01(aligned["gradientBoosting"][index]),
                    "ensemble": clamp01(aligned["ensemble"][index]),
                    "boostedEnsemble": clamp01(aligned["ensemble"][index] + sum(contributions.values())),
                    "certificationContributions": contributions,
                }
            )
        return scored_entries, mode

    def _build_priority_gaps(
        self, path_key: Optional[str], career_name: Optional[str], feature_vector: List[float]
    ) -> List[Dict[str, Any]]:
        if not path_key or not career_name:
            return []

        ladder_entry = self._find_ladder_entry(path_key, career_name)
        if ladder_entry is None:
            raise ValueError("Career profile not found for the specified path and career")

        feature_lookup = {
            key: feature_vector[index] if index < len(feature_vector) else 0.0
            for index, key in enumerate(COMPETENCY_ORDER)
        }
        if self._model_class_mode() == "profile":
            profile = self._profile_lookup().get(str(ladder_entry.get("profileKey") or ""))
            weights = cast(Dict[str, float], (profile or {}).get("weights", ladder_entry["weights"]))
        else:
            weights = cast(Dict[str, float], ladder_entry["weights"])
        ranked = []
        for key in sorted(weights.keys(), key=lambda item: weights[item], reverse=True):
            current = float(feature_lookup.get(key, 0.0))
            importance = float(weights[key])
            gap_score = clamp01((1 - current) * importance)
            ranked.append(
                {
                    "key": key,
                    "label": COMPETENCY_LABELS[key],
                    "currentReadiness": current,
                    "importance": importance,
                    "gapScore": gap_score,
                    "recommendation": GAP_RECOMMENDATIONS[key],
                }
            )

        meaningful = [item for item in sorted(ranked, key=lambda item: item["gapScore"], reverse=True) if item["gapScore"] >= 0.03]
        return (meaningful or ranked)[:6]

    def _build_explainability(
        self,
        top_career: Dict[str, Any],
        feature_vector: List[float],
        certification_signals: List[Dict[str, Any]],
        certification_contributions: Dict[str, float],
        explainability_method: str,
    ) -> Dict[str, Any]:
        ladder_entry = self._find_ladder_entry(
            str(top_career.get("pathKey") or ""),
            str(top_career.get("careerName") or ""),
        )
        relevant_keys: List[str] = []
        if ladder_entry is not None:
            if self._model_class_mode() == "profile":
                profile = self._profile_lookup().get(str(ladder_entry.get("profileKey") or ""))
                weights = cast(
                    Dict[str, float],
                    (profile or {}).get("weights", ladder_entry.get("weights", {})),
                )
            else:
                weights = cast(Dict[str, float], ladder_entry.get("weights", {}))
            relevant_keys = [
                key for key, value in weights.items() if float(value) > 0
            ]

        if self._model_class_mode() == "profile":
            top_profile_key = str(top_career.get("profileKey") or "")
            top_career_index = next(
                (index for index, profile in enumerate(self.profiles) if str(profile.get("profileKey")) == top_profile_key),
                0,
            )
        else:
            top_career_index = next(
                (
                    index
                    for index, profile in enumerate(self.ladder_entries)
                    if profile["pathKey"] == top_career["pathKey"] and profile["careerName"] == top_career["careerName"]
                ),
                0,
            )
        feature_stats = self.models.get("featureStats") or {}
        means = feature_stats.get("means") or [0.5 for _ in COMPETENCY_ORDER]
        stds = feature_stats.get("stds") or [0.2 for _ in COMPETENCY_ORDER]

        def predict_score(vector: List[float], career_index: int) -> float:
            probabilities = self._predict_probabilities(vector)
            target_count = len(self.profiles) if self._model_class_mode() == "profile" else len(self.ladder_entries)
            ensemble = self._align_probability_vector(probabilities.get("ensemble") or [], target_count)
            return clamp01(float(ensemble[career_index] if career_index < len(ensemble) else 0.0))

        return build_career_explainability(
            predict_score=predict_score,
            feature_vector=feature_vector,
            feature_keys=COMPETENCY_ORDER,
            labels=COMPETENCY_LABELS,
            career_index=top_career_index,
            career_name=str(top_career["careerName"]),
            path_key=str(top_career["pathKey"]),
            method_preference=explainability_method,
            means=[float(value) for value in means],
            stds=[float(value) for value in stds],
            additional_factors=[
                {
                    "key": signal["key"],
                    "label": signal["label"],
                    "value": signal["value"],
                    "contribution": float(certification_contributions.get(signal["key"], 0.0)),
                }
                for signal in certification_signals
            ],
            gap_recommendations=GAP_RECOMMENDATIONS,
            relevant_keys=relevant_keys,
        )

    def _empty_explainability(self, top_career: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "selectedMethod": "shap",
            "reason": "Explainability is loading separately from the initial recommendation.",
            "topCareer": {
                "method": "shap",
                "careerName": str(top_career.get("careerName") or ""),
                "pathKey": str(top_career.get("pathKey") or "business_intelligence"),
                "baseScore": 0.0,
                "predictedScore": 0.0,
                "reconstructedScore": 0.0,
                "narrative": "",
                "quality": {
                    "runtimeMs": 0,
                    "fidelity": 0.0,
                },
                "factors": [],
            },
            "comparison": {
                "shap": {
                    "quality": {
                        "runtimeMs": 0,
                        "fidelity": 0.0,
                    },
                },
                "lime": {
                    "quality": {
                        "runtimeMs": 0,
                        "fidelity": 0.0,
                    },
                },
            },
        }

    def _score_feature_vector(
        self,
        feature_vector: List[float],
        certification_signals: List[Dict[str, Any]],
        selected_path_key: Optional[str],
        selected_career_name: Optional[str],
        explainability_method: str,
        include_explainability: bool,
        summary: Dict[str, Any],
    ) -> Dict[str, Any]:
        probabilities = self._predict_probabilities(feature_vector)
        catalog_warning = self._catalog_model_warning()
        certification_signal_map = {signal["key"]: float(signal["value"]) for signal in certification_signals}
        raw_scores, scoring_mode = self._build_scored_entries(probabilities, certification_signal_map)

        normalization_total = (
            1.0 if scoring_mode == "profile" else (sum(score["boostedEnsemble"] for score in raw_scores) or 1.0)
        )
        certification_contribution_by_career: Dict[str, Dict[str, float]] = {}
        ranked_scores: List[Dict[str, Any]] = []
        for score in raw_scores:
            normalized_contribs = {
                key: value / normalization_total for key, value in score["certificationContributions"].items()
            }
            certification_contribution_by_career[f"{score['pathKey']}::{score['careerName']}"] = normalized_contribs
            ranked_scores.append(
                {
                    "pathKey": score["pathKey"],
                    "pathName": score["pathName"],
                    "careerName": score["careerName"],
                    "level": score["level"],
                    "profileKey": score.get("profileKey"),
                    "logistic": score["logistic"],
                    "randomForest": score["randomForest"],
                    "gradientBoosting": score["gradientBoosting"],
                    "ensemble": clamp01(score["boostedEnsemble"] / normalization_total),
                }
            )
        ranked_scores.sort(
            key=lambda item: self._career_ranking_sort_key(item, selected_path_key, selected_career_name),
            reverse=True,
        )

        top_career_base = ranked_scores[0]
        completion_rate = float(summary.get("completionRate") or 0.0)
        all_career_scores: List[Dict[str, Any]] = []
        for index, score in enumerate(ranked_scores):
            next_score = (
                float(ranked_scores[index + 1]["ensemble"])
                if index + 1 < len(ranked_scores)
                else 0.0
            )
            alignment_score = self._career_alignment_score(score, feature_vector)
            seniority_adjustment = self._seniority_adjustment(score, feature_vector)
            base_recommendation_score = compute_final_recommendation_score(
                ensemble_score=float(score["ensemble"]),
                alignment_score=alignment_score,
            )
            final_recommendation_score = clamp01(
                base_recommendation_score * seniority_adjustment["seniorityGateMultiplier"]
            )
            recommendation_confidence = clamp01(
                estimate_career_recommendation_confidence(
                    career_score=float(score["ensemble"]),
                    top_score=float(top_career_base["ensemble"]),
                    next_score=next_score,
                    completion_rate=completion_rate,
                    alignment_score=alignment_score,
                )
                * seniority_adjustment["seniorityGateMultiplier"]
            )
            all_career_scores.append(
                {
                    **score,
                    "alignmentScore": alignment_score,
                    "baseRecommendationScore": base_recommendation_score,
                    "finalRecommendationScore": final_recommendation_score,
                    "recommendationConfidence": recommendation_confidence,
                    **seniority_adjustment,
                }
            )

        all_career_scores.sort(
            key=lambda item: self._career_ranking_sort_key(item, selected_path_key, selected_career_name),
            reverse=True,
        )
        grouped_career_scores = self._group_career_scores(all_career_scores)

        top_career = all_career_scores[0]
        selected_career_score = next(
            (
                score
                for score in all_career_scores
                if score["pathKey"] == selected_path_key and score["careerName"] == selected_career_name
            ),
            None,
        )
        selected_career_rank = all_career_scores.index(selected_career_score) + 1 if selected_career_score else None

        competency_scores = sorted(
            [
                {
                    "key": key,
                    "label": COMPETENCY_LABELS[key],
                    "haveRate": feature_vector[index],
                    "coverageRate": feature_vector[index],
                    "featureScore": feature_vector[index],
                    "answeredCount": 1 if feature_vector[index] > 0 else 0,
                    "totalTaggedQuestions": 1,
                }
                for index, key in enumerate(COMPETENCY_ORDER)
            ],
            key=lambda item: item["featureScore"],
            reverse=True,
        )

        priority_gaps = self._build_priority_gaps(
            str(top_career["pathKey"]),
            str(top_career["careerName"]),
            feature_vector,
        )

        model_feature_importance = self.models.get("featureImportance") or {}
        logistic_importance = self._align_feature_importance_vector(
            [float(value) for value in (model_feature_importance.get("logistic") or [])],
            len(COMPETENCY_ORDER),
        )
        random_forest_importance = self._align_feature_importance_vector(
            [float(value) for value in (model_feature_importance.get("randomForest") or [])],
            len(COMPETENCY_ORDER),
        )
        gradient_boosting_importance = self._align_feature_importance_vector(
            [float(value) for value in (model_feature_importance.get("gradientBoosting") or [])],
            len(COMPETENCY_ORDER),
        )
        ensemble_importance = self._align_feature_importance_vector(
            [float(value) for value in (model_feature_importance.get("ensemble") or [])],
            len(COMPETENCY_ORDER),
        )
        feature_importances = sorted(
            [
                {
                    "key": key,
                    "label": COMPETENCY_LABELS[key],
                    "logistic": logistic_importance[index],
                    "randomForest": random_forest_importance[index],
                    "gradientBoosting": gradient_boosting_importance[index],
                    "ensemble": ensemble_importance[index],
                }
                for index, key in enumerate(COMPETENCY_ORDER)
            ],
            key=lambda item: item["ensemble"],
            reverse=True,
        )

        top_career_cert_contribs = certification_contribution_by_career.get(
            f"{top_career['pathKey']}::{top_career['careerName']}",
            {
                "sql_certification": 0.0,
                "python_certification": 0.0,
                "governance_certification": 0.0,
            },
        )
        explainability = (
            self._build_explainability(
                top_career=top_career,
                feature_vector=feature_vector,
                certification_signals=certification_signals,
                certification_contributions=top_career_cert_contribs,
                explainability_method=explainability_method,
            )
            if include_explainability
            else self._empty_explainability(top_career)
        )

        return {
            "result": {
                "topCareer": top_career,
                "selectedCareerScore": selected_career_score,
                "selectedCareerRank": selected_career_rank,
                "alternativeCareers": all_career_scores[1:4],
                "allCareerScores": all_career_scores,
                "groupedCareerScores": grouped_career_scores,
                "pathScores": self._path_scores_from_careers(all_career_scores),
                "competencyScores": competency_scores,
                "certificationSignals": certification_signals,
                "priorityGaps": priority_gaps,
                "featureImportances": feature_importances,
                "explainability": explainability,
                "summary": {
                    **summary,
                    "confidence": top_career["recommendationConfidence"],
                },
            },
            "model": {
                **self.model_info,
                "profileCount": len(self.profiles),
                "ladderEntryCount": len(self.ladder_entries),
                "modelClassMode": scoring_mode,
                "catalogModelMismatch": bool(catalog_warning),
                "warning": catalog_warning,
            },
        }
