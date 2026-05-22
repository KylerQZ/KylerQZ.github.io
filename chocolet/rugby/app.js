// Rugby — Phase 1 prototype
// All players identical. Top-down 2D, 3v3. WASD + mouse + F + Q + R.

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const W = 1430;
const H = 780;

// Pitch markings
const TRY_L = 78;
const TRY_R = W - TRY_L;
const HALFWAY = W / 2;
const M22_L = TRY_L + 285;
const M22_R = TRY_R - 285;

// Tunables
const PER_TEAM = 3;
const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 168; // 30% slower than before
const AI_SPEED_MULT = 0.92;
const BALL_RADIUS = 7;
const CATCH_RADIUS = 26;
const CATCH_COOLDOWN_MS = 500;
const TACKLE_RADIUS = 40;
const TACKLE_PROB = 0.8;
const TACKLE_COOLDOWN_MS = 5000; // 5s cooldown per player
const STUN_MS = 900;
const KNOCKBACK_PX = 24;
const PASS_MIN = 320;
const PASS_MAX = 920;
const PASS_CHARGE_MS = 1100;
const BALL_FRICTION = 0.985;
const BALL_MIN_SPEED = 8;
const ROUND_S = 60;
const TRY_PAUSE_MS = 1800;
const CONTROLLED_IDX = 0; // always control team A jersey #1

const elScoreA = document.getElementById("scoreA");
const elScoreB = document.getElementById("scoreB");
const elTime = document.getElementById("time");
const elPower = document.getElementById("powerBar");
const elMsg = document.getElementById("msg");

// State
/** @type {Array<{team:'A'|'B', jersey:number, x:number, y:number, vx:number, vy:number, lastTackleMs:number, stunUntilMs:number, requestUntilMs:number}>} */
let players = [];
let impacts = []; // {x,y,t0,life}
let shakeUntilMs = 0;
let shakeMag = 0;
let ball = {
  x: W / 2,
  y: H / 2,
  vx: 0,
  vy: 0,
  carrierIdx: null,
  lastDropMs: 0,
  pickedUpMs: 0,
};

const REQUEST_DURATION_MS = 2500;
const AI_PASS_DELAY_MS = 350;
let scoreA = 0;
let scoreB = 0;
let timeLeft = ROUND_S;
let frozenUntilMs = 0;
let extraTime = false;
let lastFrameMs = 0;
let running = true;

// Inputs
const keys = Object.create(null);
let mouseX = W / 2;
let mouseY = H / 2;
let mouseDown = false;
let chargeStart = 0;

// === Setup ===
function setupKickoff(receivingTeam) {
  players = [];
  const spacingY = (H - 160) / Math.max(1, PER_TEAM - 1 || 1);
  for (let i = 0; i < PER_TEAM; i++) {
    players.push({
      team: "A",
      jersey: i + 1,
      x: TRY_L + 120 + (i % 2) * 70,
      y: 80 + (PER_TEAM > 1 ? i * spacingY : H / 2 - 80),
      vx: 0, vy: 0,
      lastTackleMs: 0,
      stunUntilMs: 0,
      requestUntilMs: 0,
    });
  }
  for (let i = 0; i < PER_TEAM; i++) {
    players.push({
      team: "B",
      jersey: i + 1,
      x: TRY_R - 120 - (i % 2) * 70,
      y: 80 + (PER_TEAM > 1 ? i * spacingY : H / 2 - 80),
      vx: 0, vy: 0,
      lastTackleMs: 0,
      stunUntilMs: 0,
      requestUntilMs: 0,
    });
  }
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastDropMs = performance.now(); // brief grace before auto-catch so race is fair
  ball.carrierIdx = null; // loose ball — both teams race for it
}

function startMatch() {
  scoreA = 0;
  scoreB = 0;
  timeLeft = ROUND_S;
  frozenUntilMs = 0;
  extraTime = false;
  setupKickoff("A");
  setMsg("");
  running = true;
}

function setMsg(s) {
  elMsg.textContent = s || "";
}

