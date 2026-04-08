from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(tags=["AI Analysis"])


class ChildInfo(BaseModel):
    full_name: Optional[str] = None
    age_months: Optional[int] = None


class AIAnalysisRequest(BaseModel):
    child: Optional[ChildInfo] = None
    risk_level: str = "THẤP"
    score: float = 0
    domains: Dict[str, float] = Field(default_factory=dict)
    concerns: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    recommendations: Dict[str, Any] = Field(default_factory=dict)


def _domain_label(key: str) -> str:
    return {
        "social": "Ky nang xa hoi",
        "communication": "Giao tiep",
        "cognitive": "Nhan thuc",
        "motor": "Van dong",
    }.get(key, key)


def _build_prompt(payload: AIAnalysisRequest) -> str:
    domain_text = ", ".join(
        f"{_domain_label(k)}: {round(v)}/100" for k, v in payload.domains.items()
    ) or "Khong co"
    strength_text = ", ".join(_domain_label(s) for s in payload.strengths) or "Chua xac dinh"
    concern_text = ", ".join(_domain_label(c) for c in payload.concerns) or "Khong co"
    child_name = payload.child.full_name if payload.child else "Tre"
    age_months = payload.child.age_months if payload.child else "N/A"

    return f"""
Ban la chuyen gia tam ly nhi khoa va phat trien tre em. Hay phan tich ket qua sang loc sau bang tieng Viet, ngan gon, de hieu:

THONG TIN TRE:
- Ten: {child_name}
- Tuoi: {age_months} thang

KET QUA:
- Muc nguy co: {payload.risk_level}
- Diem tong hop: {payload.score}/100
- Chi tiet theo linh vuc: {domain_text}
- Diem manh: {strength_text}
- Linh vuc can chu y: {concern_text}

YEU CAU TRA LOI:
1) Nhan xet tong quan (2-3 cau)
2) Phan tich chi tiet cac linh vuc can chu y
3) Goi y 3-5 hoat dong can thiep tai nha phu hop do tuoi
4) Khuyen nghi khi nao can gap chuyen gia

Luu y: Day la cong cu sang loc, khong phai chan doan y te.
""".strip()


@router.post("/ai-analysis")
def ai_analysis(
    payload: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    api_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY chua duoc cau hinh")

    prompt = _build_prompt(payload)
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    try:
        res = requests.post(url, json=body, timeout=45)
        if not res.ok:
            raise HTTPException(status_code=502, detail=f"Gemini API error: {res.status_code}")
        data = res.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        if not text:
            raise HTTPException(status_code=502, detail="Gemini tra ve noi dung rong")
        return {"analysis_text": text}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Loi ket noi Gemini: {e}") from e
