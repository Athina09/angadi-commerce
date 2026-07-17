"""
Classical OpenCV / Pillow freshness heuristics — NOT a trained deep-learning model.
Blemish + mold ratio + (for leafy categories) HSV saturation.
"""

from __future__ import annotations

from typing import Any

import numpy as np

LEAFY_CATEGORIES = {
    "vegetables",
    "herbs",
    "leafy",
    "greens",
}


def _to_bgr(image: np.ndarray) -> np.ndarray:
    import cv2

    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image


def blemish_ratio(image: np.ndarray) -> float:
    """
    Share of dark / brown / mold-like pixels in the produce region (0–1).
    Includes near-black mold (previously excluded by the produce mask).
    """
    import cv2

    bgr = _to_bgr(image)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    # Soft produce ROI — keep dark mold inside the score region
    produce = (v > 18) & (v < 250)
    produce_count = int(np.count_nonzero(produce))
    if produce_count < 50:
        produce = np.ones(v.shape, dtype=bool)
        produce_count = int(produce.size)

    # Classic dark bruises
    dark = (v < 75) & produce
    # Brown / bruised flesh
    brown = ((h < 25) | (h > 160)) & (s > 35) & (v < 150) & produce
    # Black / grey mold (very dark, low-mid sat)
    mold_black = (v < 55) & (s < 100) & produce
    # Greenish mold film
    mold_green = (h > 35) & (h < 95) & (s < 90) & (v < 130) & produce

    blemish = dark | brown | mold_black | mold_green
    raw = float(np.count_nonzero(blemish)) / float(produce_count)

    # Amplify so visible mold lands in the "rotten" band (<35%)
    amplified = raw * 2.8
    # Hard floor when mold occupies a large share of the frame
    mold_share = float(np.count_nonzero(mold_black | mold_green)) / float(
        produce_count
    )
    if mold_share > 0.12:
        amplified = max(amplified, 0.75)
    if mold_share > 0.22:
        amplified = max(amplified, 0.88)

    return float(min(1.0, max(0.0, amplified)))


def saturation_score(image: np.ndarray) -> float:
    """
    Leafy greens: higher mean HSV saturation ≈ fresher.
    Reference "fresh" band ~90–180 (OpenCV S is 0–255).
    """
    import cv2

    bgr = _to_bgr(image)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    s = hsv[:, :, 1].astype(np.float32)
    v = hsv[:, :, 2]
    mask = (v > 30) & (v < 245)
    if np.count_nonzero(mask) < 50:
        mean_s = float(np.mean(s))
    else:
        mean_s = float(np.mean(s[mask]))

    if mean_s < 40:
        return 0.25
    if mean_s < 90:
        return 0.25 + 0.5 * ((mean_s - 40) / 50.0)
    if mean_s <= 180:
        return 0.75 + 0.25 * ((mean_s - 90) / 90.0)
    return 0.95


def score_quality(image: np.ndarray, category: str) -> dict[str, Any]:
    """
    Returns qualityScore 0–1 plus component signals for transparent UI.
    Explicitly classical CV — not a trained spoilage classifier.
    """
    cat = (category or "").strip().lower()
    br = blemish_ratio(image)
    blemish_score = float(max(0.0, min(1.0, 1.0 - br)))

    leafy = any(k in cat for k in LEAFY_CATEGORIES) or cat in LEAFY_CATEGORIES
    components: dict[str, float] = {
        "blemishRatio": round(br, 3),
        "blemishScore": round(blemish_score, 3),
    }

    if leafy:
        sat = saturation_score(image)
        components["saturationScore"] = round(sat, 3)
        quality = round(0.6 * blemish_score + 0.4 * sat, 2)
        method = "blemish+mold+saturation (leafy)"
    else:
        quality = round(blemish_score, 2)
        method = "blemish+mold"

    # Predicted edible days hint (quality-scaled, category shelf defaults)
    shelf = 5 if leafy else 10
    if quality < 0.2:
        days_hint = 0
    elif quality < 0.35:
        days_hint = 1
    else:
        days_hint = max(0, int(round(shelf * (quality - 0.35) / 0.65)))

    return {
        "qualityScore": quality,
        "components": components,
        "method": method,
        "model": "opencv-heuristic",
        "daysSurviveHint": days_hint,
        "note": "Classical OpenCV mold/blemish heuristics — not a trained deep-learning spoilage model",
    }


def score_quality_from_bytes(data: bytes, category: str) -> dict[str, Any]:
    import cv2

    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image bytes")
    return score_quality(image, category)


def score_quality_from_path(path: str, category: str) -> dict[str, Any]:
    import cv2

    image = cv2.imread(path)
    if image is None:
        raise ValueError(f"Could not read image: {path}")
    return score_quality(image, category)