// === Input ===
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === "r") startMatch();
  if (k === "f") tryTackle();
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * W;
  mouseY = ((e.clientY - rect.top) / rect.height) * H;
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  const c = controlledIdx();
  if (c < 0) return;
  if (ball.carrierIdx === c) {
    // we have the ball — start charging a pass
    mouseDown = true;
    chargeStart = performance.now();
  } else {
    // no ball — raise a hand for a pass
    players[c].requestUntilMs = performance.now() + REQUEST_DURATION_MS;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  if (!mouseDown) return;
  mouseDown = false;
  const power = chargePower();
  chargeStart = 0;
  attemptPass(power);
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function chargePower() {
  if (!chargeStart) return 0;
  const dt = performance.now() - chargeStart;
  return Math.max(0, Math.min(1, dt / PASS_CHARGE_MS));
}

// === Control selection ===
function controlledIdx() {
  // Always the same player — user controls only #1.
  return CONTROLLED_IDX;
}

// === Pass ===
function attemptPass(power) {
  const idx = controlledIdx();
  if (idx < 0) return;
  if (ball.carrierIdx !== idx) return;

  const p = players[idx];
  let dx = mouseX - p.x;
  let dy = mouseY - p.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  const speed = PASS_MIN + (PASS_MAX - PASS_MIN) * Math.max(0.05, power);
  ball.carrierIdx = null;
  ball.x = p.x + dx * (PLAYER_RADIUS + 6);
  ball.y = p.y + dy * (PLAYER_RADIUS + 6);
  ball.vx = dx * speed;
  ball.vy = dy * speed;
  ball.lastDropMs = performance.now();
  // clear our own pass request when we throw
  p.requestUntilMs = 0;
}

// === Tackle ===
function tryTackle() {
  if (frozenUntilMs > performance.now()) return;
  const idx = controlledIdx();
  if (idx < 0) return;
  const p = players[idx];

  const now = performance.now();
  if (now - p.lastTackleMs < TACKLE_COOLDOWN_MS) return;
  p.lastTackleMs = now;

  if (ball.carrierIdx === null) return;
  const carrier = players[ball.carrierIdx];
  if (carrier.team === p.team) return; // can't tackle teammate

  const dx = carrier.x - p.x;
  const dy = carrier.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d > TACKLE_RADIUS) return;

  if (Math.random() < TACKLE_PROB) {
    completeTackle(idx, ball.carrierIdx, false);
    setMsg("BIG HIT!");
    setTimeout(() => { if (elMsg.textContent === "BIG HIT!") setMsg(""); }, 700);
  } else {
    // glancing bump — small knockback, no turnover
    const dx = carrier.x - p.x;
    const dy = carrier.y - p.y;
    const dl = Math.hypot(dx, dy) || 1;
    carrier.x += (dx / dl) * 6;
    carrier.y += (dy / dl) * 6;
    spawnImpact((p.x + carrier.x) / 2, (p.y + carrier.y) / 2, 0.6);
    setMsg("missed tackle");
    setTimeout(() => { if (elMsg.textContent === "missed tackle") setMsg(""); }, 600);
  }
}

function completeTackle(tacklerIdx, carrierIdx, byAI) {
  const tackler = players[tacklerIdx];
  const carrier = players[carrierIdx];
  const now = performance.now();

  // Hand ball to tackler so the carrier can't insta-recatch
  ball.carrierIdx = tacklerIdx;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastDropMs = now;
  ball.pickedUpMs = now;

  // Knock the carrier back along the hit vector & stun them
  const dx = carrier.x - tackler.x;
  const dy = carrier.y - tackler.y;
  const dl = Math.hypot(dx, dy) || 1;
  carrier.x += (dx / dl) * KNOCKBACK_PX;
  carrier.y += (dy / dl) * KNOCKBACK_PX;
  carrier.vx = 0;
  carrier.vy = 0;
  carrier.stunUntilMs = now + STUN_MS;

  // Tackler also briefly stops (committing to the hit)
  tackler.vx = 0;
  tackler.vy = 0;
  tackler.stunUntilMs = now + STUN_MS * 0.5;

  spawnImpact((tackler.x + carrier.x) / 2, (tackler.y + carrier.y) / 2, 1.0);
  triggerShake(byAI ? 8 : 10, 220);
}

