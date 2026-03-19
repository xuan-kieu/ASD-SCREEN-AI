import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../api/axios'
import CameraAI from '../components/CameraAI'
import DeviceCheck from '../components/DeviceCheck'
import AudioIndicator from '../components/AudioIndicator'
import useAudio from '../hooks/useAudio'

const gameComponents = {
  'GATEWAY_BALLOON':  lazy(() => import('../components/games/GW_Balloon')),
  'GATEWAY_NAME':     lazy(() => import('../components/games/GW_Attention')),
  'GATEWAY_CLAPPING': lazy(() => import('../components/games/GW_Clapping')),
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

const AGE_GROUP_GAMES = {
  '12-18': { label: '12-18 tháng', full: ['G1.1','G1.2','G1.3','G1.4','G1.5'], short: ['G1.1','G1.2','G1.3'], duration: { full: 120, short: 120 } },
  '18-24': { label: '18-24 tháng', full: ['G2.1','G2.2','G2.3','G2.4','G2.5'], short: ['G2.1','G2.2','G2.3'], duration: { full: 180, short: 180 } },
  '24-36': { label: '24-36 tháng', full: ['G3.1','G3.2','G3.3','G3.4','G3.5'], short: ['G3.1','G3.2','G3.3'], duration: { full: 180, short: 180 } },
  '36-60': { label: '36-60 tháng', full: ['G4.1','G4.2','G4.3','G4.4','G4.5'], short: ['G4.1','G4.2','G4.3'], duration: { full: 240, short: 180 } },
}

const GATEWAY_SEQUENCE = [
  { code: 'GATEWAY_BALLOON',  label: '🎈 Bong bóng biết bay', duration: 120 },
  { code: 'GATEWAY_NAME',     label: '📢 Bé ơi quay lại nào', duration: 60  },
  { code: 'GATEWAY_CLAPPING', label: '👏 Vỗ tay vui nhộn',    duration: 120 },
]

function getAgeMonths(birthDate) {
  const today = new Date(), birth = new Date(birthDate)
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
}
function getAgeGroup(months) {
  if (months < 18) return '12-18'
  if (months < 24) return '18-24'
  if (months < 36) return '24-36'
  return '36-60'
}

const PHASE = { SETUP: 'setup', DEVICE_CHECK: 'device_check', GATEWAY: 'gateway', GATEWAY_RESULT: 'gateway_result', MAIN_GAMES: 'main_games', DONE: 'done' }

export default function Assessment() {
  const { id: assessmentId } = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [phase, setPhase]         = useState(PHASE.SETUP)
  const [childName, setChildName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [ageMonths, setAgeMonths] = useState(0)
  const [ageGroup, setAgeGroup]   = useState('12-18')

  const [gatewayIdx, setGatewayIdx]         = useState(0)
  const [gatewayScores, setGatewayScores]   = useState([])
  const [gatewayRunning, setGatewayRunning] = useState(false)

  const [gameMode, setGameMode]         = useState('full')
  const [gameSequence, setGameSequence] = useState([])
  const [gameIdx, setGameIdx]           = useState(0)
  const [gameRunning, setGameRunning]   = useState(false)

  const [timeElapsed, setTimeElapsed]   = useState(0)
  const [gameDuration, setGameDuration] = useState(120)

  // Camera AI
  const [cameraEnabled, setCameraEnabled] = useState(true)

  // Audio AI — thu âm trong khi chơi game
  const [currentGameSessionId, setCurrentGameSessionId] = useState(null)

  const {
    isRecording,
    audioResult,
    startRecording,
    stopRecording,
    error: audioError,
  } = useAudio({
    gameSessionId: currentGameSessionId,
    gameCode: phase === 'gateway' ? GATEWAY_SEQUENCE[gatewayIdx]?.code : gameSequence[gameIdx],
    enabled: true,
  })

  const timerRef        = useRef(null)
  const featuresBuffer  = useRef([])
  const latestAIResult  = useRef(null)

  // Refs để tránh closure bug trong timer callbacks
  const phaseRef         = useRef(PHASE.SETUP)
  const gatewayIdxRef    = useRef(0)
  const gatewayScoresRef = useRef([])
  const gameIdxRef       = useRef(0)
  const gameSequenceRef  = useRef([])
  const gameModeRef      = useRef('full')
  const ageGroupRef      = useRef('12-18')

  useEffect(() => { phaseRef.current        = phase        }, [phase])
  useEffect(() => { gatewayIdxRef.current   = gatewayIdx   }, [gatewayIdx])
  useEffect(() => { gatewayScoresRef.current = gatewayScores }, [gatewayScores])
  useEffect(() => { gameIdxRef.current      = gameIdx      }, [gameIdx])
  useEffect(() => { gameSequenceRef.current = gameSequence }, [gameSequence])
  useEffect(() => { gameModeRef.current     = gameMode     }, [gameMode])
  useEffect(() => { ageGroupRef.current     = ageGroup     }, [ageGroup])

  useEffect(() => {
    if (location.state?.childName) setChildName(location.state.childName)
    if (location.state?.birthDate) setBirthDate(location.state.birthDate)
  }, [])

  useEffect(() => () => stopTimer(), [])

  const startTimer = (duration) => {
    setTimeElapsed(0)
    setGameDuration(duration)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        if (prev >= duration) {
          clearInterval(timerRef.current)
          handleTimeUp()
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  const handleFeatureCapture = (feature) => {
    featuresBuffer.current.push(feature)
    if (featuresBuffer.current.length >= 50) flushFeatures()
  }

  const flushFeatures = async (gameCode) => {
    if (!assessmentId || featuresBuffer.current.length === 0) return
    const toSend = [...featuresBuffer.current]
    featuresBuffer.current = []
    try {
      const res = await api.post(`/assessments/${assessmentId}/features`, { game_code: gameCode, features: toSend })
      // Lưu session_id để audio biết gắn vào đâu
      if (res.data?.session_id) setCurrentGameSessionId(res.data.session_id)
    } catch (e) {}
  }

  const handleTimeUp = useCallback(() => {
    const currentPhase = phaseRef.current
    if (currentPhase === PHASE.GATEWAY)         handleGatewayNextRef(false)
    else if (currentPhase === PHASE.MAIN_GAMES) handleMainGameNextRef()
  }, [])

  const handleGatewayNextRef = useCallback(async (passed) => {
    stopTimer()
    stopRecording()
    const idx       = gatewayIdxRef.current
    const scores    = gatewayScoresRef.current
    const current   = GATEWAY_SEQUENCE[idx]
    const newScores = [...scores, { code: current.code, passed }]

    setGatewayScores(newScores)
    gatewayScoresRef.current = newScores
    setGatewayRunning(false)
    await flushFeatures(current.code)

    if (idx < GATEWAY_SEQUENCE.length - 1) {
      setGatewayIdx(idx + 1)
      gatewayIdxRef.current = idx + 1
      setTimeElapsed(0)
    } else {
      const passCount = newScores.filter(s => s.passed).length
      const mode = passCount >= 2 ? 'full' : 'short'
      setGameMode(mode)
      gameModeRef.current = mode
      setPhase(PHASE.GATEWAY_RESULT)
      phaseRef.current = PHASE.GATEWAY_RESULT
    }
  }, [assessmentId])

  const handleMainGameNextRef = useCallback(async () => {
    stopTimer()
    stopRecording()
    setGameRunning(false)
    const idx      = gameIdxRef.current
    const sequence = gameSequenceRef.current
    await flushFeatures(sequence[idx])

    if (idx < sequence.length - 1) {
      setGameIdx(idx + 1)
      gameIdxRef.current = idx + 1
      setTimeElapsed(0)
    } else {
      try { await api.patch(`/assessments/${assessmentId}/complete`) } catch (e) {}
      setPhase(PHASE.DONE)
      phaseRef.current = PHASE.DONE
    }
  }, [assessmentId])

  const handleGatewayNext = handleGatewayNextRef
  const handleMainGameNext = handleMainGameNextRef

  const handleSetup = () => {
    if (!childName.trim() || !birthDate) return
    const months = getAgeMonths(birthDate)
    const group  = getAgeGroup(months)
    setAgeMonths(months)
    setAgeGroup(group)
    ageGroupRef.current = group
    setPhase(PHASE.DEVICE_CHECK)
    phaseRef.current = PHASE.DEVICE_CHECK
    setGatewayIdx(0)
    gatewayIdxRef.current = 0
  }

  const startGateway = () => {
    setGatewayRunning(true)
    startTimer(GATEWAY_SEQUENCE[gatewayIdxRef.current].duration)
    startRecording()
  }

  const handleGatewayScore = (score) => { handleGatewayNext(score >= 60) }

  const handleStartMainGames = () => {
    const config   = AGE_GROUP_GAMES[ageGroupRef.current]
    const sequence = gameModeRef.current === 'full' ? config.full : config.short
    const duration = config.duration[gameModeRef.current]
    setGameSequence(sequence)
    gameSequenceRef.current = sequence
    setGameDuration(duration)
    setGameIdx(0)
    gameIdxRef.current = 0
    setGameRunning(false)
    setPhase(PHASE.MAIN_GAMES)
    phaseRef.current = PHASE.MAIN_GAMES
  }

  const startMainGame = () => {
    setGameRunning(true)
    const config = AGE_GROUP_GAMES[ageGroupRef.current]
    startTimer(config.duration[gameModeRef.current])
    startRecording()
  }

  const currentGateway    = GATEWAY_SEQUENCE[gatewayIdx]
  const GatewayComponent  = phase === PHASE.GATEWAY    ? gameComponents[currentGateway?.code] : null
  const currentGameCode   = gameSequence[gameIdx]
  const MainGameComponent = phase === PHASE.MAIN_GAMES ? gameComponents[currentGameCode]      : null
  const gatewayPassCount  = gatewayScores.filter(s => s.passed).length

  // ─── PHASE: SETUP ───────────────────────────────────────────
  if (phase === PHASE.SETUP) return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👶</div>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Thông tin trẻ</h2>
        <div style={{ width: '100%', marginBottom: 16 }}>
          <label style={S.label}>Tên trẻ *</label>
          <input value={childName} onChange={e => setChildName(e.target.value)}
            placeholder="Ví dụ: Bé Nam" style={S.input} />
        </div>
        <div style={{ width: '100%', marginBottom: 24 }}>
          <label style={S.label}>Ngày sinh *</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={S.input} />
        </div>
        {birthDate && (
          <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '10px 20px', marginBottom: 20, color: '#60a5fa', fontSize: 14 }}>
            📊 Nhóm tuổi: <strong>{AGE_GROUP_GAMES[getAgeGroup(getAgeMonths(birthDate))]?.label}</strong> ({getAgeMonths(birthDate)} tháng)
          </div>
        )}
        {/* Camera toggle trước khi bắt đầu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 16px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>📷 AI Camera (MediaPipe)</span>
          <button onClick={() => setCameraEnabled(p => !p)}
            style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: cameraEnabled ? '#22c55e' : '#475569', color: '#fff' }}>
            {cameraEnabled ? 'BẬT' : 'TẮT'}
          </button>
        </div>
        <button onClick={handleSetup} disabled={!childName.trim() || !birthDate}
          style={{ ...S.btnGreen, opacity: !childName.trim() || !birthDate ? 0.4 : 1 }}>
          ▶ Bắt đầu đánh giá
        </button>
      </div>
    </div>
  )

  // ─── PHASE: DEVICE CHECK ────────────────────────────────────
  if (phase === PHASE.DEVICE_CHECK) return (
    <div style={S.root}>
      <DeviceCheck
        childName={childName}
        onPass={(cameraAvailable) => {
          setCameraEnabled(cameraAvailable)
          setPhase(PHASE.GATEWAY)
          phaseRef.current = PHASE.GATEWAY
        }}
        onSkip={() => {
          setCameraEnabled(false)
          setPhase(PHASE.GATEWAY)
          phaseRef.current = PHASE.GATEWAY
        }}
      />
    </div>
  )

  // ─── PHASE: GATEWAY ─────────────────────────────────────────
  if (phase === PHASE.GATEWAY) return (
    <div style={S.root}>
      {/* CameraAI — chạy nền, PiP góc phải */}
      <CameraAI latestAIResult={latestAIResult} enabled={cameraEnabled} showPreview={true} />

      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>🔑 GATEWAY {gatewayIdx + 1}/3</span>
          <span style={S.gameLabel}>{currentGateway?.label}</span>
          <span style={S.childLabel}>👶 {childName}</span>
          {gatewayRunning && (
            <span style={{ color: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>
              ⏱ {gameDuration - timeElapsed}s
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Toggle camera */}
          <AudioIndicator audioResult={audioResult} isRecording={isRecording} error={audioError} />
          <button onClick={() => setCameraEnabled(p => !p)}
            style={{ ...S.btnBlue, background: cameraEnabled ? '#1e3a5f' : '#334155', fontSize: 12, padding: '6px 12px' }}>
            {cameraEnabled ? '📷 AI On' : '📷 Off'}
          </button>
          {gatewayRunning && (
            <>
              <button onClick={() => handleGatewayNext(true)}  style={S.btnGreen}>✅ Pass</button>
              <button onClick={() => handleGatewayNext(false)} style={S.btnRed}>❌ Fail</button>
            </>
          )}
        </div>
      </div>

      <div style={S.gatewayBar}>
        {GATEWAY_SEQUENCE.map((g, i) => (
          <div key={g.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < gatewayIdx ? (gatewayScores[i]?.passed ? '#166534' : '#7f1d1d') : i === gatewayIdx ? '#d97706' : '#334155',
              color: '#fff', border: `2px solid ${i === gatewayIdx ? '#fbbf24' : 'transparent'}`
            }}>
              {i < gatewayIdx ? (gatewayScores[i]?.passed ? '✓' : '✗') : i + 1}
            </div>
            <span style={{ color: i === gatewayIdx ? '#fbbf24' : '#475569', fontSize: 12 }}>{g.label}</span>
            {i < 2 && <span style={{ color: '#334155', margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>

      {gatewayRunning && (
        <div style={{ height: 4, background: '#334155' }}>
          <div style={{ height: '100%', width: `${((gameDuration - timeElapsed) / gameDuration) * 100}%`,
            background: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#fbbf24', transition: 'width 1s linear' }} />
        </div>
      )}

      <div style={S.gameArea}>
        {!gatewayRunning ? (
          <div style={S.introBox}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {gatewayIdx === 0 ? '🎈' : gatewayIdx === 1 ? '📢' : '👏'}
            </div>
            <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{currentGateway?.label}</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Gateway {gatewayIdx + 1}/3 • {currentGateway?.duration}s</p>
            <div style={{ background: '#1e3a5f', borderRadius: 12, padding: '12px 20px', marginBottom: 24, color: '#94a3b8', fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
              {gatewayIdx === 0 && '🎈 Cho trẻ xem bong bóng bay. Quan sát trẻ có nhìn theo và với tay không.'}
              {gatewayIdx === 1 && '📢 Gọi tên trẻ 3 lần. Quan sát trẻ có quay đầu lại và phản hồi không.'}
              {gatewayIdx === 2 && '👏 Vỗ tay trước mặt trẻ và khuyến khích bắt chước. Quan sát phản hồi.'}
            </div>
            {cameraEnabled && (
              <div style={{ background: '#0f2a1a', border: '1px solid #166534', borderRadius: 8, padding: '8px 16px', marginBottom: 16, color: '#4ade80', fontSize: 12 }}>
                🤖 AI Camera đang hoạt động — theo dõi ánh mắt & biểu cảm tự động
              </div>
            )}
            <button onClick={startGateway} style={S.btnGreen}>▶ Bắt đầu</button>
          </div>
        ) : (
          GatewayComponent && (
            <Suspense fallback={<div style={S.loading}>⏳ Đang tải...</div>}>
              <GatewayComponent
                latestAIResult={latestAIResult}
                onFeatureCapture={handleFeatureCapture}
                timeElapsed={timeElapsed}
                gameDuration={currentGateway?.duration}
                childName={childName}
                assessmentId={assessmentId}
                onScore={handleGatewayScore}
              />
            </Suspense>
          )
        )}
      </div>
    </div>
  )

  // ─── PHASE: GATEWAY RESULT ──────────────────────────────────
  if (phase === PHASE.GATEWAY_RESULT) return (
    <div style={S.root}>
      <div style={S.card}>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>📊 Kết quả Gateway</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>{childName} • {AGE_GROUP_GAMES[ageGroup]?.label}</p>
        <div style={{ width: '100%', marginBottom: 24 }}>
          {gatewayScores.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 16px', marginBottom: 8,
              background: s.passed ? '#14532d' : '#450a0a', borderRadius: 10,
              border: `1px solid ${s.passed ? '#166534' : '#7f1d1d'}`
            }}>
              <span style={{ color: '#e2e8f0', fontSize: 14 }}>{GATEWAY_SEQUENCE[i]?.label}</span>
              <span style={{ fontSize: 18 }}>{s.passed ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
        <div style={{
          padding: '16px 24px', borderRadius: 16, marginBottom: 24, textAlign: 'center',
          background: gameMode === 'full' ? '#14532d' : '#450a0a',
          border: `2px solid ${gameMode === 'full' ? '#22c55e' : '#ef4444'}`
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{gameMode === 'full' ? '🎯' : '📋'}</div>
          <div style={{ color: gameMode === 'full' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            {gameMode === 'full'
              ? `Đạt ${gatewayPassCount}/3 → Phiếu ĐẦY ĐỦ`
              : `Đạt ${gatewayPassCount}/3 → Phiếu RÚT GỌN`}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {gameMode === 'full'
              ? `5 game theo nhóm tuổi ${AGE_GROUP_GAMES[ageGroup]?.label}`
              : `3 game lõi theo nhóm tuổi ${AGE_GROUP_GAMES[ageGroup]?.label}`}
          </div>
        </div>
        <div style={{ width: '100%', marginBottom: 24 }}>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Các game sắp chơi:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(gameMode === 'full' ? AGE_GROUP_GAMES[ageGroup]?.full : AGE_GROUP_GAMES[ageGroup]?.short).map((code, i) => (
              <span key={code} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', color: '#94a3b8', fontSize: 12 }}>
                {i + 1}. {code}
              </span>
            ))}
          </div>
        </div>
        <button onClick={handleStartMainGames} style={S.btnBlue}>▶ Bắt đầu chơi game chính</button>
      </div>
    </div>
  )

  // ─── PHASE: MAIN GAMES ──────────────────────────────────────
  if (phase === PHASE.MAIN_GAMES) return (
    <div style={S.root}>
      {/* CameraAI — chạy nền */}
      <CameraAI latestAIResult={latestAIResult} enabled={cameraEnabled} showPreview={true} />

      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{gameMode === 'full' ? '📋 ĐẦY ĐỦ' : '📄 RÚT GỌN'}</span>
          <span style={S.gameLabel}>Game {gameIdx + 1}/{gameSequence.length}: {currentGameCode}</span>
          <span style={S.childLabel}>👶 {childName}</span>
          {gameRunning && (
            <span style={{ color: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>
              ⏱ {gameDuration - timeElapsed}s
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <AudioIndicator audioResult={audioResult} isRecording={isRecording} error={audioError} />
          <button onClick={() => setCameraEnabled(p => !p)}
            style={{ ...S.btnBlue, background: cameraEnabled ? '#1e3a5f' : '#334155', fontSize: 12, padding: '6px 12px' }}>
            {cameraEnabled ? '📷 AI On' : '📷 Off'}
          </button>
          {gameRunning && (
            <button onClick={handleMainGameNext} style={S.btnBlue}>
              {gameIdx >= gameSequence.length - 1 ? '✅ Hoàn thành' : 'Tiếp theo ⏭'}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 4, background: '#334155' }}>
        <div style={{ height: '100%', width: `${(gameIdx / gameSequence.length) * 100}%`, background: '#3b82f6', transition: 'width 0.3s' }} />
      </div>

      <div style={{ ...S.gatewayBar, justifyContent: 'center' }}>
        {gameSequence.map((code, i) => (
          <div key={code} style={{
            width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            background: i < gameIdx ? '#22c55e' : i === gameIdx ? '#3b82f6' : '#334155',
            transform: i === gameIdx ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.3s'
          }}>
            {i < gameIdx ? '✓' : i + 1}
          </div>
        ))}
      </div>

      {gameRunning && (
        <div style={{ height: 3, background: '#334155' }}>
          <div style={{ height: '100%', width: `${((gameDuration - timeElapsed) / gameDuration) * 100}%`,
            background: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#3b82f6', transition: 'width 1s linear' }} />
        </div>
      )}

      <div style={S.gameArea}>
        {!gameRunning ? (
          <div style={S.introBox}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎮</div>
            <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{currentGameCode}</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Game {gameIdx + 1}/{gameSequence.length}</p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>⏱ {gameDuration}s • Nhóm {AGE_GROUP_GAMES[ageGroup]?.label}</p>
            {cameraEnabled && (
              <div style={{ background: '#0f2a1a', border: '1px solid #166534', borderRadius: 8, padding: '6px 14px', marginBottom: 16, color: '#4ade80', fontSize: 12 }}>
                🤖 AI đang theo dõi
              </div>
            )}
            <button onClick={startMainGame} style={S.btnGreen}>▶ Bắt đầu</button>
          </div>
        ) : (
          MainGameComponent && (
            <Suspense fallback={<div style={S.loading}>⏳ Đang tải...</div>}>
              <MainGameComponent
                latestAIResult={latestAIResult}
                onFeatureCapture={handleFeatureCapture}
                timeElapsed={timeElapsed}
                gameDuration={gameDuration}
                childName={childName}
                assessmentId={assessmentId}
              />
            </Suspense>
          )
        )}
      </div>
    </div>
  )

  // ─── PHASE: DONE ────────────────────────────────────────────
  if (phase === PHASE.DONE) return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Hoàn thành đánh giá!</h2>
        <p style={{ color: '#94a3b8', marginBottom: 8 }}>{childName} • {AGE_GROUP_GAMES[ageGroup]?.label}</p>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          {gameMode === 'full' ? '📋 Phiếu đầy đủ' : '📄 Phiếu rút gọn'} • {gameSequence.length} game đã hoàn thành
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate(`/report/${assessmentId}`)} style={S.btnBlue}>📊 Xem báo cáo</button>
          <button onClick={() => navigate('/dashboard')} style={{ ...S.btnBlue, background: '#334155' }}>🏠 Dashboard</button>
        </div>
      </div>
    </div>
  )

  return null
}

const S = {
  root:       { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden' },
  card:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0 },
  headerLeft: { display: 'flex', gap: 14, alignItems: 'center' },
  gameLabel:  { color: '#94a3b8', fontSize: 13, fontWeight: 600 },
  childLabel: { color: '#e2e8f0', fontSize: 13 },
  gatewayBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 24px', background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0 },
  gameArea:   { flex: 1, overflow: 'hidden', position: 'relative' },
  introBox:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, textAlign: 'center' },
  loading:    { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 18 },
  label:      { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, textAlign: 'left' },
  input:      { width: '100%', padding: '10px 14px', background: '#1e293b', border: '1.5px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 15, boxSizing: 'border-box', outline: 'none' },
  btnGreen:   { padding: '10px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnBlue:    { padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnRed:     { padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
}
