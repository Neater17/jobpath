#!/usr/bin/env python3
"""Run MNIST predictions from saved CNN and ensemble model artifacts."""

import argparse

import joblib
import numpy as np
from tensorflow import keras


def align_probabilities(
    proba: np.ndarray,
    model_classes: np.ndarray,
    all_classes: np.ndarray,
) -> np.ndarray:
    aligned = np.zeros((proba.shape[0], len(all_classes)), dtype=np.float64)
    class_to_index = {int(c): i for i, c in enumerate(all_classes)}
    for source_idx, cls in enumerate(model_classes):
        target_idx = class_to_index.get(int(cls))
        if target_idx is not None:
            aligned[:, target_idx] = proba[:, source_idx]
    return aligned


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict MNIST digits with saved model(s)")
    parser.add_argument(
        "--cnn-model-path",
        type=str,
        default="ml/artifacts/mnist_cnn.keras",
        help="Path to saved CNN Keras model",
    )
    parser.add_argument(
        "--ensemble-model-path",
        type=str,
        default="ml/artifacts/mnist_ensemble.joblib",
        help="Path to saved tree ensemble model bundle",
    )
    parser.add_argument(
        "--num-samples",
        type=int,
        default=10,
        help="Number of test samples to predict",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["cnn", "ensemble", "both"],
        default="both",
        help="Which model path to use for predictions",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    (_, _), (x_test, y_test_raw) = keras.datasets.mnist.load_data()
    x_test = x_test.astype("float32") / 255.0
    x_test_cnn = np.expand_dims(x_test, axis=-1)
    x_test_flat = x_test.reshape((x_test.shape[0], -1))

    sample_slice = slice(0, args.num_samples)
    actual = y_test_raw[sample_slice]

    predicted = None
    confidence = None
    model_name = ""

    if args.mode == "cnn":
        cnn = keras.models.load_model(args.cnn_model_path)
        probs = cnn.predict(x_test_cnn[sample_slice], verbose=0)
        predicted = np.argmax(probs, axis=1)
        confidence = np.max(probs, axis=1) * 100
        model_name = "CNN"
    elif args.mode == "ensemble":
        bundle = joblib.load(args.ensemble_model_path)
        models = bundle["models"]
        weights = bundle["weights"]
        all_classes = np.array(bundle.get("classes", list(range(10))))

        logistic_proba = align_probabilities(
            models["logistic"].predict_proba(x_test_flat[sample_slice]),
            models["logistic"].classes_,
            all_classes,
        )
        rf_proba = align_probabilities(
            models["random_forest"].predict_proba(x_test_flat[sample_slice]),
            models["random_forest"].classes_,
            all_classes,
        )
        gb_proba = align_probabilities(
            models["gradient_boosting"].predict_proba(x_test_flat[sample_slice]),
            models["gradient_boosting"].classes_,
            all_classes,
        )

        probs = (
            logistic_proba * weights["logistic"]
            + rf_proba * weights["random_forest"]
            + gb_proba * weights["gradient_boosting"]
        )
        probs = probs / np.clip(probs.sum(axis=1, keepdims=True), a_min=1e-12, a_max=None)

        predicted = all_classes[np.argmax(probs, axis=1)]
        confidence = np.max(probs, axis=1) * 100
        model_name = "Tree Ensemble"
    else:
        cnn = keras.models.load_model(args.cnn_model_path)
        cnn_probs = cnn.predict(x_test_cnn[sample_slice], verbose=0)

        bundle = joblib.load(args.ensemble_model_path)
        models = bundle["models"]
        weights = bundle["weights"]
        all_classes = np.array(bundle.get("classes", list(range(10))))

        logistic_proba = align_probabilities(
            models["logistic"].predict_proba(x_test_flat[sample_slice]),
            models["logistic"].classes_,
            all_classes,
        )
        rf_proba = align_probabilities(
            models["random_forest"].predict_proba(x_test_flat[sample_slice]),
            models["random_forest"].classes_,
            all_classes,
        )
        gb_proba = align_probabilities(
            models["gradient_boosting"].predict_proba(x_test_flat[sample_slice]),
            models["gradient_boosting"].classes_,
            all_classes,
        )
        ensemble_probs = (
            logistic_proba * weights["logistic"]
            + rf_proba * weights["random_forest"]
            + gb_proba * weights["gradient_boosting"]
        )
        ensemble_probs = ensemble_probs / np.clip(
            ensemble_probs.sum(axis=1, keepdims=True), a_min=1e-12, a_max=None
        )

        # Blend CNN and tree-ensemble probabilities for robust predictions.
        probs = 0.6 * cnn_probs + 0.4 * ensemble_probs
        probs = probs / np.clip(probs.sum(axis=1, keepdims=True), a_min=1e-12, a_max=None)

        predicted = np.argmax(probs, axis=1)
        confidence = np.max(probs, axis=1) * 100
        model_name = "Hybrid (CNN + Tree Ensemble)"

    print(f"Model mode: {model_name}")
    print(f"Showing {args.num_samples} predictions:\n")
    for i in range(args.num_samples):
        print(
            f"Sample {i+1:02d}: predicted={predicted[i]} "
            f"actual={actual[i]} confidence={confidence[i]:.1f}%"
        )

    sample_acc = np.mean(predicted == actual)
    print(f"\nSample accuracy ({args.num_samples} samples): {sample_acc:.4f}")


if __name__ == "__main__":
    main()
