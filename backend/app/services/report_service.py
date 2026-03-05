import json
from datetime import date
from typing import Dict, Any

def generate_report(
    child_name: str,
    age_months: int,
    assessment_id: str,
    scoring_result: Dict[str, Any]
) -> Dict[str, Any]:
    
    risk = scoring_result["risk_level"]
    
    actions = {
        "RẤT CAO": [
            "Đánh giá chuyên khoa ngay trong vòng 2 tuần",
            "Liên hệ bác sĩ nhi khoa hoặc tâm lý lâm sàng",
            "Bắt đầu can thiệp sớm ngay lập tức"
        ],
        "CAO": [
            "Lên lịch đánh giá chuyên sâu trong vòng 1 tháng",
            "Bắt đầu chương trình can thiệp tại nhà",
            "Tăng cường tương tác xã hội hàng ngày"
        ],
        "TRUNG BÌNH": [
            "Theo dõi định kỳ mỗi 3 tháng",
            "Thực hành các hoạt động kích thích phát triển",
            "Tham vấn chuyên gia nếu lo ngại tăng lên"
        ],
        "THẤP": [
            "Tiếp tục các hoạt động phát triển bình thường",
            "Đánh giá lại sau 6 tháng"
        ]
    }

    return {
        "report_id": f"ASD{date.today().strftime('%Y%m%d')}_{assessment_id[-4:]}",
        "child_name": child_name,
        "age_months": age_months,
        "assessment_date": date.today().isoformat(),
        "executive_summary": {
            "overall_risk": risk,
            "weighted_score": scoring_result["weighted_score"],
            "strengths": scoring_result["strengths"],
            "concerns":  scoring_result["concerns"],
        },
        "domain_analysis": scoring_result["domain_scores"],
        "developmental_age_estimate": scoring_result["developmental_age_estimate"],
        "recommendations": {
            "priority": "HIGH" if risk in ("RẤT CAO", "CAO") else "NORMAL",
            "actions": actions.get(risk, [])
        },
        "disclaimer": "Đây là công cụ sàng lọc, không thay thế chẩn đoán chuyên khoa."
    }
