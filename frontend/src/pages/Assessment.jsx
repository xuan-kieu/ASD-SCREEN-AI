import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'  // ← thêm useLocation
import api from '../api/axios'

const gameComponents = {
  'GATEWAY_BALLOON':  lazy(() => import('../components/games/G1_1_Balloon')),
  'GATEWAY_NAME':     lazy(() => import('../components/games/G1_3_Attention')),
  'GATEWAY_CLAPPING': lazy(() => import('../components/games/G1_2_Clapping')),
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
  '12-18': {
    label: '12-18 tháng',
    full:  ['G1.1', 'G1.2', 'G1.3', 'G1.4', 'G1.5'],
    short: ['G1.1', 'G1.2', 'G1.3'],
    duration: { full: 120, short: 120 }
  },
  '18-24': {
    label: '18-24 tháng',
    full:  ['G2.1', 'G2.2', 'G2.3', 'G2.4', 'G2.5'],
    short: ['G2.1', 'G2.2', 'G2.3'],
    duration: { full: 180, short: 180 }
  },
  '24-36': {
    label: '24-36 tháng',
    full:  ['G3.1', 'G3.2', 'G3.3', 'G3.4', 'G3.5'],
    short: ['G3.1', 'G3.2', 'G3.3'],
    duration: { full: 180, short: 180 }
  },
  '36-60': {
    label: '36-60 tháng',
    full:  ['G4.1', 'G4.2', 'G4.3', 'G4.4', 'G4.5'],
    short: ['G4.1', 'G4.2', 'G4.3'],
    duration: { full: 240, short: 180 }
  },
}

const GATEWAY_SEQUENCE = [
  { code: 'GATEWAY_BALLOON',  label: '🎈 Bong bóng biết bay', duration: 120 },
  { code: 'GATEWAY_NAME',     label: '📢 Bé ơi quay lại nào', duration: 60  },
  { code: 'GATEWAY_CLAPPING', label: '👏 Vỗ tay vui nhộn',    duration: 120 },
]

function getAgeMonths(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)
  return (today.getFullYear() - birth.getFullYear()) * 12
       + (today.getMonth() - birth.getMonth())
}

function getAgeGroup(months) {
  if (months < 18) return '12-18'
  if (months < 24) return '18-24'
  if (months < 36) return '24-36'
  return '36-60'
}

const PHASE = {
  SETUP:          'setup',
  GATEWAY:        'gateway',
  GATEWAY_RESULT: 'gateway_result',
  MAIN_GAMES:     'main_games',
  DONE:           'done',
}