function findRequestingTeammate(carrierIdx) {
  const c = players[carrierIdx];
  const now = performance.now();
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < players.length; i++) {
    if (i === carrierIdx) continue;
    const p = players[i];
    if (p.team !== c.team) continue;
    if (p.requestUntilMs <= now) continue;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function aiPassTo(fromIdx, toIdx) {
  const from = players[fromIdx];
  const to = players[toIdx];
  // lead the receiver slightly based on their velocity
  const targetX = to.x + to.vx * 0.25;
  const targetY = to.y + to.vy * 0.25;
  let dx = targetX - from.x;
  let dy = targetY - from.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  // small inaccuracy
  const jitter = 0.08;
  const cs = Math.cos((Math.random() - 0.5) * jitter);
  const sn = Math.sin((Math.random() - 0.5) * jitter);
  const nx = dx * cs - dy * sn;
  const ny = dx * sn + dy * cs;
  const distance = len;
  const speed = Math.max(PASS_MIN, Math.min(PASS_MAX, distance * 1.6 + 200));
  ball.carrierIdx = null;
  ball.x = from.x + nx * (PLAYER_RADIUS + 6);
  ball.y = from.y + ny * (PLAYER_RADIUS + 6);
  ball.vx = nx * speed;
  ball.vy = ny * speed;
  ball.lastDropMs = performance.now();
  // clear the request once the pass is on its way
  to.requestUntilMs = 0;
}

function spawnImpact(x, y, scale) {
  impacts.push({ x, y, t0: performance.now(), life: 380, scale });
}

function triggerShake(mag, durMs) {
  shakeMag = Math.max(shakeMag, mag);
  shakeUntilMs = Math.max(shakeUntilMs, performance.now() + durMs);
}

// === Update tick ===
function update(dt) {
  const now = performance.now();
  const frozen = now < frozenUntilMs;

  if (!frozen) {
    timeLeft = Math.max(0, timeLeft - dt);
    if (timeLeft <= 0 && running && !extraTime) {
      if (scoreA === scoreB) {
        // Draw — enter golden-goal extra time
        extraTime = true;
        setMsg("EXTRA TIME \u2014 next try wins");
      } else {
        running = false;
        setMsg(scoreA > scoreB ? "FULL TIME \u2014 YOU WIN" : "FULL TIME \u2014 CPU WINS");
        return;
      }
    }
  }

  const ctrlIdx = controlledIdx();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (frozen) continue;
    if (p.stunUntilMs > now) {
      p.vx = 0; p.vy = 0;
    } else if (i === ctrlIdx) {
      let dx = 0;
      let dy = 0;
      if (keys["w"]) dy -= 1;
      if (keys["s"]) dy += 1;
      if (keys["a"]) dx -= 1;
      if (keys["d"]) dx += 1;
      const len = Math.hypot(dx, dy);
      if (len) {
        dx /= len;
        dy /= len;
      }
      p.vx = dx * PLAYER_SPEED;
      p.vy = dy * PLAYER_SPEED;
    } else {
      aiPlayer(p, i);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(PLAYER_RADIUS, Math.min(W - PLAYER_RADIUS, p.x));
    p.y = Math.max(PLAYER_RADIUS, Math.min(H - PLAYER_RADIUS, p.y));
  }

  // Resolve player-player collisions (basic push-out)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const overlap = PLAYER_RADIUS * 2 - d;
      if (overlap > 0) {
        const nx = dx / d;
        const ny = dy / d;
        a.x -= (nx * overlap) / 2;
        a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2;
        b.y += (ny * overlap) / 2;
      }
    }
  }

  // Ball update
  if (ball.carrierIdx !== null) {
    const c = players[ball.carrierIdx];
    // ball follows carrier slightly in front of running direction
    const sp = Math.hypot(c.vx, c.vy) || 1;
    const fx = c.vx / sp;
    const fy = c.vy / sp;
    ball.x = c.x + fx * (PLAYER_RADIUS + 4);
    ball.y = c.y + fy * (PLAYER_RADIUS + 4);
    ball.vx = c.vx;
    ball.vy = c.vy;
  } else {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;
    if (Math.hypot(ball.vx, ball.vy) < BALL_MIN_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
    }
    // Walls bounce gently
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * 0.5;
    }
    if (ball.x > W - BALL_RADIUS) {
      ball.x = W - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.5;
    }
    if (ball.y < BALL_RADIUS) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy) * 0.5;
    }
    if (ball.y > H - BALL_RADIUS) {
      ball.y = H - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy) * 0.5;
    }

    // Auto-catch
    if (now - ball.lastDropMs > CATCH_COOLDOWN_MS && !frozen) {
      let nearest = -1;
      let nearestD = CATCH_RADIUS;
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const d = Math.hypot(p.x - ball.x, p.y - ball.y);
        if (d < nearestD) {
          nearest = i;
          nearestD = d;
        }
      }
      if (nearest >= 0) {
        ball.carrierIdx = nearest;
        ball.vx = 0;
        ball.vy = 0;
        ball.pickedUpMs = now;
      }
    }
  }

  // Try detection
  if (!frozen && ball.carrierIdx !== null) {
    const c = players[ball.carrierIdx];
    if (c.team === "A" && c.x >= TRY_R - PLAYER_RADIUS) {
      scoreA += 1;
      onTryScored("A");
    } else if (c.team === "B" && c.x <= TRY_L + PLAYER_RADIUS) {
      scoreB += 1;
      onTryScored("B");
    }
  }
}

