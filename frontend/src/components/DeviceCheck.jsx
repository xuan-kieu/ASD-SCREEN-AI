/**
 * DeviceCheck.jsx — Kiểm tra thiết bị + môi trường trước Assessment
 * Thêm: Pre-session noise check + lighting check
 */
import { useState, useEffect, useRef } from 'react'

const CHECK = {
  camera:   { label: 'Camera',       icon: '📷', desc: 'Theo dõi ánh mắt & biểu cảm' },
  mic:      { label: 'Microphone',   icon: '🎤', desc: 'Phân tích phản ứng âm thanh' },
  screen:   { label: 'Màn hình',     icon: '🖥️', desc: 'Độ phân giải & hiển thị' },
  noise:    { label: 'Tiếng ồn',     icon: '🔊', desc: 'Môi trường yên tĩnh cho trẻ' },
  lighting: { label: 'Ánh sáng',     icon: '💡', desc: 'Đủ sáng, không ngược sáng' },
}

export default function DeviceCheck({ onPass, onSkip, childName }) {
  const [results, setResults]   = useState({
    camera: 'pending', mic: 'pending', screen: 'pending',
    noise: 'pending', lighting: 'pending'
  })
  const [checking, setChecking] = useState(false)
  const [done, setDone]         = useState(false)
  const [camStream, setCamStream] = useState(null)
  const [noiseLevel, setNoiseLevel] = useState(null)   // dB
  const [brightness, setBrightness] = useState(null)   // 0-255

  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)

  useEffect(() => {
    return () => {
      if (camStream) camStream.getTracks().forEach(t => t.stop())
    }
  }, [camStream])

  const delay = (ms) => new Promise(r => setTimeout(r, ms))

  // ── Đo độ ồn môi trường ─────────────────────────────────
  const measureNoise = (stream) => new Promise((resolve) => {
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)()
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const buf = new Uint8Array(analyser.frequencyBinCount)
      let samples = 0
      let total   = 0

      const measure = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        total += avg
        samples++
        if (samples < 20) {
          requestAnimationFrame(measure)
        } else {
          ctx.close()
          resolve(total / samples)  // trả về giá trị trung bình (0-255)
        }
      }
      requestAnimationFrame(measure)
    } catch {
      resolve(null)
    }
  })

  // ── Đo độ sáng từ video frame ────────────────────────────
  const measureBrightness = (videoEl) => {
    try {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width  = 80
      canvas.height = 60
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoEl, 0, 0, 80, 60)
      const data = ctx.getImageData(0, 0, 80, 60).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        // Luminance = 0.299R + 0.587G + 0.114B
        sum += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]
      }
      return sum / (data.length / 4)  // 0-255
    } catch {
      return null
    }
  }

  const runChecks = async () => {
    setChecking(true)
    setResults({ camera: 'checking', mic: 'checking', screen: 'checking', noise: 'checking', lighting: 'checking' })

    // ── 1. Màn hình ────────────────────────────────────────
    await delay(300)
    const screenOk = window.screen.width >= 768
    setResults(p => ({ ...p, screen: screenOk ? 'ok' : 'warn' }))

    // ── 2. Camera + Mic ────────────────────────────────────
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setCamStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      setResults(p => ({
        ...p,
        camera: videoTrack?.readyState === 'live' ? 'ok' : 'fail',
        mic:    audioTrack?.readyState === 'live' ? 'ok' : 'fail',
      }))

      // ── 3. Noise check ──────────────────────────────────
      await delay(300)
      const noiseVal = await measureNoise(stream)
      setNoiseLevel(noiseVal)
      let noiseStatus = 'ok'
      if (noiseVal === null)  noiseStatus = 'warn'
      else if (noiseVal > 60) noiseStatus = 'fail'   // quá ồn
      else if (noiseVal > 35) noiseStatus = 'warn'   // hơi ồn
      setResults(p => ({ ...p, noise: noiseStatus }))

      // ── 4. Lighting check ───────────────────────────────
      await delay(800) // đợi video ổn định
      if (videoRef.current) {
        const bv = measureBrightness(videoRef.current)
        setBrightness(bv)
        let lightStatus = 'ok'
        if (bv === null)  lightStatus = 'warn'
        else if (bv < 30) lightStatus = 'fail'   // quá tối
        else if (bv > 220) lightStatus = 'warn'  // ngược sáng
        else if (bv < 60)  lightStatus = 'warn'  // hơi tối
        setResults(p => ({ ...p, lighting: lightStatus }))
      } else {
        setResults(p => ({ ...p, lighting: 'warn' }))
      }

    } catch (err) {
      const isDenied = err.name === 'NotAllowedError'
      setResults(p => ({
        ...p,
        camera:   isDenied ? 'denied' : 'fail',
        mic:      isDenied ? 'denied' : 'fail',
        noise:    'warn',
        lighting: 'warn',
      }))
    }

    setChecking(false)
    setDone(true)
  }

  const getIcon = (status) => ({
    pending:  { icon: '⭕', color: '#475569' },
    checking: { icon: '⏳', color: '#fbbf24' },
    ok:       { icon: '✅', color: '#22c55e' },
    warn:     { icon: '⚠️', color: '#f59e0b' },
    fail:     { icon: '❌', color: '#ef4444' },
    denied:   { icon: '🚫', color: '#ef4444' },
  }[status] || { icon: '⭕', color: '#475569' })

  const getMessage = (key, status) => {
    if (status === 'pending')  return 'Chưa kiểm tra'
    if (status === 'checking') return 'Đang kiểm tra...'
    if (status === 'denied')   return 'Bị từ chối — cho phép trong cài đặt trình duyệt'
    const msgs = {
      camera:   { ok: 'Camera sẵn sàng', fail: 'Không tìm thấy camera', warn: 'Camera hạn chế' },
      mic:      { ok: 'Microphone sẵn sàng', fail: 'Không có microphone', warn: 'Microphone hạn chế' },
      screen:   {
        ok:   `${window.screen.width}×${window.screen.height} — Đạt yêu cầu`,
        warn: `${window.screen.width}×${window.screen.height} — Nên dùng màn hình ≥768px`,
        fail: 'Màn hình quá nhỏ',
      },
      noise: {
        ok:   noiseLevel != null ? `Yên tĩnh — Mức ồn: ${Math.round(noiseLevel)}/255` : 'Môi trường tốt',
        warn: noiseLevel != null ? `Hơi ồn (${Math.round(noiseLevel)}/255) — Nên tắt tivi, radio` : 'Không đo được tiếng ồn',
        fail: `Quá ồn (${Math.round(noiseLevel ?? 0)}/255) — Cần vào phòng yên tĩnh hơn`,
      },
      lighting: {
        ok:   brightness != null ? `Ánh sáng tốt (${Math.round(brightness)}/255)` : 'Ánh sáng ổn',
        warn: brightness != null
          ? brightness > 200
            ? `Có thể ngược sáng (${Math.round(brightness)}/255) — Tránh cửa sổ phía sau`
            : `Hơi tối (${Math.round(brightness)}/255) — Nên bật thêm đèn`
          : 'Không đo được ánh sáng',
        fail: brightness != null && brightness < 30
          ? `Quá tối (${Math.round(brightness)}/255) — Bật đèn hoặc mở rèm`
          : 'Ánh sáng không đạt',
      },
    }
    return msgs[key]?.[status] || ''
  }

  const cameraOk    = results.camera === 'ok'
  const canContinue = done && cameraOk

  // Đếm cảnh báo môi trường
  const envWarnings = ['noise', 'lighting'].filter(k =>
    results[k] === 'warn' || results[k] === 'fail'
  ).length

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🔍</div>
          <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Kiểm tra thiết bị & Môi trường
          </h2>
          <p style={{ color: '#64748b', fontSize: 12 }}>
            👶 {childName} — Đảm bảo điều kiện tốt nhất cho đánh giá
          </p>
        </div>

        {/* Camera preview */}
        <div style={{
          width: '100%', height: 140, background: '#0f172a', borderRadius: 10,
          overflow: 'hidden', marginBottom: 16, position: 'relative',
          border: `2px solid ${cameraOk ? '#22c55e' : '#334155'}`
        }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!cameraOk && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 28 }}>📷</div>
              <div style={{ color: '#475569', fontSize: 12 }}>
                {results.camera === 'pending' ? 'Bấm Kiểm tra để xem preview' : 'Không có camera'}
              </div>
            </div>
          )}
          {cameraOk && (
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 5, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#fff', fontSize: 10 }}>Live</span>
            </div>
          )}
          {/* Brightness indicator */}
          {brightness != null && (
            <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 5, padding: '2px 7px' }}>
              <span style={{ color: brightness < 60 ? '#f59e0b' : brightness > 210 ? '#f59e0b' : '#22c55e', fontSize: 10 }}>
                💡 {Math.round(brightness)}/255
              </span>
            </div>
          )}
        </div>

        {/* Danh sách kiểm tra — 2 nhóm */}
        <div style={{ width: '100%', marginBottom: 16 }}>
          {/* Nhóm 1: Thiết bị */}
          <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Thiết bị
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {['camera', 'mic', 'screen'].map(key => {
              const info   = CHECK[key]
              const status = results[key]
              const { icon, color } = getIcon(status)
              return (
                <CheckRow key={key} info={info} status={status} icon={icon} color={color}
                  msg={done ? getMessage(key, status) : ''} />
              )
            })}
          </div>

          {/* Nhóm 2: Môi trường */}
          <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Môi trường
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['noise', 'lighting'].map(key => {
              const info   = CHECK[key]
              const status = results[key]
              const { icon, color } = getIcon(status)
              return (
                <CheckRow key={key} info={info} status={status} icon={icon} color={color}
                  msg={done ? getMessage(key, status) : ''} />
              )
            })}
          </div>
        </div>

        {/* Kết quả tổng */}
        {done && (
          <div style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: canContinue ? (envWarnings > 0 ? '#1a1500' : '#0f2a1a') : '#1a0f0f',
            border: `1px solid ${canContinue ? (envWarnings > 0 ? '#854d0e' : '#166534') : '#7f1d1d'}`,
          }}>
            {!canContinue ? (
              <div>
                <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>⚠️ Camera không khả dụng</p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>Vẫn có thể tiếp tục bằng chế độ thủ công</p>
              </div>
            ) : envWarnings > 0 ? (
              <div>
                <p style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>
                  ⚠️ Thiết bị OK nhưng môi trường cần cải thiện
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>
                  Khuyến nghị xử lý cảnh báo trên trước khi đánh giá để có kết quả chính xác hơn
                </p>
              </div>
            ) : (
              <p style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, margin: 0 }}>
                ✅ Thiết bị & môi trường sẵn sàng — AI Camera sẽ hoạt động tốt
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {!done ? (
            <>
              <button onClick={onSkip} style={{ ...S.btnGray, flex: 1 }}>Bỏ qua</button>
              <button onClick={runChecks} disabled={checking}
                style={{ ...S.btnBlue, flex: 2, opacity: checking ? 0.7 : 1 }}>
                {checking ? '⏳ Đang kiểm tra...' : '🔍 Kiểm tra'}
              </button>
            </>
          ) : (
            <>
              <button onClick={runChecks} style={{ ...S.btnGray, flex: 1 }}>🔄 Thử lại</button>
              <button onClick={() => {
                if (camStream) camStream.getTracks().forEach(t => t.stop())
                onPass(canContinue)
              }} style={{ ...S.btnGreen, flex: 2 }}>
                {canContinue ? '▶ Bắt đầu đánh giá' : '▶ Tiếp tục (thủ công)'}
              </button>
            </>
          )}
        </div>

        {/* Ghi chú quyền trình duyệt */}
        {(results.camera === 'denied' || results.mic === 'denied') && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#1e293b', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: '#fbbf24', fontSize: 12, margin: '0 0 3px', fontWeight: 600 }}>💡 Cách cấp quyền:</p>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              Bấm 🔒 trên thanh địa chỉ → Allow Camera & Microphone → tải lại trang
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckRow({ info, status, icon, color, msg }) {
  const borderColor = status === 'ok' ? '#166534' : status === 'fail' || status === 'denied' ? '#7f1d1d' : status === 'warn' ? '#854d0e' : '#334155'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#1e293b', border: `1px solid ${borderColor}` }}>
      <span style={{ fontSize: 18 }}>{info.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{info.label}</div>
        {msg
          ? <div style={{ color, fontSize: 11, marginTop: 1 }}>{msg}</div>
          : <div style={{ color: '#475569', fontSize: 11 }}>{info.desc}</div>}
      </div>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
    </div>
  )
}

const S = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:    { background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '90vh', overflowY: 'auto' },
  btnGreen: { padding: '11px 0', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  btnBlue:  { padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  btnGray:  { padding: '11px 0', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
}