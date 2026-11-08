import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const screen = $('#screen'), canvas = $('#gl');
const FOV = 30, CAM_Z = 40, NB = 30;
const rgb = (h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const BG = '#06110b';
const pad = (n) => String(n).padStart(3, '0');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.autoClear = false;
renderer.setClearColor(new THREE.Color(BG), 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 200);
camera.position.set(0, 0, CAM_Z);

// phosphor persistence: each frame paints a translucent wash over the last instead of clearing it
const fadeMat = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false,
  uniforms: { uC: { value: rgb(BG) }, uA: { value: 0.3 } },
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform vec3 uC; uniform float uA; void main(){ gl_FragColor = vec4(uC, uA); }',
});
const fadeScene = new THREE.Scene();
const fadeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMat);
fadeQuad.frustumCulled = false;
fadeScene.add(fadeQuad);

// green, rim-lit, ordered-dithered into 5 levels, with scanlines (works for skinned and plain meshes)
const phosMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uCol: { value: rgb('#8df5b5') }, uHot: { value: rgb('#e6fff0') }, uScan: { value: 1 } },
  vertexShader: `
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vN; varying vec3 vV;
    void main() {
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      #include <project_vertex>
      vN = normalize(transformedNormal);
      vV = -mvPosition.xyz;
    }`,
  fragmentShader: `
    uniform vec3 uCol, uHot; uniform float uScan;
    varying vec3 vN; varying vec3 vV;
    float bayer(vec2 p) {
      ivec2 i = ivec2(mod(p, 4.0));
      int k = i.x + i.y * 4;
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      return m[k] / 16.0;
    }
    void main() {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(vV);
      float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);
      float lam = clamp(dot(n, normalize(vec3(-0.4, 0.75, 0.55))), 0.0, 1.0);
      float l = 0.08 + 0.42 * lam + 0.95 * rim;
      float q = floor(l * 4.0 + bayer(gl_FragCoord.xy)) / 4.0;
      float scan = mix(1.0, 0.72 + 0.28 * step(1.0, mod(gl_FragCoord.y, 3.0)), uScan);
      vec3 c = mix(uCol * q, uHot, smoothstep(0.95, 1.4, l) * 0.6);
      gl_FragColor = vec4(c * scan, 1.0);
    }`,
});
const starMat = phosMat.clone();
starMat.uniforms.uCol.value = rgb('#a8ffcb');
starMat.uniforms.uHot.value = rgb('#ffffff');
const eyeMat = new THREE.MeshBasicMaterial({ color: '#f2c46d' });

// a chunky 3D five-point star
const starGeo = (() => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.44 : 1, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i) sh.lineTo(r * Math.cos(a), r * Math.sin(a)); else sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: 2 });
  g.center(); g.computeVertexNormals();
  return g;
})();

const group = new THREE.Group();
scene.add(group);

// ── state ──────────────────────────────────────────────
let rig = null, W = 1, H = 1, scl = 1, STAR = 1, bodyLen = 20;
const bounds = { x: 1, y: 1 };
let mode = 'attract'; // attract → play ⇄ pause
const head = new THREE.Vector3(), dir = new THREE.Vector3(1, 0, 0), aim = new THREE.Vector3();
const trail = []; // past head positions, oldest first
const STEP = 0.12;
let wave = 0, speed = 8, idleA = 0;
const stars = [];
let spawnT = 0, score = 0, best = 0, streak = 0;
let lives = 1, invuln = 0, runT = 0; // lives: start with 1, +1 every 25 streak; runT: seconds into this run (bombs ramp up)
try { best = Number(localStorage.getItem('dragon-best')) || 0; } catch (e) {}
$('#best').textContent = pad(best);
let bestStreak = 0;
try { bestStreak = Number(localStorage.getItem('dragon-best-streak')) || 0; } catch (e) {}
$('#bestStreak').textContent = '×' + bestStreak;

const tmp = {
  T: new THREE.Vector3(), up: new THREE.Vector3(), side: new THREE.Vector3(), P: new THREE.Vector3(),
  cp: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
  ct: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
  ds: new Float32Array(NB + 2),
  joints: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
  ups: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
  wq: Array.from({ length: NB + 1 }, () => new THREE.Quaternion()),
  m: new THREE.Matrix4(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), pp: new THREE.Quaternion(),
  x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), qa: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0),
  Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1),
};

function resetTrail() {
  trail.length = 0;
  for (let d = bodyLen + 6; d > 0; d -= STEP) trail.push(head.clone().addScaledVector(dir, -d));
}

