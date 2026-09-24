import { create } from 'zustand'
import { NOW } from './data'

export const useStore = create((set) => ({
  // null = overview; otherwise 'laptop' | 'phone' | 'resume' | 'clock' | 'plant'
  focus: null,
  hovered: null,
  ready: false, // assets loaded + intro started
  introDone: false,
  timeT: NOW, // clock-wound time (decimal year)

  setFocus: (focus) => set({ focus, hovered: null }),
  setHovered: (hovered) => set({ hovered }),
  setReady: () => {
    set({ ready: true })
    setTimeout(() => set({ introDone: true }), 3400)
  },
  setIntroDone: () => set({ introDone: true }),
  setTimeT: (timeT) => set({ timeT }),
}))

// Where each object sits on the desk (desk top is y = DESK_Y)
export const DESK_Y = 0.765
export const LAYOUT = {
  laptop: { pos: [0.02, DESK_Y, -0.1], rot: -0.12 },
  phone: { pos: [0.4, DESK_Y, 0.16], rot: -0.35 },
  resume: { pos: [-0.4, DESK_Y, 0.12], rot: 0.18 },
  clock: { pos: [-0.44, DESK_Y, -0.24], rot: 0.35 },
  plant: { pos: [0.66, DESK_Y, -0.24], rot: 0 },
  candles: { pos: [0.4, DESK_Y, -0.22], rot: 0 },
  lamp: { pos: [-0.68, DESK_Y, -0.28], rot: 0.15 },
}

// Camera shots: [position, lookAt]
export const SHOTS = {
  intro: [[3.4, 2.4, 4.2], [0, 0.8, -0.2]],
  home: [[2.05, 1.5, 2.3], [-0.08, 0.8, -0.1]],
  homePortrait: [[2.4, 1.9, 3.0], [-0.02, 0.86, -0.12]],
  laptop: [[0.09, 1.02, 0.36], [0.03, 0.9, -0.2]],
  phone: [[0.36, 1.18, 0.27], [0.4, 0.77, 0.16]],
  resume: [[-0.38, 1.22, 0.24], [-0.4, 0.77, 0.12]],
  clock: [[-0.26, 0.94, 0.16], [-0.37, 0.85, -0.24]],
  plant: [[0.9, 1.08, 0.4], [0.7, 0.9, -0.22]],
  window: [[0.2, 1.5, 0.65], [-2.3, 1.55, -0.35]], // debug: look out the window
}
