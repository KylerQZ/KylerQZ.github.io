const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d');

function syncMaskSize() {
  if (maskCanvas.width !== canvas.width) maskCanvas.width = canvas.width;
  if (maskCanvas.height !== canvas.height) maskCanvas.height = canvas.height;
}

function drawEnemy(cam) {
  if (enemy.dead) return;
  const cx = Math.round(enemy.x - cam.x);
  const cy = Math.round(enemy.y - cam.y);
  const s = enemy.size;

  const bodyW = s;
  const bodyH = Math.max(10, Math.round(s * 1.25));
  const x = Math.round(cx - bodyW / 2);
  const y = Math.round(cy - bodyH / 2);

  ctx.fillStyle = '#d9d9d9';
  roundedRectPath(x, y, bodyW, bodyH, Math.round(s * 0.45));
  ctx.fill();

  ctx.fillStyle = '#9ae7ff';
  const visorW = Math.max(6, Math.round(bodyW * 0.75));
  const visorH = Math.max(4, Math.round(bodyH * 0.35));
  const visorX = x + Math.round(bodyW * 0.18);
  const visorY = y + Math.round(bodyH * 0.22);
  roundedRectPath(visorX, visorY, visorW, visorH, Math.round(s * 0.35));
  ctx.fill();
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
  maxHp: 50,
  hp: 50,
};