function build() {
  const r = screen.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const crt = window.__crt ? window.__crt() : true;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1) * (crt ? 0.5 : 1));
  renderer.setSize(w, h, false);
  renderer.clear();
  camera.aspect = w / h; camera.updateProjectionMatrix();
  H = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); W = H * camera.aspect;
  bounds.x = W / 2 - 2.4; bounds.y = H / 2 - 2.2;
  STAR = 0.042 * H;
  for (const s of stars) if (s.state === 'idle') s.m.scale.setScalar(STAR);
  if (rig) {
    const fresh = trail.length === 0;
    scl = (Math.min(W, H * 1.6) * 0.62) / rig.bodyRig;
    bodyLen = (rig.headLen + NB * rig.spineLen) * scl;
    group.scale.setScalar(scl);
    if (fresh) { head.set(-W * 0.25, -H * 0.1, 0); dir.set(1, 0.3, 0).normalize(); resetTrail(); }
  }
}

// sample points (and forward tangents) at increasing distances behind the head, along its trail
function chain(n) {
  const { ds, cp, ct } = tmp;
  let i = trail.length - 1, a = head, b = trail[i], acc = 0, seg = a.distanceTo(b);
  for (let k = 0; k < n; k++) {
    const d = ds[k];
    while (acc + seg < d && i > 0) { acc += seg; a = b; i--; b = trail[i]; seg = a.distanceTo(b); }
    const f = seg > 1e-6 ? (d - acc) / seg : 0;
    cp[k].lerpVectors(a, b, f);
    ct[k].subVectors(a, b);
    if (ct[k].lengthSq() < 1e-10) ct[k].copy(dir); else ct[k].normalize();
  }
}

let chasing = false; // true while the cursor has somewhere new for the dragon to go
let driver = 'user'; // 'user' steers with the cursor; 'ai' (idle mode) plays itself
// idle mode's brain. Safety first: never steer toward a bomb; only then go for the nearest reachable star.
const bombHitR = () => STAR * 0.8 * 1.1 + 0.6;
const bombPos = (b) => (b.state === 'warn' ? b.home : b.g.position);
function aiGoal() {
  let best = null, bestScore = Infinity;
  const pool = stars.filter((s) => s.state === 'idle' || s.state === 'in');
  const list = pool.length ? pool : stars.filter((s) => s.state === 'warn');
  const unsafe = bombHitR() + 2.2;
  for (const s of list) {
    let sc = head.distanceTo(s.home);
    for (const b of bombs) if (bombPos(b).distanceTo(s.home) < unsafe) sc += 60; // not worth it
    if (sc < bestScore) { bestScore = sc; best = s.home; }
  }
  return best;
}
let aiT = 0;
function aiSteer(dt, cruise) {
  aiT += dt;
  const goal = aiGoal();
  const cur = Math.atan2(dir.y, dir.x);
  const goalA = goal ? Math.atan2(goal.y - head.y, goal.x - head.x) : cur;
  const look = 5 + speed * 0.55, safe = bombHitR() + 1.6;
  const ex = W / 2 - 1.5, ey = H / 2 - 1.5;
  let bestA = cur, bestS = -Infinity, bestClear = 0;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    let clear = Infinity, wall = 0;
    for (let j = 1; j <= 10; j++) {
      const px = head.x + cx * look * (j / 10), py = head.y + cy * look * (j / 10);
      for (const b of bombs) { const bp = bombPos(b); const d = Math.hypot(px - bp.x, py - bp.y); if (d < clear) clear = d; }
      if (Math.abs(px) > ex || Math.abs(py) > ey) wall++;
    }
    for (const b of bombs) { const bp = bombPos(b); clear = Math.min(clear, Math.hypot(head.x - bp.x, head.y - bp.y) + (Math.cos(Math.atan2(bp.y - head.y, bp.x - head.x) - a) < 0 ? 3 : 0)); }
    let sc = Math.cos(a - goalA) - 0.3 * (1 - Math.cos(a - cur)) - wall * 0.4 + Math.min(clear, 8) * 0.08;
    if (clear < safe) sc -= 100 + (safe - clear) * 10; // a heading that meets a bomb is never chosen while any safe one exists
    if (sc > bestS) { bestS = sc; bestA = a; bestClear = clear; }
  }
  turnToward(bestA, 9, dt);
  const near = bombs.reduce((m, b) => Math.min(m, head.distanceTo(bombPos(b))), Infinity);
  const d = goal ? Math.hypot(goal.x - head.x, goal.y - head.y) : 10;
  let want = THREE.MathUtils.clamp(d * 2.8, cruise, reduce ? 16 : 22);
  if (near < safe + 4 || bestClear < safe + 2) want = cruise * 0.7; // ease off near bombs: tighter turns
  return want;
}
function turnToward(ang, rate, dt) {
  const cur = Math.atan2(dir.y, dir.x);
  let da = ang - cur;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const na = cur + THREE.MathUtils.clamp(da, -rate * dt, rate * dt);
  dir.set(Math.cos(na), Math.sin(na), 0);
}
function steer(dt, t) {
  const cruise = reduce ? 7 : 12;
  let want = cruise;
  if (mode === 'play' && driver === 'ai') {
    want = aiSteer(dt, cruise);
  } else if (mode === 'play') {
    if (chasing) {
      const dx = aim.x - head.x, dy = aim.y - head.y, dist = Math.hypot(dx, dy);
      if (dist < 1.6) chasing = false; // reached the cursor: carry straight on, no circling
      else { turnToward(Math.atan2(dy, dx), 7.5, dt); want = THREE.MathUtils.clamp(dist * 2.8, cruise, reduce ? 18 : 30); }
    }
  } else {
    idleA += dt * 0.42;
    const dx = W * 0.27 * Math.cos(idleA) - head.x, dy = H * 0.24 * Math.sin(idleA) - head.y;
    turnToward(Math.atan2(dy, dx), 1.6, dt);
    want = THREE.MathUtils.clamp(Math.hypot(dx, dy) * 1.7, 6, 9);
  }
  // bounce off the screen's edges: a quick, smooth turn back inside
  const ex = W / 2 - 2.2, ey = H / 2 - 2.2;
  const outX = (head.x > ex && dir.x > 0) || (head.x < -ex && dir.x < 0);
  const outY = (head.y > ey && dir.y > 0) || (head.y < -ey && dir.y < 0);
  if ((outX || outY) && !(mode === 'play' && driver === 'ai')) turnToward(Math.atan2(outY ? -dir.y : dir.y, outX ? -dir.x : dir.x), 11, dt);
  speed = THREE.MathUtils.damp(speed, want, mode === 'play' ? 9 : 4, dt);
  head.addScaledVector(dir, speed * dt);
  head.x = THREE.MathUtils.clamp(head.x, -W / 2 - 1, W / 2 + 1);
  head.y = THREE.MathUtils.clamp(head.y, -H / 2 - 1, H / 2 + 1);
  const last = trail[trail.length - 1];
  if (head.distanceTo(last) >= STEP) trail.push(head.clone());
  const maxN = Math.ceil((bodyLen + 6) / STEP) + 4;
  if (trail.length > maxN) trail.splice(0, trail.length - maxN);
  wave += dt * (3 + speed * 0.12);
}

