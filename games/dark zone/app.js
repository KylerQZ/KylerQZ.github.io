const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d');

function syncMaskSize() {
  if (maskCanvas.width !== canvas.width) maskCanvas.width = canvas.width;
  if (maskCanvas.height !== canvas.height) maskCanvas.height = canvas.height;
}

const WORLD = {
  w: 1800,
  h: 1000,
};

const player = {
  x: 250,
  y: 250,
  size: 14,
  speed: 154,
};

const mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2,
};

const keys = new Set();

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ([
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    'w', 'a', 's', 'd'
  ].includes(k)) {
    e.preventDefault();
  }
  keys.add(k);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * (canvas.width / r.width);
  const sy = (e.clientY - r.top) * (canvas.height / r.height);
  mouse.x = clamp(sx, 0, canvas.width);
  mouse.y = clamp(sy, 0, canvas.height);
});

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function roundedRectPath(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Map: 3 rooms + 1 corridor. Walls are rectangles you can't walk through.
// Background is open floor; walls block movement.
const WALLS = [
  // Outer world bounds (thick walls)
  { x: -40, y: -40, w: WORLD.w + 80, h: 40 },
  { x: -40, y: WORLD.h, w: WORLD.w + 80, h: 40 },
  { x: -40, y: 0, w: 40, h: WORLD.h },
  { x: WORLD.w, y: 0, w: 40, h: WORLD.h },

  // Room 1 (top-left)
  { x: 100, y: 80, w: 520, h: 20 },
  { x: 100, y: 80, w: 20, h: 300 },
  { x: 100, y: 360, w: 520, h: 20 },
  { x: 600, y: 80, w: 20, h: 110 },
  { x: 600, y: 250, w: 20, h: 130 },

  // Corridor (connects Room1 -> Room2)
  // Corridor walls
  { x: 620, y: 180, w: 360, h: 20 },
  { x: 620, y: 260, w: 360, h: 20 },

  // Room 2 (top-right)
  { x: 980, y: 80, w: 520, h: 20 },
  { x: 980, y: 80, w: 20, h: 300 },
  { x: 980, y: 360, w: 520, h: 20 },
  { x: 1480, y: 80, w: 20, h: 300 },

  // Doorway from corridor into Room2 (gap in left wall of room2)
  // We create the room2 left wall as two segments leaving a gap aligned to corridor
  // (Replace the earlier full wall at x=980 with segments)
];

// Rebuild room2 left wall with a gap (remove the earlier full segment)
// We'll just filter that one out and push split segments.
for (let i = WALLS.length - 1; i >= 0; i--) {
  const r = WALLS[i];
  if (r.x === 980 && r.y === 80 && r.w === 20 && r.h === 300) {
    WALLS.splice(i, 1);
  }
}
// Gap between y=180..280 (corridor open)
WALLS.push(
  { x: 980, y: 80, w: 20, h: 100 },
  { x: 980, y: 280, w: 20, h: 100 }
);

// Room 3 (bottom center)
WALLS.push(
  { x: 520, y: 560, w: 760, h: 20 },
  { x: 520, y: 560, w: 20, h: 320 },
  { x: 520, y: 860, w: 760, h: 20 },
  { x: 1260, y: 560, w: 20, h: 320 }
);

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function tryMove(dx, dy) {
  let nx = player.x + dx;
  let ny = player.y + dy;

  const half = player.size / 2;
  const px = nx - half;
  const py = ny - half;
  const ps = player.size;

  for (const w of WALLS) {
    if (!rectsOverlap(px, py, ps, ps, w.x, w.y, w.w, w.h)) continue;

    // Resolve separately per-axis for simple collision.
    if (dx !== 0) {
      // Move back on x
      nx = player.x;
    }
    if (dy !== 0) {
      ny = player.y;
    }
  }

  player.x = clamp(nx, 0, WORLD.w);
  player.y = clamp(ny, 0, WORLD.h);
}

function getInputDir() {
  const up = keys.has('w') || keys.has('arrowup');
  const down = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');

  let dx = 0;
  let dy = 0;
  if (up) dy -= 1;
  if (down) dy += 1;
  if (left) dx -= 1;
  if (right) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  return { dx, dy };
}

function getCamera() {
  const cx = player.x;
  const cy = player.y;

  const camX = clamp(cx - canvas.width / 2, 0, WORLD.w - canvas.width);
  const camY = clamp(cy - canvas.height / 2, 0, WORLD.h - canvas.height);

  return { x: camX, y: camY };
}

function drawPlayer(cam) {
  const cx = Math.round(player.x - cam.x);
  const cy = Math.round(player.y - cam.y);
  const s = player.size;

  const bodyW = s;
  const bodyH = Math.max(10, Math.round(s * 1.25));
  const x = Math.round(cx - bodyW / 2);
  const y = Math.round(cy - bodyH / 2);

  const outline = 'rgba(0,0,0,0.35)';
  const body = '#00ff3a';
  const bodyDark = '#00c62f';

  const bpW = Math.max(6, Math.round(bodyW * 0.45));
  const bpH = Math.max(8, Math.round(bodyH * 0.65));
  const bpX = x - Math.round(bpW * 0.4);
  const bpY = y + Math.round(bodyH * 0.2);
  ctx.fillStyle = bodyDark;
  roundedRectPath(bpX, bpY, bpW, bpH, Math.round(s * 0.35));
  ctx.fill();

  ctx.fillStyle = body;
  roundedRectPath(x, y, bodyW, bodyH, Math.round(s * 0.45));
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  const visorW = Math.max(6, Math.round(bodyW * 0.75));
  const visorH = Math.max(4, Math.round(bodyH * 0.35));
  const visorX = x + Math.round(bodyW * 0.18);
  const visorY = y + Math.round(bodyH * 0.22);

  ctx.fillStyle = '#9ae7ff';
  roundedRectPath(visorX, visorY, visorW, visorH, Math.round(s * 0.35));
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  roundedRectPath(visorX + 1, visorY + 1, Math.max(2, Math.round(visorW * 0.35)), Math.max(2, Math.round(visorH * 0.55)), Math.round(s * 0.25));
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWorld(cam) {
  // Floor
  ctx.fillStyle = '#b01212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light grid for orientation
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#9fb3c8';
  ctx.lineWidth = 1;
  const grid = 60;
  for (let x = -((cam.x % grid)); x < canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = -((cam.y % grid)); y < canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Walls
  ctx.fillStyle = '#3d4f68';
  for (const w of WALLS) {
    const sx = Math.round(w.x - cam.x);
    const sy = Math.round(w.y - cam.y);
    ctx.fillRect(sx, sy, w.w, w.h);
  }

  // Player (white block)
  drawPlayer(cam);
}

function drawVisionMask(cam) {
  // Among Us-like darkness: dark overlay with a circular reveal around player.
  // We use destination-out to punch a hole in an OFFSCREEN darkness mask,
  // then draw that mask on top of the world.
  syncMaskSize();
  const px = player.x - cam.x;
  const py = player.y - cam.y;

  const baseRadius = 72;
  const forwardRadius = 90;
  const forwardOffset = 51;

  maskCtx.save();

  // Full darkness layer
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  // Cut-out circles (with feather)
  maskCtx.globalCompositeOperation = 'destination-out';
  {
    const g = maskCtx.createRadialGradient(px, py, baseRadius * 0.55, px, py, baseRadius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    maskCtx.fillStyle = g;
    maskCtx.beginPath();
    maskCtx.arc(px, py, baseRadius, 0, Math.PI * 2);
    maskCtx.fill();
  }

  {
    const dx = mouse.x - px;
    const dy = mouse.y - py;
    const len = Math.hypot(dx, dy);
    const ux = len > 0.001 ? (dx / len) : 0;
    const uy = len > 0.001 ? (dy / len) : 0;
    const cx = px + ux * forwardOffset;
    const cy = py + uy * forwardOffset;

    const g2 = maskCtx.createRadialGradient(cx, cy, forwardRadius * 0.55, cx, cy, forwardRadius);
    g2.addColorStop(0, 'rgba(0,0,0,1)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    maskCtx.fillStyle = g2;
    maskCtx.beginPath();
    maskCtx.arc(cx, cy, forwardRadius, 0, Math.PI * 2);
    maskCtx.fill();
  }

  maskCtx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const { dx, dy } = getInputDir();
  tryMove(dx * player.speed * dt, dy * player.speed * dt);

  const cam = getCamera();

  drawWorld(cam);
  drawVisionMask(cam);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
