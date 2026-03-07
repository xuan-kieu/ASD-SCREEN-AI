from datetime import date, datetime
from typing import Dict, Any

DOMAIN_LABELS = {
    'social':        'Kỹ năng xã hội',
    'communication': 'Giao tiếp',
    'cognitive':     'Nhận thức',
    'motor':         'Vận động',
}

RISK_DESCRIPTIONS = {
    'THẤP': {
        'summary': 'Trẻ phát triển trong giới hạn bình thường.',
        'color':   'green',
        'action':  'Tiếp tục theo dõi định kỳ 6 tháng/lần.',
    },
    'TRUNG BÌNH': {
        'summary': 'Trẻ có một số dấu hiệu cần chú ý thêm.',
        'color':   'yellow',
        'action':  'Tăng cường kích thích phát triển và tái đánh giá sau 3 tháng.',
    },
    'CAO': {
        'summary': 'Trẻ có nhiều dấu hiệu cần được đánh giá chuyên sâu.',
        'color':   'orange',
        'action':  'Chuyển đến chuyên gia tâm lý trẻ em trong vòng 1 tháng.',
    },
    'RẤT CAO': {
        'summary': 'Trẻ có dấu hiệu rõ ràng cần can thiệp sớm.',
        'color':   'red',
        'action':  'Cần được đánh giá và can thiệp ngay trong tuần này.',
    },
}

def get_recommendations(
    risk_level: str,
    concerns: list,
    age_months: int
) -> Dict[str, Any]:
    base = RISK_DESCRIPTIONS.get(risk_level, RISK_DESCRIPTIONS['THẤP'])
    actions = [base['action']]

    if 'social' in concerns:
        actions.append('Tăng cường tương tác mặt-đối-mặt với trẻ mỗi ngày ít nhất 30 phút.')
    if 'communication' in concerns:
        actions.append('Đọc sách, kể chuyện và trò chuyện nhiều hơn với trẻ.')
    if 'cognitive' in concerns:
        actions.append('Khuyến khích trẻ chơi các trò chơi xếp hình, phân loại đồ vật.')
    if 'motor' in concerns:
        actions.append('Tạo điều kiện cho trẻ vận động tự do, leo trèo, chạy nhảy an toàn.')

    if age_months < 24:
        actions.append('Hạn chế thời gian xem màn hình dưới 1 giờ/ngày.')
    elif age_months < 36:
        actions.append('Khuyến khích chơi với bạn cùng tuổi ít nhất 3 lần/tuần.')

    return {
        'actions':   actions,
        'urgency':   base['action'],
        'summary':   base['summary'],
    }

def generate_report(
    child_name: str,
    age_months: int,
    assessment_id: str,
    scoring_result: Dict[str, Any]
) -> Dict[str, Any]:
    risk_level    = scoring_result['risk_level']
    domain_avg    = scoring_result['domain_analysis']
    strengths     = scoring_result['strengths']
    concerns      = scoring_result['concerns']
    game_scores   = scoring_result['game_scores']

    recommendations = get_recommendations(risk_level, concerns, age_months)

    # Diễn giải từng domain
    domain_interpretation = {}
    for domain, score in domain_avg.items():
        label = DOMAIN_LABELS.get(domain, domain)
        if score >= 75:
            level = 'Tốt'
            note  = f'{label} phát triển tốt so với lứa tuổi.'
        elif score >= 50:
            level = 'Trung bình'
            note  = f'{label} đang phát triển, cần thêm hỗ trợ.'
        else:
            level = 'Cần chú ý'
            note  = f'{label} có dấu hiệu chậm, cần can thiệp.'
        domain_interpretation[domain] = {
            'score': score, 'level': level, 'note': note, 'label': label
        }

    return {
        'meta': {
            'child_name':    child_name,
            'age_months':    age_months,
            'assessment_id': assessment_id,
            'generated_at':  datetime.now().isoformat(),
            'age_group':     scoring_result['age_group'],
        },
        'executive_summary': {
            'risk_level':      risk_level,
            'weighted_score':  scoring_result['weighted_score'],
            'summary':         RISK_DESCRIPTIONS[risk_level]['summary'],
            'strengths':       strengths,
            'concerns':        concerns,
        },
        'domain_analysis':       domain_avg,
        'domain_interpretation': domain_interpretation,
        'game_scores':           game_scores,
        'recommendations':       recommendations,
    }