function pose(t) {
  const { bones, restQ, spineLen, headLen, root } = rig;
  const { joints, ups, Y, Z, ds, cp, ct } = tmp;
  const s = scl, bl = spineLen * s;
  for (let i = 1; i < NB + 2; i++) ds[i - 1] = (i - 1) * bl;
  chain(NB + 1);
  for (let i = 0; i < NB + 2; i++) {
    let b;
    if (i === 0) { b = -headLen * s; tmp.P.copy(head).addScaledVector(dir, headLen * s); tmp.T.copy(dir); }
    else { b = (i - 1) * bl; tmp.P.copy(cp[i - 1]); tmp.T.copy(ct[i - 1]); }
    tmp.up.copy(Y).addScaledVector(tmp.T, -Y.dot(tmp.T)).addScaledVector(Z, 0.55);
    tmp.up.addScaledVector(tmp.T, -tmp.up.dot(tmp.T)).normalize();
    tmp.side.crossVectors(tmp.T, tmp.up);
    const env = 0.35 + 0.65 * Math.min(1, Math.max(0, (b + headLen * s) / (4 * s)));
    const vert = 0.5 * s * env * Math.sin((b / (7 * s)) * Math.PI * 2 - wave);
    const lat = 0.28 * s * env * Math.sin((b / (9 * s)) * Math.PI * 2 - wave * 0.6 + 1.3);
    joints[i].copy(tmp.P).addScaledVector(tmp.up, vert).addScaledVector(tmp.side, lat);
    ups[i].copy(tmp.up);
  }
  for (let i = 2; i < NB + 2; i++) {
    tmp.x.subVectors(joints[i], joints[i - 1]).normalize();
    joints[i].copy(joints[i - 1]).addScaledVector(tmp.x, bl);
  }
  root.updateWorldMatrix(true, false);
  root.getWorldQuaternion(tmp.pq);
  const frame = (d, upv, out) => {
    tmp.y.copy(d).normalize();
    tmp.z.copy(upv).addScaledVector(tmp.y, -upv.dot(tmp.y)).normalize();
    tmp.x.crossVectors(tmp.y, tmp.z);
    tmp.m.makeBasis(tmp.x, tmp.y, tmp.z);
    return out.setFromRotationMatrix(tmp.m);
  };
  tmp.pp.copy(tmp.pq);
  for (let i = 0; i < NB; i++) {
    const bone = bones['Spine_' + String(i).padStart(2, '0')];
    tmp.T.subVectors(joints[i + 2], joints[i + 1]);
    tmp.up.copy(ups[i + 1]).add(ups[i + 2]);
    frame(tmp.T, tmp.up, tmp.wq[i]);
    bone.quaternion.copy(tmp.pp).invert().multiply(tmp.wq[i]);
    tmp.pp.copy(tmp.wq[i]);
    if (i === 0) bone.position.copy(root.worldToLocal(tmp.P.copy(joints[1])));
  }
  tmp.T.subVectors(joints[0], joints[1]);
  frame(tmp.T, ups[0], tmp.q);
  bones.Head.quaternion.copy(tmp.wq[0]).invert().multiply(tmp.q);
  const paddle = (name, ph, amp) => {
    const b = bones[name]; if (!b) return;
    tmp.qa.setFromAxisAngle(tmp.ax, amp * Math.sin(t * 2.4 + ph));
    b.quaternion.copy(restQ[name]).multiply(tmp.qa);
  };
  for (const [side, ph] of [['A', 0], ['B', Math.PI]]) {
    paddle(`Arm${side}_upper`, ph, 0.22);
    paddle(`Arm${side}_fore`, ph - 0.7, 0.16);
    paddle(`Arm${side}_claw`, ph - 1.3, 0.24);
  }
  return joints[0];
}

