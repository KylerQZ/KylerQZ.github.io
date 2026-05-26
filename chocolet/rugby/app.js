// Chocoby rugby — multiplayer thin client.
// Sends inputs to the authoritative server, renders broadcast state.

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { getServerUrl } from "./config.js?v=1";

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

// Pitch dimensions (will be confirmed by server `welcome`)
let W = 1430;
let H = 780;
const TRY_L_RATIO = 78 / 1430;
function tryL() { return W * TRY_L_RATIO; }
function tryR() { return W - tryL(); }

const PLAYER_RADIUS = 16;
const BALL_RADIUS = 7;
const PASS_CHARGE_MS = 1100;

const elScoreA = document.getElementById("scoreA");
const elScoreB = document.getElementById("scoreB");
const elTime = document.getElementById("time");
const elPower = document.getElementById("powerBar");
const elMsg = document.getElementById("msg");
const elConn = document.getElementById("connStatus");
const elRoster = document.getElementById("roster");

// =====================================================================
// Connection
// =====================================================================
const SERVER_URL = getServerUrl();
const socket = io(SERVER_URL, { transports: ["websocket", "polling"] });

let youIdx = -1;
let state = null; // latest server snapshot
let visualImpacts = []; // {x,y,t0,life,scale}
let shakeMag = 0;
let shakeUntilMs = 0;

function setConn(text, ok) {
  if (!elConn) return;
  elConn.textContent = text;
  elConn.classList.toggle("ok", !!ok);
  elConn.classList.toggle("bad", !ok);
}

setConn("connecting…", false);

socket.on("connect", () => {
  setConn("connected · joining…", true);
  const params = new URLSearchParams(location.search);
  const queryName = params.get("name");
  const stored = localStorage.getItem("chocoby_name") || "";
  let name = queryName || stored;
  if (!name) {
    name = (prompt("Your name:", "") || "Player").trim().slice(0, 24) || "Player";
  }
  localStorage.setItem("chocoby_name", name);
  socket.emit("join", { name });
});

socket.on("disconnect", () => setConn("disconnected — refresh to retry", false));
socket.on("connect_error", () => setConn(`cannot reach ${SERVER_URL}`, false));

socket.on("welcome", (data) => {
  youIdx = data.youIdx;
  W = data.W;
  H = data.H;
  setConn(`connected · you are #${youIdx}`, true);
});

socket.on("roomFull", () => {
  setConn("room is full (6 humans) — try again later", false);
});

socket.on("modeChanged", (data) => {
  const n = data.perTeam;
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.getAttribute("data-mode")) === n);
  });
});

socket.on("state", (snap) => {
  state = snap;
  // Spawn visual events queued by server
  if (snap.events && snap.events.length) {
    const t = performance.now();
    for (const ev of snap.events) {
      if (ev.type === "impact") {
        visualImpacts.push({ x: ev.x, y: ev.y, t0: t, life: 380, scale: ev.scale || 1 });
      } else if (ev.type === "shake") {
        shakeMag = Math.max(shakeMag, ev.mag || 8);
        shakeUntilMs = Math.max(shakeUntilMs, t + (ev.durMs || 220));
      }
    }
  }
}); 

// =====================================================================
// Inputs
// =====================================================================
const keys = Object.create(null);
let mouseX = W / 2;
let mouseY = H / 2;
let mouseDown = false;
let chargeStart = 0;

function isCarrier() {
  return state && state.ball && state.ball.carrierIdx === youIdx;
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["w","a","s","d"," ","f"].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === "f") socket.emit("tackle");
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
  if (isCarrier()) {
    mouseDown = true;
    chargeStart = performance.now();
  } else {
    socket.emit("request");
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  if (!mouseDown) return;
  const power = chargePower();
  mouseDown = false;
  chargeStart = 0;
  socket.emit("passRelease", { power, aimX: mouseX, aimY: mouseY });
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function chargePower() {
  if (!chargeStart) return 0;
  const dt = performance.now() - chargeStart;
  return Math.max(0, Math.min(1, dt / PASS_CHARGE_MS));
}

// Mode selector
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const n = Math.max(1, Math.min(3, Number(btn.getAttribute("data-mode")) || 3));
    socket.emit("setMode", { perTeam: n });
  });
});

// Send inputs at ~30 Hz; only when something changed.
let lastSent = { dx: 0, dy: 0, aimX: -1, aimY: -1 };
setInterval(() => {
  if (!socket.connected || youIdx < 0) return;
  let dx = 0, dy = 0;
  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;
  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;
  const len = Math.hypot(dx, dy);
  if (len > 0) { dx /= len; dy /= len; }
  if (
    dx !== lastSent.dx ||
    dy !== lastSent.dy ||
    Math.abs(mouseX - lastSent.aimX) > 1 ||
    Math.abs(mouseY - lastSent.aimY) > 1
  ) {
    socket.emit("input", { dx, dy, aimX: mouseX, aimY: mouseY });
    lastSent = { dx, dy, aimX: mouseX, aimY: mouseY };
  }
}, 1000 / 30);

