// Rugby 7s — Phase 1 prototype
// All players identical. Top-down 2D, 7v7. WASD + mouse + F + Q + R.

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const W = 1100;
const H = 600;

// Pitch markings
const TRY_L = 60;
const TRY_R = W - TRY_L;
const HALFWAY = W / 2;
const M22_L = TRY_L + 220;
const M22_R = TRY_R - 220;

// Tunables
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 230;
const AI_SPEED_MULT = 0.92;
const BALL_RADIUS = 7;
const CATCH_RADIUS = 24;
const CATCH_COOLDOWN_MS = 400;
const TACKLE_RADIUS = 34;
const TACKLE_PROB = 0.7; // Phase 1: same for all players
const TACKLE_COOLDOWN_MS = 700;
const PASS_MIN = 320;
const PASS_MAX = 920;
const PASS_CHARGE_MS = 1100;
const BALL_FRICTION = 0.985;
const BALL_MIN_SPEED = 8;
const MATCH_S = 120;
const TRY_PAUSE_MS = 1800;

const elScoreA = document.getElementById("scoreA");
const elScoreB = document.getElementById("scoreB");
const elTime = document.getElementById("time");
const elPower = document.getElementById("powerBar");
const elMsg = document.getElementById("msg");

// State
/** @type {Array<{team:'A'|'B', jersey:number, x:number, y:number, vx:number, vy:number, lastTackleMs:number}>} */
let players = [];
let ball = {
  x: W / 2,
  y: H / 2,
  vx: 0,
  vy: 0,
  carrierIdx: null,
  lastDropMs: 0,
};
let scoreA = 0;
let scoreB = 0;
let timeLeft = MATCH_S;
let frozenUntilMs = 0;
let manualControlIdx = null; // when player presses Q to lock onto a specific player
let manualControlUntilMs = 0;
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
  // Team A on left half, B on right half
  for (let i = 0; i < 7; i++) {
    players.push({
      team: "A",
      jersey: i + 1,
      x: TRY_L + 80 + (i % 3) * 60,
      y: 90 + (i * 70) % (H - 180),
      vx: 0,
      vy: 0,
      lastTackleMs: 0,
    });
  }
  for (let i = 0; i < 7; i++) {
    players.push({
      team: "B",
      jersey: i + 1,
      x: TRY_R - 80 - (i % 3) * 60,
      y: 90 + (i * 70) % (H - 180),
      vx: 0,
      vy: 0,
      lastTackleMs: 0,
    });
  }
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastDropMs = 0;
  // give to receiving team's "scrum-half" (idx 3 for A, 10 for B)
  ball.carrierIdx = receivingTeam === "A" ? 3 : 10;
}

function startMatch() {
  scoreA = 0;
  scoreB = 0;
  timeLeft = MATCH_S;
  frozenUntilMs = 0;
  manualControlIdx = null;
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
  if (k === "q") cycleManualControl();
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
  // only useful if we have ball
  const c = controlledIdx();
  if (c < 0) return;
  if (ball.carrierIdx !== c) return;
  mouseDown = true;
  chargeStart = performance.now();
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
  // If manual lock recent and still on team A & alive: use it
  if (manualControlIdx !== null && performance.now() < manualControlUntilMs) {
    return manualControlIdx;
  }
  // If team A holds ball -> control carrier
  if (ball.carrierIdx !== null && players[ball.carrierIdx].team === "A") {
    return ball.carrierIdx;
  }
  // Else control nearest team A player to ball
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < players.length; i++) {
    if (players[i].team !== "A") continue;
    const dx = players[i].x - ball.x;
    const dy = players[i].y - ball.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function cycleManualControl() {
  const teamA = players
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.team === "A");
  if (!teamA.length) return;
  const cur = manualControlIdx;
  const curPos = teamA.findIndex((x) => x.i === cur);
  const next = teamA[(curPos + 1 + teamA.length) % teamA.length];
  manualControlIdx = next.i;
  manualControlUntilMs = performance.now() + 4000;
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
    // Knock-on / drop ball
    ball.carrierIdx = null;
    ball.x = carrier.x;
    ball.y = carrier.y;
    // ball squirts in carrier's running direction with some randomness
    const cv = Math.hypot(carrier.vx, carrier.vy) || 1;
    const nx = carrier.vx / cv;
    const ny = carrier.vy / cv;
    const sp = 140 + Math.random() * 80;
    ball.vx = nx * sp + (Math.random() - 0.5) * 80;
    ball.vy = ny * sp + (Math.random() - 0.5) * 80;
    ball.lastDropMs = performance.now();
    setMsg("TACKLE!");
    setTimeout(() => {
      if (elMsg.textContent === "TACKLE!") setMsg("");
    }, 700);
  } else {
    setMsg("missed tackle");
    setTimeout(() => {
      if (elMsg.textContent === "missed tackle") setMsg("");
    }, 600);
  }
}