function onTryScored(team) {
  const now = performance.now();
  frozenUntilMs = now + TRY_PAUSE_MS;
  triggerShake(12, 320);

  // Golden-goal: any try in extra time ends match
  if (extraTime) {
    running = false;
    setMsg(team === "A" ? "GOLDEN TRY \u2014 YOU WIN" : "GOLDEN TRY \u2014 CPU WINS");
    return;
  }

  setMsg(team === "A" ? "TRY!" : "CPU TRY");
  setTimeout(() => {
    if (!running) return;
    setupKickoff(team === "A" ? "B" : "A");
    if (!extraTime) setMsg("");
  }, TRY_PAUSE_MS);
}

// === AI ===
function aiPlayer(p, idx) {
  const carrier = ball.carrierIdx !== null ? players[ball.carrierIdx] : null;
  const isCarrier = ball.carrierIdx === idx;
  let dx = 0;
  let dy = 0;

  if (isCarrier) {
    // If a teammate is requesting a pass and we've held the ball briefly, throw it
    const now = performance.now();
    if (now - ball.pickedUpMs > AI_PASS_DELAY_MS) {
      const reqIdx = findRequestingTeammate(idx);
      if (reqIdx !== -1) {
        aiPassTo(idx, reqIdx);
        return;
      }
    }
    // run toward opponent's tryline
    dx = p.team === "A" ? 1 : -1;
    // dodge nearest opponent
    let nearest = null;
    let nd = Infinity;
    for (const o of players) {
      if (o.team === p.team) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < nd) {
        nd = d;
        nearest = o;
      }
    }
    if (nearest && nd < 90) {
      const ox = p.x - nearest.x;
      const oy = p.y - nearest.y;
      const ol = Math.hypot(ox, oy) || 1;
      dx = (dx + (ox / ol) * 0.6);
      dy += (oy / ol) * 0.9;
    }
  } else if (carrier) {
    if (carrier.team === p.team) {
      // teammate: support, stay onside (behind carrier in attack direction)
      const onsideOffset = p.team === "A" ? -60 : 60;
      const lateral = ((idx % 7) - 3) * 55;
      const targetX = carrier.x + onsideOffset;
      const targetY = carrier.y + lateral;
      dx = targetX - p.x;
      dy = targetY - p.y;
    } else {
      // defender: chase carrier
      dx = carrier.x - p.x;
      dy = carrier.y - p.y;
      // attempt tackle if close (AI defenders go for the carrier)
      if (Math.hypot(dx, dy) < TACKLE_RADIUS) {
        const now = performance.now();
        if (now - p.lastTackleMs > TACKLE_COOLDOWN_MS) {
          p.lastTackleMs = now;
          if (Math.random() < TACKLE_PROB) {
            completeTackle(idx, ball.carrierIdx, true);
            setMsg(p.team === "B" ? "TACKLED!" : "TURNOVER!");
            setTimeout(() => {
              const cur = elMsg.textContent;
              if (cur === "TACKLED!" || cur === "TURNOVER!") setMsg("");
            }, 700);
          }
        }
      }
    }
  } else {
    // free ball - chase
    dx = ball.x - p.x;
    dy = ball.y - p.y;
  }

  const len = Math.hypot(dx, dy);
  if (len < 4) {
    p.vx = 0;
    p.vy = 0;
    return;
  }
  p.vx = (dx / len) * PLAYER_SPEED * AI_SPEED_MULT;
  p.vy = (dy / len) * PLAYER_SPEED * AI_SPEED_MULT;
}