// ── stars ──────────────────────────────────────────────
const bounce = (x) => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
function spawnStar() {
  const home = new THREE.Vector3();
  let ok = false;
  for (let tries = 0; tries < 24 && !ok; tries++) {
    home.set((Math.random() * 2 - 1) * bounds.x, (Math.random() * 2 - 1) * bounds.y, 0);
    ok = home.distanceTo(head) > 5 && stars.every((s) => s.home.distanceTo(home) > 4) && bombs.every((b) => b.home.distanceTo(home) > 4.5);
  }
  if (!ok) return; // no clear spot right now; try again next tick
  const m = new THREE.Mesh(starGeo, starMat);
  m.scale.setScalar(0.0001);
  m.visible = false;
  m.frustumCulled = false;
  m.position.copy(home);
  scene.add(m);
  const el = document.createElement('i');
  el.className = 'spawn';
  el.setAttribute('aria-hidden', 'true');
  screen.insertBefore(el, $('#state').parentNode);
  stars.push({ m, el, home, t: 0, state: 'warn', spin: Math.random() * 6.28 });
}
const backOut = (x) => { const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function placeMarker(s, k) {
  const r = screen.getBoundingClientRect();
  const px = (s.home.x / W + 0.5) * r.width, py = (0.5 - s.home.y / H) * r.height;
  const size = 26 + 50 * (1 - k);
  s.el.style.left = px + 'px'; s.el.style.top = py + 'px';
  s.el.style.width = size + 'px'; s.el.style.height = size + 'px';
  s.el.style.opacity = (Math.floor(k * 9) % 2 ? 0.35 : 1).toString();
}
function updateStars(dt, t, snout) {
  const cap = 3;
  spawnT += dt;
  const live = stars.filter((s) => s.state !== 'pop').length;
  if (live < cap && spawnT > (mode === 'play' ? 1.1 : 0.6)) { spawnT = 0; spawnStar(); }
  if (streak && stars.filter((s) => s.state === 'idle' || s.state === 'in').length >= cap) setStreak(0); // fell behind: the field filled up
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i], m = s.m;
    m.rotation.y += dt * 1.8;
    m.rotation.z = 0.25 * Math.sin(t * 1.3 + s.spin);
    if (s.state === 'warn') {
      // the marker closes in on the spot, blinking, then the star pops out of nothing
      s.t += dt / 0.9;
      placeMarker(s, Math.min(1, s.t));
      if (s.t >= 1) { s.state = 'in'; s.t = 0; s.el.remove(); s.el = null; m.visible = true; }
      continue;
    } else if (s.state === 'in') {
      s.t += dt / 0.35;
      m.scale.setScalar(STAR * Math.max(0.0001, backOut(Math.min(1, s.t))));
      m.position.set(s.home.x, s.home.y + 0.25 * Math.sin(t * 2 + s.spin), s.home.z);
      if (s.t >= 1) { s.state = 'idle'; m.scale.setScalar(STAR); }
    } else if (s.state === 'idle') {
      m.position.set(s.home.x, s.home.y + 0.25 * Math.sin(t * 2 + s.spin), s.home.z);
    } else {
      s.t += dt / 0.3;
      m.scale.setScalar(STAR * (1 + 1.4 * s.t) * Math.max(0, 1 - s.t));
      m.rotation.y += dt * 14;
      if (s.t >= 1) { scene.remove(m); stars.splice(i, 1); }
      continue;
    }
    if (mode === 'play' && snout && (s.state === 'idle' || s.state === 'in')) {
      const dx = m.position.x - snout.x, dy = m.position.y - snout.y;
      if (dx * dx + dy * dy < (STAR * 1.5 + 0.9) ** 2 || head.distanceTo(m.position) < STAR * 1.5 + 0.9) {
        s.state = 'pop'; s.t = 0; collect(s);
      }
    }
  }
}