export default function Assessment() {
  const { id: assessmentId } = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()  // ← thêm

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
  const timerRef       = useRef(null)
  const featuresBuffer = useRef([])
  const latestAIResult = useRef(null)
  const phaseRef       = useRef(PHASE.SETUP)  // ← để handleTimeUp đọc phase mới nhất

  // ← THÊM: prefill từ ChildDetail navigate state
  useEffect(() => {
    if (location.state?.childName) setChildName(location.state.childName)
    if (location.state?.birthDate) setBirthDate(location.state.birthDate)
  }, [])

  // Sync phaseRef để dùng trong timer callback
  useEffect(() => { phaseRef.current = phase }, [phase])

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

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => () => stopTimer(), [])

  const handleFeatureCapture = (feature) => {
    featuresBuffer.current.push(feature)
    if (featuresBuffer.current.length >= 50) flushFeatures()
  }

  const flushFeatures = async (gameCode) => {
    if (!assessmentId || featuresBuffer.current.length === 0) return
    const toSend = [...featuresBuffer.current]
    featuresBuffer.current = []
    try {
      await api.post(`/assessments/${assessmentId}/features`, {
        game_code: gameCode,
        features:  toSend
      })
    } catch (e) {}
  }

  const handleSetup = () => {
    if (!childName.trim() || !birthDate) return
    const months = getAgeMonths(birthDate)
    const group  = getAgeGroup(months)
    setAgeMonths(months)
    setAgeGroup(group)
    setPhase(PHASE.GATEWAY)
    setGatewayIdx(0)
  }

  const startGateway = () => {
    setGatewayRunning(true)
    startTimer(GATEWAY_SEQUENCE[gatewayIdx].duration)
  }

  const handleTimeUp = () => {
    if (phaseRef.current === PHASE.GATEWAY)    handleGatewayNext(false)
    else if (phaseRef.current === PHASE.MAIN_GAMES) handleMainGameNext()
  }

  const handleGatewayNext = (passed) => {
    stopTimer()
    const current   = GATEWAY_SEQUENCE[gatewayIdx]
    const newScores = [...gatewayScores, { code: current.code, passed }]
    setGatewayScores(newScores)
    setGatewayRunning(false)
    flushFeatures(current.code)

    if (gatewayIdx < GATEWAY_SEQUENCE.length - 1) {
      setGatewayIdx(i => i + 1)
      setTimeElapsed(0)
    } else {
      const passCount = newScores.filter(s => s.passed).length
      const mode = passCount >= 2 ? 'full' : 'short'
      setGameMode(mode)
      setPhase(PHASE.GATEWAY_RESULT)
    }
  }

  const handleStartMainGames = () => {
    const config   = AGE_GROUP_GAMES[ageGroup]
    const sequence = gameMode === 'full' ? config.full : config.short
    const duration = config.duration[gameMode]
    setGameSequence(sequence)
    setGameDuration(duration)
    setGameIdx(0)
    setGameRunning(false)
    setPhase(PHASE.MAIN_GAMES)
  }

  const startMainGame = () => {
    setGameRunning(true)
    const config = AGE_GROUP_GAMES[ageGroup]
    startTimer(config.duration[gameMode])
  }

  const handleMainGameNext = async () => {
    stopTimer()
    setGameRunning(false)
    await flushFeatures(gameSequence[gameIdx])

    if (gameIdx < gameSequence.length - 1) {
      setGameIdx(i => i + 1)
      setTimeElapsed(0)
    } else {
      try { await api.patch(`/assessments/${assessmentId}/complete`) } catch (e) {}
      setPhase(PHASE.DONE)
    }
  }

  const handleGatewayScore = (score) => {
    handleGatewayNext(score >= 60)
  }

  const currentGateway      = GATEWAY_SEQUENCE[gatewayIdx]
  const GatewayComponent    = phase === PHASE.GATEWAY    ? gameComponents[currentGateway?.code] : null
  const currentGameCode     = gameSequence[gameIdx]
  const MainGameComponent   = phase === PHASE.MAIN_GAMES ? gameComponents[currentGameCode]      : null
  const gatewayPassCount    = gatewayScores.filter(s => s.passed).length

  // ─── PHASE: SETUP ───────────────────────────────────────────
  if (phase === PHASE.SETUP) return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👶</div>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          Thông tin trẻ
        </h2>
        <div style={{ width: '100%', marginBottom: 16 }}>
          <label style={S.label}>Tên trẻ *</label>
          <input
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Ví dụ: Bé Nam"
            style={S.input}
          />
        </div>
        <div style={{ width: '100%', marginBottom: 24 }}>
          <label style={S.label}>Ngày sinh *</label>
          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            style={S.input}
          />
        </div>
        {birthDate && (
          <div style={{
            background: '#1e3a5f', borderRadius: 10, padding: '10px 20px',
            marginBottom: 20, color: '#60a5fa', fontSize: 14
          }}>
            📊 Nhóm tuổi: <strong>
              {AGE_GROUP_GAMES[getAgeGroup(getAgeMonths(birthDate))]?.label}
            </strong> ({getAgeMonths(birthDate)} tháng)
          </div>
        )}
        <button
          onClick={handleSetup}
          disabled={!childName.trim() || !birthDate}
          style={{ ...S.btnGreen, opacity: !childName.trim() || !birthDate ? 0.4 : 1 }}
        >
          ▶ Bắt đầu đánh giá
        </button>
      </div>
    </div>
  )

  // ─── PHASE: GATEWAY ─────────────────────────────────────────
  if (phase === PHASE.GATEWAY) return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>
            🔑 GATEWAY {gatewayIdx + 1}/3
          </span>
          <span style={S.gameLabel}>{currentGateway?.label}</span>
          <span style={S.childLabel}>👶 {childName}</span>
          {gatewayRunning && (
            <span style={{ color: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>
              ⏱ {gameDuration - timeElapsed}s
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
              background: i < gatewayIdx
                ? (gatewayScores[i]?.passed ? '#166534' : '#7f1d1d')
                : i === gatewayIdx ? '#d97706' : '#334155',
              color: '#fff',
              border: `2px solid ${i === gatewayIdx ? '#fbbf24' : 'transparent'}`
            }}>
              {i < gatewayIdx ? (gatewayScores[i]?.passed ? '✓' : '✗') : i + 1}
            </div>
            <span style={{ color: i === gatewayIdx ? '#fbbf24' : '#475569', fontSize: 12 }}>
              {g.label}
            </span>
            {i < 2 && <span style={{ color: '#334155', margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>

      {gatewayRunning && (
        <div style={{ height: 4, background: '#334155' }}>
          <div style={{
            height: '100%',
            width: `${((gameDuration - timeElapsed) / gameDuration) * 100}%`,
            background: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#fbbf24',
            transition: 'width 1s linear'
          }} />
        </div>
      )}

      <div style={S.gameArea}>
        {!gatewayRunning ? (
          <div style={S.introBox}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {gatewayIdx === 0 ? '🎈' : gatewayIdx === 1 ? '📢' : '👏'}
            </div>
            <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {currentGateway?.label}
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
              Gateway {gatewayIdx + 1}/3 • {currentGateway?.duration}s
            </p>
            <div style={{
              background: '#1e3a5f', borderRadius: 12, padding: '12px 20px',
              marginBottom: 24, color: '#94a3b8', fontSize: 13, maxWidth: 360, textAlign: 'center'
            }}>
              {gatewayIdx === 0 && '🎈 Cho trẻ xem bong bóng bay. Quan sát trẻ có nhìn theo và với tay không.'}
              {gatewayIdx === 1 && '📢 Gọi tên trẻ 3 lần. Quan sát trẻ có quay đầu lại và phản hồi không.'}
              {gatewayIdx === 2 && '👏 Vỗ tay trước mặt trẻ và khuyến khích bắt chước. Quan sát phản hồi.'}
            </div>
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
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          📊 Kết quả Gateway
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
          {childName} • {AGE_GROUP_GAMES[ageGroup]?.label}
        </p>

        <div style={{ width: '100%', marginBottom: 24 }}>
          {gatewayScores.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 16px', marginBottom: 8,
              background: s.passed ? '#14532d' : '#450a0a',
              borderRadius: 10,
              border: `1px solid ${s.passed ? '#166534' : '#7f1d1d'}`
            }}>
              <span style={{ color: '#e2e8f0', fontSize: 14 }}>
                {GATEWAY_SEQUENCE[i]?.label}
              </span>
              <span style={{ fontSize: 18 }}>{s.passed ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>

        <div style={{
          padding: '16px 24px', borderRadius: 16, marginBottom: 24, textAlign: 'center',
          background: gameMode === 'full' ? '#14532d' : '#450a0a',
          border: `2px solid ${gameMode === 'full' ? '#22c55e' : '#ef4444'}`
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {gameMode === 'full' ? '🎯' : '📋'}
          </div>
          <div style={{
            color: gameMode === 'full' ? '#22c55e' : '#ef4444',
            fontWeight: 700, fontSize: 18, marginBottom: 4
          }}>
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
            {(gameMode === 'full'
              ? AGE_GROUP_GAMES[ageGroup]?.full
              : AGE_GROUP_GAMES[ageGroup]?.short
            ).map((code, i) => (
              <span key={code} style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 6, padding: '4px 10px', color: '#94a3b8', fontSize: 12
              }}>
                {i + 1}. {code}
              </span>
            ))}
          </div>
        </div>

        <button onClick={handleStartMainGames} style={S.btnBlue}>
          ▶ Bắt đầu chơi game chính
        </button>
      </div>
    </div>
  )

  // ─── PHASE: MAIN GAMES ──────────────────────────────────────
  if (phase === PHASE.MAIN_GAMES) return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {gameMode === 'full' ? '📋 ĐẦY ĐỦ' : '📄 RÚT GỌN'}
          </span>
          <span style={S.gameLabel}>
            Game {gameIdx + 1}/{gameSequence.length}: {currentGameCode}
          </span>
          <span style={S.childLabel}>👶 {childName}</span>
          {gameRunning && (
            <span style={{ color: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>
              ⏱ {gameDuration - timeElapsed}s
            </span>
          )}
        </div>
        {gameRunning && (
          <button onClick={handleMainGameNext} style={S.btnBlue}>
            {gameIdx >= gameSequence.length - 1 ? '✅ Hoàn thành' : 'Tiếp theo ⏭'}
          </button>
        )}
      </div>

      <div style={{ height: 4, background: '#334155' }}>
        <div style={{
          height: '100%',
          width: `${(gameIdx / gameSequence.length) * 100}%`,
          background: '#3b82f6', transition: 'width 0.3s'
        }} />
      </div>

      <div style={{ ...S.gatewayBar, justifyContent: 'center' }}>
        {gameSequence.map((code, i) => (
          <div key={code} style={{
            width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            background: i < gameIdx ? '#22c55e' : i === gameIdx ? '#3b82f6' : '#334155',
            transform: i === gameIdx ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s'
          }}>
            {i < gameIdx ? '✓' : i + 1}
          </div>
        ))}
      </div>

      {gameRunning && (
        <div style={{ height: 3, background: '#334155' }}>
          <div style={{
            height: '100%',
            width: `${((gameDuration - timeElapsed) / gameDuration) * 100}%`,
            background: gameDuration - timeElapsed <= 10 ? '#ef4444' : '#3b82f6',
            transition: 'width 1s linear'
          }} />
        </div>
      )}

      <div style={S.gameArea}>
        {!gameRunning ? (
          <div style={S.introBox}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎮</div>
            <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {currentGameCode}
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
              Game {gameIdx + 1}/{gameSequence.length}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24 }}>
              ⏱ {gameDuration}s • Nhóm {AGE_GROUP_GAMES[ageGroup]?.label}
            </p>
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
        <h2 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Hoàn thành đánh giá!
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 8 }}>
          {childName} • {AGE_GROUP_GAMES[ageGroup]?.label}
        </p>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          {gameMode === 'full' ? '📋 Phiếu đầy đủ' : '📄 Phiếu rút gọn'} •&nbsp;
          {gameSequence.length} game đã hoàn thành
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate(`/report/${assessmentId}`)} style={S.btnBlue}>
            📊 Xem báo cáo
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ ...S.btnBlue, background: '#334155' }}>
            🏠 Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  return null
}

const S = {
  root: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden'
  },
  card: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, textAlign: 'center'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 24px', background: '#1e293b',
    borderBottom: '1px solid #334155', flexShrink: 0
  },
  headerLeft:  { display: 'flex', gap: 14, alignItems: 'center' },
  gameLabel:   { color: '#94a3b8', fontSize: 13, fontWeight: 600 },
  childLabel:  { color: '#e2e8f0', fontSize: 13 },
  gatewayBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 24px', background: '#1e293b',
    borderBottom: '1px solid #334155', flexShrink: 0
  },
  gameArea: { flex: 1, overflow: 'hidden', position: 'relative' },
  introBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', padding: 24, textAlign: 'center'
  },
  loading: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 18 },
  label: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, textAlign: 'left' },
  input: {
    width: '100%', padding: '10px 14px', background: '#1e293b',
    border: '1.5px solid #334155', borderRadius: 10, color: '#e2e8f0',
    fontSize: 15, boxSizing: 'border-box', outline: 'none'
  },
  btnGreen: { padding: '10px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnBlue:  { padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnRed:   { padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
}