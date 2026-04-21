from __future__ import annotations

import shutil
import unittest
from pathlib import Path
from typing import Any, Dict, cast

from app.catalog import COMPETENCY_ORDER, build_career_profiles
from app.service import RecommendationMlService
from app.training_service import train_and_persist_recommendation_model

try:
    import sklearn  # noqa: F401

    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


@unittest.skipUnless(SKLEARN_AVAILABLE, "scikit-learn is required for recommendation scenario tests")
class RecommendationScenarioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_root = Path("c:/Users/jmvel/Codes/jobpath/Python/tests/.tmp_scenarios")
        cls.temp_root.mkdir(parents=True, exist_ok=True)
        cls.model_path = cls.temp_root / "recommendation-model.v3.json"
        cls.profiles = build_career_profiles()
        cls.profile_lookup = cast(Dict[str, Dict[str, Any]], {
            str(profile["profileKey"]): profile for profile in cls.profiles
        })
        train_and_persist_recommendation_model(model_path=str(cls.model_path))
        cls.service = RecommendationMlService(model_path=str(cls.model_path))

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.temp_root.exists():
            shutil.rmtree(cls.temp_root)

    def test_entry_level_business_intelligence_stays_in_early_neighborhood(self) -> None:
        response = self._score(
            vector=self._profile_vector("associate_data_analyst", scale=0.95),
            selected_path_key="business_intelligence",
            selected_career_name="Associate Data Analyst",
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {"Associate Data Analyst", "Data Analyst", "BI Analyst"} & set(top_names)
        )
        self.assertFalse(self._is_executive(top_names[0]))

    def test_governance_heavy_profile_surfaces_stewardship_neighbors(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "data_quality_specialist": 0.6,
                    "data_governance_manager": 0.4,
                }
            ),
            selected_path_key="data_stewardship",
            selected_career_name="Data Governance Manager",
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {"Data Quality Specialist", "Data Governance Manager", "Data Governance Officer"}
            & set(top_names)
        )
        self.assertNotEqual(top_names[0], "Chief Business Function Officer")

    def test_engineering_heavy_profile_keeps_engineering_neighbors_visible(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "associate_data_engineer": 0.2,
                    "data_engineer": 0.55,
                    "senior_data_engineer": 0.25,
                }
            ),
            selected_path_key="data_engineering",
            selected_career_name="Data Engineer",
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {"Associate Data Engineer", "Data Engineer", "Senior Data Engineer", "Data Architech"}
            & set(top_names)
        )
        self.assertFalse(self._is_business_executive(top_names[0]))

    def test_mid_level_data_science_stays_in_data_science_or_neighboring_ai_neighborhood(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "data_scientist": 0.7,
                    "machine_learning_engineer": 0.3,
                }
            ),
            selected_path_key="data_science",
            selected_career_name="Data Scientist",
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {"Data Scientist", "Senior Data Scientist", "Machine Learning Engineer", "AI Engineer"}
            & set(top_names)
        )
        self.assertFalse(self._is_business_executive(top_names[0]))
        self.assertLessEqual(self._top_confidence(response), 0.9)

    def test_research_heavy_profile_keeps_research_roles_in_top_results(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "applied_dataai_researcher": 0.65,
                    "senior_applied_dataai_researcher": 0.35,
                }
            ),
            selected_path_key="applied_research",
            selected_career_name="Applied Data/AI Researcher",
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {
                "Applied Data/AI Researcher",
                "Senior Applied Data/AI Researcher",
                "Research Manager",
            }
            & set(top_names)
        )
        self.assertFalse(self._is_business_executive(top_names[0]))

    def test_broad_mid_level_profile_does_not_jump_straight_to_executive_roles(self) -> None:
        vector = self._blend_vectors(
            {
                "senior_data_engineer": 0.3,
                "data_scientist": 0.25,
                "ai_engineer": 0.25,
                "data_governance_manager": 0.2,
            },
            scale=0.82,
        )
        response = self._score(
            vector=vector,
            selected_path_key="data_science",
            selected_career_name="Data Scientist",
        )
        top_names = self._top_group_names(response)
        self.assertFalse(self._is_executive(top_names[0]))
        self.assertLess(self._top_confidence(response), 0.8)

    def test_sparse_profile_keeps_confidence_bounded(self) -> None:
        response = self._score(
            vector=self._profile_vector("data_analyst", scale=0.18),
            selected_path_key="business_intelligence",
            selected_career_name="Data Analyst",
            completion_rate=0.4,
            have_rate=0.2,
        )
        top_names = self._top_group_names(response)
        self.assertTrue(
            {"Associate Data Analyst", "Data Analyst", "BI Analyst"} & set(top_names)
        )
        self.assertLess(self._top_confidence(response), 0.65)

    def test_neighboring_role_overlap_allows_adjacent_careers_to_appear(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "machine_learning_engineer": 0.45,
                    "data_scientist": 0.35,
                    "ai_engineer": 0.2,
                }
            ),
            selected_path_key="ai_engineering",
            selected_career_name="AI Engineer",
        )
        top_names = self._top_group_names(response)
        expected = {"Machine Learning Engineer", "AI Engineer", "Data Scientist"}
        self.assertGreaterEqual(len(expected & set(top_names[:5])), 2)

    def test_non_executive_mixed_profiles_keep_level_seven_roles_out_of_top_three(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "data_engineer": 0.35,
                    "data_scientist": 0.35,
                    "ai_engineer": 0.2,
                    "data_governance_manager": 0.1,
                },
                scale=0.84,
            ),
            selected_path_key="data_science",
            selected_career_name="Data Scientist",
        )
        top_three = self._top_group_entries(response, limit=3)
        self.assertTrue(top_three)
        self.assertFalse(any(self._is_level_seven(entry["careerName"]) for entry in top_three))

    def test_cbfo_confidence_stays_bounded_without_strong_executive_competencies(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "business_analystics_manager": 0.35,
                    "data_engineer": 0.3,
                    "data_scientist": 0.2,
                    "ai_engineer": 0.15,
                },
                scale=0.8,
            ),
            selected_path_key="business_intelligence",
            selected_career_name="Business Analystics Manager",
        )
        cbfo = self._find_grouped_career(response, "Chief Business Function Officer")
        if cbfo is not None:
            self.assertLess(float(cbfo["recommendationConfidence"]), 0.55)

    def test_bi_path_does_not_dominate_engineering_and_science_heavy_profiles(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "senior_data_engineer": 0.35,
                    "machine_learning_engineer": 0.3,
                    "data_scientist": 0.2,
                    "ai_engineer": 0.15,
                },
                scale=0.9,
            ),
            selected_path_key="data_engineering",
            selected_career_name="Senior Data Engineer",
        )
        path_scores = response["result"].get("pathScores") or []
        self.assertTrue(path_scores)
        self.assertIn(path_scores[0]["pathKey"], {"data_engineering", "data_science", "ai_engineering"})
        self.assertNotEqual(path_scores[0]["pathKey"], "business_intelligence")

    def test_level_seven_roles_are_suppressed_for_hands_on_profiles_without_executive_depth(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "senior_data_engineer": 0.45,
                    "machine_learning_engineer": 0.3,
                    "data_scientist": 0.15,
                    "associate_data_engineer": 0.1,
                },
                scale=0.92,
            ),
            selected_path_key="data_engineering",
            selected_career_name="Senior Data Engineer",
        )
        top_five = self._top_group_entries(response, limit=5)
        self.assertFalse(any(self._is_level_seven(entry["careerName"]) for entry in top_five[:3]))
        self.assertEqual(response["result"]["topCareer"]["careerName"], "Senior Data Engineer")

    def test_strong_executive_strategy_profile_can_still_surface_level_seven_roles(self) -> None:
        response = self._score(
            vector=self._blend_vectors(
                {
                    "business_analystics_director": 0.55,
                    "chief_business_function_officer": 0.45,
                },
                scale=0.98,
            ),
            selected_path_key="business_intelligence",
            selected_career_name="Chief Business Function Officer",
        )
        top_three = self._top_group_entries(response, limit=3)
        self.assertTrue(any(self._is_level_seven(entry["careerName"]) for entry in top_three))

    def _profile_vector(self, profile_key: str, scale: float = 1.0) -> list[float]:
        profile = self.profile_lookup[profile_key]
        return [
            clamp01(float(profile["weights"].get(key, 0.0)) * scale)
            for key in COMPETENCY_ORDER
        ]

    def _blend_vectors(self, weights_by_profile: Dict[str, float], scale: float = 1.0) -> list[float]:
        vector = [0.0 for _ in COMPETENCY_ORDER]
        total_weight = sum(weights_by_profile.values()) or 1.0
        for profile_key, profile_weight in weights_by_profile.items():
            profile = self.profile_lookup[profile_key]
            normalized_weight = profile_weight / total_weight
            for index, competency_key in enumerate(COMPETENCY_ORDER):
                vector[index] += float(profile["weights"].get(competency_key, 0.0)) * normalized_weight
        return [clamp01(value * scale) for value in vector]

    def _score(
        self,
        *,
        vector: list[float],
        selected_path_key: str,
        selected_career_name: str,
        completion_rate: float = 1.0,
        have_rate: float = 0.7,
    ) -> dict:
        answered_count = len(COMPETENCY_ORDER)
        return self.service.score_feature_vector(
            {
                "featureVector": vector,
                "certificationSignals": [],
                "selectedPathKey": selected_path_key,
                "selectedCareerName": selected_career_name,
                "includeExplainability": False,
                "summary": {
                    "completionRate": completion_rate,
                    "haveRate": have_rate,
                    "answeredCount": answered_count,
                    "totalQuestions": answered_count,
                    "source": "backend",
                },
            }
        )

    def _top_group_names(self, response: dict, limit: int = 5) -> list[str]:
        grouped = response["result"].get("groupedCareerScores") or []
        return [str(item["careerName"]) for item in grouped[:limit]]

    def _top_group_entries(self, response: dict, limit: int = 5) -> list[dict]:
        grouped = response["result"].get("groupedCareerScores") or []
        return list(grouped[:limit])

    def _find_grouped_career(self, response: dict, career_name: str) -> dict | None:
        grouped = response["result"].get("groupedCareerScores") or []
        return next((item for item in grouped if str(item["careerName"]) == career_name), None)

    def _top_confidence(self, response: dict) -> float:
        grouped = response["result"].get("groupedCareerScores") or []
        if grouped:
            return float(grouped[0]["recommendationConfidence"])
        return float(response["result"]["topCareer"]["recommendationConfidence"])

    def _is_executive(self, career_name: str) -> bool:
        return any(token in career_name for token in ["Chief", "Officer", "Director"])

    def _is_level_seven(self, career_name: str) -> bool:
        grouped_profile = next(
            (profile for profile in self.profiles if str(profile["careerName"]) == career_name),
            None,
        )
        if grouped_profile is None:
            return False
        levels = [int(level) for level in grouped_profile.get("levels") or []]
        return any(level >= 7 for level in levels)

    def _is_business_executive(self, career_name: str) -> bool:
        return career_name in {
            "Chief Business Function Officer",
            "Business Analystics Director",
            "Business Analystics Manager",
        }


if __name__ == "__main__":
    unittest.main()
