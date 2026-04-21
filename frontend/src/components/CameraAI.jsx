
import { useEffect, useRef, useState } from 'react'

// MediaPipe CDN URLs
const MP_FACE_MESH_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
const MP_HANDS_URL      = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
const MP_POSE_URL       = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'
const MP_CAMERA_URL     = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
const MP_DRAWING_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'

// Load script động
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload  = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// ── Landmark indices (MediaPipe Face Mesh) ──────────────
const LEFT_EYE_CENTER   = 468  // iris center left
const RIGHT_EYE_CENTER  = 473  // iris center right
const NOSE_TIP          = 1
const LEFT_MOUTH        = 61
const RIGHT_MOUTH       = 291
const UPPER_LIP         = 13
const LOWER_LIP         = 14

// ── Tính vector nhìn từ landmark ────────────────────────
function estimateGaze(landmarks) {
  if (!landmarks || landmarks.length < 478) return { gazeX: 0.5, gazeY: 0.5 }
  const lEye = landmarks[LEFT_EYE_CENTER]
  const rEye = landmarks[RIGHT_EYE_CENTER]
  // Trung tâm iris → normalize về 0-1
  return {
    gazeX: ((lEye.x + rEye.x) / 2),
    gazeY: ((lEye.y + rEye.y) / 2),
  }
}

// ── Tính smile intensity từ khoảng miệng ────────────────
function estimateSmile(landmarks) {
  if (!landmarks || landmarks.length < 300) return 0
  const lMouth = landmarks[LEFT_MOUTH]
  const rMouth = landmarks[RIGHT_MOUTH]
  const upper  = landmarks[UPPER_LIP]
  const lower  = landmarks[LOWER_LIP]
  const mouthWidth  = Math.abs(rMouth.x - lMouth.x)
  const mouthHeight = Math.abs(lower.y - upper.y)
  // Smile ratio: miệng rộng + ít cao = đang cười
  return Math.min(1, mouthWidth / 0.3) * (1 - Math.min(1, mouthHeight / 0.05))
}

// ── Tính attention level từ head pose và gaze ─────────────
function estimateAttention(landmarks) {
  if (!landmarks || landmarks.length < 10) return 0.5
  
  // Head score
  const nose = landmarks[NOSE_TIP]
  const centerDist = Math.sqrt(Math.pow(nose.x - 0.5, 2) + Math.pow(nose.y - 0.5, 2))
  const headScore = Math.max(0, 1 - centerDist * 2)
  
  // Gaze score
  const gaze = estimateGaze(landmarks)
  const gazeDist = Math.sqrt(Math.pow(gaze.gazeX - 0.5, 2) + Math.pow(gaze.gazeY - 0.5, 2))
  const gazeScore = Math.max(0, 1 - gazeDist * 2)
  
  return 0.5 * headScore + 0.5 * gazeScore
}

