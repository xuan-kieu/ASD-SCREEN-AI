from datetime import date
from typing import Dict, List, Any

# ============================================================
# TRỌNG SỐ THEO NHÓM TUỔI
# ============================================================
DOMAIN_WEIGHTS = {
    '12-18': {
        'social':        0.35,
        'communication': 0.30,
        'cognitive':     0.20,
        'motor':         0.15,
    },
    '18-24': {
        'social':        0.30,
        'communication': 0.30,
        'cognitive':     0.25,
        'motor':         0.15,
    },
    '24-36': {
        'social':        0.25,
        'communication': 0.30,
        'cognitive':     0.30,
        'motor':         0.15,
    },
    '36-60': {
        'social':        0.20,
        'communication': 0.25,
        'cognitive':     0.40,
        'motor':         0.15,
    },
}

# Game thuộc domain nào
GAME_DOMAIN_MAP = {
    'GATEWAY_BALLOON':  'social',
    'GATEWAY_NAME':     'social',
    'GATEWAY_CLAPPING': 'social',
    'G1.1': 'social',
    'G1.2': 'social',
    'G1.3': 'social',
    'G1.4': 'social',
    'G1.5': 'cognitive',
    'G2.1': 'cognitive',
    'G2.2': 'motor',
    'G2.3': 'communication',
    'G2.4': 'cognitive',
    'G2.5': 'cognitive',
    'G3.1': 'cognitive',
    'G3.2': 'social',
    'G3.3': 'social',
    'G3.4': 'cognitive',
    'G3.5': 'cognitive',
    'G4.1': 'cognitive',
    'G4.2': 'cognitive',
    'G4.3': 'cognitive',
    'G4.4': 'communication',
    'G4.5': 'cognitive',
}

# Ngưỡng điểm risk
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
# TÍNH ĐIỂM TỪNG GAME
# ============================================================
def score_game_features(game_code: str, features: List[Dict]) -> float:
    """Tính điểm 0-100 cho một game dựa trên features"""
    if not features:
        return 0.0

    total = len(features)

    # Gateway: Bong bóng - tỷ lệ nhìn theo
    if game_code == 'GATEWAY_BALLOON':
        hits = sum(1 for f in features if f.get('event') == 'balloon_pop')
        return min(100, hits * 20)

    # Gateway: Gọi tên - tỷ lệ phản hồi
    if game_code == 'GATEWAY_NAME':
        attention = [f.get('attentionLevel', 0) for f in features]
        return sum(attention) / len(attention) * 100 if attention else 0

    # Gateway: Vỗ tay - độ chính xác bắt chước
    if game_code == 'GATEWAY_CLAPPING':
        correct = [f for f in features if f.get('event') == 'clap']
        accuracy = [f.get('accuracy', 0) for f in features if 'accuracy' in f]
        if accuracy:
            return sum(accuracy) / len(accuracy) * 100
        return min(100, len(correct) * 15)

    # G1.x - chú ý chung
    if game_code in ('G1.1', 'G1.2', 'G1.3', 'G1.4', 'G1.5'):
        attention = [f.get('attentionLevel', 0) for f in features]
        hits = sum(1 for f in features if f.get('isLookingAtTarget', False))
        attn_score = (sum(attention) / len(attention)) * 60 if attention else 0
        hit_score  = min(40, (hits / max(1, total)) * 40)
        return attn_score + hit_score

    # G2.x - bắt chước & nhận thức
    if game_code in ('G2.1', 'G2.2', 'G2.3', 'G2.4', 'G2.5'):
        correct = sum(1 for f in features if f.get('correct', False))
        events  = sum(1 for f in features if 'event' in f)
        return (correct / max(1, events)) * 100 if events else 50

    # G3.x - xã hội & nhận diện
    if game_code in ('G3.1', 'G3.2', 'G3.3', 'G3.4', 'G3.5'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'categorize', 'emotion_identify', 'turn_complete',
            'turn_wrong', 'match', 'mismatch', 'maze_complete'
        ))
        if total_q == 0: return 50
        return (correct / total_q) * 100

    # G4.x - nhận thức cao
    if game_code in ('G4.1', 'G4.2', 'G4.3', 'G4.4', 'G4.5'):
        correct = sum(1 for f in features if f.get('correct', False))
        total_q = sum(1 for f in features if f.get('event') in (
            'answer', 'story_complete', 'checkout',
            'follow_instruction', 'pattern_decode'
        ))
        if total_q == 0: return 40
        return (correct / total_q) * 100

    # Default: dùng attentionLevel
    attention = [f.get('attentionLevel', 0.5) for f in features]
    return (sum(attention) / len(attention)) * 100

# ============================================================
# HÀM CHÍNH
# ============================================================
def calculate_developmental_score(
    age_months: int,
    game_features: Dict[str, List[Dict]]
) -> Dict[str, Any]:
    """
    game_features = {
        'G1.1': [...features...],
        'G1.2': [...features...],
        ...
    }
    """
    age_group = get_age_group(age_months)
    weights   = DOMAIN_WEIGHTS[age_group]

    # Tính điểm từng game
    game_scores = {}
    for game_code, features in game_features.items():
        game_scores[game_code] = round(score_game_features(game_code, features), 1)

    # Tính điểm từng domain
    domain_scores = {d: [] for d in weights.keys()}
    for game_code, score in game_scores.items():
        domain = GAME_DOMAIN_MAP.get(game_code)
        if domain and domain in domain_scores:
            domain_scores[domain].append(score)

    domain_avg = {}
    for domain, scores in domain_scores.items():
        domain_avg[domain] = round(sum(scores) / len(scores), 1) if scores else 50.0

    # Tính điểm tổng hợp (có trọng số)
    weighted_score = sum(
        domain_avg[d] * w
        for d, w in weights.items()
    )
    weighted_score = round(weighted_score, 1)

    risk_level = get_risk_level(weighted_score)

    # Xác định điểm mạnh / yếu
    sorted_domains = sorted(domain_avg.items(), key=lambda x: x[1], reverse=True)
    strengths = [d for d, s in sorted_domains if s >= 70]
    concerns  = [d for d, s in sorted_domains if s < 50]

    return {
        'age_months':    age_months,
        'age_group':     age_group,
        'game_scores':   game_scores,
        'domain_analysis': domain_avg,
        'weighted_score':  weighted_score,
        'risk_level':      risk_level,
        'strengths':       strengths,
        'concerns':        concerns,
    }