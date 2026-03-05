import { useState } from 'react'

const ITEMS = [
  { id: 'apple', emoji: '🍎', name: 'Táo', price: 5 },
  { id: 'banana', emoji: '🍌', name: 'Chuối', price: 3 },
  { id: 'milk', emoji: '🥛', name: 'Sữa', price: 8 },
  { id: 'bread', emoji: '🍞', name: 'Bánh mì', price: 6 },
  { id: 'cookie', emoji: '🍪', name: 'Bánh quy', price: 4 },
]

export default function G4_3_CuaHangTiHon({ onFeatureCapture, childName = 'Bé' }) {
  const [budget] = useState(20)
  const [cart, setCart] = useState([])
  const [paid, setPaid] = useState(false)

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0)
  const change = budget - total

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
    onFeatureCapture({ timestamp: Date.now(), gameId: 'G4.3', event: 'add_item', itemId: item.id, attentionLevel: 0.8 })
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0))
  }

  const checkout = () => {
    if (total > budget) return
    setPaid(true)
    onFeatureCapture({ timestamp: Date.now(), gameId: 'G4.3', event: 'checkout', total, change, attentionLevel: 1 })
  }

  const reset = () => { setCart([]); setPaid(false) }

  return (
    <div style={{
      height: '100%', display: 'flex', gap: 20,
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 20
    }}>
      {/* Shop */}
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 12, fontSize: 16 }}>
          🏪 Cửa hàng
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ITEMS.map(item => (
            <button key={item.id} onClick={() => !paid && total + item.price <= budget && addToCart(item)} style={{
              padding: '12px', background: '#1e293b',
              border: '2px solid #334155', borderRadius: 10,
              cursor: paid || total + item.price > budget ? 'not-allowed' : 'pointer',
              opacity: total + item.price > budget && !cart.find(c => c.id === item.id) ? 0.4 : 1,
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: 32 }}>{item.emoji}</div>
              <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 4 }}>{item.name}</div>
              <div style={{ color: '#fbbf24', fontWeight: 700 }}>{item.price}🪙</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div style={{ width: 180, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>
          🛒 Giỏ hàng
        </div>
        <div style={{ color: '#22c55e', marginBottom: 12 }}>
          💰 Có: {budget}🪙
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cart.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 13 }}>Chưa có gì</div>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#1e293b', borderRadius: 8, padding: '6px 10px'
              }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <span style={{ color: '#e2e8f0', fontSize: 12 }}>x{item.qty}</span>
                <span style={{ color: '#fbbf24', fontSize: 12 }}>{item.price * item.qty}🪙</span>
                {!paid && (
                  <button onClick={() => removeFromCart(item.id)} style={{
                    background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontSize: 14
                  }}>✕</button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '1px solid #334155', paddingTop: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginBottom: 6 }}>
            <span>Tổng:</span>
            <span style={{ color: total > budget ? '#ef4444' : '#fbbf24', fontWeight: 700 }}>
              {total}🪙
            </span>
          </div>

          {paid ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 6 }}>
                ✅ Tiền thối: {change}🪙
              </div>
              <button onClick={reset} style={{
                width: '100%', padding: '8px', background: '#3b82f6',
                border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer'
              }}>
                🔄 Mua tiếp
              </button>
            </div>
          ) : (
            <button
              onClick={checkout}
              disabled={cart.length === 0 || total > budget}
              style={{
                width: '100%', padding: '10px',
                background: cart.length === 0 || total > budget ? '#334155' : '#22c55e',
                border: 'none', borderRadius: 8, color: '#fff',
                cursor: cart.length === 0 || total > budget ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              💳 Thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  )
}