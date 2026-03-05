from typing import Dict, Any

# Trọng số theo Master Document
SKILL_WEIGHTS = {
    "joint_attention": 0.25,
    "imitation":       0.20,
    "nonverbal_comm":  0.20,
    "name_response":   0.15,
    "pretend_play":    0.10,
    "emotion_recog":   0.10,
    "turn_taking":     0.08,
    "receptive_lang":  0.07,
}

DOMAIN_WEIGHTS = {
    "core":        0.4,
    "social":      0.3,
    "cognitive":   0.3,
}

def calculate_z_score(raw: float, mean: float, std: float) -> float:
    if std == 0:
        return 0
    return (raw - mean) / std

def classify_risk(weighted_score: float) -> str:
    if weighted_score < -2.0:
        return "RẤT CAO"
    elif weighted_score < -1.0:
        return "CAO"
    elif weighted_score < -0.5:
        return "TRUNG BÌNH"
    else:
        return "THẤP"

def calculate_developmental_score(
    age_months: int,
    game_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    game_results: {
      "G1.1": {"response_time": 2.5, "accuracy": 0.8, "gaze_score": 0.7},
      ...
    }
    """
    # Điểm thô mô phỏng (sẽ thay bằng dữ liệu AI thật)
    domain_scores = {
        "social":    _calc_domain(game_results, ["G1.1", "G1.2", "G1.3", "G2.1"]),
        "communication": _calc_domain(game_results, ["G2.3", "G4.4"]),
        "cognitive": _calc_domain(game_results, ["G3.1", "G3.4", "G4.1"]),
        "motor":     _calc_domain(game_results, ["G2.2"]),
    }

    weighted = (
        domain_scores["social"]        * 0.4 +
        domain_scores["communication"] * 0.3 +
        domain_scores["cognitive"]     * 0.2 +
        domain_scores["motor"]         * 0.1
    )

    risk_level = classify_risk(weighted - 70)  # Normalize về z-score

    return {
        "domain_scores": domain_scores,
        "weighted_score": round(weighted, 2),
        "risk_level": risk_level,
        "strengths": [k for k, v in domain_scores.items() if v >= 75],
        "concerns":  [k for k, v in domain_scores.items() if v < 50],
        "developmental_age_estimate": max(12, age_months + int((weighted - 70) / 5))
    }

def _calc_domain(results: dict, game_codes: list) -> float:
    scores = []
    for code in game_codes:
        if code in results:
            g = results[code]
            acc = g.get("accuracy", 0.5)
            scores.append(acc * 100)
    return round(sum(scores) / len(scores), 2) if scores else 50.0