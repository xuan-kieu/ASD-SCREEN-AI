/**
 * MChatScreen.jsx — M-CHAT-R/F Tiếng Việt
 * © 2009 Diana Robins, Deborah Fein, & Marianne Barton
 * Dịch: CCIHP, hiệu đính: Nguyễn Thị Nhã Trang, 6/2015
 *
 * Props:
 *   childName   — tên trẻ
 *   childId     — id trẻ (để lưu kết quả)
 *   onComplete  — callback(result) khi xong
 *   onClose     — callback khi đóng
 */
import { useState } from 'react'
import api from '../api/axios'

// ── Dữ liệu 20 câu M-CHAT-R ─────────────────────────────────────────────────
// riskAnswer: câu trả lời CHỈ RA nguy cơ (true = Có là nguy cơ, false = Không là nguy cơ)
const QUESTIONS = [
  { id: 1,  riskAnswer: false, text: 'Nếu bạn chỉ vào một điểm trong phòng, con bạn có nhìn theo không?', example: 'VD: nếu bạn chỉ vào đồ chơi hay con vật, con bạn có nhìn vào đó không?' },
  { id: 2,  riskAnswer: true,  text: 'Bạn có bao giờ tự hỏi liệu con bạn có bị điếc không?', example: '' },
  { id: 3,  riskAnswer: false, text: 'Con bạn có chơi trò chơi tưởng tượng hoặc giả vờ không?', example: 'VD: giả vờ uống nước từ cốc rỗng, giả vờ nói chuyện điện thoại, hay giả vờ cho búp bê ăn?' },
  { id: 4,  riskAnswer: false, text: 'Con bạn có thích leo trèo lên đồ vật không?', example: 'VD: trèo lên đồ đạc, đồ chơi ngoài trời, hoặc leo cầu thang?' },
  { id: 5,  riskAnswer: true,  text: 'Con bạn có làm các chuyển động ngón tay bất thường gần mắt không?', example: 'VD: vẫy/đưa qua lại ngón tay gần mắt?' },
  { id: 6,  riskAnswer: false, text: 'Con bạn có dùng ngón tay trỏ để yêu cầu việc gì đó hoặc muốn được giúp đỡ không?', example: 'VD: chỉ vào bim bim hoặc đồ chơi ngoài tầm với?' },
  { id: 7,  riskAnswer: false, text: 'Con bạn có dùng ngón tay để chỉ cho bạn thứ gì đó thú vị không?', example: 'VD: chỉ vào máy bay trên trời hoặc xe tải lớn trên đường?' },
  { id: 8,  riskAnswer: false, text: 'Con bạn có thích chơi với những trẻ khác không?', example: 'VD: quan sát trẻ khác, cười với chúng hoặc tới chơi cùng?' },
  { id: 9,  riskAnswer: false, text: 'Con bạn có khoe bạn những đồ vật bằng cách mang đến cho bạn xem không?', example: 'VD: khoe bông hoa, thú bông, hoặc xe đồ chơi — không phải để được giúp, chỉ để chia sẻ?' },
  { id: 10, riskAnswer: false, text: 'Con bạn có đáp lại khi được gọi tên không?', example: 'VD: ngước tìm người gọi, nói chuyện/bập bẹ, hoặc ngừng việc đang làm khi được gọi tên?' },
  { id: 11, riskAnswer: false, text: 'Khi bạn cười với con, con có cười lại với bạn không?', example: '' },
  { id: 12, riskAnswer: true,  text: 'Con bạn có cảm thấy khó chịu bởi tiếng ồn xung quanh không?', example: 'VD: hét lên hay khóc khi nghe máy hút bụi hoặc nhạc to?' },
  { id: 13, riskAnswer: false, text: 'Con bạn có đi bộ không?', example: '' },
  { id: 14, riskAnswer: false, text: 'Con bạn có nhìn vào mắt bạn khi bạn nói chuyện, chơi cùng hoặc mặc quần áo cho bé không?', example: '' },
  { id: 15, riskAnswer: false, text: 'Con bạn có bắt chước những điều bạn làm không?', example: 'VD: vẫy tay bye bye, vỗ tay, hoặc tạo âm thanh vui vẻ khi bạn làm?' },
  { id: 16, riskAnswer: false, text: 'Nếu bạn quay đầu nhìn gì đó, con bạn có nhìn xung quanh để xem bạn đang nhìn cái gì không?', example: '' },
  { id: 17, riskAnswer: false, text: 'Con bạn có cố gắng gây sự chú ý để bạn phải nhìn vào bé không?', example: 'VD: nhìn bạn để được khen ngợi, hoặc nói "nhìn" hoặc "nhìn con"?' },
  { id: 18, riskAnswer: false, text: 'Con bạn có hiểu bạn nói gì khi yêu cầu con làm không?', example: 'VD: không chỉ tay mà con vẫn hiểu "để sách lên ghế" hoặc "đưa mẹ/bố cái chăn"?' },
  { id: 19, riskAnswer: false, text: 'Nếu có điều gì mới lạ, con bạn có nhìn bạn để xem bạn cảm thấy thế nào không?', example: 'VD: nghe âm thanh lạ hoặc thấy đồ chơi mới, con có nhìn bạn không?' },
  { id: 20, riskAnswer: false, text: 'Con bạn có thích những hoạt động mang tính chuyển động không?', example: 'VD: được lắc lư hoặc nâng lên hạ xuống trên đầu gối bạn?' },
]

