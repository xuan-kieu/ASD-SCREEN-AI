from typing import Dict, List, Any

# ============================================================
# TRỌNG SỐ THEO NHÓM TUỔI
# ============================================================
DOMAIN_WEIGHTS = {
    '12-18': { 'social': 0.35, 'communication': 0.30, 'cognitive': 0.20, 'motor': 0.15 },
    '18-24': { 'social': 0.30, 'communication': 0.30, 'cognitive': 0.25, 'motor': 0.15 },
    '24-36': { 'social': 0.25, 'communication': 0.30, 'cognitive': 0.30, 'motor': 0.15 },
    '36-60': { 'social': 0.20, 'communication': 0.25, 'cognitive': 0.40, 'motor': 0.15 },
}

GAME_DOMAIN_MAP = {
    'GATEWAY_BALLOON':  'social',
    'GATEWAY_NAME':     'social',
    'GATEWAY_CLAPPING': 'social',
    'G1.1': 'social',    'G1.2': 'social',    'G1.3': 'social',
    'G1.4': 'social',    'G1.5': 'cognitive',
    'G2.1': 'cognitive', 'G2.2': 'motor',     'G2.3': 'communication',
    'G2.4': 'cognitive', 'G2.5': 'cognitive',
    'G3.1': 'cognitive', 'G3.2': 'social',    'G3.3': 'social',
    'G3.4': 'cognitive', 'G3.5': 'cognitive',
    'G4.1': 'cognitive', 'G4.2': 'cognitive', 'G4.3': 'cognitive',
    'G4.4': 'communication', 'G4.5': 'cognitive',
}

RISK_THRESHOLDS = [
    (75, 'THẤP'),
    (50, 'TRUNG BÌNH'),
    (30, 'CAO'),
    (0,  'RẤT CAO'),
]

def get_age_group(age_months: int) -> str:
    if age_months < 18: return '12-18'
    if age_months < 24: return '18-24'
    if age_months < 36: return '24-36'
    return '36-60'

def get_risk_level(score: float) -> str:
    for threshold, level in RISK_THRESHOLDS:
        if score >= threshold:
            return level
    return 'RẤT CAO'

