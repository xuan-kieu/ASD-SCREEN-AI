/**
 * DeviceCheck.jsx — Kiểm tra thiết bị trước khi vào Assessment
 * Props:
 *   onPass   — callback khi tất cả thiết bị OK
 *   onSkip   — callback bỏ qua kiểm tra
 *   childName — tên trẻ hiển thị
 */
import { useState, useEffect, useRef } from 'react'

const CHECK = {
  camera:  { label: 'Camera',      icon: '📷', desc: 'Theo dõi ánh mắt & biểu cảm' },
  mic:     { label: 'Microphone',  icon: '🎤', desc: 'Phân tích phản ứng âm thanh' },
  screen:  { label: 'Màn hình',    icon: '🖥️', desc: 'Độ phân giải & hiển thị' },
}

export default function DeviceCheck({ onPass, onSkip, childName }) {
  const [results, setResults] = useState({ camera: 'pending', mic: 'pending', screen: 'pending' })
  const [checking, setChecking] = useState(false)
  const [done, setDone]         = useState(false)
  const [camStream, setCamStream] = useState(null)
  const videoRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup stream khi unmount
      if (camStream) camStream.getTracks().forEach(t => t.stop())
    }
  }, [camStream])

  const runChecks = async () => {
    setChecking(true)
    setResults({ camera: 'checking', mic: 'checking', screen: 'checking' })

    // ── 1. Kiểm tra màn hình ──────────────────────────────
    await delay(400)
    const w = window.screen.width
    const h = window.screen.height
    const screenOk = w >= 1024 && h >= 600
    setResults(p => ({ ...p, screen: screenOk ? 'ok' : 'warn' }))

    // ── 2. Kiểm tra Camera + Mic cùng lúc ────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setCamStream(stream)

      // Gắn stream vào video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      // Kiểm tra camera track
      const videoTrack = stream.getVideoTracks()[0]
      const cameraOk = videoTrack && videoTrack.readyState === 'live'
      setResults(p => ({ ...p, camera: cameraOk ? 'ok' : 'fail' }))

      // Kiểm tra mic track
      const audioTrack = stream.getAudioTracks()[0]
      const micOk = audioTrack && audioTrack.readyState === 'live'
      setResults(p => ({ ...p, mic: micOk ? 'ok' : 'fail' }))

    } catch (err) {
      // Phân biệt lỗi camera vs mic
      if (err.name === 'NotAllowedError') {
        setResults(p => ({ ...p, camera: 'denied', mic: 'denied' }))
      } else if (err.name === 'NotFoundError') {
        // Thử lại chỉ với video
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true })
          setCamStream(vStream)
          if (videoRef.current) { videoRef.current.srcObject = vStream; vStream.play?.() }
          setResults(p => ({ ...p, camera: 'ok', mic: 'fail' }))
        } catch {
          setResults(p => ({ ...p, camera: 'fail', mic: 'fail' }))
        }
      } else {
        setResults(p => ({ ...p, camera: 'fail', mic: 'fail' }))
      }
    }

    setChecking(false)
    setDone(true)
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms))

  const getIcon = (status) => {
    if (status === 'pending')  return { icon: '⭕', color: '#475569' }
    if (status === 'checking') return { icon: '⏳', color: '#fbbf24' }
    if (status === 'ok')       return { icon: '✅', color: '#22c55e' }
    if (status === 'warn')     return { icon: '⚠️', color: '#f59e0b' }
    if (status === 'fail')     return { icon: '❌', color: '#ef4444' }
    if (status === 'denied')   return { icon: '🚫', color: '#ef4444' }
    return { icon: '⭕', color: '#475569' }
  }

  const getMessage = (key, status) => {
    if (status === 'pending')  return 'Chưa kiểm tra'
    if (status === 'checking') return 'Đang kiểm tra...'
    if (status === 'denied')   return 'Bị từ chối — cho phép truy cập trong cài đặt trình duyệt'
    if (key === 'camera') {
      if (status === 'ok')   return 'Camera sẵn sàng'
      if (status === 'fail') return 'Không tìm thấy camera'
    }
    if (key === 'mic') {
      if (status === 'ok')   return 'Microphone sẵn sàng'
      if (status === 'fail') return 'Không tìm thấy microphone — có thể dùng chế độ thủ công'
    }
    if (key === 'screen') {
      if (status === 'ok')   return `${window.screen.width}×${window.screen.height} — Đạt yêu cầu`
      if (status === 'warn') return `${window.screen.width}×${window.screen.height} — Nên dùng màn hình ≥1024px`
    }
    return ''
  }

  // Tính kết quả tổng
  const cameraOk = results.camera === 'ok'
  const allOk    = results.camera === 'ok' && results.mic === 'ok' && results.screen !== 'fail'
  const canContinue = done && cameraOk // Chỉ cần camera là đủ để chạy AI

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
          <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Kiểm tra thiết bị
          </h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            👶 {childName} — Đảm bảo thiết bị sẵn sàng trước khi đánh giá
          </p>
        </div>

        {/* Camera preview */}
        <div style={{
          width: '100%', height: 160, background: '#0f172a', borderRadius: 12,
          overflow: 'hidden', marginBottom: 20, position: 'relative',
          border: `2px solid ${cameraOk ? '#22c55e' : '#334155'}`
        }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          {!cameraOk && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column', gap: 8
            }}>
              <div style={{ fontSize: 32 }}>📷</div>
              <div style={{ color: '#475569', fontSize: 13 }}>
                {results.camera === 'pending' ? 'Bấm Kiểm tra để xem preview' : 'Không có camera'}
              </div>
            </div>
          )}
          {cameraOk && (
            <div style={{
              position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)',
              borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#fff', fontSize: 11 }}>Camera live</span>
            </div>
          )}
        </div>

        {/* Danh sách kiểm tra */}
        <div style={{ width: '100%', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(CHECK).map(([key, info]) => {
            const status = results[key]
            const { icon, color } = getIcon(status)
            const msg = getMessage(key, status)
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12, background: '#1e293b',
                border: `1px solid ${status === 'ok' ? '#166534' : status === 'fail' || status === 'denied' ? '#7f1d1d' : '#334155'}`
              }}>
                <span style={{ fontSize: 20 }}>{info.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{info.label}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{info.desc}</div>
                  {done && <div style={{ color, fontSize: 12, marginTop: 2 }}>{msg}</div>}
                </div>
                <span style={{ fontSize: 20 }}>
                  {status === 'checking' ? (
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  ) : icon}
                </span>
              </div>
            )
          })}
        </div>

        {/* Kết quả tổng */}
        {done && (
          <div style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 20,
            background: canContinue ? '#0f2a1a' : '#1a0f0f',
            border: `1px solid ${canContinue ? '#166534' : '#7f1d1d'}`,
            textAlign: 'center'
          }}>
            {canContinue ? (
              <p style={{ color: '#4ade80', fontSize: 14, fontWeight: 600, margin: 0 }}>
                ✅ Thiết bị sẵn sàng — AI Camera sẽ hoạt động trong phiên đánh giá
              </p>
            ) : (
              <div>
                <p style={{ color: '#f87171', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                  ⚠️ Camera không khả dụng
                </p>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                  Vẫn có thể tiếp tục bằng chế độ thủ công (giám sát viên tự đánh giá)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {!done ? (
            <>
              <button onClick={onSkip}
                style={{ ...S.btnGray, flex: 1 }}>
                Bỏ qua
              </button>
              <button onClick={runChecks} disabled={checking}
                style={{ ...S.btnBlue, flex: 2, opacity: checking ? 0.7 : 1 }}>
                {checking ? '⏳ Đang kiểm tra...' : '🔍 Kiểm tra thiết bị'}
              </button>
            </>
          ) : (
            <>
              <button onClick={runChecks}
                style={{ ...S.btnGray, flex: 1 }}>
                🔄 Thử lại
              </button>
              <button onClick={() => {
                // Dừng stream trước khi chuyển sang CameraAI
                if (camStream) camStream.getTracks().forEach(t => t.stop())
                onPass(canContinue)
              }}
                style={{ ...S.btnGreen, flex: 2 }}>
                {canContinue ? '▶ Bắt đầu đánh giá' : '▶ Tiếp tục (thủ công)'}
              </button>
            </>
          )}
        </div>

        {/* Ghi chú quyền trình duyệt */}
        {(results.camera === 'denied' || results.mic === 'denied') && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#1e293b', borderRadius: 10, width: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: '#fbbf24', fontSize: 12, margin: '0 0 4px', fontWeight: 600 }}>
              💡 Cách cấp quyền camera/mic:
            </p>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Bấm vào biểu tượng 🔒 hoặc 📷 trên thanh địa chỉ trình duyệt → chọn <strong style={{ color: '#94a3b8' }}>Allow</strong> cho Camera và Microphone → tải lại trang
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 20,
    padding: '28px 24px', width: '100%', maxWidth: 460,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  btnGreen: { padding: '12px 0', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnBlue:  { padding: '12px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnGray:  { padding: '12px 0', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
}