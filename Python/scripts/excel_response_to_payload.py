#!/usr/bin/env python3
"""Validate JobPath industry skill Excel responses against a target role.

The workbook is a normal .xlsx file, so this script reads its XML parts directly
and does not require pandas/openpyxl.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.catalog import (
    COMPETENCY_LABELS,
    COMPETENCY_ORDER,
    build_career_ladder_entries,
    competency_key_for_title,
)

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
METADATA_COLUMNS = {
    "timestamp",
    "do_you_give_consent",
    "name_optional",
    "company_organization_optional",
    "job_title_current_position",
    "years_of_experience",
}
COMMENT_HEADER_TOKENS = ("comment", "suggestion", "write_none")

HEADER_ALIASES = {
    "applications_integrations": "applications_integration",
    "testing_planning": "testing_planning",
}

TEXT_LEVEL_SCORES = {
    "beginner": 0.30,
    "basic": 0.30,
    "foundation": 0.30,
    "foundational": 0.30,
    "intermediate": 0.55,
    "working": 0.55,
    "advanced": 0.78,
    "senior": 0.78,
    "expert": 0.92,
    "lead": 0.92,
}
DECISION_THRESHOLDS = {
    "validates": 0.75,
    "partially_validates": 0.55,
}
DEFAULT_ZERO_WEIGHT = 0.5
SUMMARY_COLUMNS = [
    "rowNumber",
    "jobTitle",
    "yearsExperience",
    "targetPathKey",
    "targetCareerName",
    "decision",
    "fitScore",
    "requirementMatchScore",
    "coverageRate",
    "answeredSkills",
    "totalFormSkills",
    "averageAnsweredScore",
    "metExpectedSkillCount",
    "strongSkillCount",
    "gapSkillCount",
    "topStrengths",
    "topGaps",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate JobPath Excel response rows against a selected career role."
    )
    parser.add_argument("--xlsx", required=True, help="Path to the .xlsx response export")
    parser.add_argument(
        "--out-dir",
        default="artifacts/role-validation",
        help="Directory where validation reports and optional payloads should be written",
    )
    parser.add_argument(
        "--row",
        type=int,
        default=None,
        help="Optional 1-based worksheet row number to validate; default validates every response row",
    )
    parser.add_argument(
        "--selected-path-key",
        default="data_engineering",
        help="Target career path key, for example data_engineering",
    )
    parser.add_argument(
        "--selected-career-name",
        default="Senior Data Engineer",
        help='Target career name, for example "Senior Data Engineer"',
    )
    parser.add_argument(
        "--blank-score",
        type=float,
        default=0.0,
        help="Score to use for blank competency cells in validation and payload exports",
    )
    parser.add_argument(
        "--export-payloads",
        action="store_true",
        help="Also export per-row /ml/score JSON payloads for the existing model CLI/API",
    )
    return parser.parse_args()


def read_xlsx_rows(path: Path) -> List[List[str]]:
    with zipfile.ZipFile(path) as archive:
        shared_strings = read_shared_strings(archive)
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    rows: List[List[str]] = []
    for row in sheet.findall(".//a:sheetData/a:row", NS):
        values: List[str] = []
        current_column = 1
        for cell in row.findall("a:c", NS):
            column_index = column_name_to_index(re.sub(r"\d+", "", cell.get("r", "")))
            while current_column < column_index:
                values.append("")
                current_column += 1
            values.append(read_cell_value(cell, shared_strings))
            current_column += 1
        rows.append(values)
    return rows


def read_shared_strings(archive: zipfile.ZipFile) -> List[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(node.text or "" for node in item.findall(".//a:t", NS))
        for item in root.findall("a:si", NS)
    ]


def read_cell_value(cell: ET.Element, shared_strings: List[str]) -> str:
    value = cell.find("a:v", NS)
    raw = "" if value is None else value.text or ""
    if cell.get("t") == "s" and raw:
        return shared_strings[int(raw)]
    return raw


def column_name_to_index(column: str) -> int:
    result = 0
    for char in column:
        if not char.isalpha():
            continue
        result = result * 26 + (ord(char.upper()) - ord("A") + 1)
    return max(result, 1)


def normalize_header(header: str) -> str:
    key = competency_key_for_title(header.strip())
    return HEADER_ALIASES.get(key, key)


def parse_score(value: str) -> float | None:
    text = value.strip().lower()
    if not text:
        return None

    match = re.match(r"^(\d+(?:\.\d+)?)\s*-", text)
    if match:
        number = float(match.group(1))
        if number <= 5:
            return clamp01(number / 5)
        if number <= 7:
            return clamp01(number / 7)
        return clamp01(number / 100)

    for token, score in TEXT_LEVEL_SCORES.items():
        if token in text:
            return score

    numbers = [float(item) for item in re.findall(r"\d+(?:\.\d+)?", text)]
    if numbers:
        number = max(numbers)
        if number <= 5:
            return clamp01(number / 5)
        if number <= 7:
            return clamp01(number / 7)
        return clamp01(number / 100)
    return None


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def normalize_identifier(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())


def is_comment_header(header_key: str, raw_header: str) -> bool:
    text = f"{header_key} {raw_header}".lower()
    return any(token in text for token in COMMENT_HEADER_TOKENS)


def metadata_from_row(headers: List[str], response: List[str]) -> Dict[str, str]:
    metadata: Dict[str, str] = {
        "timestamp": "",
        "jobTitle": "",
        "yearsExperience": "",
    }
    mapping = {
        "timestamp": "timestamp",
        "job_title_current_position": "jobTitle",
        "years_of_experience": "yearsExperience",
    }
    for index, header in enumerate(headers):
        key = normalize_header(header)
        output_key = mapping.get(key)
        if output_key:
            metadata[output_key] = response[index].strip() if index < len(response) else ""
    return metadata


def find_ladder_entry(path_key: str, career_name: str) -> Dict[str, Any]:
    normalized_target = normalize_identifier(career_name)
    for entry in build_career_ladder_entries():
        if str(entry.get("pathKey")) != path_key:
            continue
        if normalize_identifier(str(entry.get("careerName") or "")) == normalized_target:
            return entry
    raise SystemExit(f"Career role not found: {path_key} / {career_name}")


def iter_response_row_numbers(rows: List[List[str]], selected_row: Optional[int]) -> Iterable[int]:
    if selected_row is not None:
        if selected_row <= 1:
            raise SystemExit("--row must point to a response row, not the header row")
        if len(rows) < selected_row:
            raise SystemExit(f"Workbook has {len(rows)} rows; cannot read row {selected_row}")
        return [selected_row]
    return range(2, len(rows) + 1)


def collect_competency_values(
    headers: List[str],
    response: List[str],
) -> Tuple[Dict[str, Dict[str, Any]], List[str], List[str]]:
    values_by_key: Dict[str, Dict[str, Any]] = {}
    unmatched_headers: List[str] = []
    recognized_keys: set[str] = set()

    for index, header in enumerate(headers):
        raw_header = header.strip()
        if not raw_header:
            continue

        key = normalize_header(raw_header)
        raw_value = response[index].strip() if index < len(response) else ""
        if key in METADATA_COLUMNS:
            continue
        if key not in COMPETENCY_ORDER:
            if raw_value and not is_comment_header(key, raw_header):
                unmatched_headers.append(raw_header)
            continue

        score = parse_score(raw_value)
        values_by_key[key] = {
            "header": raw_header,
            "rawValue": raw_value,
            "score": score,
        }
        recognized_keys.add(key)

    return values_by_key, sorted(recognized_keys), unmatched_headers


def build_score_payload(
    values_by_key: Dict[str, Dict[str, Any]],
    selected_path_key: str,
    selected_career_name: str,
    blank_score: float,
    total_questions: int,
) -> Dict[str, Any]:
    feature_vector = [
        clamp01(float(values_by_key.get(key, {}).get("score") if values_by_key.get(key, {}).get("score") is not None else blank_score))
        for key in COMPETENCY_ORDER
    ]
    answered_keys = [
        key for key in COMPETENCY_ORDER if values_by_key.get(key, {}).get("score") is not None
    ]
    return {
        "featureVector": feature_vector,
        "certificationSignals": [],
        "selectedPathKey": selected_path_key,
        "selectedCareerName": selected_career_name,
        "explainabilityMethod": "auto",
        "includeExplainability": False,
        "summary": {
            "completionRate": len(answered_keys) / total_questions if total_questions else 0.0,
            "haveRate": sum(feature_vector) / len(answered_keys) if answered_keys else 0.0,
            "answeredCount": len(answered_keys),
            "totalQuestions": total_questions,
            "source": "backend",
        },
    }


def role_weight_for(weights: Dict[str, Any], key: str) -> float:
    value = float(weights.get(key, 0.0) or 0.0)
    return value if value > 0 else DEFAULT_ZERO_WEIGHT


def requirement_match_for(score: float, expected_score: float) -> float:
    if expected_score <= 0:
        return clamp01(score)
    return clamp01(score / expected_score)


def decision_for_fit(requirement_match_score: float) -> str:
    if requirement_match_score >= DECISION_THRESHOLDS["validates"]:
        return "Validates role fit"
    if requirement_match_score >= DECISION_THRESHOLDS["partially_validates"]:
        return "Partially validates role fit"
    return "Does not validate role fit"


def validate_response(
    *,
    row_number: int,
    headers: List[str],
    response: List[str],
    ladder_entry: Dict[str, Any],
    selected_path_key: str,
    selected_career_name: str,
    blank_score: float,
) -> Dict[str, Any]:
    values_by_key, recognized_keys, unmatched_headers = collect_competency_values(headers, response)
    weights = dict(ladder_entry.get("weights") or {})
    metadata = metadata_from_row(headers, response)

    skill_results: List[Dict[str, Any]] = []
    weighted_score = 0.0
    weighted_requirement_match = 0.0
    total_weight = 0.0
    answered_scores: List[float] = []

    for key in recognized_keys:
        value = values_by_key[key]
        score = value.get("score")
        effective_score = clamp01(float(score if score is not None else blank_score))
        weight = role_weight_for(weights, key)
        expected_score = role_weight_for(weights, key)
        requirement_match = requirement_match_for(effective_score, expected_score)
        weighted_score += effective_score * weight
        weighted_requirement_match += requirement_match * weight
        total_weight += weight
        if score is not None:
            answered_scores.append(float(score))
        skill_results.append(
            {
                "key": key,
                "label": COMPETENCY_LABELS[key],
                "rawValue": value["rawValue"],
                "score": score,
                "effectiveScore": effective_score,
                "expectedScore": expected_score,
                "requirementMatch": requirement_match,
                "meetsExpected": requirement_match >= 1.0,
                "roleWeight": weight,
                "status": "answered" if score is not None else "blank",
            }
        )

    answered_count = len(answered_scores)
    total_form_skills = len(recognized_keys)
    fit_score = clamp01(weighted_score / total_weight) if total_weight > 0 else 0.0
    requirement_match_score = clamp01(weighted_requirement_match / total_weight) if total_weight > 0 else 0.0
    coverage_rate = answered_count / total_form_skills if total_form_skills else 0.0
    average_answered_score = sum(answered_scores) / answered_count if answered_count else 0.0
    met_expected_skill_count = sum(
        1 for skill in skill_results if skill["score"] is not None and bool(skill["meetsExpected"])
    )
    strong_skills = [
        skill for skill in skill_results
        if skill["score"] is not None and float(skill["effectiveScore"]) >= 0.7
    ]
    gap_skills = [
        {
            **skill,
            "gapScore": float(skill["roleWeight"]) * (1.0 - float(skill["requirementMatch"])),
        }
        for skill in skill_results
        if skill["score"] is None or float(skill["requirementMatch"]) < 1.0
    ]
    strong_skills.sort(
        key=lambda item: (float(item["effectiveScore"]) * float(item["roleWeight"]), float(item["roleWeight"])),
        reverse=True,
    )
    gap_skills.sort(key=lambda item: float(item["gapScore"]), reverse=True)

    return {
        "rowNumber": row_number,
        "metadata": metadata,
        "targetRole": {
            "pathKey": selected_path_key,
            "pathName": ladder_entry.get("pathName"),
            "careerName": selected_career_name,
            "level": ladder_entry.get("level"),
            "profileKey": ladder_entry.get("profileKey"),
        },
        "decision": decision_for_fit(requirement_match_score),
        "fitScore": fit_score,
        "requirementMatchScore": requirement_match_score,
        "coverageRate": coverage_rate,
        "answeredSkills": answered_count,
        "totalFormSkills": total_form_skills,
        "averageAnsweredScore": average_answered_score,
        "metExpectedSkillCount": met_expected_skill_count,
        "strongSkills": strong_skills[:8],
        "gapSkills": gap_skills[:10],
        "skills": skill_results,
        "unmatchedHeaders": unmatched_headers,
        "scorePayload": build_score_payload(
            values_by_key,
            selected_path_key,
            selected_career_name,
            blank_score,
            total_form_skills,
        ),
    }


def csv_row_from_result(result: Dict[str, Any]) -> Dict[str, Any]:
    metadata = result["metadata"]
    target = result["targetRole"]
    return {
        "rowNumber": result["rowNumber"],
        "jobTitle": metadata["jobTitle"],
        "yearsExperience": metadata["yearsExperience"],
        "targetPathKey": target["pathKey"],
        "targetCareerName": target["careerName"],
        "decision": result["decision"],
        "fitScore": f"{result['fitScore']:.4f}",
        "requirementMatchScore": f"{result['requirementMatchScore']:.4f}",
        "coverageRate": f"{result['coverageRate']:.4f}",
        "answeredSkills": result["answeredSkills"],
        "totalFormSkills": result["totalFormSkills"],
        "averageAnsweredScore": f"{result['averageAnsweredScore']:.4f}",
        "metExpectedSkillCount": result["metExpectedSkillCount"],
        "strongSkillCount": len(result["strongSkills"]),
        "gapSkillCount": len(result["gapSkills"]),
        "topStrengths": "; ".join(skill["label"] for skill in result["strongSkills"][:5]),
        "topGaps": "; ".join(skill["label"] for skill in result["gapSkills"][:5]),
    }


def write_summary_csv(path: Path, results: List[Dict[str, Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=SUMMARY_COLUMNS)
        writer.writeheader()
        for result in results:
            writer.writerow(csv_row_from_result(result))


def write_markdown_report(path: Path, results: List[Dict[str, Any]]) -> None:
    lines = ["# JobPath Role Validation Report", ""]
    for result in results:
        metadata = result["metadata"]
        target = result["targetRole"]
        label = f"Row {result['rowNumber']}"
        lines.extend(
            [
                f"## {label}",
                "",
                f"- Target role: {target['careerName']} ({target['pathKey']})",
                f"- Current position: {metadata['jobTitle'] or 'N/A'}",
                f"- Years of experience: {metadata['yearsExperience'] or 'N/A'}",
                f"- Decision: {result['decision']}",
                f"- Evidence strength score: {result['fitScore']:.1%}",
                f"- Expected proficiency match score: {result['requirementMatchScore']:.1%}",
                f"- Coverage: {result['answeredSkills']} / {result['totalFormSkills']} ({result['coverageRate']:.1%})",
                f"- Skills meeting expected proficiency: {result['metExpectedSkillCount']} / {result['totalFormSkills']}",
                f"- Average answered proficiency: {result['averageAnsweredScore']:.1%}",
                "",
                "Strongest evidence:",
            ]
        )
        if result["strongSkills"]:
            for skill in result["strongSkills"][:5]:
                lines.append(f"- {skill['label']}: {float(skill['effectiveScore']):.1%}")
        else:
            lines.append("- None")
        lines.extend(["", "Priority gaps:"])
        if result["gapSkills"]:
            for skill in result["gapSkills"][:5]:
                actual = "blank" if skill["score"] is None else f"{float(skill['effectiveScore']):.1%}"
                expected = f"{float(skill['expectedScore']):.1%}"
                lines.append(f"- {skill['label']}: {actual} / expected {expected}")
        else:
            lines.append("- None")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def slugify_filename(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "role"


def main() -> None:
    args = parse_args()
    workbook_path = Path(args.xlsx).resolve()
    rows = read_xlsx_rows(workbook_path)
    if len(rows) < 2:
        raise SystemExit("Workbook does not contain any response rows")

    headers = rows[0]
    ladder_entry = find_ladder_entry(args.selected_path_key, args.selected_career_name)
    row_numbers = list(iter_response_row_numbers(rows, args.row))
    results = [
        validate_response(
            row_number=row_number,
            headers=headers,
            response=rows[row_number - 1],
            ladder_entry=ladder_entry,
            selected_path_key=args.selected_path_key,
            selected_career_name=args.selected_career_name,
            blank_score=args.blank_score,
        )
        for row_number in row_numbers
    ]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    role_slug = slugify_filename(args.selected_career_name)
    details_path = out_dir / f"{role_slug}-validation-details.json"
    summary_json_path = out_dir / f"{role_slug}-validation-summary.json"
    summary_csv_path = out_dir / f"{role_slug}-validation-summary.csv"
    markdown_path = out_dir / f"{role_slug}-validation-report.md"

    details = {
        "sourceWorkbook": str(workbook_path),
        "targetRole": {
            "pathKey": args.selected_path_key,
            "pathName": ladder_entry.get("pathName"),
            "careerName": args.selected_career_name,
            "level": ladder_entry.get("level"),
            "profileKey": ladder_entry.get("profileKey"),
        },
        "responseCount": len(results),
        "results": [
            {key: value for key, value in result.items() if key != "scorePayload"}
            for result in results
        ],
    }
    summary = {
        "sourceWorkbook": str(workbook_path),
        "targetRole": details["targetRole"],
        "responseCount": len(results),
        "rows": [csv_row_from_result(result) for result in results],
    }

    details_path.write_text(json.dumps(details, indent=2), encoding="utf-8")
    summary_json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_summary_csv(summary_csv_path, results)
    write_markdown_report(markdown_path, results)

    print(f"Wrote {details_path}")
    print(f"Wrote {summary_json_path}")
    print(f"Wrote {summary_csv_path}")
    print(f"Wrote {markdown_path}")

    if args.export_payloads:
        payload_dir = out_dir / "payloads"
        payload_dir.mkdir(parents=True, exist_ok=True)
        for result in results:
            payload_path = payload_dir / f"row-{result['rowNumber']}-score-payload.json"
            payload_path.write_text(json.dumps(result["scorePayload"], indent=2), encoding="utf-8")
            print(f"Wrote {payload_path}")

    print(json.dumps(summary["rows"], indent=2))


if __name__ == "__main__":
    main()