const enemy = {
  x: 640,
  y: 410,
  size: 22,
  speed: 92,
  maxHp: 50,
  hp: 50,
  touchDamage: 5,
  touchCooldown: 0,
  retreatTimer: 0,
  dead: false,
  respawnTimer: 0,
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
const justPressed = new Set();

let mouseDown = false;

const bullets = [];
const gun = {
  cooldown: 0.32,
  timer: 0,
  bulletSpeed: 560,
  bulletRadius: 3,
  damage: 5,
};

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ([
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    'w', 'a', 's', 'd'
  ].includes(k)) {
    e.preventDefault();
  }
  if (!keys.has(k)) justPressed.add(k);
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

function pointInActor(ax, ay, actor, pad = 0) {
  const half = actor.size / 2;
  return rectContainsPoint(actor.x - half - pad, actor.y - half - pad, actor.size + pad * 2, actor.size + pad * 2, ax, ay);
}

function resetActorHp(actor) {
  actor.hp = actor.maxHp;
}

function resetPositions() {
  player.x = 140;
  player.y = 140;
  enemy.x = 640;
  enemy.y = 410;
  enemy.touchCooldown = 0;
  enemy.retreatTimer = 0;
  enemy.dead = false;
  enemy.respawnTimer = 0;

  effects.speedTimer = 0;
  effects.visionTimer = 0;
  effects.gunTimer = 0;
  effects.specialTimer = 0;
  chestState.messageTimer = 0;
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

const effects = {
  speedTimer: 0,
  visionTimer: 0,
  gunTimer: 0,
  specialTimer: 0,
};

const loot = {
  gold: 0,
  goldenFootballs: 0,
};

const chestState = {
  message: '',
  messageTimer: 0,
  scareTimer: 0,
};

const chests = [];
const CHEST_COUNT = 5;
const CHEST_SIZE = 18;
const CHEST_OPEN_RANGE = 54;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function rectsOverlapPad(ax, ay, aw, ah, bx, by, bw, bh, pad) {
  return rectsOverlap(ax - pad, ay - pad, aw + pad * 2, ah + pad * 2, bx, by, bw, bh);
}

function chestOverlapsWalls(x, y, size) {
  const half = size / 2;
  const rx = x - half;
  const ry = y - half;
  for (const w of WALLS) {
    if (rectsOverlap(rx, ry, size, size, w.x, w.y, w.w, w.h)) return true;
  }
  return false;
}

function placeChest(chest) {
  const margin = 60;
  for (let tries = 0; tries < 700; tries++) {
    const x = rand(margin, WORLD.w - margin);
    const y = rand(margin, WORLD.h - margin);
    if (chestOverlapsWalls(x, y, CHEST_SIZE + 10)) continue;
    if (dist(x, y, player.x, player.y) < 180) continue;
    let ok = true;
    for (const c of chests) {
      if (c !== chest && c.state !== 'gone') {
        if (dist(x, y, c.x, c.y) < 80) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;
    chest.x = x;
    chest.y = y;
    chest.state = 'closed';
    chest.t = 0;
    return;
  }

  chest.x = player.x + 220;
  chest.y = player.y + 120;
  chest.state = 'closed';
  chest.t = 0;
}

function initChests() {
  if (chests.length) return;
  for (let i = 0; i < CHEST_COUNT; i++) {
    const chest = { x: 0, y: 0, state: 'closed', t: 0 };
    chests.push(chest);
  }
  for (const c of chests) placeChest(c);
}

function findClosestChest() {
  let best = null;
  let bestD = Infinity;
  for (const c of chests) {
    if (c.state !== 'closed') continue;
    const d = dist(player.x, player.y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { chest: best, d: bestD };
}

function setChestMessage(text) {
  chestState.message = text;
  chestState.messageTimer = 1.8;
}

function applyLoot() {
  chestState.scareTimer = 0.22;
  const roll = Math.random();
  if (roll < 0.34) {
    const amt = Math.floor(rand(8, 22));
    loot.gold += amt;
    setChestMessage(`Found: Gold (+${amt})`);
    return;
  }
  if (roll < 0.56) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + 10);
    setChestMessage(`Found: Heal (+${player.hp - before})`);
    return;
  }
  if (roll < 0.74) {
    effects.speedTimer = 8;
    setChestMessage('Found: Speed Boost (8s)');
    return;
  }
  if (roll < 0.88) {
    effects.visionTimer = 10;
    setChestMessage('Found: Vision Boost (10s)');
    return;
  }
  if (roll < 0.95) {
    effects.gunTimer = 9;
    setChestMessage('Found: Power Shots (9s)');
    return;
  }
  if (roll < 0.985) {
    loot.goldenFootballs += 1;
    setChestMessage('Found: Golden Football');
    return;
  }
  effects.specialTimer = 10;
  setChestMessage('Found: Special Weapon (10s)');
}

function stepChests(dt) {
  initChests();

  effects.speedTimer = Math.max(0, effects.speedTimer - dt);
  effects.visionTimer = Math.max(0, effects.visionTimer - dt);
  effects.gunTimer = Math.max(0, effects.gunTimer - dt);
  effects.specialTimer = Math.max(0, effects.specialTimer - dt);

  chestState.messageTimer = Math.max(0, chestState.messageTimer - dt);
  chestState.scareTimer = Math.max(0, chestState.scareTimer - dt);

  const { chest: nearest, d } = findClosestChest();
  if (nearest && d <= CHEST_OPEN_RANGE && justPressed.has('e')) {
    nearest.state = 'opening';
    nearest.t = 0.26;
  }

  for (const c of chests) {
    if (c.state === 'opening') {
      c.t -= dt;
      if (c.t <= 0) {
        c.state = 'opened';
        c.t = 0.8;
        applyLoot();
      }
    } else if (c.state === 'opened') {
      c.t -= dt;
      if (c.t <= 0) {
        c.state = 'gone';
        c.t = 7.5;
      }
    } else if (c.state === 'gone') {
      c.t -= dt;
      if (c.t <= 0) {
        placeChest(c);
      }
    }
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function actorsOverlap(a, b) {
  const ah = a.size / 2;
  const bh = b.size / 2;
  return rectsOverlap(a.x - ah, a.y - ah, a.size, a.size, b.x - bh, b.y - bh, b.size, b.size);
}

function moveActor(actor, dx, dy) {
  let nx = actor.x + dx;
  let ny = actor.y + dy;

  const half = actor.size / 2;
  const px = nx - half;
  const py = ny - half;
  const ps = actor.size;

  for (const w of WALLS) {
    if (!rectsOverlap(px, py, ps, ps, w.x, w.y, w.w, w.h)) continue;

    // Resolve separately per-axis for simple collision.
    if (dx !== 0) {
      // Move back on x
      nx = actor.x;
    }
    if (dy !== 0) {
      ny = actor.y;
    }
  }

  actor.x = clamp(nx, 0, WORLD.w);
  actor.y = clamp(ny, 0, WORLD.h);
}

function tryMove(dx, dy) {
  moveActor(player, dx, dy);
}

function stepEnemy(dt) {
  if (enemy.dead) {
    enemy.respawnTimer = Math.max(0, enemy.respawnTimer - dt);
    if (enemy.respawnTimer <= 0) {
      enemy.dead = false;
      resetActorHp(enemy);
      enemy.x = 640;
      enemy.y = 410;
      enemy.touchCooldown = 0;
      enemy.retreatTimer = 0;
    }
    return;
  }

  enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
  enemy.retreatTimer = Math.max(0, enemy.retreatTimer - dt);

  const vx = player.x - enemy.x;
  const vy = player.y - enemy.y;
  const dist = Math.hypot(vx, vy);
  const ux = dist > 0.001 ? vx / dist : 0;
  const uy = dist > 0.001 ? vy / dist : 0;

  let mdx = ux;
  let mdy = uy;
  if (enemy.retreatTimer > 0) {
    mdx = -ux;
    mdy = -uy;
  }

  const mag = Math.hypot(mdx, mdy);
  if (mag > 0.001) {
    mdx /= mag;
    mdy /= mag;
  }

  moveActor(enemy, mdx * enemy.speed * dt, mdy * enemy.speed * dt);

  if (actorsOverlap(enemy, player) && enemy.touchCooldown <= 0) {
    player.hp = Math.max(0, player.hp - enemy.touchDamage);
    enemy.touchCooldown = 0.9;
    enemy.retreatTimer = 0.55;

    // Small immediate push so it clearly backs off.
    moveActor(enemy, -ux * 70 * dt, -uy * 70 * dt);

    if (player.hp <= 0) {
      resetActorHp(player);
      resetActorHp(enemy);
      resetPositions();
    }
  }
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

function drawScaryOverlay(now) {
  const t = now * 0.001;
  const flicker = 0.06 + 0.04 * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 17.9);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const r = Math.max(canvas.width, canvas.height) * 0.72;
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, `rgba(0,0,0,${0.10 + flicker})`);
  g.addColorStop(1, `rgba(0,0,0,${0.55 + flicker})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const hpT = 1 - clamp(player.hp / player.maxHp, 0, 1);
  if (hpT > 0.25) {
    const pulse = 0.10 + 0.12 * Math.max(0, Math.sin(t * (6 + hpT * 10)));
    ctx.fillStyle = `rgba(120,0,0,${pulse * hpT})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

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

  const special = effects.specialTimer > 0;

  bullets.push({
    x: player.x + ux * (player.size * 0.9),
    y: player.y + uy * (player.size * 0.9),
    vx: ux * gun.bulletSpeed,
    vy: uy * gun.bulletSpeed,
    r: special ? 5 : gun.bulletRadius,
    damage: gun.damage + (effects.gunTimer > 0 ? 2 : 0) + (special ? 7 : 0),
    life: 2.0,
    owner: 'player',
    color: special ? '#c96bff' : '#ffd34a',
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

    if (!enemy.dead && b.owner !== 'enemy' && pointInActor(b.x, b.y, enemy, b.r)) {
      enemy.hp = Math.max(0, enemy.hp - (b.damage ?? gun.damage));
      bullets.splice(i, 1);
      if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.respawnTimer = 2.2;
      }
      continue;
    }
  }
}

function drawBullets(cam) {
  for (const b of bullets) {
    ctx.fillStyle = b.color ?? '#ffd34a';
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
  ctx.fillStyle = '#001a33';
  for (const w of WALLS) {
    const sx = Math.round(w.x - cam.x);
    const sy = Math.round(w.y - cam.y);
    ctx.fillRect(sx, sy, w.w, w.h);
  }

  for (const c of chests) {
    if (c.state === 'gone') continue;
    const sx = Math.round(c.x - cam.x);
    const sy = Math.round(c.y - cam.y);
    const s = CHEST_SIZE;
    const x = Math.round(sx - s / 2);
    const y = Math.round(sy - s / 2);

    let a = 1;
    if (c.state === 'opening') a = 0.85;
    if (c.state === 'opened') a = 0.55;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#7a4a18';
    roundedRectPath(x, y, s, s, 4);
    ctx.fill();
    ctx.fillStyle = '#4b2c0e';
    ctx.fillRect(x, y + Math.round(s * 0.52), s, Math.max(2, Math.round(s * 0.12)));
    ctx.fillStyle = '#d8b44a';
    ctx.fillRect(x + Math.round(s * 0.42), y + Math.round(s * 0.35), Math.max(2, Math.round(s * 0.16)), Math.max(3, Math.round(s * 0.30)));
    ctx.globalAlpha = 1;
  }

  // Player (white block)
  drawPlayer(cam);

  drawEnemy(cam);

  drawBullets(cam);
}

function drawHpBar(x, y, w, h, hp, maxHp, fill) {
  const t = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * t), h - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawMiniMap() {
  const pad = 12;
  const w = 170;
  const h = 110;
  const x = canvas.width - pad - w;
  const y = pad;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const inner = 8;
  const ix = x + inner;
  const iy = y + inner;
  const iw = w - inner * 2;
  const ih = h - inner * 2;

  const sx = iw / WORLD.w;
  const sy = ih / WORLD.h;

  ctx.fillStyle = 'rgba(102,201,255,0.08)';
  ctx.fillRect(ix, iy, iw, ih);

  // Walls
  ctx.fillStyle = 'rgba(0, 26, 51, 0.92)';
  for (const wall of WALLS) {
    const rx = ix + wall.x * sx;
    const ry = iy + wall.y * sy;
    const rw = wall.w * sx;
    const rh = wall.h * sy;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // Player
  ctx.fillStyle = '#29ff6a';
  ctx.beginPath();
  ctx.arc(ix + player.x * sx, iy + player.y * sy, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHud() {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(12, 12, 220, 186);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(`YOU: ${player.hp}/${player.maxHp}`, 22, 18);
  drawHpBar(22, 34, 200, 12, player.hp, player.maxHp, '#29ff6a');

  ctx.fillStyle = '#ffffff';
  if (enemy.dead) {
    ctx.fillText('ENEMY: DEAD', 22, 50);
    drawHpBar(22, 66, 200, 12, 0, enemy.maxHp, '#ff5c5c');
  } else {
    ctx.fillText(`ENEMY: ${enemy.hp}/${enemy.maxHp}`, 22, 50);
    drawHpBar(22, 66, 200, 12, enemy.hp, enemy.maxHp, '#ff5c5c');
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`Gold: ${loot.gold}`, 22, 82);
  ctx.fillText(`Football: ${loot.goldenFootballs}`, 22, 96);

  const { chest: nearest, d } = findClosestChest();
  if (nearest && d <= CHEST_OPEN_RANGE) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('Press E to open', 22, 112);
  }

  let ty = 130;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  if (effects.speedTimer > 0) {
    ctx.fillText(`Speed: ${effects.speedTimer.toFixed(1)}s`, 22, ty);
    ty += 14;
  }
  if (effects.visionTimer > 0) {
    ctx.fillText(`Vision: ${effects.visionTimer.toFixed(1)}s`, 22, ty);
    ty += 14;
  }
  if (effects.gunTimer > 0) {
    ctx.fillText(`Power: ${effects.gunTimer.toFixed(1)}s`, 22, ty);
    ty += 14;
  }
  if (effects.specialTimer > 0) {
    ctx.fillText(`Special: ${effects.specialTimer.toFixed(1)}s`, 22, ty);
    ty += 14;
  }

  ctx.restore();

  if (chestState.messageTimer > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const alpha = Math.min(1, chestState.messageTimer / 0.2);
    ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
    ctx.fillText(chestState.message, canvas.width * 0.5, canvas.height - 18);
    ctx.restore();
  }

  drawMiniMap();
}

function drawVisionMask(cam, now) {
  // Among Us-like darkness: dark overlay with a circular reveal around player.
  // We use destination-out to punch a hole in an OFFSCREEN darkness mask,
  // then draw that mask on top of the world.
  syncMaskSize();
  const px = player.x - cam.x;
  const py = player.y - cam.y;

  const visionMul = effects.visionTimer > 0 ? 1.22 : 1;
  const baseRadius = 96 * visionMul;
  const forwardRadius = 128 * visionMul;

  const screenWalls = [];
  for (const w of WALLS) {
    screenWalls.push({ x: w.x - cam.x, y: w.y - cam.y, w: w.w, h: w.h });
  }

  const aim = getAimDirectionScreen(cam);

  maskCtx.save();

  // Full darkness layer
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  {
    const t = now * 0.001;
    const flicker = 0.06 + 0.04 * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 17.9) + chestState.scareTimer * 0.35;
    const cx = maskCanvas.width * 0.5;
    const cy = maskCanvas.height * 0.5;
    const r = Math.max(maskCanvas.width, maskCanvas.height) * 0.72;
    const g = maskCtx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, `rgba(0,0,0,${0.10 + flicker})`);
    g.addColorStop(1, `rgba(0,0,0,${0.55 + flicker})`);
    maskCtx.fillStyle = g;
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const hpT = 1 - clamp(player.hp / player.maxHp, 0, 1);
    if (hpT > 0.25) {
      const pulse = 0.10 + 0.12 * Math.max(0, Math.sin(t * (6 + hpT * 10)));
      maskCtx.fillStyle = `rgba(120,0,0,${pulse * hpT})`;
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  }

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

    const clearK = 0.76;
    maskCtx.lineJoin = 'round';

    maskCtx.fillStyle = 'rgba(0,0,0,1)';
    maskCtx.beginPath();
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const dist = dists[i] * clearK;
      const x = px + d.x * dist;
      const y = py + d.y * dist;
      if (i === 0) maskCtx.moveTo(x, y);
      else maskCtx.lineTo(x, y);
    }
    maskCtx.closePath();
    maskCtx.fill();

    const featherCount = 12;
    for (let j = 0; j < featherCount; j++) {
      const t = (j + 1) / featherCount; // 0..1
      const k = clearK + (1 - clearK) * t;
      const a = Math.max(0, Math.min(1, Math.pow(1 - t, 1.35)));
      if (a <= 0.001) continue;
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
  stepChests(dt);

  const speedMul = effects.speedTimer > 0 ? 1.35 : 1;
  tryMove(dx * player.speed * speedMul * dt, dy * player.speed * speedMul * dt);

  stepEnemy(dt);

  stepBullets(dt);

  const cam = getCamera();

  gun.timer = Math.max(0, gun.timer - dt);
  if (mouseDown && gun.timer <= 0) {
    shoot(cam);
    gun.timer = gun.cooldown;
  }

  drawWorld(cam);
  drawVisionMask(cam, now);
  drawHud();

  justPressed.clear();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
