from typing import Dict, List, Any
import math

# ============================================================
# TRỌNG SỐ THEO NHÓM TUỔI — Hướng B
#
# Nguyên tắc: domain nào không có game thật sự trong nhóm tuổi đó
# thì trọng số = 0, phần còn lại phân bổ lại cho domain còn game.
#
# 12-18: không có game motor, không có game communication
#   → social 0.55, communication 0.00, cognitive 0.45, motor 0.00
#
# 18-24: có đủ cả 4 domain (G2.2=motor, G2.3=communication)
#   → giữ nguyên phân bổ gốc
#
# 24-36: không có game motor, không có game communication
#   → social 0.45, cognitive 0.55
#
# 36-60: không có game motor (G4.4=communication có)
#   → social 0.25, communication 0.30, cognitive 0.45, motor 0.00
# ============================================================
DOMAIN_WEIGHTS = {
    '12-18': { 'social': 0.55, 'communication': 0.00, 'cognitive': 0.45, 'motor': 0.00 },
    '18-24': { 'social': 0.30, 'communication': 0.30, 'cognitive': 0.25, 'motor': 0.15 },
    '24-36': { 'social': 0.45, 'communication': 0.00, 'cognitive': 0.55, 'motor': 0.00 },
    '36-60': { 'social': 0.25, 'communication': 0.30, 'cognitive': 0.45, 'motor': 0.00 },
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

# ============================================================
# CHUẨN DÂN SỐ — chỉ giữ domain có trọng số > 0
# ============================================================
POPULATION_NORMS = {
    '12-18': {
        'social':        {'mean': 72.0, 'std': 12.5},
        'cognitive':     {'mean': 70.0, 'std': 11.5},
    },
    '18-24': {
        'social':        {'mean': 70.0, 'std': 13.0},
        'communication': {'mean': 67.0, 'std': 13.5},
        'cognitive':     {'mean': 69.0, 'std': 12.0},
        'motor':         {'mean': 74.0, 'std': 10.5},
    },
    '24-36': {
        'social':        {'mean': 69.0, 'std': 13.5},
        'cognitive':     {'mean': 68.0, 'std': 12.5},
    },
    '36-60': {
        'social':        {'mean': 68.0, 'std': 14.0},
        'communication': {'mean': 65.0, 'std': 14.5},
        'cognitive':     {'mean': 67.0, 'std': 13.0},
    },
}

# ============================================================
# Z-SCORE & PERCENTILE
# ============================================================
def calculate_zscore(score: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return round((score - mean) / std, 2)

def zscore_to_percentile(z: float) -> int:
    t = 1.0 / (1.0 + 0.2316419 * abs(z))
    d = 0.3989422819 * math.exp(-z * z / 2.0)
    p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
    if z > 0:
        return min(99, int((1.0 - p) * 100))
    else:
        return max(1, int(p * 100))

def get_percentile_label(percentile: int) -> str:
    if percentile >= 85:
        return 'Trên trung bình'
    elif percentile >= 50:
        return 'Bình thường'
    elif percentile >= 25:
        return 'Dưới trung bình'
    elif percentile >= 10:
        return 'Thấp'
    else:
        return 'Rất thấp'

def calculate_zscore_analysis(
    domain_avg: Dict[str, float],
    age_group: str
) -> Dict[str, Any]:
    norms  = POPULATION_NORMS.get(age_group, POPULATION_NORMS['24-36'])
    result = {}
    for domain, score in domain_avg.items():
        norm = norms.get(domain)
        if not norm:
            continue
        z           = calculate_zscore(score, norm['mean'], norm['std'])
        percentile  = zscore_to_percentile(z)
        result[domain] = {
            'raw_score':  score,
            'zscore':     z,
            'percentile': percentile,
            'label':      get_percentile_label(percentile),
            'mean':       norm['mean'],
            'std':        norm['std'],
        }
    return result

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
# TÍNH ĐIỂM TỪNG GAME
# ============================================================
def score_game_features(game_code: str, features: List[Dict]) -> float:
    if not features:
        return 0.0

    total = len(features)

    if game_code == 'GATEWAY_BALLOON':
        joint    = [f.get('jointAttention', 0) for f in features]
        looking  = [1 for f in features if f.get('isLookingAtTarget', False)]
        attention = [f.get('attentionLevel', 0) for f in features]
        joint_score   = (sum(joint) / total) * 40
        looking_score = min(40, (len(looking) / total) * 40)
        attn_score    = (sum(attention) / total) * 20 if attention else 0
        return round(joint_score + looking_score + attn_score, 1)

    if game_code == 'GATEWAY_NAME':
        responded = [f for f in features if f.get('isLookingAtTarget', False)]
        if not responded:
            return 0.0
        response_rate = len(responded) / total
        rate_score    = response_rate * 60
        latencies     = [f.get('responseLatency', 3000) for f in responded]
        avg_latency   = sum(latencies) / len(latencies)
        speed_score   = max(0, 40 - (avg_latency - 1000) / 50)
        return round(min(100, rate_score + speed_score), 1)

    if game_code == 'GATEWAY_CLAPPING':
        success = [f for f in features if f.get('imitationSuccess', False)]
        if not success:
            return 0.0
        rate_score  = (len(success) / total) * 60
        latencies   = [f.get('imitationLatency', 3000) for f in success]
        avg_latency = sum(latencies) / len(latencies)
        speed_score = max(0, 40 - (avg_latency - 500) / 50)
        return round(min(100, rate_score + speed_score), 1)

    if game_code.startswith('G1.'):
        attention = [f.get('attentionLevel', 0) for f in features]
        hits      = sum(1 for f in features if f.get('isLookingAtTarget', False))
        attn_score = (sum(attention) / total) * 60 if attention else 0
        hit_score  = min(40, (hits / total) * 40)
        return round(attn_score + hit_score, 1)

    if game_code.startswith('G2.'):
        correct = sum(1 for f in features if f.get('correct', False))
        events  = sum(1 for f in features if 'event' in f)
        return round((correct / max(1, events)) * 100, 1) if events else 50.0

    if game_code.startswith('G3.'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'categorize', 'emotion_identify', 'turn_complete',
            'turn_wrong', 'match', 'mismatch', 'maze_complete'
        ))
        if total_q == 0: return 50.0
        return round((correct / total_q) * 100, 1)

    if game_code.startswith('G4.'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'answer', 'story_complete', 'checkout',
            'follow_instruction', 'pattern_decode'
        ))
        if total_q == 0: return 40.0
        return round((correct / total_q) * 100, 1)

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

    # Chỉ tính domain có trọng số > 0
    active_domains = {d for d, w in weights.items() if w > 0}

    # Tính điểm từng game
    game_scores = {}
    for game_code, features in game_features.items():
        game_scores[game_code] = score_game_features(game_code, features)

    # Gom điểm theo domain — chỉ domain active
    domain_scores: Dict[str, List[float]] = {d: [] for d in active_domains}
    for game_code, score in game_scores.items():
        domain = GAME_DOMAIN_MAP.get(game_code)
        if domain and domain in domain_scores:
            domain_scores[domain].append(score)

    domain_avg = {
        d: round(sum(scores) / len(scores), 1) if scores else 50.0
        for d, scores in domain_scores.items()
    }

    # Điểm tổng hợp — chỉ dùng domain active (trọng số đã tổng = 1.0)
    weighted_score = round(sum(domain_avg[d] * weights[d] for d in active_domains), 1)
    risk_level     = get_risk_level(weighted_score)

    sorted_domains = sorted(domain_avg.items(), key=lambda x: x[1], reverse=True)
    strengths = [d for d, s in sorted_domains if s >= 70]
    concerns  = [d for d, s in sorted_domains if s < 50]

    # Z-score chỉ cho domain active có norm
    zscore_analysis = calculate_zscore_analysis(domain_avg, age_group)

    weighted_z = round(sum(
        zscore_analysis[d]['zscore'] * weights[d]
        for d in active_domains
        if d in zscore_analysis
    ), 2)
    overall_percentile = zscore_to_percentile(weighted_z)

    return {
        'age_months':          age_months,
        'age_group':           age_group,
        'active_domains':      list(active_domains),
        'game_scores':         game_scores,
        'domain_analysis':     domain_avg,
        'weighted_score':      weighted_score,
        'risk_level':          risk_level,
        'strengths':           strengths,
        'concerns':            concerns,
        'zscore_analysis':     zscore_analysis,
        'weighted_zscore':     weighted_z,
        'overall_percentile':  overall_percentile,
    }