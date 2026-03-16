"""
services/ai/audio_service.py
Phân tích âm thanh trẻ em real-time
- Phát hiện có tiếng / im lặng
- Phân tích cảm xúc giọng nói
- Dự đoán phát triển ngôn ngữ
"""
import io
import numpy as np
from typing import Optional

# librosa import lazy để tránh lỗi nếu chưa cài
try:
    import librosa
    LIBROSA_OK = True
except ImportError:
    LIBROSA_OK = False
    print("[AUDIO] librosa not installed — using fallback analysis")


# ── Constants ──────────────────────────────────────────────────────────────

SAMPLE_RATE       = 22050
SILENCE_THRESHOLD = 0.01   # RMS energy dưới ngưỡng này = im lặng
MIN_VOICE_RATIO   = 0.15   # Tỷ lệ tối thiểu có tiếng để tính là "có phản hồi"


# ── Main analyze function ──────────────────────────────────────────────────

def analyze_audio_chunk(audio_bytes: bytes, sample_rate: int = SAMPLE_RATE) -> dict:
    """
    Phân tích 1 chunk audio (bytes từ MediaRecorder)
    Returns:
        {
            has_voice: bool,
            voice_ratio: float,        # 0.0 - 1.0
            emotion: str,              # 'happy' | 'sad' | 'neutral' | 'excited'
            emotion_confidence: float,
            language_score: float,     # 0-100 điểm phát triển ngôn ngữ
            language_label: str,       # 'Tốt' | 'Bình thường' | 'Cần theo dõi'
            pitch_mean: float,
            pitch_std: float,
            energy_mean: float,
            vocalization_rate: float,  # số lần phát âm / giây
            features: dict,            # raw features để lưu DB
        }
    """
    if not LIBROSA_OK:
        return _fallback_analysis()

    try:
        # Load audio từ bytes
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=sample_rate, mono=True)

        if len(y) < sr * 0.5:  # Quá ngắn (< 0.5s)
            return _fallback_analysis()

        duration = len(y) / sr

        # ── 1. Phát hiện có tiếng / im lặng ──────────────────────────────
        rms       = librosa.feature.rms(y=y)[0]
        energy    = float(np.mean(rms))
        voice_frames = np.sum(rms > SILENCE_THRESHOLD)
        voice_ratio  = float(voice_frames / len(rms)) if len(rms) > 0 else 0.0
        has_voice    = voice_ratio >= MIN_VOICE_RATIO

        # ── 2. Pitch analysis ─────────────────────────────────────────────
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            pitch = pitches[idx, t]
            if pitch > 80 and pitch < 800:  # Tần số giọng người (80-800 Hz)
                pitch_values.append(pitch)

        pitch_mean = float(np.mean(pitch_values)) if pitch_values else 0.0
        pitch_std  = float(np.std(pitch_values))  if pitch_values else 0.0

        # ── 3. Spectral features ──────────────────────────────────────────
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        spectral_rolloff  = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
        zcr               = float(np.mean(librosa.feature.zero_crossing_rate(y)))

        # MFCCs — đặc trưng quan trọng cho nhận dạng giọng nói
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_means = np.mean(mfccs, axis=1).tolist()

        # ── 4. Phân tích cảm xúc ──────────────────────────────────────────
        emotion, emotion_confidence = _classify_emotion(
            pitch_mean=pitch_mean,
            pitch_std=pitch_std,
            energy_mean=energy,
            zcr=zcr,
            spectral_centroid=spectral_centroid,
        )

        # ── 5. Dự đoán phát triển ngôn ngữ ───────────────────────────────
        # Đếm số lần phát âm (onset detection)
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
        vocalization_count = len(onset_frames)
        vocalization_rate  = vocalization_count / duration if duration > 0 else 0.0

        language_score, language_label = _assess_language_development(
            has_voice=has_voice,
            voice_ratio=voice_ratio,
            pitch_mean=pitch_mean,
            pitch_std=pitch_std,
            vocalization_rate=vocalization_rate,
            mfcc_diversity=float(np.std(mfcc_means)),
        )

        return {
            "has_voice":           has_voice,
            "voice_ratio":         round(voice_ratio, 3),
            "emotion":             emotion,
            "emotion_confidence":  round(emotion_confidence, 2),
            "language_score":      round(language_score, 1),
            "language_label":      language_label,
            "pitch_mean":          round(pitch_mean, 1),
            "pitch_std":           round(pitch_std, 1),
            "energy_mean":         round(energy, 4),
            "vocalization_rate":   round(vocalization_rate, 2),
            "features": {
                "duration":           round(duration, 2),
                "spectral_centroid":  round(spectral_centroid, 1),
                "spectral_rolloff":   round(spectral_rolloff, 1),
                "zcr":                round(zcr, 4),
                "mfcc_means":         [round(v, 2) for v in mfcc_means],
                "vocalization_count": vocalization_count,
            }
        }

    except Exception as e:
        print(f"[AUDIO] Analysis error: {e}")
        return _fallback_analysis()


# ── Emotion Classification ─────────────────────────────────────────────────