// =====================================================================
// Render
// =====================================================================
function teamColor(team, isYou) {
  if (team === "A") return isYou ? "#ff8a8a" : "#ff5757";
  return isYou ? "#9bbcff" : "#5a93ff";
}

function drawPitch() {
  ctx.fillStyle = "#1d6b3a";
  ctx.fillRect(0, 0, W, H);
  // alternating mow lines
  for (let i = 0; i < 14; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fillRect((W / 14) * i, 0, W / 14, H);
    }
  }
  // try lines
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(tryL() - 2, 0, 4, H);
  ctx.fillRect(tryR() - 2, 0, 4, H);
  // halfway dashed
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);
  // try-zone tint
  ctx.fillStyle = "rgba(239, 71, 111, 0.08)";
  ctx.fillRect(0, 0, tryL(), H);
  ctx.fillStyle = "rgba(90, 147, 255, 0.08)";
  ctx.fillRect(tryR(), 0, W - tryR(), H);
}

function drawPlayer(p, idx) {
  const isYou = idx === youIdx;
  const stunned = state && p.stunUntilMs > state.serverNow;
  ctx.save();
  // body
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = stunned ? "#7c7c7c" : teamColor(p.team, isYou);
  ctx.fill();
  if (isYou) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffd166";
    ctx.stroke();
  } else {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();
  }
  // jersey
  ctx.fillStyle = "white";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.jersey), p.x, p.y);
  // name
  if (p.name && !p.isBot) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText(p.name, p.x, p.y - PLAYER_RADIUS - 8);
  } else if (p.isBot) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("CPU", p.x, p.y - PLAYER_RADIUS - 8);
  }
  if (stunned) {
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.fillText("\u2605", p.x, p.y - PLAYER_RADIUS - 22);
  }
  // pass-request indicator
  if (state && p.requestUntilMs > state.serverNow) {
    const bx = p.x + PLAYER_RADIUS + 4;
    const by = p.y - PLAYER_RADIUS - 6;
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
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", bx + BALL_RADIUS + 5, by + 4);
  }
  ctx.restore();
}

function drawBall() {
  if (!state) return;
  const b = state.ball;
  ctx.save();
  ctx.translate(b.x, b.y);
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 1) ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.beginPath();
  ctx.ellipse(0, 0, BALL_RADIUS * 1.4, BALL_RADIUS * 0.9, 0, 0, Math.PI * 2);
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
}

function drawImpacts() {
  const t = performance.now();
  visualImpacts = visualImpacts.filter((im) => t - im.t0 < im.life);
  for (const im of visualImpacts) {
    const k = (t - im.t0) / im.life;
    const r = (PLAYER_RADIUS + 14 + k * 60) * im.scale;
    ctx.save();
    ctx.translate(im.x, im.y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 209, 102, ${1 - k})`;
    ctx.lineWidth = 4 * (1 - k);
    ctx.stroke();
    ctx.fillStyle = `rgba(239, 71, 111, ${(1 - k) * 0.25})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function applyShake() {
  const t = performance.now();
  if (t > shakeUntilMs) {
    shakeMag = 0;
    return [0, 0];
  }
  const remaining = shakeUntilMs - t;
  const factor = Math.max(0, Math.min(1, remaining / 220));
  const m = shakeMag * factor;
  return [(Math.random() - 0.5) * m, (Math.random() - 0.5) * m];
}

function render() {
  // Update HUD
  if (state) {
    elScoreA.textContent = String(state.scoreA);
    elScoreB.textContent = String(state.scoreB);
    const m = Math.floor(state.timeLeft / 60);
    const s = Math.floor(state.timeLeft % 60);
    elTime.textContent = state.extraTime
      ? "EXTRA TIME"
      : `${m}:${String(s).padStart(2, "0")}`;
    elMsg.textContent = state.msg || "";
    // Update active mode button
    document.querySelectorAll(".mode-btn").forEach((b) => {
      b.classList.toggle("active", Number(b.getAttribute("data-mode")) === state.perTeam);
    });
    // Roster panel
    if (elRoster) {
      const teamA = state.players.filter((p) => p.team === "A");
      const teamB = state.players.filter((p) => p.team === "B");
      const fmt = (p) => {
        const tag = p.isBot ? "CPU" : (p.name || "Player");
        return `<span class="r-${p.team.toLowerCase()}">${escapeHtml(tag)}</span>`;
      };
      elRoster.innerHTML = `<span class="r-label">A:</span> ${teamA.map(fmt).join(" ")}  ·  <span class="r-label">B:</span> ${teamB.map(fmt).join(" ")}`;
    }
    // Power bar
    const pct = mouseDown && isCarrier() ? Math.round(chargePower() * 100) : 0;
    elPower.style.width = `${pct}%`;
  }

  // Draw
  const [sx, sy] = applyShake();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(sx, sy);
  drawPitch();
  if (state) {
    for (let i = 0; i < state.players.length; i++) {
      drawPlayer(state.players[i], i);
    }
  }
  drawBall();
  drawImpacts();
  ctx.restore();
  requestAnimationFrame(render);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

requestAnimationFrame(render);
