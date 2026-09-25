// ─────────────────────────────────────────────────────────────
//  All site content lives here. Edit this file to update the desk.
// ─────────────────────────────────────────────────────────────

export const PALETTE = {
  mist: '#4B4A5A', // grey-violet
  teal: '#336356', // leaf green
  pine: '#22302E', // deep green
  plum: '#332A3A', // shadow plum
  ink: '#232428', // near black
}

export const PROFILE = {
  name: 'Matthew Zhou',
  role: 'Software Engineering · McGill',
  resumePdf: 'matthewzhou_cv.pdf',
  resumeImage: 'resume-page.png',
}

// Laptop → horizontal project carousel (templates for now)
export const PROJECTS = [
  {
    id: 'nodality',
    title: 'Nodality.ai',
    year: '2025 — now',
    tagline: 'AI mind-mapping that clusters your ideas and suggests the next one.',
    stack: ['React Flow', 'Node', 'Python', 'PostgreSQL', 'Docker'],
    accent: '#336356',
    link: '#', // live demo / write-up URL
    github: 'https://github.com/matthewzhouzq', // TODO: point at the repo
  },
  {
    id: 'navigator',
    title: 'navigator.ai',
    year: '2023 — 2024',
    tagline: 'Traffic routing for Ottawa, built on 7 years of city data. Featured by Ottawa Citizen & CTV.',
    stack: ['JavaScript', 'Three.js', 'Leaflet', 'Python', 'OpenAI'],
    accent: '#4B4A5A',
    link: '#', // live demo / write-up URL
    github: 'https://github.com/matthewzhouzq', // TODO: point at the repo
  },
  {
    id: 'tempora',
    title: 'Tempora',
    year: '2021 — 2022',
    tagline: 'A productivity Chrome extension that reached 40+ users.',
    stack: ['JavaScript', 'Chrome API', 'Python'],
    accent: '#5b4a63',
    link: '#', // live demo / write-up URL
    github: 'https://github.com/matthewzhouzq', // TODO: point at the repo
  },
]

// iPhone → vertical contact pages
export const CONTACTS = [
  { id: 'email', label: 'Email', value: 'matthewzhou.contacts@gmail.com', href: 'mailto:matthewzhou.contacts@gmail.com', action: 'Write to me', glyph: '✉' },
  { id: 'phone', label: 'Phone', value: '(613) 581-8828', href: 'tel:+16135818828', action: 'Call', glyph: '☏' },
  { id: 'linkedin', label: 'LinkedIn', value: 'in/matthewzhouzq', href: 'https://www.linkedin.com/in/matthewzhouzq/', action: 'Connect', glyph: 'in' },
  { id: 'github', label: 'GitHub', value: 'matthewzhouzq', href: 'https://github.com/matthewzhouzq', action: 'See the code', glyph: '⌥' },
]

// Clock → wind time through these milestones (year as a decimal: 2023.5 ≈ July 2023)
export const TIMELINE = [
  { t: 2021.8, title: 'Tempora', text: 'First shipped product — a Chrome extension built with 3 friends.' },
  { t: 2023.45, title: 'FIRST Robotics 8729', text: 'Software team lead. Swerve autos, vision on a Raspberry Pi.' },
  { t: 2023.7, title: 'navigator.ai', text: 'Traffic routing for Ottawa. Ended up on CTV.' },
  { t: 2023.8, title: 'VEX 50226A', text: 'Software lead — autonomous code on stubborn hardware.' },
  { t: 2024.8, title: 'YTP Ottawa', text: 'Design lead. 3D graphics in Blender, automation on Google Cloud.' },
  { t: 2025.66, title: 'McGill', text: 'Started Software Engineering Co-op.' },
  { t: 2025.7, title: 'Formula SAE Electric', text: 'Driverless team — YOLOv8 cone detection, ROS 2.' },
  { t: 2025.8, title: 'Nodality.ai', text: 'An AI that thinks in graphs.' },
  { t: 2026.35, title: 'Ciena', text: 'Software engineering co-op, Reliability Engineering.' },
  { t: 2027.2, title: '??? ', text: 'Next chapter: software / AI infrastructure. Let’s talk.' },
]
export const TIME_RANGE = [2021.5, 2027.5]
export const NOW = 2026 + (new Date().getMonth() + new Date().getDate() / 31) / 12

// Book → "chapters": work & team experience, in order. One chapter per spread.
export const CHAPTERS = [
  {
    id: 'syrc',
    org: 'Sparkling Youth Robotics Club',
    short: 'SYRC · FIRST 8729',
    role: 'Software Team Lead',
    when: 'Jun 2023 — Jul 2025',
    where: 'Ottawa, ON',
    points: [
      'Taught 19 software members to program and test command-based robots in Java.',
      'Built swerve autonomous paths on Bézier trajectories in PathPlanner.',
      'Ran vision on a Raspberry Pi 4 and tuned PID loops on real hardware.',
    ],
    stack: ['Java', 'WPILib', 'PathPlanner'],
  },
  {
    id: 'vex',
    org: 'VEX Team 50226A',
    short: 'VEX 50226A',
    role: 'Software Lead / Mechanical',
    when: 'Oct 2023 — Feb 2025',
    where: 'Ottawa, ON',
    points: [
      'Wrote autonomous and driver-control code in C++ around hardware limits.',
      'Worked hands-on with pneumatics, then programmed them.',
    ],
    stack: ['C++', 'CAD'],
  },
  {
    id: 'ytp',
    org: 'Youth Tutoring Project — Ottawa',
    short: 'YTP Ottawa',
    role: 'Design Lead',
    when: 'Oct 2024 — May 2025',
    where: 'Remote',
    points: [
      'Automated Google Sheets with Python scripts deployed on Google Cloud.',
      'Designed outreach posts and videos, with 3D graphics made in Blender.',
    ],
    stack: ['Python', 'Google Cloud', 'Blender'],
  },
  {
    id: 'fsae',
    org: 'McGill Formula SAE Electric',
    short: 'Formula SAE',
    role: 'Driverless / Autonomous Member',
    when: 'Sep 2025 — now',
    where: 'Montréal, QC',
    points: [
      'Training a YOLOv8 model for live cone detection across lighting conditions.',
      'Writing ROS 2 nodes that handle high-frequency sensor data for autonomous driving.',
    ],
    stack: ['C++', 'ROS 2', 'Python', 'Docker'],
  },
  {
    id: 'ciena',
    org: 'Ciena',
    short: 'Ciena',
    role: 'Software Engineering Co-op · Reliability Engineering',
    when: '2026', // TODO: exact dates
    where: 'Ottawa, ON',
    points: [
      'Template — what you built, what it improved, and the tools you used.',
      'Template — one result with a number in it.',
    ],
    stack: ['Add', 'Your', 'Stack'],
  },
]

// Plant → life outside work
export const INTERESTS = [
  { title: 'Soccer', text: 'Placeholder — your position, team, favourite club.', glyph: '⚽' },
  { title: 'Games', text: 'Placeholder — what you play, and why you like designing them.', glyph: '🎮' },
  { title: 'Creative code', text: 'Placeholder — 3D web, little browser games, weird prototypes.', glyph: '✦' },
  { title: 'Content', text: 'Placeholder — video edits, highlight reels, tooling.', glyph: '▶' },
]
