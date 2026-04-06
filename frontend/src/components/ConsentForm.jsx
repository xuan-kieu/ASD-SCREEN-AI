/**
 * ConsentForm.jsx
 * Hiển thị trước mỗi phiên đánh giá — tuân thủ Nghị định 13/2023/NĐ-CP
 * Phụ huynh phải đọc và tích đủ các ô mới được bắt đầu
 */
import { useState } from 'react'

const CONSENT_VERSION = '1.0.0'
const CONSENT_DATE    = '2026-01-01'

export default function ConsentForm({ childName, onAccept, onDecline }) {
  const [scrolled, setScrolled] = useState(false)
  const [consents, setConsents] = useState({
    assessment:    false,
    dataStorage:   false,
    aiTraining:    false,
    disclaimer:    false,
    privacyPolicy: false,
  })

  const handleScroll = (e) => {
    const el = e.target
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true)
  }

  const toggle = (key) => setConsents(prev => ({ ...prev, [key]: !prev[key] }))

  const canProceed = scrolled && consents.assessment && consents.dataStorage &&
                     consents.disclaimer && consents.privacyPolicy

  const handleAccept = () => {
    if (!canProceed) return
    const record = {
      version: CONSENT_VERSION, date: CONSENT_DATE,
      accepted_at: new Date().toISOString(),
      child_name: childName, consents,
    }
    localStorage.setItem('last_consent', JSON.stringify(record))
    onAccept(record)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 14px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 30 }}>🔒</span>
            <div>
              <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 17, fontWeight: 700 }}>Đồng ý Thu thập & Sử dụng Dữ liệu</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
                Vui lòng đọc kỹ trước khi đánh giá cho <strong style={{ color: '#60a5fa' }}>{childName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '18px 28px' }}>

          <Sec icon="⚠️" title="Tuyên bố Miễn trừ Trách nhiệm Y tế" color="#f59e0b">
            <p style={T.p}>
              <strong>ASD-SCREEN AI</strong> là công cụ <strong>sàng lọc</strong>, <strong>không phải chẩn đoán lâm sàng</strong>.
              Kết quả <strong>không thể thay thế</strong> đánh giá của bác sĩ hoặc chuyên gia tâm lý có chuyên môn.
            </p>
            <ul style={T.ul}>
              <li><strong style={{ color: '#ef4444' }}>Âm tính giả:</strong> Hệ thống có thể bỏ sót trường hợp cần can thiệp. Nếu gia đình có lo ngại, hãy gặp chuyên gia bất kể kết quả.</li>
              <li><strong style={{ color: '#f59e0b' }}>Dương tính giả:</strong> Kết quả "nguy cơ cao" không có nghĩa trẻ chắc chắn có rối loạn. Cần đánh giá chuyên khoa để xác nhận.</li>
              <li>Độ chính xác phụ thuộc vào chất lượng môi trường, sự hợp tác của trẻ và nhiều yếu tố khác.</li>
              <li>Đơn vị phát triển <strong>không chịu trách nhiệm pháp lý</strong> đối với quyết định y tế dựa trên kết quả này.</li>
            </ul>
          </Sec>

          <Sec icon="📹" title="Dữ liệu được Thu thập" color="#3b82f6">
            <ul style={T.ul}>
              <li><strong>Video webcam</strong> — phân tích chuyển động mắt, biểu cảm, cử chỉ tay.</li>
              <li><strong>Âm thanh microphone</strong> — phân tích giọng nói và phát hiện tiếng ồn môi trường.</li>
              <li><strong>Dữ liệu tương tác</strong> — thời gian phản ứng, vị trí chạm màn hình.</li>
              <li><strong>Thông tin cơ bản</strong> — tên (có thể dùng biệt danh), ngày sinh, khu vực.</li>
            </ul>
            <div style={{ background: '#1e3a5f', borderRadius: 8, padding: '10px 14px', marginTop: 6 }}>
              <p style={{ margin: 0, color: '#93c5fd', fontSize: 13 }}>
                🔐 Dữ liệu mã hóa <strong>AES-256</strong>. Video gốc lưu tối đa <strong>90 ngày</strong> rồi tự động xóa.
              </p>
            </div>
          </Sec>

          <Sec icon="👤" title="Quyền của Người Giám hộ (NĐ 13/2023/NĐ-CP)" color="#22c55e">
            <ul style={T.ul}>
              <li><strong>Quyền truy cập:</strong> Xem toàn bộ dữ liệu đang lưu về con bạn.</li>
              <li><strong>Quyền xóa:</strong> Yêu cầu xóa toàn bộ dữ liệu bất kỳ lúc nào.</li>
              <li><strong>Quyền rút lại:</strong> Thu hồi sự đồng ý và dừng thu thập dữ liệu.</li>
              <li><strong>Quyền phản đối:</strong> Từ chối dùng dữ liệu huấn luyện AI mà không ảnh hưởng kết quả đánh giá.</li>
            </ul>
          </Sec>

          <Sec icon="🏠" title="Hướng dẫn Môi trường Đánh giá" color="#8b5cf6">
            <ul style={T.ul}>
              <li>Phòng <strong>yên tĩnh</strong> — tắt tivi, radio.</li>
              <li><strong>Đủ ánh sáng</strong> — tránh ngồi ngược sáng cửa sổ.</li>
              <li>Phụ huynh ngồi <strong>phía sau</strong> — không nhắc nhở, không chỉ tay hộ.</li>
              <li>Camera ngang <strong>tầm mắt</strong> trẻ, cách 40–60cm.</li>
            </ul>
            <div style={{ background: '#2e1065', borderRadius: 8, padding: '10px 14px', marginTop: 6 }}>
              <p style={{ margin: 0, color: '#c4b5fd', fontSize: 13 }}>
                ⚠️ Nếu phụ huynh can thiệp, AI sẽ phát hiện và đánh dấu phiên là <strong>"có can thiệp"</strong> — kết quả kém tin cậy hơn.
              </p>
            </div>
          </Sec>

          {!scrolled && (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              ↓ Cuộn xuống hết để mở khóa các ô đồng ý
            </p>
          )}
        </div>

        {/* Checkboxes + Buttons */}
        <div style={{ padding: '14px 28px 20px', borderTop: '1px solid #1e293b', background: '#080d17', borderRadius: '0 0 20px 20px' }}>
          {[
            { key: 'assessment',    req: true,  text: 'Tôi đồng ý cho thu thập video, âm thanh và dữ liệu tương tác của con tôi cho mục đích đánh giá phát triển.' },
            { key: 'dataStorage',   req: true,  text: 'Tôi đồng ý lưu trữ dữ liệu tối đa 90 ngày theo chính sách bảo mật.' },
            { key: 'disclaimer',    req: true,  text: 'Tôi hiểu đây là công cụ sàng lọc, KHÔNG phải chẩn đoán y tế, và không thay thế ý kiến chuyên gia.' },
            { key: 'privacyPolicy', req: true,  text: 'Tôi đồng ý với Chính sách Bảo mật và các quyền của tôi theo Nghị định 13/2023/NĐ-CP.' },
            { key: 'aiTraining',    req: false, text: '(Tuỳ chọn) Cho phép dữ liệu đã làm mờ khuôn mặt/giọng nói dùng để cải thiện AI, giúp đỡ các trẻ khác.' },
          ].map(item => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9, cursor: scrolled ? 'pointer' : 'not-allowed', opacity: scrolled ? 1 : 0.4 }}>
              <input type="checkbox" checked={consents[item.key]} onChange={() => scrolled && toggle(item.key)}
                disabled={!scrolled}
                style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: '#3b82f6' }} />
              <span style={{ fontSize: 12.5, color: item.req ? '#cbd5e1' : '#64748b', lineHeight: 1.5 }}>
                {item.req && <span style={{ color: '#ef4444' }}>* </span>}
                {item.text}
              </span>
            </label>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={onDecline} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #334155', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              ← Từ chối
            </button>
            <button onClick={handleAccept} disabled={!canProceed} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed', background: canProceed ? '#3b82f6' : '#1e293b', color: canProceed ? '#fff' : '#475569', transition: 'all 0.2s' }}>
              {!scrolled ? '⬇ Cuộn hết để tiếp tục'
                : !canProceed ? '☑ Tích đủ ô bắt buộc (*)'
                : '✅ Đồng ý & Bắt đầu đánh giá'}
            </button>
          </div>

          <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 11, marginTop: 8, marginBottom: 0 }}>
            Phiên bản {CONSENT_VERSION} • {CONSENT_DATE}
          </p>
        </div>
      </div>
    </div>
  )
}

function Sec({ icon, title, color, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <h3 style={{ margin: 0, color, fontSize: 14, fontWeight: 700 }}>{title}</h3>
      </div>
      <div style={{ paddingLeft: 25 }}>{children}</div>
    </div>
  )
}

const T = {
  p:  { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' },
  ul: { color: '#94a3b8', fontSize: 13, lineHeight: 1.8, paddingLeft: 16, margin: '0 0 6px' },
}