from __future__ import annotations

import json
import shutil
import unittest
from pathlib import Path

from app.catalog import COMPETENCY_ORDER, build_career_profiles
from app.service import RecommendationMlService
from app.training_dataset import load_dataset_from_file, load_or_build_training_dataset
from app.training_models import predict_ensemble_probabilities, train_ensemble_models
from app.training_service import train_and_persist_recommendation_model


class RecommendationTrainingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_root = Path("c:/Users/jmvel/Codes/jobpath/Python/tests/.tmp")
        self.temp_root.mkdir(parents=True, exist_ok=True)

    def tearDown(self) -> None:
        if self.temp_root.exists():
            shutil.rmtree(self.temp_root)

    def test_profile_count_matches_catalog(self) -> None:
        profiles = build_career_profiles()
        self.assertGreater(len(profiles), 0)
        payload = train_and_persist_recommendation_model(model_path=str(self._temp_model_path()))
        self.assertEqual(payload["modelInfo"]["classCount"], len(profiles))

    def test_dataset_builder_accepts_explicit_dataset_file(self) -> None:
        profiles = build_career_profiles()
        dataset_path = self._write_dataset_file(
            [
                {
                    "pathKey": profiles[0]["pathKey"],
                    "careerName": profiles[0]["careerName"],
                    "features": {key: 0.7 for key in COMPETENCY_ORDER},
                }
                for _ in range(len(profiles) + 2)
            ]
        )
        dataset = load_dataset_from_file(dataset_path, profiles, COMPETENCY_ORDER)
        self.assertGreaterEqual(len(dataset.samples), len(profiles))

    def test_dataset_builder_skips_malformed_and_unknown_rows(self) -> None:
        profiles = build_career_profiles()
        dataset_path = self._write_dataset_file(
            [
                {"careerName": "Unknown Career", "pathKey": "data_science", "features": {key: 0.5 for key in COMPETENCY_ORDER}},
                {"careerName": profiles[0]["careerName"], "pathKey": profiles[0]["pathKey"]},
                {"careerName": profiles[0]["careerName"], "pathKey": profiles[0]["pathKey"], "features": {key: 0.5 for key in COMPETENCY_ORDER}},
            ]
            + [
                {
                    "careerName": profile["careerName"],
                    "pathKey": profile["pathKey"],
                    "features": {key: 0.6 for key in COMPETENCY_ORDER},
                }
                for profile in profiles
            ]
        )
        dataset = load_dataset_from_file(dataset_path, profiles, COMPETENCY_ORDER)
        self.assertGreaterEqual(len(dataset.samples), len(profiles))

    def test_synthetic_fallback_produces_samples(self) -> None:
        profiles = build_career_profiles()
        dataset = load_or_build_training_dataset(profiles, COMPETENCY_ORDER, dataset_path="missing.json")
        self.assertGreater(len(dataset.samples), 0)
        self.assertEqual(len(dataset.samples[0].features), len(COMPETENCY_ORDER))

    def test_trained_probability_lengths_match_profile_count(self) -> None:
        profiles = build_career_profiles()
        dataset = load_or_build_training_dataset(profiles, COMPETENCY_ORDER)
        models = train_ensemble_models(dataset.samples, len(profiles), len(COMPETENCY_ORDER))
        probabilities = predict_ensemble_probabilities(models, dataset.samples[0].features)
        for values in probabilities.values():
            self.assertEqual(len(values), len(profiles))
        weights = models["ensembleWeights"]
        self.assertAlmostEqual(weights["logistic"] + weights["randomForest"] + weights["gradientBoosting"], 1.0, places=6)
        self.assertIn("bins", models["confidenceCalibration"])

    def test_persisted_artifact_is_loadable(self) -> None:
        model_path = self._temp_model_path()
        payload = train_and_persist_recommendation_model(model_path=str(model_path))
        service = RecommendationMlService(model_path=str(model_path))
        self.assertEqual(service.model_info["classCount"], payload["modelInfo"]["classCount"])
        self.assertIn("featureStats", service.models)

    def test_evaluation_file_is_written_and_readable(self) -> None:
        model_path = self._temp_model_path()
        evaluation_path = model_path.with_name(model_path.stem + ".evaluation.json")
        train_and_persist_recommendation_model(model_path=str(model_path))
        self.assertTrue(evaluation_path.exists())
        service = RecommendationMlService(model_path=str(model_path))
        evaluation = service.get_evaluation()
        self.assertIn("evaluation", evaluation)
        self.assertIn("ensemble", evaluation["evaluation"])
        self.assertIn("confusionMatrix", evaluation["evaluation"]["ensemble"])
        self.assertIn("perClass", evaluation["evaluation"]["ensemble"])

    def test_service_retrain_reloads_and_recommend_works(self) -> None:
        model_path = self._temp_model_path()
        train_and_persist_recommendation_model(model_path=str(model_path))
        service = RecommendationMlService(model_path=str(model_path))
        retrained = service.retrain()
        self.assertEqual(retrained["model"]["classCount"], len(build_career_profiles()))

        response = service.score_feature_vector(
            {
                "featureVector": [0.5 for _ in COMPETENCY_ORDER],
                "certificationSignals": [],
                "selectedPathKey": None,
                "selectedCareerName": None,
                "includeExplainability": False,
                "summary": {
                    "completionRate": 1.0,
                    "haveRate": 0.5,
                    "answeredCount": len(COMPETENCY_ORDER),
                    "totalQuestions": len(COMPETENCY_ORDER),
                    "source": "backend",
                },
            }
        )
        self.assertEqual(len(response["result"]["allCareerScores"]), len(build_career_profiles()))

    def test_retrain_writes_and_returns_model_info(self) -> None:
        model_path = self._temp_model_path()
        train_and_persist_recommendation_model(model_path=str(model_path))
        service = RecommendationMlService(model_path=str(model_path))
        result = service.retrain()
        self.assertTrue(model_path.exists())
        self.assertEqual(result["model"]["classCount"], len(build_career_profiles()))

    def _temp_model_path(self) -> Path:
        temp_dir = self.temp_root / "model"
        temp_dir.mkdir(parents=True, exist_ok=True)
        return temp_dir / "recommendation-model.v3.json"

    def _write_dataset_file(self, samples: list[dict]) -> str:
        temp_dir = self.temp_root / "dataset"
        temp_dir.mkdir(parents=True, exist_ok=True)
        path = temp_dir / "dataset.json"
        path.write_text(json.dumps(samples), encoding="utf-8")
        return str(path)


if __name__ == "__main__":
    unittest.main()