// ── bombs: telegraphed like stars, live for 3 s, end the run if the dragon touches one
const bombMat = phosMat.clone();
bombMat.uniforms.uCol.value = rgb('#f2c46d');
bombMat.uniforms.uHot.value = rgb('#fff4d6');
const sparkMat = new THREE.MeshBasicMaterial({ color: '#fff4d6' });
const bombBody = new THREE.SphereGeometry(1, 18, 14);
const bombCap = new THREE.CylinderGeometry(0.32, 0.36, 0.3, 12);
const bombFuse = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6);
const sparkGeo = new THREE.IcosahedronGeometry(0.22, 0);
const bitGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const bombs = [], bits = [];
let bombT = 0;
const BOMB_LIFE = 3;
function makeBomb() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bombBody, bombMat);
  const cap = new THREE.Mesh(bombCap, bombMat); cap.position.y = 1.0;
  const fuse = new THREE.Mesh(bombFuse, bombMat); fuse.position.set(0.18, 1.38, 0); fuse.rotation.z = -0.5;
  const spark = new THREE.Mesh(sparkGeo, sparkMat); spark.position.set(0.36, 1.68, 0);
  g.add(body, cap, fuse, spark);
  g.traverse((o) => { o.frustumCulled = false; });
  g.userData.spark = spark;
  return g;
}
function spawnBomb() {
  const home = new THREE.Vector3();
  let ok = false;
  for (let tries = 0; tries < 24 && !ok; tries++) {
    home.set((Math.random() * 2 - 1) * bounds.x, (Math.random() * 2 - 1) * bounds.y, 0);
    ok = home.distanceTo(head) > 8 && stars.every((s) => s.home.distanceTo(home) > 4.5) && bombs.every((b) => b.home.distanceTo(home) > 4.5);
  }
  if (!ok) return;
  const g = makeBomb();
  g.visible = false; g.scale.setScalar(0.0001); g.position.copy(home);
  scene.add(g);
  const el = document.createElement('i');
  el.className = 'spawn bomb';
  el.setAttribute('aria-hidden', 'true');
  screen.insertBefore(el, $('#state').parentNode);
  bombs.push({ g, el, home, t: 0, state: 'warn', spin: Math.random() * 6.28 });
}
function removeBomb(i) { const b = bombs[i]; scene.remove(b.g); if (b.el) b.el.remove(); bombs.splice(i, 1); }
function clearBombs() { for (let i = bombs.length - 1; i >= 0; i--) removeBomb(i); }
function explode(pos, small) {
  const n = small ? 12 : 28, k = small ? 0.45 : 1;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(i % 3 ? bitGeo : sparkGeo, i % 3 ? bombMat : sparkMat);
    m.position.copy(pos); m.frustumCulled = false;
    const a = Math.random() * Math.PI * 2, sp = (6 + Math.random() * 12) * k;
    const v = new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp + 4 * k, (Math.random() * 2 - 1) * 6 * k);
    m.scale.setScalar(STAR * (0.8 + Math.random() * 1.2) * k);
    scene.add(m);
    bits.push({ m, v, life: (0.8 + Math.random() * 0.5) * (small ? 0.7 : 1) });
  }
  if (small) return; // a fizzle: no flash, no shake, can't hurt the dragon
  screen.classList.remove('boom'); void screen.offsetWidth; screen.classList.add('boom');
}
function updateBits(dt) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const p = bits[i];
    p.life -= dt; p.v.y -= (p.grav ?? 16) * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 9; p.m.rotation.y += dt * 7;
    p.m.scale.multiplyScalar(Math.exp(-dt * 1.6));
    if (p.life <= 0) { scene.remove(p.m); bits.splice(i, 1); }
  }
}
function renderLives(fresh) {
  const el = $('#lives');
  const shown = Math.min(lives, 6);
  el.innerHTML = '<i></i>'.repeat(shown) + (lives > 6 ? '<span>+' + (lives - 6) + '</span>' : '');
  if (fresh && shown) el.children[shown - 1].classList.add('new');
  el.setAttribute('aria-label', lives + (lives === 1 ? ' life' : ' lives'));
}
function newRun() { lives = 1; invuln = 0; runT = 0; renderLives(); }
function loseLife() {
  lives = Math.max(0, lives - 1);
  setStreak(0);
  renderLives();
  const el = $('#lives'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  if (lives > 0) { invuln = 1.6; return; } // keep going; the dragon blinks while it can't be hit
  if (driver === 'ai') aiReset(); else gameOver();
}
function gainLife(pos) {
  lives++;
  renderLives(true);
  const [x, y] = toScreen(pos);
  const el = document.createElement('div');
  el.className = 'pop-txt life';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = x + 'px'; el.style.top = (y - 46) + 'px';
  el.innerHTML = '<b>+1 life</b>';
  screen.insertBefore(el, $('#state').parentNode);
  setTimeout(() => el.remove(), 1300);
}
function aiReset() {
  newRun();
  clearBombs();
  score = 0; scoreEl.textContent = pad(0); setStreak(0);
  head.set(0, 0, 0);
  const a = Math.random() * Math.PI * 2; dir.set(Math.cos(a), Math.sin(a), 0);
  resetTrail();
  bombT = 0;
}
function gameOver() {
  clearBombs(); setMode('over');
  if (driver === 'ai') setTimeout(() => { if (mode === 'over' && driver === 'ai') setMode('play'); }, 2600);
}
const stun = new THREE.Group();
const STUN_N = 5, STUN_TAIL = 5; // stars circling the head, each with a short tail of shrinking copies
const stunStars = [];
const STUN_SIZE = [1.15, 0.75, 1, 0.6, 0.9]; // each star a slightly different size
for (let i = 0; i < STUN_N; i++) {
  const parts = [];
  for (let k = 0; k <= STUN_TAIL; k++) {
    const m = new THREE.Mesh(k ? sparkGeo : starGeo, bombMat);
    m.frustumCulled = false;
    stun.add(m); parts.push(m);
  }
  stunStars.push(parts);
}
stun.visible = false;
scene.add(stun);
function updateStun(t) {
  stun.visible = mode === 'over' && !!rig;
  if (!stun.visible) return;
  const c = tmp.P.copy(tmp.joints[0]).add(tmp.joints[1]).multiplyScalar(0.5); // centred over the head
  const r = 0.75 * scl + 0.35, lift = 0.9 * scl + 0.5;
  stunStars.forEach((parts, i) => {
    parts.forEach((m, k) => {
      const a = t * 3.4 + (i * Math.PI * 2) / STUN_N - k * 0.16; // tail pieces lag behind on the same circle
      m.position.set(c.x + Math.cos(a) * r, c.y + lift + 0.12 * Math.sin(a * 2), c.z + Math.sin(a) * r * 0.7);
      if (k === 0) { m.rotation.set(0, t * 4 + i, 0.3 * Math.sin(t * 5 + i)); m.scale.setScalar(STAR * 0.3 * STUN_SIZE[i]); }
      else m.scale.setScalar(STAR * 0.5 * STUN_SIZE[i] * (1 - k / (STUN_TAIL + 1)));
    });
  });
}
function updateBombs(dt, t, snout) {
  if (mode === 'play') {
    bombT += dt;
    const maxBombs = Math.min(5, 2 + Math.floor(runT / 35)); // one more allowed every ~35 s, up to 5
    const gap = Math.max(1.6, 3.4 - runT * 0.02); // and they come a little more often
    if (bombs.length < maxBombs && bombT > gap) { bombT = Math.random() * 1.2; spawnBomb(); }
  } else if (mode !== 'pause' && bombs.length) clearBombs();
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i], g = b.g;
    if (b.state === 'warn') {
      b.t += dt / 1.0;
      placeMarker(b, Math.min(1, b.t));
      if (b.t >= 1) { b.state = 'in'; b.t = 0; b.el.remove(); b.el = null; g.visible = true; }
      continue;
    }
    g.rotation.y += dt * 0.9;
    g.rotation.z = 0.2 * Math.sin(t * 2 + b.spin);
    g.position.set(b.home.x, b.home.y + 0.18 * Math.sin(t * 2.4 + b.spin), 0);
    g.userData.spark.visible = Math.sin(t * 30 + b.spin) > -0.3;
    const S = STAR * 0.8;
    if (b.state === 'in') {
      b.t += dt / 0.3;
      g.scale.setScalar(S * Math.max(0.0001, backOut(Math.min(1, b.t))));
      if (b.t >= 1) { b.state = 'live'; b.t = 0; }
    } else if (b.state === 'live') {
      b.t += dt;
      const left = BOMB_LIFE - b.t;
      g.scale.setScalar(S * (left < 1 ? 1 + 0.14 * Math.sin(t * 30) : 1)); // jitters in its last second
      if (left <= 0) { const pos = g.position.clone(); removeBomb(i); explode(pos, true); continue; }
    } else {
      b.t += dt / 0.25;
      g.scale.setScalar(S * Math.max(0.0001, 1 - b.t));
      if (b.t >= 1) { removeBomb(i); continue; }
    }
    if (mode === 'play' && snout && b.state !== 'out' && invuln <= 0) {
      const r = S * 1.1 + 0.6;
      if (snout.distanceTo(g.position) < r || head.distanceTo(g.position) < r) {
        const pos = g.position.clone();
        removeBomb(i);
        explode(pos);
        loseLife();
        return;
      }
    }
  }
}

