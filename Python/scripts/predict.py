#!/usr/bin/env python3
"""Score a recommendation payload locally using the Python recommendation service runtime."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.service import RecommendationMlService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score a JobPath recommendation payload")
    parser.add_argument(
        "--payload",
        type=str,
        required=True,
        help="Path to a JSON recommendation request payload",
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=None,
        help="Optional override for the persisted recommendation model JSON",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload_path = Path(args.payload)
    if not payload_path.exists():
        raise SystemExit(f"Payload file not found: {payload_path}")

    service = RecommendationMlService(model_path=args.model_path)
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    response = service.recommend(payload)
    print(json.dumps(response, indent=2))


if __name__ == "__main__":
    main()