// === Render ===
function drawPitch() {
  ctx.fillStyle = "#1d6b3a";
  ctx.fillRect(0, 0, W, H);

  // Stripes
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  const stripeW = 100;
  for (let x = 0; x < W; x += stripeW * 2) {
    ctx.fillRect(x, 0, stripeW, H);
  }

  // Try lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TRY_L, 0);
  ctx.lineTo(TRY_L, H);
  ctx.moveTo(TRY_R, 0);
  ctx.lineTo(TRY_R, H);
  ctx.stroke();

  // Halfway
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(HALFWAY, 0);
  ctx.lineTo(HALFWAY, H);
  ctx.stroke();

  // 22m
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(M22_L, 0);
  ctx.lineTo(M22_L, H);
  ctx.moveTo(M22_R, 0);
  ctx.lineTo(M22_R, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sidelines
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // In-goal areas tint
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, TRY_L, H);
  ctx.fillRect(TRY_R, 0, W - TRY_R, H);
}

function drawPlayer(p, isControlled) {
  const stunned = p.stunUntilMs > performance.now();
  const color = p.team === "A" ? "#ff5757" : "#5a93ff";

  // Shadow
  ctx.beginPath();
  ctx.arc(p.x + 2, p.y + 4, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = stunned ? "#7a7a7a" : color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.stroke();

  // Controlled ring
  if (isControlled) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS + 5, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ffd166";
    ctx.stroke();
  }

  // Jersey number
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.jersey), p.x, p.y);

  if (stunned) {
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.fillText("\u2605", p.x, p.y - PLAYER_RADIUS - 8);
  }

  // Pass-request indicator: small ball above head
  if (p.requestUntilMs > performance.now()) {
    const bx = p.x + PLAYER_RADIUS + 4;
    const by = p.y - PLAYER_RADIUS - 6;
    // pulse
    const t = (performance.now() % 600) / 600;
    const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.12;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.ellipse(0, 0, BALL_RADIUS * 1.3, BALL_RADIUS * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5b3a1d";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS, 0);
    ctx.lineTo(BALL_RADIUS, 0);
    ctx.stroke();
    ctx.restore();
    // "!" marker for clarity
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", bx + BALL_RADIUS + 5, by + 4);
  }
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  // orientation: along velocity
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 1) {
    ctx.rotate(Math.atan2(ball.vy, ball.vx));
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, BALL_RADIUS * 1.5, BALL_RADIUS, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5b3a1d";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-BALL_RADIUS * 1.2, 0);
  ctx.lineTo(BALL_RADIUS * 1.2, 0);
  ctx.stroke();
  ctx.restore();
}

function drawAimLine() {
  const idx = controlledIdx();
  if (idx < 0) return;
  if (ball.carrierIdx !== idx) return;
  const p = players[idx];
  const power = chargePower();
  if (!mouseDown && power < 0.05) return;

  let dx = mouseX - p.x;
  let dy = mouseY - p.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const reach = 80 + power * 220;
  ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + dx * reach, p.y + dy * reach);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawImpacts() {
  const now = performance.now();
  for (let i = impacts.length - 1; i >= 0; i--) {
    const im = impacts[i];
    const t = (now - im.t0) / im.life;
    if (t >= 1) { impacts.splice(i, 1); continue; }
    const r = (10 + t * 50) * (im.scale || 1);
    ctx.beginPath();
    ctx.arc(im.x, im.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 230, 120, ${(1 - t) * 0.9})`;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.stroke();
    // inner flash
    ctx.beginPath();
    ctx.arc(im.x, im.y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 90, 60, ${(1 - t) * 0.5})`;
    ctx.fill();
  }
}

function render() {
  ctx.save();
  const now = performance.now();
  if (now < shakeUntilMs) {
    const k = (shakeUntilMs - now) / 220;
    const m = shakeMag * k;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  } else {
    shakeMag = 0;
  }

  drawPitch();
  drawAimLine();

  const ctrlIdx = controlledIdx();
  for (let i = 0; i < players.length; i++) {
    drawPlayer(players[i], i === ctrlIdx);
  }
  drawBall();
  drawImpacts();
  ctx.restore();
}

function updateHUD() {
  elScoreA.textContent = String(scoreA);
  elScoreB.textContent = String(scoreB);
  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  elTime.textContent = extraTime
    ? "EXTRA TIME"
    : `${m}:${String(s).padStart(2, "0")}`;
  const pct = mouseDown ? Math.round(chargePower() * 100) : 0;
  elPower.style.width = `${pct}%`;
}

// === Loop ===
function loop(t) {
  if (!lastFrameMs) lastFrameMs = t;
  let dt = (t - lastFrameMs) / 1000;
  lastFrameMs = t;
  if (dt > 0.1) dt = 0.1;

  if (running) update(dt);
  render();
  updateHUD();

  requestAnimationFrame(loop);
}

startMatch();
requestAnimationFrame(loop);