// ── score + the shared counter ─────────────────────────
const scoreEl = $('#score');
// field clear: the star you just ate was the only one out. Bonus points, the next star appears at once, streak +1.
function toScreen(v) {
  const r = screen.getBoundingClientRect();
  return [(v.x / W + 0.5) * r.width, (0.5 - v.y / H) * r.height];
}
function setStreak(n, up) {
  streak = n;
  const el = $('#streak');
  el.textContent = '×' + n;
  el.classList.toggle('zero', n === 0);
  if (up) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 180); }
  if (up && driver === 'user' && n > bestStreak) { // the AI's streaks don't count
    bestStreak = n;
    $('#bestStreak').textContent = '×' + n;
    try { localStorage.setItem('dragon-best-streak', String(n)); } catch (e) {}
  }
}
function clearFx(pos, n, bonus) {
  // a ring of little stars bursting outward, a pulse on the frame, and a floating callout
  const ring = 10 + Math.min(n, 8) * 2;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2, sp = 9 + Math.min(n, 8) * 1.2;
    const m = new THREE.Mesh(starGeo, starMat);
    m.position.copy(pos); m.frustumCulled = false;
    m.scale.setScalar(STAR * 0.35);
    scene.add(m);
    bits.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp, 0), life: 0.55, grav: 0 });
  }
  screen.classList.remove('streakfx'); void screen.offsetWidth; screen.classList.add('streakfx');
  const [x, y] = toScreen(pos);
  const el = document.createElement('div');
  el.className = 'pop-txt';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.setProperty('--s', String(Math.min(n, 8)));
  el.innerHTML = 'clear +' + bonus + '<b>×' + n + '</b>';
  screen.insertBefore(el, $('#state').parentNode);
  setTimeout(() => el.remove(), 1300);
}
function fastSpawn() {
  // the next star skips its countdown: finish one that's on its way, or make a new one right now
  spawnT = 0;
  const waiting = stars.find((o) => o.state === 'warn');
  if (waiting) { waiting.t = 1; return; }
  const n = stars.length;
  spawnStar();
  if (stars.length > n) stars[stars.length - 1].t = 1;
}
function collect(s) {
  const alone = !stars.some((o) => o !== s && (o.state === 'idle' || o.state === 'in'));
  let pts = 1;
  if (alone) {
    const bonus = Math.min(streak + 1, 10);
    setStreak(streak + 1, true);
    pts += bonus;
    clearFx(s.m.position.clone(), streak, bonus);
    if (streak % 25 === 0) gainLife(s.m.position.clone());
    fastSpawn();
  }
  score += pts;
  scoreEl.textContent = pad(score);
  scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
  setTimeout(() => scoreEl.classList.remove('bump'), 160);
  if (driver === 'ai') return; // the AI's stars don't count toward your best or all time
  if (score > best) { best = score; $('#best').textContent = pad(best); try { localStorage.setItem('dragon-best', String(best)); } catch (e) {} }
  shared.add(1);
}

