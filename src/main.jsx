import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// canvas textures draw text, so wait (briefly) for Work Sans before first render
const fontsReady = Promise.race([
  Promise.all(['300 64px "Work Sans"', '400 16px "Work Sans"'].map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 1500)),
]).catch(() => {})

fontsReady.then(() => ReactDOM.createRoot(document.getElementById('root')).render(<App />))