// === Update tick ===
function update(dt) {
  const now = performance.now();
  const frozen = now < frozenUntilMs;

  if (!frozen) {
    timeLeft = Math.max(0, timeLeft - dt);
    if (timeLeft <= 0 && running) {
      running = false;
      setMsg(scoreA > scoreB ? "FULL TIME — YOU WIN" : scoreA < scoreB ? "FULL TIME — CPU WINS" : "FULL TIME — DRAW");
      return;
    }
  }

  const ctrlIdx = controlledIdx();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (frozen) continue;
    if (i === ctrlIdx) {
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
      }
    }
  }

  // Try detection
  if (!frozen && ball.carrierIdx !== null) {
    const c = players[ball.carrierIdx];
    if (c.team === "A" && c.x >= TRY_R - PLAYER_RADIUS) {
      scoreA += 5;
      setMsg("TRY!");
      frozenUntilMs = now + TRY_PAUSE_MS;
      setTimeout(() => {
        setupKickoff("B");
        setMsg("");
      }, TRY_PAUSE_MS);
    } else if (c.team === "B" && c.x <= TRY_L + PLAYER_RADIUS) {
      scoreB += 5;
      setMsg("CPU TRY");
      frozenUntilMs = now + TRY_PAUSE_MS;
      setTimeout(() => {
        setupKickoff("A");
        setMsg("");
      }, TRY_PAUSE_MS);
    }
  }
}

// === AI ===
function aiPlayer(p, idx) {
  const carrier = ball.carrierIdx !== null ? players[ball.carrierIdx] : null;
  const isCarrier = ball.carrierIdx === idx;
  let dx = 0;
  let dy = 0;

  if (isCarrier) {
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
      // attempt tackle if close (B-team only AI tackle on player-controlled A carrier)
      if (p.team === "B" && Math.hypot(dx, dy) < TACKLE_RADIUS) {
        const now = performance.now();
        if (now - p.lastTackleMs > TACKLE_COOLDOWN_MS) {
          p.lastTackleMs = now;
          if (Math.random() < TACKLE_PROB) {
            ball.carrierIdx = null;
            ball.x = carrier.x;
            ball.y = carrier.y;
            const cv = Math.hypot(carrier.vx, carrier.vy) || 1;
            const nx = carrier.vx / cv;
            const ny = carrier.vy / cv;
            const sp = 140 + Math.random() * 80;
            ball.vx = nx * sp + (Math.random() - 0.5) * 80;
            ball.vy = ny * sp + (Math.random() - 0.5) * 80;
            ball.lastDropMs = now;
            setMsg("TACKLED!");
            setTimeout(() => {
              if (elMsg.textContent === "TACKLED!") setMsg("");
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
  const color = p.team === "A" ? "#ff5757" : "#5a93ff";

  // Shadow
  ctx.beginPath();
  ctx.arc(p.x + 2, p.y + 4, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
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
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.jersey), p.x, p.y);
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

function render() {
  drawPitch();
  drawAimLine();

  const ctrlIdx = controlledIdx();
  for (let i = 0; i < players.length; i++) {
    drawPlayer(players[i], i === ctrlIdx);
  }
  drawBall();
}

function updateHUD() {
  elScoreA.textContent = String(scoreA);
  elScoreB.textContent = String(scoreB);
  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  elTime.textContent = `${m}:${String(s).padStart(2, "0")}`;
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