// ── Câu hỏi Follow-up (chỉ hỏi các câu bị FAIL ở phần R) ────────────────────
// logic: mô tả cách đánh giá ĐẠT/KHÔNG ĐẠT theo sơ đồ PDF
const FOLLOWUP = {
  1: {
    intro: 'Nếu bạn chỉ vào một điểm, [tên] có nhìn theo không?',
    subQuestions: [
      { text: 'Nhìn vào đồ vật', pass: true },
      { text: 'Chỉ vào đồ vật', pass: true },
      { text: 'Nhìn và nhận xét về đồ vật', pass: true },
      { text: 'Không phản ứng / lờ cha mẹ đi', pass: false },
      { text: 'Nhìn xung quanh phòng ngẫu nhiên', pass: false },
      { text: 'Nhìn vào ngón tay của cha mẹ', pass: false },
    ],
    passRule: 'Có ÍT NHẤT 1 phản ứng ĐẠT và phần lớn thời gian làm giống ví dụ ĐẠT',
  },
  2: {
    intro: 'Con có lờ âm thanh không? Con có lờ người khác không?',
    subQuestions: [
      { text: 'Lờ âm thanh', pass: false },
      { text: 'Lờ người khác', pass: false },
    ],
    passRule: 'ĐẠT nếu KHÔNG có cả 2. KHÔNG ĐẠT nếu có 1 trong 2.',
  },
  3: {
    intro: '[Tên] có chơi trò giả vờ không?',
    subQuestions: [
      { text: 'Giả vờ uống từ cốc đồ chơi', pass: true },
      { text: 'Giả vờ ăn từ thìa/dĩa đồ chơi', pass: true },
      { text: 'Giả vờ nói chuyện điện thoại', pass: true },
      { text: 'Giả vờ cho búp bê / thú nhồi bông ăn', pass: true },
      { text: 'Đẩy xe như thể đang đi trên đường giả vờ', pass: true },
      { text: 'Giả vờ là robot, máy bay, nhân vật yêu thích', pass: true },
      { text: 'Giả vờ nấu ăn, hút bụi, quét nhà', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào',
  },
  4: {
    intro: '[Tên] có thích leo trèo không?',
    subQuestions: [
      { text: 'Leo cầu thang', pass: true },
      { text: 'Leo ghế', pass: true },
      { text: 'Leo đồ đạc trong nhà', pass: true },
      { text: 'Leo thiết bị sân chơi ngoài trời', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào',
  },
  5: {
    intro: '[Tên] có làm chuyển động ngón tay bất thường gần mắt không?',
    subQuestions: [
      { text: 'Ngọ nguậy ngón tay gần mắt', pass: false },
      { text: 'Giữ bàn tay gần mắt hoặc cạnh bên mắt', pass: false },
      { text: 'Vỗ tay gần mặt', pass: false },
      { text: 'Nhìn vào bàn tay (bình thường)', pass: true },
      { text: 'Chuyển động ngón tay khi chơi ú tìm (bình thường)', pass: true },
    ],
    passRule: 'KHÔNG ĐẠT nếu có hành vi bất thường VÀ xảy ra hơn 2 lần/tuần',
  },
  6: {
    intro: 'Khi muốn thứ gì ngoài tầm với, [tên] làm gì?',
    subQuestions: [
      { text: 'Với bằng cả tay', pass: true },
      { text: 'Dẫn cha mẹ đến đồ vật', pass: true },
      { text: 'Cố tự lấy', pass: true },
      { text: 'Yêu cầu bằng từ ngữ hoặc âm thanh', pass: true },
      { text: 'Chỉ vào khi được bảo "Chỉ cho mẹ/bố xem nào"', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào',
  },
  7: {
    intro: '[Tên] có dùng ngón tay chỉ cho thấy thứ thú vị không (không phải để xin)?',
    subQuestions: [
      { text: 'Chỉ vào máy bay trên trời', pass: true },
      { text: 'Chỉ vào xe tải trên đường', pass: true },
      { text: 'Chỉ vào con bọ dưới đất', pass: true },
      { text: 'Chỉ vào con vật trong sân', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ và dùng 1 ngón tay để thể hiện sự thích thú (không phải để xin giúp đỡ)',
  },
  8: {
    intro: '[Tên] có hứng thú với trẻ khác không?',
    subQuestions: [
      { text: 'Chơi cùng trẻ khác', pass: true },
      { text: 'Nói chuyện / bập bẹ với trẻ khác', pass: true },
      { text: 'Quan sát / nhìn trẻ khác', pass: true },
      { text: 'Cười với trẻ khác', pass: true },
      { text: 'Hào hứng khi gặp trẻ khác', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ và phản ứng hơn nửa thời gian chơi cùng',
  },
  9: {
    intro: '[Tên] có khoe đồ vật với bạn (chỉ để chia sẻ, không phải xin giúp) không?',
    subQuestions: [
      { text: 'Mang tranh/ảnh/đồ chơi tới khoe', pass: true },
      { text: 'Mang bức tranh vừa vẽ', pass: true },
      { text: 'Mang bông hoa vừa hái', pass: true },
      { text: 'Mang con bọ tìm thấy', pass: true },
      { text: 'Mang khối hình vừa xếp', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ và hành động đó chỉ để khoe, không để xin giúp',
  },
  10: {
    intro: '[Tên] phản ứng thế nào khi được gọi tên?',
    subQuestions: [
      { text: 'Tìm kiếm người gọi (ĐẠT)', pass: true },
      { text: 'Nói hoặc bập bẹ (ĐẠT)', pass: true },
      { text: 'Ngừng việc đang làm (ĐẠT)', pass: true },
      { text: 'Không phản ứng / lờ đi (KHÔNG ĐẠT)', pass: false },
      { text: 'Chỉ phản ứng khi đứng trước mặt (KHÔNG ĐẠT)', pass: false },
      { text: 'Chỉ phản ứng khi chạm vào (KHÔNG ĐẠT)', pass: false },
    ],
    passRule: 'ĐẠT nếu phần lớn làm theo nhóm ĐẠT',
  },
  11: {
    intro: 'Khi bạn cười, [tên] có cười lại không?',
    subQuestions: [
      { text: 'Cười khi cha mẹ cười (ĐẠT)', pass: true },
      { text: 'Cười khi cha mẹ vào phòng (ĐẠT)', pass: true },
      { text: 'Cười khi cha mẹ đi xa về (ĐẠT)', pass: true },
      { text: 'Cười vu vơ / không cụ thể (KHÔNG ĐẠT)', pass: false },
      { text: 'Chỉ cười với đồ chơi (KHÔNG ĐẠT)', pass: false },
    ],
    passRule: 'ĐẠT nếu phần lớn là ví dụ ĐẠT',
  },
  12: {
    intro: '[Tên] có khó chịu với tiếng ồn nào không?',
    subQuestions: [
      { text: 'Máy giặt', pass: false },
      { text: 'Máy hút bụi', pass: false },
      { text: 'Máy sấy tóc', pass: false },
      { text: 'Nhạc to', pass: false },
      { text: 'Trẻ khóc / hò hét', pass: false },
      { text: 'Bình tĩnh che tai (ĐẠT)', pass: true },
      { text: 'Nói không thích tiếng ồn (ĐẠT)', pass: true },
    ],
    passRule: 'KHÔNG ĐẠT nếu khó chịu với 2+ tiếng ồn VÀ phản ứng tiêu cực (la hét/khóc)',
  },
  13: {
    intro: '[Tên] có đi bộ không?',
    subQuestions: [
      { text: 'Đi bộ không cần nắm/giữ thứ gì', pass: true },
    ],
    passRule: 'ĐẠT nếu đi bộ độc lập',
  },
  14: {
    intro: '[Tên] có nhìn vào mắt bạn không?',
    subQuestions: [
      { text: 'Nhìn vào mắt khi cần thứ gì', pass: true },
      { text: 'Nhìn vào mắt khi đang chơi cùng', pass: true },
      { text: 'Nhìn vào mắt khi cho ăn', pass: true },
      { text: 'Nhìn vào mắt khi thay tã / mặc quần áo', pass: true },
      { text: 'Nhìn vào mắt khi đọc truyện', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ từ 2 câu trở lên, hoặc nhìn vào mắt ít nhất 5 lần/ngày',
  },
  15: {
    intro: '[Tên] có bắt chước bạn không?',
    subQuestions: [
      { text: 'Lè lưỡi', pass: true },
      { text: 'Tạo tiếng động vui tai', pass: true },
      { text: 'Vẫy tay bye bye', pass: true },
      { text: 'Vỗ tay', pass: true },
      { text: 'Đặt ngón tay lên môi "suỵt"', pass: true },
      { text: 'Hôn gió', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ từ 2 câu trở lên',
  },
  16: {
    intro: 'Khi bạn quay đầu nhìn thứ gì, [tên] làm gì?',
    subQuestions: [
      { text: 'Nhìn theo hướng bạn đang nhìn (ĐẠT)', pass: true },
      { text: 'Chỉ vào vật bạn đang nhìn (ĐẠT)', pass: true },
      { text: 'Lờ bạn đi (KHÔNG ĐẠT)', pass: false },
      { text: 'Chỉ nhìn vào mặt bạn (KHÔNG ĐẠT)', pass: false },
    ],
    passRule: 'ĐẠT nếu phần lớn làm theo nhóm ĐẠT',
  },
  17: {
    intro: '[Tên] có cố gắng gây chú ý để bạn nhìn vào bé không?',
    subQuestions: [
      { text: 'Nói "Mẹ nhìn này!" hoặc "Nhìn con!"', pass: true },
      { text: 'Bập bẹ / gây tiếng động để kéo chú ý', pass: true },
      { text: 'Nhìn bạn để được khen / nhận xét', pass: true },
      { text: 'Cứ nhìn để xem bạn có đang nhìn con không', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào',
  },
  18: {
    intro: '[Tên] có hiểu yêu cầu không cần dùng cử chỉ không?',
    subQuestions: [
      { text: '"Cho mẹ xem giầy" (không chỉ tay) — con chỉ vào giầy', pass: true },
      { text: '"Lấy cho mẹ cái chăn" (không chỉ) — con lấy được', pass: true },
      { text: '"Để sách lên ghế" (không chỉ) — con làm được', pass: true },
      { text: 'Chỉ hiểu khi có gợi ý / cử chỉ kèm theo', pass: false },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào (hiểu được 1 yêu cầu đơn giản không cần cử chỉ)',
  },
  19: {
    intro: 'Khi có điều mới lạ, [tên] có nhìn bạn để xem bạn cảm thấy thế nào không?',
    subQuestions: [
      { text: 'Nhìn mặt cha/mẹ trước khi phản ứng với âm thanh lạ', pass: true },
      { text: 'Nhìn cha/mẹ khi gặp người mới', pass: true },
      { text: 'Nhìn cha/mẹ khi tiếp xúc vật lạ/đáng sợ', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ câu nào',
  },
  20: {
    intro: '[Tên] có thích hoạt động chuyển động không?',
    subQuestions: [
      { text: 'Thích được tung lên / đung đưa', pass: true },
      { text: 'Cười / mỉm cười khi được đung đưa', pass: true },
      { text: 'Bập bẹ / nói chuyện khi được đung đưa', pass: true },
      { text: 'Đòi chơi thêm (đưa tay ra)', pass: true },
    ],
    passRule: 'ĐẠT nếu CÓ với bất cứ ví dụ cụ thể nào',
  },
}

// ── Helper: tính điểm M-CHAT-R ───────────────────────────────────────────────
function calcRScore(answers) {
  // answers = { 1: true/false, 2: true/false, ... } (true = Có, false = Không)
  let score = 0
  QUESTIONS.forEach(q => {
    const ans = answers[q.id]
    if (ans === undefined) return
    if (q.riskAnswer === true  && ans === true)  score++ // Câu 2,5,12: Có = nguy cơ
    if (q.riskAnswer === false && ans === false) score++ // Còn lại: Không = nguy cơ
  })
  return score
}

// Câu nào bị fail (có nguy cơ) để hỏi Follow-up
function getFailedItems(answers) {
  return QUESTIONS.filter(q => {
    const ans = answers[q.id]
    if (ans === undefined) return false
    return (q.riskAnswer === true && ans === true) || (q.riskAnswer === false && ans === false)
  }).map(q => q.id)
}

// ── PHASE constants ───────────────────────────────────────────────────────────
const PHASE = { INTRO: 'intro', PART_R: 'part_r', RESULT_R: 'result_r', PART_F: 'part_f', RESULT_F: 'result_f' }

export default function MChatScreen({ childName, childId, onComplete, onClose }) {
  const name = childName || 'Con bạn'
  const [phase, setPhase]       = useState(PHASE.INTRO)
  const [current, setCurrent]   = useState(0)       // index câu hiện tại (phần R)
  const [answers, setAnswers]   = useState({})       // { 1: true/false, ... }
  const [rScore, setRScore]     = useState(0)
  const [failedItems, setFailedItems] = useState([]) // danh sách id câu bị fail
  const [fuIndex, setFuIndex]   = useState(0)        // index trong failedItems (phần F)
  const [fuAnswers, setFuAnswers] = useState({})      // { qId: { subId: bool, ... } }
  const [fuResults, setFuResults] = useState({})     // { qId: 'pass'/'fail' }
  const [saving, setSaving]     = useState(false)

  const q = QUESTIONS[current]

  // ── Phần R: chọn Có/Không ────────────────────────────────────────────────
  const handleAnswer = (yes) => {
    const newAnswers = { ...answers, [q.id]: yes }
    setAnswers(newAnswers)
    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1)
    } else {
      // Xong phần R
      const score = calcRScore(newAnswers)
      const failed = getFailedItems(newAnswers)
      setRScore(score)
      setFailedItems(failed)
      setPhase(PHASE.RESULT_R)
    }
  }

  const handleBack = () => {
    if (current > 0) setCurrent(current - 1)
  }

  // ── Quyết định sau Result R ───────────────────────────────────────────────
  const handleAfterR = () => {
    if (rScore >= 8) {
      // Nguy cơ cao → kết thúc ngay
      saveAndFinish('high', rScore, {})
    } else if (rScore >= 3) {
      // Trung bình → làm Follow-up với các câu bị fail
      setFuIndex(0)
      setPhase(PHASE.PART_F)
    } else {
      // Thấp
      saveAndFinish('low', rScore, {})
    }
  }

  // ── Phần F: đánh giá từng câu bị fail ────────────────────────────────────
  const currentFuId  = failedItems[fuIndex]
  const currentFu    = FOLLOWUP[currentFuId]
  const currentFuSub = fuAnswers[currentFuId] || {}

  const handleFuSub = (subIdx, val) => {
    setFuAnswers(prev => ({
      ...prev,
      [currentFuId]: { ...currentFuSub, [subIdx]: val }
    }))
  }

  const handleFuNext = (passOverride) => {
    // passOverride: boolean từ nút ĐẠT/KHÔNG ĐẠT của giám sát viên
    const newResults = { ...fuResults, [currentFuId]: passOverride ? 'pass' : 'fail' }
    setFuResults(newResults)
    if (fuIndex < failedItems.length - 1) {
      setFuIndex(fuIndex + 1)
    } else {
      // Xong Follow-up
      const failCount = Object.values(newResults).filter(r => r === 'fail').length
      const risk = failCount >= 2 ? 'high' : 'low'
      saveAndFinish(risk, rScore, newResults)
      setPhase(PHASE.RESULT_F)
    }
  }

  // ── Lưu kết quả ──────────────────────────────────────────────────────────
  const saveAndFinish = async (riskLevel, score, fuRes) => {
    setSaving(true)
    const failF = Object.values(fuRes).filter(r => r === 'fail').length
    const result = {
      child_id:    childId,
      r_score:     score,
      risk_level:  riskLevel,
      answers_r:   answers,
      failed_items: failedItems,
      followup_results: fuRes,
      followup_fail_count: failF,
    }
    try {
      await api.post('/mchat/results', result)
    } catch (e) {
      // Không có API thì vẫn trả về kết quả cho UI
    }
    setSaving(false)
    onComplete?.(result)
  }

  const riskLabel = rScore <= 2 ? { text: 'NGUY CƠ THẤP', color: '#22c55e', bg: '#14532d', border: '#166534' }
    : rScore <= 7 ? { text: 'NGUY CƠ TRUNG BÌNH', color: '#fbbf24', bg: '#451a03', border: '#92400e' }
    : { text: 'NGUY CƠ CAO', color: '#ef4444', bg: '#450a0a', border: '#7f1d1d' }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.closeBtn} onClick={onClose}>✕</div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={S.title}>Bảng sàng lọc M-CHAT-R/F</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8, textAlign: 'center' }}>
          Dành cho trẻ 16–30 tháng tuổi
        </p>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
          © 2009 Robins, Fein & Barton — Dịch: CCIHP 2015
        </p>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: '#e2e8f0' }}>Hướng dẫn:</strong> Trả lời dựa trên hành vi <strong>thường xuyên</strong> của trẻ.
          Nếu thấy hành vi đó vài lần nhưng không thường xuyên, hãy trả lời <strong>Không</strong>.
          Bảng gồm <strong>20 câu hỏi</strong>, hoàn thành trong khoảng 2 phút.
        </div>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 16px', marginBottom: 24, color: '#60a5fa', fontSize: 13 }}>
          👶 Trẻ: <strong>{name}</strong>
        </div>
        <button onClick={() => setPhase(PHASE.PART_R)} style={S.btnGreen}>
          ▶ Bắt đầu
        </button>
      </div>
    </div>
  )

  // ── PHẦN R ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.PART_R) return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 560 }}>
        <div style={S.closeBtn} onClick={onClose}>✕</div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, width: '100%' }}>
          <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>Câu {current + 1}/20</span>
          <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${((current + 1) / 20) * 100}%`, background: '#3b82f6', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>{Math.round(((current + 1) / 20) * 100)}%</span>
        </div>

        {/* Câu hỏi */}
        <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px 24px', marginBottom: 16, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>CÂU {q.id}</div>
          <p style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: q.example ? 12 : 0 }}>
            {q.text.replace('[tên]', name)}
          </p>
          {q.example && (
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, fontStyle: 'italic' }}>
              {q.example}
            </p>
          )}
        </div>

        {/* Nút trả lời */}
        <div style={{ display: 'flex', gap: 12, width: '100%', marginBottom: 16 }}>
          <button onClick={() => handleAnswer(true)}
            style={{ ...S.answerBtn, background: '#166534', border: '2px solid #22c55e', color: '#22c55e' }}>
            <span style={{ fontSize: 24 }}>✓</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>CÓ</span>
          </button>
          <button onClick={() => handleAnswer(false)}
            style={{ ...S.answerBtn, background: '#450a0a', border: '2px solid #ef4444', color: '#ef4444' }}>
            <span style={{ fontSize: 24 }}>✗</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>KHÔNG</span>
          </button>
        </div>

        {/* Nút Back */}
        {current > 0 && (
          <button onClick={handleBack} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            ← Câu trước
          </button>
        )}

        {/* Dots indicator */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, maxWidth: 400 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: answers[i + 1] !== undefined ? '#3b82f6' : i === current ? '#fbbf24' : '#1e293b',
              border: i === current ? '2px solid #fbbf24' : '2px solid transparent',
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ── KẾT QUẢ PHẦN R ─────────────────────────────────────────────────────────
  if (phase === PHASE.RESULT_R) return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.closeBtn} onClick={onClose}>✕</div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <h2 style={S.title}>Kết quả M-CHAT-R</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>👶 {name}</p>

        {/* Score */}
        <div style={{ background: riskLabel.bg, border: `2px solid ${riskLabel.border}`, borderRadius: 16, padding: '20px 32px', marginBottom: 20, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: riskLabel.color, marginBottom: 4 }}>{rScore}</div>
          <div style={{ color: riskLabel.color, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{riskLabel.text}</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {rScore <= 2 && 'Tổng điểm 0-2: Chưa cần hành động. Tái khám sau 24 tháng nếu trẻ dưới 24 tháng.'}
            {rScore >= 3 && rScore <= 7 && `Tổng điểm 3-7: Cần làm thêm phần Follow-up (${failedItems.length} câu) để đánh giá chính xác hơn.`}
            {rScore >= 8 && 'Tổng điểm 8-20: Nguy cơ cao — Cần giới thiệu trẻ đi đánh giá chẩn đoán ngay.'}
          </div>
        </div>

        {/* Các câu bị fail */}
        {failedItems.length > 0 && (
          <div style={{ width: '100%', marginBottom: 20 }}>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Các câu có dấu hiệu nguy cơ ({failedItems.length} câu):</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {failedItems.map(id => (
                <span key={id} style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '3px 10px', color: '#fca5a5', fontSize: 12 }}>
                  Câu {id}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleAfterR} disabled={saving} style={{ ...S.btnBlue, width: '100%' }}>
          {saving ? '⏳ Đang lưu...'
            : rScore >= 8 ? '✅ Xem kết quả cuối'
            : rScore >= 3 ? `▶ Tiếp tục Follow-up (${failedItems.length} câu)`
            : '✅ Hoàn thành'}
        </button>
      </div>
    </div>
  )

  // ── PHẦN F (Follow-up) ──────────────────────────────────────────────────────
  if (phase === PHASE.PART_F && currentFu) return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 580 }}>
        <div style={S.closeBtn} onClick={onClose}>✕</div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%' }}>
          <span style={{ background: '#fbbf24', color: '#000', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>FOLLOW-UP</span>
          <span style={{ color: '#64748b', fontSize: 13 }}>Câu {fuIndex + 1}/{failedItems.length} — Câu gốc #{currentFuId}</span>
          <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, marginLeft: 8 }}>
            <div style={{ height: '100%', width: `${((fuIndex + 1) / failedItems.length) * 100}%`, background: '#fbbf24', borderRadius: 2 }} />
          </div>
        </div>

        {/* Câu hỏi follow-up */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', marginBottom: 16, width: '100%', boxSizing: 'border-box' }}>
          <p style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            {currentFu.intro.replace('[tên]', name)}
          </p>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10, fontStyle: 'italic' }}>
            Tiêu chí: {currentFu.passRule}
          </div>

          {/* Sub-questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentFu.subQuestions.map((sub, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, background: '#0f172a',
                border: `1px solid ${currentFuSub[idx] === true ? '#166534' : currentFuSub[idx] === false ? '#7f1d1d' : '#334155'}`
              }}>
                <span style={{ color: sub.pass ? '#4ade80' : '#fca5a5', fontSize: 13 }}>
                  {sub.pass ? '✓' : '✗'} {sub.text}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleFuSub(idx, true)}
                    style={{ padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: currentFuSub[idx] === true ? '#166534' : '#1e293b', color: currentFuSub[idx] === true ? '#fff' : '#64748b' }}>
                    Có
                  </button>
                  <button onClick={() => handleFuSub(idx, false)}
                    style={{ padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: currentFuSub[idx] === false ? '#7f1d1d' : '#1e293b', color: currentFuSub[idx] === false ? '#fff' : '#64748b' }}>
                    Không
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nút đánh giá cuối */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={() => handleFuNext(true)}
            style={{ flex: 1, padding: '12px', background: '#166534', border: '2px solid #22c55e', color: '#22c55e', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            ✅ ĐẠT
          </button>
          <button onClick={() => handleFuNext(false)}
            style={{ flex: 1, padding: '12px', background: '#450a0a', border: '2px solid #ef4444', color: '#ef4444', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            ❌ KHÔNG ĐẠT
          </button>
        </div>
        <p style={{ color: '#475569', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          Giám sát viên đánh giá dựa trên câu trả lời của phụ huynh và tiêu chí ở trên
        </p>
      </div>
    </div>
  )

  // ── KẾT QUẢ CUỐI (sau Follow-up) ───────────────────────────────────────────
  if (phase === PHASE.RESULT_F) {
    const failF = Object.values(fuResults).filter(r => r === 'fail').length
    const finalRisk = failF >= 2 ? 'high' : 'low'
    const finalLabel = finalRisk === 'high'
      ? { text: 'DƯƠNG TÍNH', sub: 'Cần giới thiệu đánh giá chẩn đoán và can thiệp sớm càng sớm càng tốt.', color: '#ef4444', bg: '#450a0a', border: '#7f1d1d' }
      : { text: 'ÂM TÍNH', sub: 'Không cần hành động. Tiếp tục theo dõi trong các lần khám tiếp theo.', color: '#22c55e', bg: '#14532d', border: '#166534' }

    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.closeBtn} onClick={onClose}>✕</div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{finalRisk === 'high' ? '⚠️' : '✅'}</div>
          <h2 style={S.title}>Kết quả M-CHAT-R/F</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>👶 {name}</p>

          <div style={{ background: finalLabel.bg, border: `2px solid ${finalLabel.border}`, borderRadius: 16, padding: '20px 32px', marginBottom: 20, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ color: finalLabel.color, fontWeight: 900, fontSize: 24, marginBottom: 8 }}>{finalLabel.text}</div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{finalLabel.sub}</div>
          </div>

          {/* Tóm tắt */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Điểm M-CHAT-R</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{rScore}/20</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Câu Follow-up không đạt</span>
              <span style={{ color: failF >= 2 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{failF}/{failedItems.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Kết luận</span>
              <span style={{ color: finalLabel.color, fontWeight: 700 }}>{finalLabel.text}</span>
            </div>
          </div>

          <button onClick={() => onComplete?.({ risk_level: finalRisk, r_score: rScore, followup_fail_count: failF })}
            style={{ ...S.btnBlue, width: '100%' }}>
            ✅ Xong — Quay về
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 20,
    padding: '32px 28px', width: '100%', maxWidth: 480, maxHeight: '90vh',
    overflowY: 'auto', position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, color: '#475569', cursor: 'pointer',
    fontSize: 18, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', background: '#1e293b',
  },
  title: { color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: 'center' },
  answerBtn: {
    flex: 1, padding: '18px 0', borderRadius: 12, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'transform 0.1s',
  },
  btnGreen: { padding: '12px 32px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 },
  btnBlue:  { padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 },
}