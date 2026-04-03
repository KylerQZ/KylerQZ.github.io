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
  x: 140,
  y: 140,
  size: 22,
  speed: 108,
};

let walkT = 0;
let walkAmt = 0;

const mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2,
};

const errorOverlay = document.createElement('div');
errorOverlay.style.position = 'fixed';
errorOverlay.style.left = '12px';
errorOverlay.style.right = '12px';
errorOverlay.style.bottom = '12px';
errorOverlay.style.padding = '10px 12px';
errorOverlay.style.borderRadius = '12px';
errorOverlay.style.background = 'rgba(0,0,0,0.72)';
errorOverlay.style.color = '#ffb3b3';
errorOverlay.style.fontSize = '12px';
errorOverlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
errorOverlay.style.whiteSpace = 'pre-wrap';
errorOverlay.style.zIndex = '9999';
errorOverlay.style.display = 'none';
document.body.appendChild(errorOverlay);

window.addEventListener('error', (e) => {
  errorOverlay.style.display = 'block';
  errorOverlay.textContent = String(e.message || e.error || e);
});

const keys = new Set();

let mouseDown = false;

const bullets = [];
const gun = {
  cooldown: 0.32,
  timer: 0,
  bulletSpeed: 560,
  bulletRadius: 3,
};

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

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * (canvas.width / r.width);
  const sy = (e.clientY - r.top) * (canvas.height / r.height);
  mouse.x = clamp(sx, 0, canvas.width);
  mouse.y = clamp(sy, 0, canvas.height);
}

canvas.addEventListener('pointermove', (e) => {
  updatePointer(e);
});

canvas.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary) return;
  updatePointer(e);
  mouseDown = true;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (!e.isPrimary) return;
  mouseDown = false;
});

canvas.addEventListener('pointercancel', () => {
  mouseDown = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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

function roundedRectPathTo(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function rectContainsPoint(rx, ry, rw, rh, px, py) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function rayAabbDistance(ox, oy, dx, dy, rx, ry, rw, rh, maxDist) {
  const eps = 1e-8;
  let tmin = -Infinity;
  let tmax = Infinity;

  if (Math.abs(dx) < eps) {
    if (ox < rx || ox > rx + rw) return null;
  } else {
    let tx1 = (rx - ox) / dx;
    let tx2 = (rx + rw - ox) / dx;
    if (tx1 > tx2) [tx1, tx2] = [tx2, tx1];
    tmin = Math.max(tmin, tx1);
    tmax = Math.min(tmax, tx2);
  }

  if (Math.abs(dy) < eps) {
    if (oy < ry || oy > ry + rh) return null;
  } else {
    let ty1 = (ry - oy) / dy;
    let ty2 = (ry + rh - oy) / dy;
    if (ty1 > ty2) [ty1, ty2] = [ty2, ty1];
    tmin = Math.max(tmin, ty1);
    tmax = Math.min(tmax, ty2);
  }

  if (tmax < 0) return null;
  if (tmin > tmax) return null;

  const tHit = tmin >= 0 ? tmin : tmax;
  if (tHit < 0) return null;
  if (tHit > maxDist) return null;
  return tHit;
}

function raycastToWalls(ox, oy, dx, dy, maxDist, screenWalls) {
  let best = maxDist;
  for (const w of screenWalls) {
    if (rectContainsPoint(w.x, w.y, w.w, w.h, ox, oy)) continue;
    const hit = rayAabbDistance(ox, oy, dx, dy, w.x, w.y, w.w, w.h, maxDist);
    if (hit === null) continue;
    if (hit < best) best = hit;
  }
  return best;
}

function getAimDirectionScreen(cam) {
  const px = player.x - cam.x;
  const py = player.y - cam.y;
  const dx = mouse.x - px;
  const dy = mouse.y - py;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

// Map: 3 rooms + 1 corridor. Walls are rectangles you can't walk through.
// Background is open floor; walls block movement.
function buildBlockMapWalls() {
  const walls = [
    // Outer world bounds (thick walls)
    { x: -40, y: -40, w: WORLD.w + 80, h: 40 },
    { x: -40, y: WORLD.h, w: WORLD.w + 80, h: 40 },
    { x: -40, y: 0, w: 40, h: WORLD.h },
    { x: WORLD.w, y: 0, w: 40, h: WORLD.h },
  ];

  const block = 240;
  const cols = 3;
  const rows = 3;
  const startX = 260;
  const startY = 140;
  const gapX = 520;
  const gapY = 300;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls.push({
        x: startX + c * gapX,
        y: startY + r * gapY,
        w: block,
        h: block,
      });
    }
  }

  return walls;
}

const WALLS = buildBlockMapWalls();

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

  const footW = Math.max(6, Math.round(bodyW * 0.32));
  const footH = Math.max(4, Math.round(bodyH * 0.22));
  const footAnim = Math.sin(walkT) * Math.round(footH * 0.35) * walkAmt;
  const footY = y + bodyH - Math.round(footH * 0.45);
  const leftFootX = x + Math.round(bodyW * 0.18);
  const rightFootX = x + bodyW - Math.round(bodyW * 0.18) - footW;
  ctx.fillStyle = bodyDark;
  roundedRectPath(leftFootX, footY - footAnim, footW, footH, Math.round(s * 0.25));
  ctx.fill();
  roundedRectPath(rightFootX, footY + footAnim, footW, footH, Math.round(s * 0.25));
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

  const aim = getAimDirectionScreen(cam);
  const ang = Math.atan2(aim.y, aim.x);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(Math.round(s * 0.35), Math.round(-s * 0.16), Math.round(s * 0.75), Math.max(3, Math.round(s * 0.22)));
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(Math.round(s * 0.35), Math.round(s * 0.02), Math.round(s * 0.26), Math.max(3, Math.round(s * 0.34)));
  ctx.restore();
}

function shoot(cam) {
  const aim = getAimDirectionScreen(cam);
  const mxWorld = cam.x + mouse.x;
  const myWorld = cam.y + mouse.y;
  const dx = mxWorld - player.x;
  const dy = myWorld - player.y;
  const len = Math.hypot(dx, dy);
  const ux = len > 0.001 ? dx / len : aim.x;
  const uy = len > 0.001 ? dy / len : aim.y;

  bullets.push({
    x: player.x + ux * (player.size * 0.9),
    y: player.y + uy * (player.size * 0.9),
    vx: ux * gun.bulletSpeed,
    vy: uy * gun.bulletSpeed,
    r: gun.bulletRadius,
    life: 2.0,
  });
}

function stepBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    const moveX = b.vx * dt;
    const moveY = b.vy * dt;
    const dist = Math.hypot(moveX, moveY);
    if (dist < 0.0001) continue;
    const dx = moveX / dist;
    const dy = moveY / dist;

    let bestHit = null;
    for (const w of WALLS) {
      const rx = w.x - b.r;
      const ry = w.y - b.r;
      const rw = w.w + b.r * 2;
      const rh = w.h + b.r * 2;
      const hit = rayAabbDistance(b.x, b.y, dx, dy, rx, ry, rw, rh, dist);
      if (hit === null) continue;
      if (bestHit === null || hit < bestHit) bestHit = hit;
    }

    if (bestHit !== null) {
      bullets.splice(i, 1);
      continue;
    }

    b.x += moveX;
    b.y += moveY;
  }
}