# ============================================================
# TÍNH ĐIỂM TỪNG GAME — khớp với features thực tế từ frontend
# ============================================================
def score_game_features(game_code: str, features: List[Dict]) -> float:
    if not features:
        return 0.0

    total = len(features)

    # ── GATEWAY_BALLOON ─────────────────────────────────────
    # Features: { jointAttention, isLookingAtTarget, attentionLevel, smileIntensity }
    # Manual input: onScore(100) hoặc onScore(0) từ nút bấm
    if game_code == 'GATEWAY_BALLOON':
        # Nếu game kết thúc bằng manual (1 feature duy nhất với score cao)
        joint = [f.get('jointAttention', 0) for f in features]
        looking = [1 for f in features if f.get('isLookingAtTarget', False)]
        attention = [f.get('attentionLevel', 0) for f in features]

        joint_score   = (sum(joint) / total) * 40
        looking_score = min(40, (len(looking) / total) * 40)
        attn_score    = (sum(attention) / total) * 20 if attention else 0
        return round(joint_score + looking_score + attn_score, 1)

    # ── GATEWAY_NAME ─────────────────────────────────────────
    # Features: { isLookingAtTarget, responseLatency, callAttempt, manualInput }
    if game_code == 'GATEWAY_NAME':
        responded = [f for f in features if f.get('isLookingAtTarget', False)]
        if not responded:
            return 0.0
        # Điểm tỷ lệ phản hồi (tối đa 60đ)
        response_rate = len(responded) / total
        rate_score = response_rate * 60

        # Điểm tốc độ phản hồi (tối đa 40đ) — nhanh hơn = cao hơn
        latencies = [f.get('responseLatency', 3000) for f in responded]
        avg_latency = sum(latencies) / len(latencies)
        # < 1000ms = 40đ, 3000ms = 0đ
        speed_score = max(0, 40 - (avg_latency - 1000) / 50)
        return round(min(100, rate_score + speed_score), 1)

    # ── GATEWAY_CLAPPING ─────────────────────────────────────
    # Features: { imitationSuccess, imitationLatency, actionName }
    if game_code == 'GATEWAY_CLAPPING':
        success = [f for f in features if f.get('imitationSuccess', False)]
        if not success:
            return 0.0
        rate_score = (len(success) / total) * 60
        latencies = [f.get('imitationLatency', 3000) for f in success]
        avg_latency = sum(latencies) / len(latencies)
        speed_score = max(0, 40 - (avg_latency - 500) / 50)
        return round(min(100, rate_score + speed_score), 1)

    # ── G1.x ─────────────────────────────────────────────────
    # Features: { attentionLevel, isLookingAtTarget, ... }
    if game_code.startswith('G1.'):
        attention = [f.get('attentionLevel', 0) for f in features]
        hits = sum(1 for f in features if f.get('isLookingAtTarget', False))
        attn_score = (sum(attention) / total) * 60 if attention else 0
        hit_score  = min(40, (hits / total) * 40)
        return round(attn_score + hit_score, 1)

    # ── G2.x ─────────────────────────────────────────────────
    if game_code.startswith('G2.'):
        correct = sum(1 for f in features if f.get('correct', False))
        events  = sum(1 for f in features if 'event' in f)
        return round((correct / max(1, events)) * 100, 1) if events else 50.0

    # ── G3.x ─────────────────────────────────────────────────
    if game_code.startswith('G3.'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'categorize', 'emotion_identify', 'turn_complete',
            'turn_wrong', 'match', 'mismatch', 'maze_complete'
        ))
        if total_q == 0: return 50.0
        return round((correct / total_q) * 100, 1)

    # ── G4.x ─────────────────────────────────────────────────
    if game_code.startswith('G4.'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'answer', 'story_complete', 'checkout',
            'follow_instruction', 'pattern_decode'
        ))
        if total_q == 0: return 40.0
        return round((correct / total_q) * 100, 1)

    # ── Default ───────────────────────────────────────────────
    attention = [f.get('attentionLevel', 0.5) for f in features]
    return round((sum(attention) / total) * 100, 1)

# ============================================================
# HÀM CHÍNH
# ============================================================
def calculate_developmental_score(
    age_months: int,
    game_features: Dict[str, List[Dict]]
) -> Dict[str, Any]:
    age_group = get_age_group(age_months)
    weights   = DOMAIN_WEIGHTS[age_group]

    # Tính điểm từng game
    game_scores = {}
    for game_code, features in game_features.items():
        game_scores[game_code] = score_game_features(game_code, features)

    # Tính điểm từng domain
    domain_scores: Dict[str, List[float]] = {d: [] for d in weights}
    for game_code, score in game_scores.items():
        domain = GAME_DOMAIN_MAP.get(game_code)
        if domain and domain in domain_scores:
            domain_scores[domain].append(score)

    domain_avg = {
        d: round(sum(scores) / len(scores), 1) if scores else 50.0
        for d, scores in domain_scores.items()
    }

    # Điểm tổng hợp có trọng số
    weighted_score = round(sum(domain_avg[d] * w for d, w in weights.items()), 1)
    risk_level = get_risk_level(weighted_score)

    sorted_domains = sorted(domain_avg.items(), key=lambda x: x[1], reverse=True)
    strengths = [d for d, s in sorted_domains if s >= 70]
    concerns  = [d for d, s in sorted_domains if s < 50]

    return {
        'age_months':      age_months,
        'age_group':       age_group,
        'game_scores':     game_scores,
        'domain_analysis': domain_avg,
        'weighted_score':  weighted_score,
        'risk_level':      risk_level,
        'strengths':       strengths,
        'concerns':        concerns,
    }