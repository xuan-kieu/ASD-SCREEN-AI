import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Filter noisy MediaPipe/WebGL runtime logs in browser console.
const MP_NOISE_PATTERNS = [
  'gl_context_webgl.cc',
  'gl_context.cc',
  'OpenGL error checking is disabled',
  'Successfully created a WebGL context',
  'Successfully destroyed WebGL context',
  'GL version:',
]

function isMediaPipeNoise(args) {
  const msg = args.map(a => (typeof a === 'string' ? a : '')).join(' ')
  return MP_NOISE_PATTERNS.some(p => msg.includes(p))
}

const originalLog = console.log.bind(console)
const originalWarn = console.warn.bind(console)
console.log = (...args) => {
  if (isMediaPipeNoise(args)) return
  originalLog(...args)
}
console.warn = (...args) => {
  if (isMediaPipeNoise(args)) return
  originalWarn(...args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)