function drawBullets(cam) {
  ctx.fillStyle = '#ffd34a';
  for (const b of bullets) {
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorld(cam) {
  // Floor
  ctx.fillStyle = '#66c9ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light grid for orientation
  ctx.globalAlpha = 0.0;
  ctx.strokeStyle = '#000000';
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
  ctx.fillStyle = '#05080c';
  for (const w of WALLS) {
    const sx = Math.round(w.x - cam.x);
    const sy = Math.round(w.y - cam.y);
    ctx.fillRect(sx, sy, w.w, w.h);
  }

  // Player (white block)
  drawPlayer(cam);

  drawBullets(cam);
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

  const screenWalls = [];
  for (const w of WALLS) {
    screenWalls.push({ x: w.x - cam.x, y: w.y - cam.y, w: w.w, h: w.h });
  }

  const aim = getAimDirectionScreen(cam);

  maskCtx.save();

  // Full darkness layer
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  // Cut-out polygon (vision blocked by walls)
  maskCtx.globalCompositeOperation = 'destination-out';
  {
    const rays = 420;
    const dirs = [];
    const dists = [];

    for (let i = 0; i <= rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);

      const dot = dx * aim.x + dy * aim.y;
      const boost = Math.max(0, dot);
      const maxDist = baseRadius + (forwardRadius - baseRadius) * Math.pow(boost, 1.35);

      const dist = raycastToWalls(px, py, dx, dy, maxDist, screenWalls);
      dirs.push({ x: dx, y: dy });
      dists.push(dist);
    }

    const layersCount = 14;
    const minK = 0.22;
    maskCtx.lineJoin = 'round';

    for (let j = 0; j < layersCount; j++) {
      const t = j / (layersCount - 1); // 0 inner -> 1 outer
      const k = minK + (1 - minK) * t;
      const a = 1 - (1 - 0.02) * Math.pow(t, 1.35);
      maskCtx.fillStyle = `rgba(0,0,0,${a})`;
      maskCtx.beginPath();
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        const dist = dists[i] * k;
        const x = px + d.x * dist;
        const y = py + d.y * dist;
        if (i === 0) maskCtx.moveTo(x, y);
        else maskCtx.lineTo(x, y);
      }
      maskCtx.closePath();
      maskCtx.fill();
    }
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
  const moveMag = Math.hypot(dx, dy);
  walkAmt = moveMag;
  if (moveMag > 0) {
    walkT += dt * 10;
  }
  tryMove(dx * player.speed * dt, dy * player.speed * dt);

  stepBullets(dt);

  const cam = getCamera();

  gun.timer = Math.max(0, gun.timer - dt);
  if (mouseDown && gun.timer <= 0) {
    shoot(cam);
    gun.timer = gun.cooldown;
  }

  drawWorld(cam);
  drawVisionMask(cam);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
