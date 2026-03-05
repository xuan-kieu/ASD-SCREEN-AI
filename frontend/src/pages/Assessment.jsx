import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'

const gameComponents = {
  'G1.1': lazy(() => import('../components/games/G1_1_Balloon')),
  'G1.2': lazy(() => import('../components/games/G1_2_Clapping')),
  'G1.3': lazy(() => import('../components/games/G1_3_Attention')),
  'G1.4': lazy(() => import('../components/games/G1_4_Peekaboo')),
  'G1.5': lazy(() => import('../components/games/G1_5_ToyTracking')),
  'G2.1': lazy(() => import('../components/games/G2_1_ChiTayTinhMat')),
  'G2.2': lazy(() => import('../components/games/G2_2_XayThapCao')),
  'G2.3': lazy(() => import('../components/games/G2_3_TiengKeuCuaAi')),
  'G2.4': lazy(() => import('../components/games/G2_4_ChoBupBeAn')),
  'G2.5': lazy(() => import('../components/games/G2_5_TimBongHinh')),
  'G3.1': lazy(() => import('../components/games/G3_1_VeDungNhaNao')),
  'G3.2': lazy(() => import('../components/games/G3_2_CamXucGiDay')),
  'G3.3': lazy(() => import('../components/games/G3_3_DenLuotConRoii')),
  'G3.4': lazy(() => import('../components/games/G3_4_TimHinhGhepCap')),
  'G3.5': lazy(() => import('../components/games/G3_5_MeCungDonGian')),
  'G4.1': lazy(() => import('../components/games/G4_1_ViSaoTheNhi')),
  'G4.2': lazy(() => import('../components/games/G4_2_SapXepCauChuyen')),
  'G4.3': lazy(() => import('../components/games/G4_3_CuaHangTiHon')),
  'G4.4': lazy(() => import('../components/games/G4_4_LamTheoChiDan')),
  'G4.5': lazy(() => import('../components/games/G4_5_GiaiMaQuyTac')),
}

const GAME_SEQUENCE = ['G1.1', 'G1.2', 'G1.3', 'G2.1', 'G2.3', 'G3.2', 'G3.3', 'G4.1']
const GAME_DURATION = 120

export default function Assessment() {
  const { id: assessmentId } = useParams() // ← fix: dùng :id từ route
  const navigate = useNavigate()

  const [currentGameIdx, setCurrentGameIdx] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [childName, setChildName] = useState('Bé')

  const latestAIResult = useRef(null)
  const featuresBuffer = useRef([])
  const timerRef = useRef(null)

  const currentGameCode = GAME_SEQUENCE[currentGameIdx]
  const GameComponent = gameComponents[currentGameCode]

  useEffect(() => {
    if (!isRunning) return
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        if (prev >= GAME_DURATION) {
          handleNextGame()
          return 0
        }
        return prev + 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, currentGameIdx])

  const handleFeatureCapture = (feature) => {
    featuresBuffer.current.push(feature)
    if (featuresBuffer.current.length >= 50) flushFeatures()
  }

  const flushFeatures = async () => {
    if (!assessmentId || featuresBuffer.current.length === 0) return
    const toSend = [...featuresBuffer.current]
    featuresBuffer.current = []
    try {
      await api.post(`/assessments/${assessmentId}/features`, {
        game_code: currentGameCode,
        features: toSend
      })
    } catch (e) {
      console.error('Feature flush error:', e)
    }
  }

  const handleNextGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    await flushFeatures()
    if (currentGameIdx >= GAME_SEQUENCE.length - 1) {
      try { await api.patch(`/assessments/${assessmentId}/complete`) } catch (e) {}
      navigate(`/report/${assessmentId}`)
      return
    }
    setCurrentGameIdx(prev => prev + 1)
    setTimeElapsed(0)
  }

  const startAssessment = () => {
    setIsRunning(true)
    setTimeElapsed(0)
  }

  const progress = Math.round((currentGameIdx / GAME_SEQUENCE.length) * 100)
  const timeLeft = GAME_DURATION - timeElapsed

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.gameLabel}>
            🎮 Game {currentGameIdx + 1}/{GAME_SEQUENCE.length} — {currentGameCode}
          </span>
          <span style={styles.childLabel}>👶 {childName}</span>
          {isRunning && (
            <span style={{ ...styles.timer, color: timeLeft <= 10 ? '#ef4444' : '#22c55e' }}>
              ⏱ {timeLeft}s
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          {!isRunning ? (
            <button style={styles.startBtn} onClick={startAssessment}>
              ▶ Bắt đầu đánh giá
            </button>
          ) : (
            <button style={styles.nextBtn} onClick={handleNextGame}>
              {currentGameIdx >= GAME_SEQUENCE.length - 1 ? '✅ Hoàn thành' : 'Game tiếp theo ⏭'}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <div style={styles.stepDots}>
        {GAME_SEQUENCE.map((code, i) => (
          <div key={code} style={{
            ...styles.dot,
            background: i < currentGameIdx ? '#22c55e' : i === currentGameIdx ? '#3b82f6' : '#334155',
            transform: i === currentGameIdx ? 'scale(1.3)' : 'scale(1)'
          }}>
            {i < currentGameIdx ? '✓' : i + 1}
          </div>
        ))}
      </div>

      {/* Game Area */}
      <div style={styles.gameArea}>
        {!isRunning ? (
          <div style={styles.introBox}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
            <h2 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 8 }}>
              {currentGameCode}
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              Game {currentGameIdx + 1} trong {GAME_SEQUENCE.length} game đánh giá
            </p>
            <button style={styles.startBtn} onClick={startAssessment}>
              ▶ Bắt đầu
            </button>
          </div>
        ) : (
          GameComponent && (
            <Suspense fallback={<div style={styles.loading}>⏳ Đang tải game...</div>}>
              <GameComponent
                latestAIResult={latestAIResult}
                onFeatureCapture={handleFeatureCapture}
                timeElapsed={timeElapsed}
                gameDuration={GAME_DURATION}
                childName={childName}
                assessmentId={assessmentId}
              />
            </Suspense>
          )
        )}
      </div>
    </div>
  )
}

const styles = {
  root: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0f172a', fontFamily: "'Segoe UI', sans-serif"
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid #334155'
  },
  headerLeft: { display: 'flex', gap: 16, alignItems: 'center' },
  gameLabel: { color: '#94a3b8', fontSize: 14, fontWeight: 600 },
  childLabel: { color: '#e2e8f0', fontSize: 14 },
  timer: { fontSize: 14, fontWeight: 700 },
  headerRight: {},
  startBtn: {
    padding: '8px 20px', background: '#22c55e', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14
  },
  nextBtn: {
    padding: '8px 20px', background: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14
  },
  progressBar: { height: 4, background: '#334155' },
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.3s' },
  stepDots: {
    display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 0',
    background: '#1e293b'
  },
  dot: {
    width: 24, height: 24, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 10,
    color: '#fff', fontWeight: 700, transition: 'all 0.3s'
  },
  gameArea: { flex: 1, overflow: 'hidden', position: 'relative' },
  introBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', textAlign: 'center'
  },
  loading: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 18 }
}