export default function CameraAI({ latestAIResult, enabled = true, showPreview = true }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const cameraRef  = useRef(null)
  const faceMeshRef = useRef(null)
  const handsRef   = useRef(null)

  const [status, setStatus]   = useState('idle') // idle | loading | ready | error | disabled
  const [error, setError]     = useState('')
  const [fps, setFps]         = useState(0)
  const frameCountRef = useRef(0)
  const lastFpsTime   = useRef(Date.now())
  const mountedRef    = useRef(false)
  const destroyedRef  = useRef(false)

  // Accumulator để tính average
  const accumRef = useRef({ attention: [], smile: [], gazeX: [], gazeY: [], handCount: 0, frames: 0 })

  useEffect(() => {
    mountedRef.current = true
    destroyedRef.current = false
    if (!enabled) {
      setStatus('disabled')
      // Vẫn ghi data rỗng để game không bị null
      if (latestAIResult) {
        latestAIResult.current = {
          features: { gazeX: 0.5, gazeY: 0.5, avgAttention: 0.5, avgSmile: 0, handCount: 0 },
          timestamp: Date.now(),
        }
      }
      return
    }
    initMediaPipe()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [enabled])

  const cleanup = () => {
    destroyedRef.current = true
    if (cameraRef.current) {
      try { cameraRef.current.stop() } catch {}
      cameraRef.current = null
    }
    if (faceMeshRef.current) {
      try { faceMeshRef.current.close() } catch {}
      faceMeshRef.current = null
    }
    if (handsRef.current) {
      try { handsRef.current.close() } catch {}
      handsRef.current = null
    }
  }

  const initMediaPipe = async () => {
    setStatus('loading')
    try {
      // Load tất cả scripts song song
      await Promise.all([
        loadScript(MP_FACE_MESH_URL),
        loadScript(MP_HANDS_URL),
        loadScript(MP_CAMERA_URL),
        loadScript(MP_DRAWING_URL),
      ])

      // Khởi tạo FaceMesh
      const faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      })
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,  // Bật iris tracking (478 landmarks)
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      faceMesh.onResults(onFaceResults)
      faceMeshRef.current = faceMesh

      // Khởi tạo Hands
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      })
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      hands.onResults(onHandResults)
      handsRef.current = hands

      // Khởi tạo Camera
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (destroyedRef.current || !mountedRef.current) return
          const video = videoRef.current
          if (!video || !video.videoWidth || !video.videoHeight) return
          try {
            if (faceMeshRef.current) await faceMeshRef.current.send({ image: video })
            if (handsRef.current)    await handsRef.current.send({ image: video })
          } catch {
            // Swallow frame errors during unmount/transition between phases.
            return
          }

          // FPS counter
          frameCountRef.current++
          const now = Date.now()
          if (now - lastFpsTime.current >= 1000) {
            setFps(frameCountRef.current)
            frameCountRef.current = 0
            lastFpsTime.current = now
          }
        },
        width: 320, height: 240,
      })
      await camera.start()
      cameraRef.current = camera
      if (!destroyedRef.current && mountedRef.current) setStatus('ready')

    } catch (err) {
      console.error('MediaPipe init error:', err)
      if (!mountedRef.current) return
      setError(err.message || 'Không thể khởi động camera')
      setStatus('error')
      // Fallback: ghi data mặc định
      if (latestAIResult) {
        latestAIResult.current = {
          features: { gazeX: 0.5, gazeY: 0.5, avgAttention: 0.5, avgSmile: 0, handCount: 0 },
          timestamp: Date.now(),
        }
      }
    }
  }

  const handCountRef = useRef(0)

  const onHandResults = (results) => {
    handCountRef.current = results.multiHandLandmarks?.length || 0
  }

  const onFaceResults = (results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Vẽ video flip
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    const acc = accumRef.current
    acc.frames++

    if (results.multiFaceLandmarks?.[0]) {
      const lm = results.multiFaceLandmarks[0]

      // Gaze
      const gaze    = estimateGaze(lm)
      const smile   = estimateSmile(lm)
      const attn    = estimateAttention(lm)

      acc.gazeX.push(gaze.gazeX)
      acc.gazeY.push(gaze.gazeY)
      acc.smile.push(smile)
      acc.attention.push(attn)

      // Vẽ iris points (nhỏ, màu xanh)
      if (showPreview && lm[LEFT_EYE_CENTER] && lm[RIGHT_EYE_CENTER]) {
        ;[LEFT_EYE_CENTER, RIGHT_EYE_CENTER].forEach(idx => {
          const p = lm[idx]
          ctx.beginPath()
          ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 3, 0, Math.PI * 2)
          ctx.fillStyle = '#22d3ee'
          ctx.fill()
        })
      }

      // Vẽ attention indicator
      if (showPreview) {
        const color = attn > 0.7 ? '#22c55e' : attn > 0.4 ? '#eab308' : '#ef4444'
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
      }
    }

    // Ghi kết quả vào latestAIResult mỗi 10 frames (300ms @30fps)
    if (acc.frames >= 10) {
      const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5
      const features = {
        gazeX:        avg(acc.gazeX),
        gazeY:        avg(acc.gazeY),
        avgAttention: avg(acc.attention),
        avgSmile:     avg(acc.smile),
        handCount:    handCountRef.current,
        // Derived
        isLookingAtScreen: avg(acc.attention) > 0.4,
        isSmilingDetected: avg(acc.smile) > 0.3,
      }
      if (latestAIResult) {
        latestAIResult.current = { features, timestamp: Date.now() }
      }
      // Reset accumulator
      accumRef.current = { attention: [], smile: [], gazeX: [], gazeY: [], handCount: 0, frames: 0 }
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (!enabled) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 100,
      width: showPreview ? 160 : 0,
      height: showPreview ? 120 : 0,
      overflow: 'hidden',
    }}>
      {/* Video element (ẩn, chỉ dùng để feed vào MediaPipe) */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

      {/* Canvas preview */}
      {showPreview && (
        <div style={{ position: 'relative', width: 160, height: 120, borderRadius: 10, overflow: 'hidden', border: '2px solid #334155', background: '#0f172a' }}>
          <canvas ref={canvasRef} width={160} height={120} style={{ width: '100%', height: '100%' }} />

          {/* Status overlay */}
          {status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: '#60a5fa', fontSize: 10, textAlign: 'center' }}>⏳ Đang khởi động</div>
              <div style={{ color: '#64748b', fontSize: 9 }}>MediaPipe...</div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, padding: 8 }}>
              <div style={{ fontSize: 18 }}>📷</div>
              <div style={{ color: '#ef4444', fontSize: 9, textAlign: 'center' }}>Không có camera</div>
              <div style={{ color: '#64748b', fontSize: 8, textAlign: 'center' }}>Chế độ thủ công</div>
            </div>
          )}

          {/* FPS + status badge */}
          {status === 'ready' && (
            <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#94a3b8', fontSize: 9 }}>{fps}fps</span>
            </div>
          )}

          {/* Label */}
          <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 9, background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4 }}>
              🤖 AI Camera
            </span>
          </div>
        </div>
      )}

      {/* Canvas ẩn nếu không show preview nhưng vẫn cần process */}
      {!showPreview && (
        <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
      )}
    </div>
  )
}