def _classify_emotion(
    pitch_mean: float,
    pitch_std: float,
    energy_mean: float,
    zcr: float,
    spectral_centroid: float,
) -> tuple[str, float]:
    """
    Phân loại cảm xúc dựa trên acoustic features
    Trẻ em: pitch cao hơn người lớn (200-600 Hz bình thường)

    Rules dựa trên nghiên cứu acoustic emotion recognition:
    - Happy/Excited: pitch cao, energy cao, ZCR cao
    - Sad: pitch thấp, energy thấp, ZCR thấp
    - Neutral: pitch trung bình, energy trung bình
    - Excited: pitch rất cao, energy rất cao, biến động lớn
    """
    if pitch_mean == 0 and energy_mean < SILENCE_THRESHOLD:
        return "neutral", 0.5

    score = {}

    # Happy: pitch 300-500Hz, energy cao
    happy_score = 0.0
    if 250 < pitch_mean < 550:
        happy_score += 0.4
    if energy_mean > 0.05:
        happy_score += 0.3
    if pitch_std > 50:  # Biến động pitch → sinh động
        happy_score += 0.3
    score["happy"] = happy_score

    # Excited: pitch > 450Hz, energy rất cao, ZCR cao
    excited_score = 0.0
    if pitch_mean > 450:
        excited_score += 0.4
    if energy_mean > 0.08:
        excited_score += 0.3
    if zcr > 0.15:
        excited_score += 0.3
    score["excited"] = excited_score

    # Sad: pitch thấp, energy thấp
    sad_score = 0.0
    if 0 < pitch_mean < 250:
        sad_score += 0.4
    if energy_mean < 0.03:
        sad_score += 0.3
    if pitch_std < 30:
        sad_score += 0.3
    score["sad"] = sad_score

    # Neutral: default
    score["neutral"] = 0.3

    # Chọn emotion có score cao nhất
    emotion = max(score, key=score.get)
    confidence = score[emotion]

    # Normalize confidence
    total = sum(score.values())
    confidence = score[emotion] / total if total > 0 else 0.5

    return emotion, confidence


# ── Language Development Assessment ───────────────────────────────────────

def _assess_language_development(
    has_voice: bool,
    voice_ratio: float,
    pitch_mean: float,
    pitch_std: float,
    vocalization_rate: float,
    mfcc_diversity: float,
) -> tuple[float, str]:
    """
    Đánh giá phát triển ngôn ngữ dựa trên acoustic features
    Score 0-100:
    - 70-100: Tốt
    - 40-70:  Bình thường
    - 0-40:   Cần theo dõi
    """
    score = 0.0

    # 1. Có phát âm không (25 điểm)
    if has_voice:
        score += 15
        score += min(voice_ratio * 30, 10)  # Tỷ lệ có tiếng càng cao càng tốt

    # 2. Tần suất phát âm — vocalization rate (25 điểm)
    # Trẻ bình thường: 1-4 lần/giây
    if 0.5 <= vocalization_rate <= 5.0:
        score += 25
    elif vocalization_rate > 0:
        score += 10

    # 3. Pitch phù hợp lứa tuổi (25 điểm)
    # Trẻ em bình thường: 200-500 Hz
    if 150 < pitch_mean < 600:
        score += 25
    elif pitch_mean > 0:
        score += 10

    # 4. Đa dạng âm thanh — MFCC diversity (25 điểm)
    # Đa dạng cao → nhiều âm tiết khác nhau → ngôn ngữ phát triển tốt
    if mfcc_diversity > 5:
        score += 25
    elif mfcc_diversity > 2:
        score += 15
    elif mfcc_diversity > 0:
        score += 5

    score = min(100, max(0, score))

    if score >= 70:
        label = "Tốt"
    elif score >= 40:
        label = "Bình thường"
    else:
        label = "Cần theo dõi"

    return score, label


# ── Fallback khi không có librosa ─────────────────────────────────────────

def _fallback_analysis() -> dict:
    return {
        "has_voice":          False,
        "voice_ratio":        0.0,
        "emotion":            "neutral",
        "emotion_confidence": 0.5,
        "language_score":     0.0,
        "language_label":     "Không phân tích được",
        "pitch_mean":         0.0,
        "pitch_std":          0.0,
        "energy_mean":        0.0,
        "vocalization_rate":  0.0,
        "features":           {},
    }


# ── Aggregate nhiều chunk trong 1 game session ────────────────────────────

def aggregate_audio_results(results: list[dict]) -> dict:
    """
    Tổng hợp kết quả từ nhiều chunk audio trong 1 game session
    """
    if not results:
        return _fallback_analysis()

    valid = [r for r in results if r.get("has_voice") is not None]
    if not valid:
        return _fallback_analysis()

    # Tỷ lệ có tiếng trung bình
    voice_ratio_avg = np.mean([r["voice_ratio"] for r in valid])
    has_voice       = voice_ratio_avg >= MIN_VOICE_RATIO

    # Emotion phổ biến nhất
    emotions = [r["emotion"] for r in valid if r.get("emotion")]
    from collections import Counter
    emotion_counts = Counter(emotions)
    dominant_emotion = emotion_counts.most_common(1)[0][0] if emotion_counts else "neutral"

    # Language score trung bình
    language_scores = [r["language_score"] for r in valid if r.get("language_score", 0) > 0]
    language_score_avg = float(np.mean(language_scores)) if language_scores else 0.0

    if language_score_avg >= 70:
        language_label = "Tốt"
    elif language_score_avg >= 40:
        language_label = "Bình thường"
    else:
        language_label = "Cần theo dõi"

    # Pitch trung bình
    pitches = [r["pitch_mean"] for r in valid if r.get("pitch_mean", 0) > 0]
    pitch_avg = float(np.mean(pitches)) if pitches else 0.0

    return {
        "has_voice":          has_voice,
        "voice_ratio":        round(float(voice_ratio_avg), 3),
        "emotion":            dominant_emotion,
        "emotion_confidence": round(float(np.mean([r.get("emotion_confidence", 0.5) for r in valid])), 2),
        "language_score":     round(language_score_avg, 1),
        "language_label":     language_label,
        "pitch_mean":         round(pitch_avg, 1),
        "chunks_analyzed":    len(valid),
    }
