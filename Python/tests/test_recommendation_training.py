from __future__ import annotations

import json
import shutil
import unittest
from pathlib import Path

from app.catalog import COMPETENCY_ORDER, build_career_ladder_entries, build_career_profiles
from app.service import RecommendationMlService
from app.training_dataset import build_synthetic_dataset, load_dataset_from_file, load_or_build_training_dataset
from app.training_models import build_hard_validation_subset, predict_ensemble_probabilities, train_ensemble_models
from app.training_service import train_and_persist_recommendation_model

try:
    import sklearn  # noqa: F401

    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class RecommendationTrainingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_root = Path("c:/Users/jmvel/Codes/jobpath/Python/tests/.tmp")
        self.temp_root.mkdir(parents=True, exist_ok=True)

    def tearDown(self) -> None:
        if self.temp_root.exists():
            shutil.rmtree(self.temp_root)

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
    def test_profile_count_matches_catalog(self) -> None:
        profiles = build_career_profiles()
        ladder_entries = build_career_ladder_entries()
        self.assertGreater(len(profiles), 0)
        self.assertGreater(len(ladder_entries), len(profiles))
        payload = train_and_persist_recommendation_model(model_path=str(self._temp_model_path()))
        self.assertEqual(payload["modelInfo"]["classCount"], len(profiles))
        self.assertEqual(payload["modelInfo"]["ladderEntryCount"], len(ladder_entries))

    def test_repeated_roles_share_one_trainable_profile(self) -> None:
        profiles = build_career_profiles()
        associate_profile = next(profile for profile in profiles if profile["profileKey"] == "associate_data_analyst")
        ladder_paths = [entry["pathKey"] for entry in associate_profile["ladderEntries"]]
        self.assertGreaterEqual(len(ladder_paths), 2)
        self.assertIn("business_intelligence", ladder_paths)
        self.assertIn("ai_engineering", ladder_paths)

    def test_dataset_builder_accepts_explicit_dataset_file(self) -> None:
        profiles = build_career_profiles()
        ladder_entries = build_career_ladder_entries()
        dataset_path = self._write_dataset_file(
            [
                {
                    "pathKey": ladder_entries[0]["pathKey"],
                    "careerName": ladder_entries[0]["careerName"],
                    "features": {key: 0.7 for key in COMPETENCY_ORDER},
                }
                for _ in range(len(profiles) + 2)
            ]
        )
        dataset = load_dataset_from_file(dataset_path, profiles, COMPETENCY_ORDER)
        self.assertGreaterEqual(len(dataset.samples), len(profiles))

    def test_dataset_builder_skips_malformed_and_unknown_rows(self) -> None:
        profiles = build_career_profiles()
        ladder_entries = build_career_ladder_entries()
        dataset_path = self._write_dataset_file(
            [
                {"careerName": "Unknown Career", "pathKey": "data_science", "features": {key: 0.5 for key in COMPETENCY_ORDER}},
                {"careerName": ladder_entries[0]["careerName"], "pathKey": ladder_entries[0]["pathKey"]},
                {"careerName": ladder_entries[0]["careerName"], "pathKey": ladder_entries[0]["pathKey"], "features": {key: 0.5 for key in COMPETENCY_ORDER}},
            ]
            + [
                {
                    "careerName": ladder_entry["careerName"],
                    "pathKey": ladder_entry["pathKey"],
                    "features": {key: 0.6 for key in COMPETENCY_ORDER},
                }
                for ladder_entry in ladder_entries
            ]
        )
        dataset = load_dataset_from_file(dataset_path, profiles, COMPETENCY_ORDER)
        self.assertGreaterEqual(len(dataset.samples), len(profiles))

    def test_synthetic_fallback_produces_samples(self) -> None:
        profiles = build_career_profiles()
        dataset = load_or_build_training_dataset(profiles, COMPETENCY_ORDER, dataset_path="missing.json")
        self.assertGreater(len(dataset.samples), 0)
        self.assertEqual(len(dataset.samples[0].features), len(COMPETENCY_ORDER))
        self.assertEqual(dataset.debug["mode"], "level-aware-synthetic")
        self.assertIn("metadata", dataset.samples[0].__dict__)
        self.assertEqual(dataset.samples[0].metadata.get("source"), "synthetic")

    def test_early_profiles_have_broader_variance_than_higher_levels(self) -> None:
        profiles = build_career_profiles()
        dataset = build_synthetic_dataset(profiles, COMPETENCY_ORDER)
        debug_profiles = dataset.debug["profiles"]
        early = [profile["avgDistanceToBase"] for profile in debug_profiles if profile["representativeLevel"] <= 3]
        advanced = [profile["avgDistanceToBase"] for profile in debug_profiles if profile["representativeLevel"] >= 4]
        self.assertTrue(early and advanced)
        self.assertGreater(sum(early) / len(early), sum(advanced) / len(advanced))

    def test_higher_levels_have_low_cross_profile_mixing(self) -> None:
        profiles = build_career_profiles()
        dataset = build_synthetic_dataset(profiles, COMPETENCY_ORDER)
        debug_profiles = dataset.debug["profiles"]
        advanced = [profile for profile in debug_profiles if profile["representativeLevel"] >= 6]
        self.assertTrue(advanced)
        self.assertTrue(all(profile["maxPeerWeight"] <= 0.1 for profile in advanced))

    def test_repeated_early_role_remains_blended(self) -> None:
        profiles = build_career_profiles()
        dataset = build_synthetic_dataset(profiles, COMPETENCY_ORDER)
        associate_profile = next(
            profile for profile in dataset.debug["profiles"] if profile["profileKey"] == "associate_data_analyst"
        )
        self.assertEqual(associate_profile["representativeLevel"], 1)
        self.assertGreater(associate_profile["avgPeerWeight"], 0.08)
        self.assertGreater(len(associate_profile["peerIndexes"]), 0)

    def test_senior_role_samples_are_tighter_to_base(self) -> None:
        profiles = build_career_profiles()
        dataset = build_synthetic_dataset(profiles, COMPETENCY_ORDER)
        debug_profiles = dataset.debug["profiles"]
        senior_profile = next(
            profile for profile in debug_profiles if profile["profileKey"] == "chief_business_function_officer"
        )
        early_profile = next(
            profile for profile in debug_profiles if profile["profileKey"] == "associate_data_analyst"
        )
        self.assertLess(senior_profile["avgDistanceToBase"], early_profile["avgDistanceToBase"])

    def test_hard_validation_subset_prioritizes_ambiguous_samples(self) -> None:
        profiles = build_career_profiles()
        dataset = build_synthetic_dataset(profiles, COMPETENCY_ORDER)
        validation_samples = dataset.samples[: max(24, len(dataset.samples) // 8)]
        hard_validation, debug = build_hard_validation_subset(validation_samples)
        self.assertGreaterEqual(len(hard_validation), 1)
        self.assertLessEqual(len(hard_validation), len(validation_samples))
        self.assertEqual(debug["selectedCount"], len(hard_validation))
        self.assertIn(debug["selectionMode"], {"all", "hardness-ranked"})
        if len(validation_samples) > 12:
            self.assertGreater(debug["avgHardness"], 0.0)

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
    def test_trained_probability_lengths_match_profile_count(self) -> None:
        profiles = build_career_profiles()
        dataset = load_or_build_training_dataset(profiles, COMPETENCY_ORDER)
        models = train_ensemble_models(
            dataset.samples,
            len(profiles),
            len(COMPETENCY_ORDER),
            class_names=[str(profile["careerName"]) for profile in profiles],
        )
        probabilities = predict_ensemble_probabilities(models, dataset.samples[0].features)
        for values in probabilities.values():
            self.assertEqual(len(values), len(profiles))
        weights = models["ensembleWeights"]
        self.assertAlmostEqual(weights["logistic"] + weights["randomForest"] + weights["gradientBoosting"], 1.0, places=6)
        self.assertIn("bins", models["confidenceCalibration"])
        self.assertEqual(models["diagnostics"]["tuningValidationMode"], "hard")
        self.assertIn("baselineValidation", models["diagnostics"]["metrics"])
        self.assertIn("hardValidation", models["diagnostics"]["metrics"])
        self.assertIn("test", models["diagnostics"]["metrics"])

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
    def test_hard_validation_metrics_are_harder_than_random_validation(self) -> None:
        profiles = build_career_profiles()
        dataset = load_or_build_training_dataset(profiles, COMPETENCY_ORDER)
        models = train_ensemble_models(
            dataset.samples,
            len(profiles),
            len(COMPETENCY_ORDER),
            class_names=[str(profile["careerName"]) for profile in profiles],
        )
        baseline = models["diagnostics"]["metrics"]["baselineValidation"]["ensemble"]
        hard = models["diagnostics"]["metrics"]["hardValidation"]["ensemble"]
        self.assertLessEqual(hard["top1"], baseline["top1"] + 1e-9)
        self.assertGreaterEqual(hard["logLoss"], baseline["logLoss"] - 1e-9)

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
    def test_persisted_artifact_is_loadable(self) -> None:
        model_path = self._temp_model_path()
        payload = train_and_persist_recommendation_model(model_path=str(model_path))
        service = RecommendationMlService(model_path=str(model_path))
        self.assertEqual(service.model_info["classCount"], payload["modelInfo"]["classCount"])
        self.assertIn("featureStats", service.models)
        self.assertEqual(service.model_info["trainingBackend"], "sklearn")
        self.assertEqual(service.model_info["artifactFormat"], "json+joblib")
        self.assertTrue(Path(service.model_info["modelArtifacts"]["logistic"]).exists())
        self.assertTrue(Path(service.model_info["modelArtifacts"]["randomForest"]).exists())
        self.assertTrue(Path(service.model_info["modelArtifacts"]["gradientBoosting"]).exists())

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
    def test_evaluation_file_is_written_and_readable(self) -> None:
        model_path = self._temp_model_path()
        evaluation_path = model_path.with_name(model_path.stem + ".evaluation.json")
        train_and_persist_recommendation_model(model_path=str(model_path))
        self.assertTrue(evaluation_path.exists())
        service = RecommendationMlService(model_path=str(model_path))
        evaluation = service.get_evaluation()
        self.assertIn("evaluation", evaluation)
        self.assertIn("baselineValidation", evaluation["evaluation"])
        self.assertIn("hardValidation", evaluation["evaluation"])
        self.assertIn("test", evaluation["evaluation"])
        self.assertIn("ensemble", evaluation["evaluation"]["test"])
        self.assertIn("confusionMatrix", evaluation["evaluation"]["test"]["ensemble"])
        self.assertIn("perClass", evaluation["evaluation"]["test"]["ensemble"])
        self.assertEqual(evaluation["tuningValidationMode"], "hard")

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
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
        result = response["result"]
        top_career = result["topCareer"]
        grouped = result["groupedCareerScores"]
        path_scores = result["pathScores"]

        self.assertEqual(len(response["result"]["allCareerScores"]), len(build_career_ladder_entries()))
        self.assertEqual(response["model"]["modelClassMode"], "profile")
        self.assertIn("finalRecommendationScore", top_career)
        self.assertEqual(top_career["careerName"], grouped[0]["careerName"])
        self.assertAlmostEqual(
            float(top_career["finalRecommendationScore"]),
            float(grouped[0]["finalRecommendationScore"]),
            places=6,
        )
        self.assertEqual(top_career["pathKey"], path_scores[0]["pathKey"])
        self.assertAlmostEqual(
            float(top_career["finalRecommendationScore"]),
            float(path_scores[0]["score"]),
            places=6,
        )

    @unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for model training tests")
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
