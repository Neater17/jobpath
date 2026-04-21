#!/usr/bin/env python3
"""Train or inspect the persisted recommendation model used by the FastAPI ML service."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.training_service import train_and_persist_recommendation_model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train or inspect the persisted recommendation model artifact")
    parser.add_argument(
        "--model-path",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "backend" / "data" / "recommendation-model.v3.json"),
        help="Path to the persisted recommendation model JSON",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="Only print model info instead of the full payload keys",
    )
    parser.add_argument(
        "--dataset-path",
        type=str,
        default=None,
        help="Optional dataset JSON to train from",
    )
    parser.add_argument(
        "--evaluation-only",
        action="store_true",
        help="Print the saved evaluation JSON without retraining",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model_path = Path(args.model_path)
    evaluation_path = model_path.with_name(model_path.stem + ".evaluation.json")

    if args.evaluation_only:
        if not evaluation_path.exists():
            raise SystemExit(f"Evaluation file not found: {evaluation_path}")
        payload = json.loads(evaluation_path.read_text(encoding="utf-8"))
        print(f"Loaded evaluation: {evaluation_path}")
        print(json.dumps(payload, indent=2))
        return

    if not args.summary_only:
        print("Starting recommendation model training...")
        if args.dataset_path:
            print(f"Using dataset file: {args.dataset_path}")
        else:
            print("No dataset file provided. Falling back to synthetic/profile-bootstrap dataset generation.")
        payload = train_and_persist_recommendation_model(
            dataset_path=args.dataset_path,
            model_path=str(model_path),
            progress=print,
        )
        print(f"Trained and saved model to: {model_path}")
        print(json.dumps(payload.get("modelInfo", {}), indent=2))
        return

    if not model_path.exists():
        raise SystemExit(f"Model file not found: {model_path}")

    payload = json.loads(model_path.read_text(encoding="utf-8"))
    model_info = payload.get("modelInfo", {})

    print(f"Loaded: {model_path}")
    print(json.dumps(model_info, indent=2))

    if not args.summary_only:
        print("\nTop-level keys:")
        print(json.dumps(sorted(payload.keys()), indent=2))


if __name__ == "__main__":
    main()