// all-time stars, shared by every visitor: one public counter, bumped once per star
const shared = (() => {
  const el = $('#global');
  const BASE = 'https://abacus.jasoncameron.dev';
  const KEY = 'matthewzhou-ca/stars';
  let server = null, pending = 0, inflight = false;
  const show = () => { el.textContent = server == null ? '—' : (server + pending).toLocaleString('en-CA'); };
  const pump = async () => {
    if (inflight || pending <= 0) return;
    inflight = true;
    try {
      const r = await fetch(`${BASE}/hit/${KEY}`, { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); pending--; server = Number(j.value) || server; }
      else if (r.status === 429) await new Promise((res) => setTimeout(res, 4000)); // rate limited: wait and retry
      else pending = 0;
    } catch (e) { pending = 0; }
    inflight = false;
    show();
    if (pending > 0) setTimeout(pump, 400);
  };
  fetch(`${BASE}/get/${KEY}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : r.status === 404 ? { value: 0 } : Promise.reject()))
    .then((j) => { server = Number(j.value) || 0; show(); })
    .catch(() => { el.textContent = 'offline'; });
  return {
    add(n) { pending += n; show(); pump(); },
    total() { return server == null ? null : server + pending; },
  };
})();

// ── modes ──────────────────────────────────────────────
const stateEl = $('#state'), hint = $('#hint');
function setMode(m) {
  const was = mode;
  mode = m;
  screen.classList.toggle('playing', m === 'play' || m === 'pause');
  screen.classList.toggle('paused', m === 'pause');
  stateEl.textContent = m === 'pause' ? 'paused · click to resume' : m === 'over' ? 'gg u ded · click to play again' : 'click to play';
  hint.textContent = m === 'play' ? 'click to pause' : m === 'pause' ? 'click to resume' : m === 'over' ? 'click to play again' : 'click to play';
  if (m === 'play' && (was === 'attract' || was === 'over')) { score = 0; scoreEl.textContent = pad(0); bombT = 0; setStreak(0); newRun(); }
  if (m === 'over') setStreak(0);
}
const toggle = () => setMode(mode === 'play' ? 'pause' : 'play');
renderLives();
function setDriver(d) {
  if (d === driver) return;
  driver = d;
  $('#m-play').setAttribute('aria-pressed', String(d === 'user'));
  $('#m-idle').setAttribute('aria-pressed', String(d === 'ai'));
  $('#m-note').textContent = d === 'ai' ? 'idle · an ai plays' : 'play · dragon follows your cursor';
  window.__targetLabel = d === 'ai' ? 'nearest star' : 'cursor';
  $('#target').textContent = window.__targetLabel;
  chasing = false;
  score = 0; scoreEl.textContent = pad(0); setStreak(0); newRun(); // a new run for whoever is steering now
  if (d === 'ai' && (mode === 'attract' || mode === 'over')) setMode('play');
}
$('#m-play').addEventListener('click', () => setDriver('user'));
$('#m-idle').addEventListener('click', () => setDriver('ai'));
window.__game = { driver: (d) => setDriver(d), play: () => mode !== 'play' && setMode('play'), pause: () => mode === 'play' && setMode('pause'), score: () => score, streak: () => streak, lives: () => lives, best: () => best, total: () => shared.total() };

const fmtN = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);
function aimAt(cx, cy) {
  const r = screen.getBoundingClientRect();
  const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
  $('#cx').textContent = fmtN(nx); $('#cy').textContent = fmtN(ny);
  if (mode === 'pause') return; // frozen until resumed
  aim.set(THREE.MathUtils.clamp((nx * W) / 2, -bounds.x, bounds.x), THREE.MathUtils.clamp((ny * H) / 2, -bounds.y, bounds.y), 0);
  chasing = true;
}
let lastX = 0, lastY = 0;
screen.addEventListener('pointermove', (e) => { lastX = e.clientX; lastY = e.clientY; aimAt(e.clientX, e.clientY); });
screen.addEventListener('pointerleave', () => { chasing = false; });
screen.addEventListener('pointerdown', (e) => { lastX = e.clientX; lastY = e.clientY; toggle(); aimAt(e.clientX, e.clientY); });
screen.tabIndex = 0;
screen.setAttribute('role', 'button');
screen.setAttribute('aria-label', 'Dragon game. Press to play or pause.');
screen.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
});
window.addEventListener('summon', () => { if (mode !== 'play') setMode('play'); });
window.addEventListener('crt', () => build());
new ResizeObserver(() => build()).observe(screen);
build();

// load the model
function loadDragon(onLoad, onError) {
  new GLTFLoader().load(import.meta.env.BASE_URL + 'models/dragon.glb', onLoad, undefined, onError);
}
loadDragon((gltf) => {
  const bones = {};
  let tris = 0;
  gltf.scene.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.frustumCulled = false;
      o.geometry.computeVertexNormals();
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      if (o.name.includes('Eye')) {
        const pos = o.geometry.attributes.position;
        const sides = [[], []];
        for (let i = 0; i < pos.count; i++) sides[pos.getZ(i) > 0 ? 0 : 1].push(i);
        for (const idx of sides) {
          if (!idx.length) continue;
          const c = new THREE.Vector3();
          for (const i of idx) c.add(new THREE.Vector3().fromBufferAttribute(pos, i));
          c.divideScalar(idx.length);
          for (const i of idx) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(c).multiplyScalar(0.45).add(c); pos.setXYZ(i, v.x, v.y, v.z); }
        }
        pos.needsUpdate = true;
        o.material = eyeMat;
      } else {
        o.material = phosMat;
      }
    }
  });
  const restQ = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
  const spineLen = bones.Spine_01.position.length();
  const headLen = 1.29;
  rig = { bones, restQ, spineLen, headLen, root: bones.Spine_00.parent, bodyRig: headLen + NB * spineLen };
  group.add(gltf.scene);
  $('#tris').textContent = Math.round(tris).toLocaleString('en-CA');
  build();
  $('#boot').classList.add('gone');
}, () => {
  $('#boot').textContent = 'dragon.glb failed to load · refresh to retry';
});

// ── loop ───────────────────────────────────────────────
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, t = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const crt = window.__crt ? window.__crt() : true;
  phosMat.uniforms.uScan.value = crt ? 1 : 0;
  starMat.uniforms.uScan.value = crt ? 1 : 0;
  if (crt) { fadeMat.uniforms.uA.value = 0.32; renderer.render(fadeScene, camera); } else renderer.clear();
  renderer.clearDepth();
  if (mode !== 'pause') {
    t += dt;
    let snout = null;
    if (rig && trail.length) {
      if (mode === 'over') wave += dt * 1.2; // stunned: stays put, just breathes
      else steer(dt, t);
      snout = pose(t);
    }
    updateStun(t);
    updateStars(dt, t, snout);
    if (mode === 'play') runT += dt;
    if (invuln > 0) invuln -= dt;
    group.visible = invuln > 0 ? Math.floor(t * 14) % 2 === 0 : true;
    updateBombs(dt, t, snout);
    updateBits(dt);
  }
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { $('#fps').textContent = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
