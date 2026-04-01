#!/usr/bin/env python3
"""Inspect the persisted recommendation model used by the FastAPI ML service."""

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect the persisted recommendation model artifact")
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model_path = Path(args.model_path)
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
