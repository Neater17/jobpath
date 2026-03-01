#!/usr/bin/env python3
"""Train MNIST models: CNN and tree-based ensemble, then save artifacts."""

import argparse
import json
import os

import joblib
import numpy as np
import tensorflow as tf
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from tensorflow import keras
from tensorflow.keras import layers

ENSEMBLE_WEIGHTS = {
    "logistic": 0.35,
    "random_forest": 0.45,
    "gradient_boosting": 0.20,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train MNIST CNN + tree ensemble models")
    parser.add_argument("--epochs", type=int, default=30, help="Max CNN training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="CNN batch size")
    parser.add_argument(
        "--cnn-model-path",
        type=str,
        default="ml/artifacts/mnist_cnn.keras",
        help="Output path for saved CNN Keras model",
    )
    parser.add_argument(
        "--ensemble-model-path",
        type=str,
        default="ml/artifacts/mnist_ensemble.joblib",
        help="Output path for saved tree ensemble model bundle",
    )
    parser.add_argument(
        "--metrics-path",
        type=str,
        default="ml/artifacts/metrics.json",
        help="Output path for training metrics JSON",
    )
    parser.add_argument(
        "--ensemble-train-size",
        type=int,
        default=20000,
        help="Number of train samples for tree models (0 = use all)",
    )
    parser.add_argument(
        "--rf-trees",
        type=int,
        default=300,
        help="Random forest tree count",
    )
    parser.add_argument(
        "--gb-estimators",
        type=int,
        default=180,
        help="Gradient boosting estimators",
    )
    return parser.parse_args()


def load_data():
    (x_train, y_train_raw), (x_test, y_test_raw) = keras.datasets.mnist.load_data()

    x_train = x_train.astype("float32") / 255.0
    x_test = x_test.astype("float32") / 255.0

    x_train_cnn = np.expand_dims(x_train, axis=-1)
    x_test_cnn = np.expand_dims(x_test, axis=-1)

    y_train_cnn = keras.utils.to_categorical(y_train_raw, 10)
    y_test_cnn = keras.utils.to_categorical(y_test_raw, 10)

    x_train_flat = x_train.reshape((x_train.shape[0], -1))
    x_test_flat = x_test.reshape((x_test.shape[0], -1))

    return {
        "x_train_cnn": x_train_cnn,
        "y_train_cnn": y_train_cnn,
        "x_test_cnn": x_test_cnn,
        "y_test_cnn": y_test_cnn,
        "x_train_flat": x_train_flat,
        "x_test_flat": x_test_flat,
        "y_train_raw": y_train_raw,
        "y_test_raw": y_test_raw,
    }


def build_model() -> keras.Model:
    model = keras.Sequential(
        [
            layers.Conv2D(32, (3, 3), activation="relu", input_shape=(28, 28, 1)),
            layers.BatchNormalization(),
            layers.Conv2D(32, (3, 3), activation="relu"),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Conv2D(64, (3, 3), activation="relu"),
            layers.BatchNormalization(),
            layers.Conv2D(64, (3, 3), activation="relu"),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Flatten(),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(10, activation="softmax"),
        ]
    )
    return model


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


def train_tree_ensemble(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_test: np.ndarray,
    y_test: np.ndarray,
    train_size: int,
    rf_trees: int,
    gb_estimators: int,
) -> dict:
    rng = np.random.default_rng(42)
    if train_size > 0 and train_size < x_train.shape[0]:
        indices = rng.choice(x_train.shape[0], size=train_size, replace=False)
        x_train_used = x_train[indices]
        y_train_used = y_train[indices]
    else:
        x_train_used = x_train
        y_train_used = y_train

    logistic = LogisticRegression(
        max_iter=350,
        solver="lbfgs",
        multi_class="multinomial",
    )
    random_forest = RandomForestClassifier(
        n_estimators=rf_trees,
        random_state=42,
        n_jobs=-1,
    )
    gradient_boosting = GradientBoostingClassifier(
        n_estimators=gb_estimators,
        learning_rate=0.08,
        max_depth=3,
        random_state=42,
    )

    logistic.fit(x_train_used, y_train_used)
    random_forest.fit(x_train_used, y_train_used)
    gradient_boosting.fit(x_train_used, y_train_used)

    all_classes = np.arange(10)
    logistic_proba = align_probabilities(
        logistic.predict_proba(x_test), logistic.classes_, all_classes
    )
    rf_proba = align_probabilities(
        random_forest.predict_proba(x_test), random_forest.classes_, all_classes
    )
    gb_proba = align_probabilities(
        gradient_boosting.predict_proba(x_test), gradient_boosting.classes_, all_classes
    )
    ensemble_proba = (
        logistic_proba * ENSEMBLE_WEIGHTS["logistic"]
        + rf_proba * ENSEMBLE_WEIGHTS["random_forest"]
        + gb_proba * ENSEMBLE_WEIGHTS["gradient_boosting"]
    )
    ensemble_proba = ensemble_proba / np.clip(
        ensemble_proba.sum(axis=1, keepdims=True), a_min=1e-12, a_max=None
    )

    predictions = {
        "logistic": np.argmax(logistic_proba, axis=1),
        "random_forest": np.argmax(rf_proba, axis=1),
        "gradient_boosting": np.argmax(gb_proba, axis=1),
        "ensemble": np.argmax(ensemble_proba, axis=1),
    }

    metrics = {
        "train_samples_used": int(x_train_used.shape[0]),
        "logistic_accuracy": float(accuracy_score(y_test, predictions["logistic"])),
        "random_forest_accuracy": float(accuracy_score(y_test, predictions["random_forest"])),
        "gradient_boosting_accuracy": float(
            accuracy_score(y_test, predictions["gradient_boosting"])
        ),
        "ensemble_accuracy": float(accuracy_score(y_test, predictions["ensemble"])),
        "ensemble_log_loss": float(log_loss(y_test, ensemble_proba, labels=list(all_classes))),
    }

    feature_importance = {
        "logistic": np.mean(np.abs(logistic.coef_), axis=0).tolist(),
        "random_forest": random_forest.feature_importances_.tolist(),
        "gradient_boosting": gradient_boosting.feature_importances_.tolist(),
    }

    return {
        "bundle": {
            "models": {
                "logistic": logistic,
                "random_forest": random_forest,
                "gradient_boosting": gradient_boosting,
            },
            "weights": ENSEMBLE_WEIGHTS,
            "classes": all_classes.tolist(),
            "feature_importance": feature_importance,
        },
        "metrics": metrics,
    }


def main() -> None:
    args = parse_args()
    tf.random.set_seed(42)
    np.random.seed(42)

    data = load_data()

    cnn = build_model()
    cnn.compile(
        optimizer="adam",
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    early_stopping = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
    )
    reduce_lr = keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=2,
        min_lr=1e-5,
    )

    history = cnn.fit(
        data["x_train_cnn"],
        data["y_train_cnn"],
        batch_size=args.batch_size,
        epochs=args.epochs,
        validation_split=0.1,
        callbacks=[early_stopping, reduce_lr],
        shuffle=True,
        verbose=1,
    )

    cnn_test_loss, cnn_test_accuracy = cnn.evaluate(
        data["x_test_cnn"], data["y_test_cnn"], verbose=0
    )

    ensemble_output = train_tree_ensemble(
        x_train=data["x_train_flat"],
        y_train=data["y_train_raw"],
        x_test=data["x_test_flat"],
        y_test=data["y_test_raw"],
        train_size=args.ensemble_train_size,
        rf_trees=args.rf_trees,
        gb_estimators=args.gb_estimators,
    )

    os.makedirs(os.path.dirname(args.cnn_model_path), exist_ok=True)
    os.makedirs(os.path.dirname(args.ensemble_model_path), exist_ok=True)
    os.makedirs(os.path.dirname(args.metrics_path), exist_ok=True)

    cnn.save(args.cnn_model_path)
    joblib.dump(ensemble_output["bundle"], args.ensemble_model_path)

    metrics = {
        "cnn": {
            "epochs_ran": len(history.history["loss"]),
            "best_val_accuracy": float(max(history.history["val_accuracy"])),
            "final_train_accuracy": float(history.history["accuracy"][-1]),
            "test_accuracy": float(cnn_test_accuracy),
            "test_loss": float(cnn_test_loss),
            "model_path": args.cnn_model_path,
        },
        "ensemble": {
            **ensemble_output["metrics"],
            "model_path": args.ensemble_model_path,
            "weights": ENSEMBLE_WEIGHTS,
        },
    }
    with open(args.metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\nTraining complete.")
    print(f"Saved CNN model: {args.cnn_model_path}")
    print(f"Saved ensemble model: {args.ensemble_model_path}")
    print(f"Saved metrics: {args.metrics_path}")
    print(f"CNN test accuracy: {cnn_test_accuracy:.4f}")
    print(f"Ensemble test accuracy: {ensemble_output['metrics']['ensemble_accuracy']:.4f}")


if __name__ == "__main__":
    main()
