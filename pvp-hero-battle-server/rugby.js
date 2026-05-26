// Chocoby rugby — authoritative game simulation as a Socket.io namespace.
// Attached to the main server via attachRugby(io) from server.js.
// Mirrors the client renderer in /chocolet/rugby/app.js.

const W = 1430;
const H = 780;
const TRY_L = 78;
const TRY_R = W - TRY_L;

const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 168;
const AI_SPEED_MULT = 0.92;
const BALL_RADIUS = 7;
const CATCH_RADIUS = 26;
const CATCH_COOLDOWN_MS = 500;
const TACKLE_RADIUS = 40;
const TACKLE_PROB = 0.8;
const TACKLE_COOLDOWN_MS = 5000;
const STUN_MS = 900;
const KNOCKBACK_PX = 24;
const PASS_MIN = 320;
const PASS_MAX = 920;
const BALL_FRICTION = 0.985;
const BALL_MIN_SPEED = 8;
const ROUND_S = 60;
const TRY_PAUSE_MS = 1800;
const REQUEST_DURATION_MS = 2500;
const AI_PASS_DELAY_MS = 350;

const TICK_HZ = 30;
const TICK_MS = 1000 / TICK_HZ;
const DT = 1 / TICK_HZ;

const MAX_PER_TEAM = 3;

function attachRugby(io) {
  const nsp = io.of('/rugby');

  const room = {
    perTeam: 3,
    players: [],
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, carrierIdx: null, lastDropMs: 0, pickedUpMs: 0 },
    scoreA: 0,
    scoreB: 0,
    timeLeft: ROUND_S,
    frozenUntilMs: 0,
    extraTime: false,
    running: true,
    msg: '',
    msgUntilMs: 0,
    events: []
  };

  const inputs = [];

  function now() { return Date.now(); }

  function setMsg(text, durMs = 1200) {
    room.msg = text || '';
    room.msgUntilMs = text ? now() + durMs : 0;
  }
  function pushImpact(x, y, scale) {
    room.events.push({ type: 'impact', x, y, scale });
  }
  function pushShake(mag, durMs) {
    room.events.push({ type: 'shake', mag, durMs });
  }

  function makeEmptyInput() {
    return {
      dx: 0, dy: 0,
      aimX: W / 2, aimY: H / 2,
      mouseDown: false, prevMouseDown: false,
      chargeStartMs: 0,
      requestQueued: false,
      tackleQueued: false,
      passQueued: null
    };
  }

  function setupKickoff() {
    const PER_TEAM = room.perTeam;
    const spacingY = (H - 160) / Math.max(1, PER_TEAM - 1 || 1);
    const existing = room.players;
    const next = [];

    for (let i = 0; i < PER_TEAM; i++) {
      const prev = existing.find((p) => p && p.team === 'A' && p.jersey === i + 1);
      next.push({
        team: 'A',
        jersey: i + 1,
        x: TRY_L + 120 + (i % 2) * 70,
        y: 80 + (PER_TEAM > 1 ? i * spacingY : H / 2 - 80),
        vx: 0, vy: 0,
        lastTackleMs: 0,
        stunUntilMs: 0,
        requestUntilMs: 0,
        socketId: prev?.socketId || null,
        name: prev?.name || '',
        isBot: !prev?.socketId
      });
    }
    for (let i = 0; i < PER_TEAM; i++) {
      const prev = existing.find((p) => p && p.team === 'B' && p.jersey === i + 1);
      next.push({
        team: 'B',
        jersey: i + 1,
        x: TRY_R - 120 - (i % 2) * 70,
        y: 80 + (PER_TEAM > 1 ? i * spacingY : H / 2 - 80),
        vx: 0, vy: 0,
        lastTackleMs: 0,
        stunUntilMs: 0,
        requestUntilMs: 0,
        socketId: prev?.socketId || null,
        name: prev?.name || '',
        isBot: !prev?.socketId
      });
    }
    room.players = next;

    while (inputs.length < next.length) inputs.push(makeEmptyInput());
    inputs.length = next.length;

    room.ball.x = W / 2;
    room.ball.y = H / 2;
    room.ball.vx = 0; room.ball.vy = 0;
    room.ball.lastDropMs = now();
    room.ball.pickedUpMs = 0;
    room.ball.carrierIdx = null;
  }

  function startMatch() {
    room.scoreA = 0;
    room.scoreB = 0;
    room.timeLeft = ROUND_S;
    room.frozenUntilMs = 0;
    room.extraTime = false;
    room.running = true;
    setMsg('');
    setupKickoff();
  }

  function findHumanSlot() {
    const aHumans = room.players.filter((p) => p.team === 'A' && !p.isBot).length;
    const bHumans = room.players.filter((p) => p.team === 'B' && !p.isBot).length;
    const preferTeam = aHumans <= bHumans ? 'A' : 'B';
    let idx = room.players.findIndex((p) => p.team === preferTeam && p.isBot);
    if (idx < 0) idx = room.players.findIndex((p) => p.isBot);
    return idx;
  }

  function detachSocket(socketId) {
    const idx = room.players.findIndex((p) => p.socketId === socketId);
    if (idx < 0) return;
    room.players[idx].socketId = null;
    room.players[idx].name = '';
    room.players[idx].isBot = true;
    inputs[idx] = makeEmptyInput();
  }

  function attemptPass(idx, power, aimX, aimY) {
    if (room.ball.carrierIdx !== idx) return;
    const p = room.players[idx];
    let dx = aimX - p.x;
    let dy = aimY - p.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const speed = PASS_MIN + (PASS_MAX - PASS_MIN) * Math.max(0.05, Math.min(1, power));
    room.ball.carrierIdx = null;
    room.ball.x = p.x + dx * (PLAYER_RADIUS + 6);
    room.ball.y = p.y + dy * (PLAYER_RADIUS + 6);
    room.ball.vx = dx * speed;
    room.ball.vy = dy * speed;
    room.ball.lastDropMs = now();
    p.requestUntilMs = 0;
  }

  function tryTackleByIdx(idx) {
    const t = now();
    if (room.frozenUntilMs > t) return;
    if (idx < 0 || idx >= room.players.length) return;
    const p = room.players[idx];
    if (t - p.lastTackleMs < TACKLE_COOLDOWN_MS) return;
    p.lastTackleMs = t;
    if (room.ball.carrierIdx === null) return;
    const carrier = room.players[room.ball.carrierIdx];
    if (carrier.team === p.team) return;
    const d = Math.hypot(carrier.x - p.x, carrier.y - p.y);
    if (d > TACKLE_RADIUS) return;
    if (Math.random() < TACKLE_PROB) {
      completeTackle(idx, room.ball.carrierIdx, false);
      setMsg('BIG HIT!', 800);
    } else {
      const dx = (carrier.x - p.x) / (d || 1);
      const dy = (carrier.y - p.y) / (d || 1);
      carrier.x += dx * 6;
      carrier.y += dy * 6;
      pushImpact((p.x + carrier.x) / 2, (p.y + carrier.y) / 2, 0.6);
      setMsg('missed tackle', 600);
    }
  }

  function completeTackle(tacklerIdx, carrierIdx, byAI) {
    const t = now();
    const tackler = room.players[tacklerIdx];
    const carrier = room.players[carrierIdx];
    room.ball.carrierIdx = tacklerIdx;
    room.ball.vx = 0; room.ball.vy = 0;
    room.ball.lastDropMs = t;
    room.ball.pickedUpMs = t;
    const dx = carrier.x - tackler.x;
    const dy = carrier.y - tackler.y;
    const dl = Math.hypot(dx, dy) || 1;
    carrier.x += (dx / dl) * KNOCKBACK_PX;
    carrier.y += (dy / dl) * KNOCKBACK_PX;
    carrier.vx = 0; carrier.vy = 0;
    carrier.stunUntilMs = t + STUN_MS;
    tackler.vx = 0; tackler.vy = 0;
    tackler.stunUntilMs = t + STUN_MS * 0.5;
    pushImpact((tackler.x + carrier.x) / 2, (tackler.y + carrier.y) / 2, 1.0);
    pushShake(byAI ? 8 : 10, 220);
  }

  function findRequestingTeammate(carrierIdx) {
    const c = room.players[carrierIdx];
    const t = now();
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < room.players.length; i++) {
      if (i === carrierIdx) continue;
      const p = room.players[i];
      if (p.team !== c.team) continue;
      if (p.requestUntilMs <= t) continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function aiPassTo(fromIdx, toIdx) {
    const from = room.players[fromIdx];
    const to = room.players[toIdx];
    const targetX = to.x + to.vx * 0.25;
    const targetY = to.y + to.vy * 0.25;
    let dx = targetX - from.x;
    let dy = targetY - from.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const jitter = 0.08;
    const cs = Math.cos((Math.random() - 0.5) * jitter);
    const sn = Math.sin((Math.random() - 0.5) * jitter);
    const nx = dx * cs - dy * sn;
    const ny = dx * sn + dy * cs;
    const distance = len;
    const speed = Math.max(PASS_MIN, Math.min(PASS_MAX, distance * 1.6 + 200));
    room.ball.carrierIdx = null;
    room.ball.x = from.x + nx * (PLAYER_RADIUS + 6);
    room.ball.y = from.y + ny * (PLAYER_RADIUS + 6);
    room.ball.vx = nx * speed;
    room.ball.vy = ny * speed;
    room.ball.lastDropMs = now();
    to.requestUntilMs = 0;
  }

  function aiPlayer(p, idx) {
    const carrier = room.ball.carrierIdx !== null ? room.players[room.ball.carrierIdx] : null;
    const isCarrier = room.ball.carrierIdx === idx;
    let dx = 0;
    let dy = 0;
    if (isCarrier) {
      const t = now();
      if (t - room.ball.pickedUpMs > AI_PASS_DELAY_MS) {
        const reqIdx = findRequestingTeammate(idx);
        if (reqIdx !== -1) { aiPassTo(idx, reqIdx); return; }
      }
      dx = p.team === 'A' ? 1 : -1;
      let nearest = null;
      let nd = Infinity;
      for (const o of room.players) {
        if (o.team === p.team) continue;
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < nd) { nd = d; nearest = o; }
      }
      if (nearest && nd < 90) {
        const ox = p.x - nearest.x;
        const oy = p.y - nearest.y;
        const ol = Math.hypot(ox, oy) || 1;
        dx = dx + (ox / ol) * 0.6;
        dy += (oy / ol) * 0.9;
      }
    } else if (carrier) {
      if (carrier.team === p.team) {
        const onsideOffset = p.team === 'A' ? -60 : 60;
        const lateral = ((idx % 7) - 3) * 55;
        dx = carrier.x + onsideOffset - p.x;
        dy = carrier.y + lateral - p.y;
      } else {
        dx = carrier.x - p.x;
        dy = carrier.y - p.y;
        if (Math.hypot(dx, dy) < TACKLE_RADIUS) {
          const t = now();
          if (t - p.lastTackleMs > TACKLE_COOLDOWN_MS) {
            p.lastTackleMs = t;
            if (Math.random() < TACKLE_PROB) {
              completeTackle(idx, room.ball.carrierIdx, true);
              setMsg(p.team === 'B' ? 'TACKLED!' : 'TURNOVER!', 700);
            }
          }
        }
      }
    } else {
      dx = room.ball.x - p.x;
      dy = room.ball.y - p.y;
    }
    const len = Math.hypot(dx, dy);
    if (len < 4) { p.vx = 0; p.vy = 0; return; }
    p.vx = (dx / len) * PLAYER_SPEED * AI_SPEED_MULT;
    p.vy = (dy / len) * PLAYER_SPEED * AI_SPEED_MULT;
  }

  function onTryScored(team) {
    const t = now();
    room.frozenUntilMs = t + TRY_PAUSE_MS;
    pushShake(12, 320);
    if (room.extraTime) {
      room.running = false;
      setMsg(team === 'A' ? 'GOLDEN TRY — TEAM A WINS' : 'GOLDEN TRY — TEAM B WINS', 5000);
      setTimeout(startMatch, 4500);
      return;
    }
    setMsg(team === 'A' ? 'TRY!' : 'CPU TRY', TRY_PAUSE_MS);
    setTimeout(() => {
      if (!room.running) return;
      setupKickoff();
    }, TRY_PAUSE_MS);
  }

  function tick() {
    const t = now();
    const frozen = t < room.frozenUntilMs;

    if (!frozen && room.running) {
      room.timeLeft = Math.max(0, room.timeLeft - DT);
      if (room.timeLeft <= 0 && !room.extraTime) {
        if (room.scoreA === room.scoreB) {
          room.extraTime = true;
          setMsg('EXTRA TIME — next try wins', 4000);
        } else {
          room.running = false;
          setMsg(
            room.scoreA > room.scoreB ? 'FULL TIME — TEAM A WINS' : 'FULL TIME — TEAM B WINS',
            5000
          );
          setTimeout(startMatch, 4500);
        }
      }
    }

    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      if (frozen) continue;
      if (p.stunUntilMs > t) {
        p.vx = 0; p.vy = 0;
      } else if (!p.isBot) {
        const inp = inputs[i] || makeEmptyInput();
        let dx = inp.dx || 0;
        let dy = inp.dy || 0;
        const len = Math.hypot(dx, dy);
        if (len) { dx /= len; dy /= len; }
        p.vx = dx * PLAYER_SPEED;
        p.vy = dy * PLAYER_SPEED;
      } else {
        aiPlayer(p, i);
      }
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.x = Math.max(PLAYER_RADIUS, Math.min(W - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(H - PLAYER_RADIUS, p.y));
    }

    for (let i = 0; i < room.players.length; i++) {
      for (let j = i + 1; j < room.players.length; j++) {
        const a = room.players[i];
        const b = room.players[j];
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

    if (!frozen) {
      for (let i = 0; i < room.players.length; i++) {
        const inp = inputs[i];
        if (!inp || room.players[i].isBot) continue;
        if (inp.tackleQueued) {
          inp.tackleQueued = false;
          tryTackleByIdx(i);
        }
        if (inp.requestQueued) {
          inp.requestQueued = false;
          if (room.ball.carrierIdx !== i) {
            room.players[i].requestUntilMs = t + REQUEST_DURATION_MS;
          }
        }
        if (inp.passQueued) {
          const { power, aimX, aimY } = inp.passQueued;
          inp.passQueued = null;
          attemptPass(i, power, aimX, aimY);
        }
      }
    }

    if (room.ball.carrierIdx !== null) {
      const c = room.players[room.ball.carrierIdx];
      const sp = Math.hypot(c.vx, c.vy) || 1;
      room.ball.x = c.x + (c.vx / sp) * (PLAYER_RADIUS + 4);
      room.ball.y = c.y + (c.vy / sp) * (PLAYER_RADIUS + 4);
      room.ball.vx = c.vx;
      room.ball.vy = c.vy;
    } else {
      room.ball.x += room.ball.vx * DT;
      room.ball.y += room.ball.vy * DT;
      room.ball.vx *= BALL_FRICTION;
      room.ball.vy *= BALL_FRICTION;
      if (Math.hypot(room.ball.vx, room.ball.vy) < BALL_MIN_SPEED) {
        room.ball.vx = 0; room.ball.vy = 0;
      }
      if (room.ball.x < BALL_RADIUS) { room.ball.x = BALL_RADIUS; room.ball.vx = Math.abs(room.ball.vx) * 0.5; }
      if (room.ball.x > W - BALL_RADIUS) { room.ball.x = W - BALL_RADIUS; room.ball.vx = -Math.abs(room.ball.vx) * 0.5; }
      if (room.ball.y < BALL_RADIUS) { room.ball.y = BALL_RADIUS; room.ball.vy = Math.abs(room.ball.vy) * 0.5; }
      if (room.ball.y > H - BALL_RADIUS) { room.ball.y = H - BALL_RADIUS; room.ball.vy = -Math.abs(room.ball.vy) * 0.5; }
      if (t - room.ball.lastDropMs > CATCH_COOLDOWN_MS && !frozen) {
        let nearest = -1;
        let nearestD = CATCH_RADIUS;
        for (let i = 0; i < room.players.length; i++) {
          const p = room.players[i];
          const d = Math.hypot(p.x - room.ball.x, p.y - room.ball.y);
          if (d < nearestD) { nearest = i; nearestD = d; }
        }
        if (nearest >= 0) {
          room.ball.carrierIdx = nearest;
          room.ball.vx = 0; room.ball.vy = 0;
          room.ball.pickedUpMs = t;
        }
      }
    }

    if (!frozen && room.running && room.ball.carrierIdx !== null) {
      const c = room.players[room.ball.carrierIdx];
      if (c.team === 'A' && c.x >= TRY_R - PLAYER_RADIUS) {
        room.scoreA += 1;
        onTryScored('A');
      } else if (c.team === 'B' && c.x <= TRY_L + PLAYER_RADIUS) {
        room.scoreB += 1;
        onTryScored('B');
      }
    }

    if (room.msg && t > room.msgUntilMs && !room.extraTime) {
      room.msg = '';
    }

    broadcastState();
  }

  function snapshot() {
    return {
      perTeam: room.perTeam,
      players: room.players.map((p) => ({
        team: p.team,
        jersey: p.jersey,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx * 10) / 10,
        vy: Math.round(p.vy * 10) / 10,
        stunUntilMs: p.stunUntilMs,
        requestUntilMs: p.requestUntilMs,
        name: p.name || '',
        isBot: p.isBot
      })),
      ball: {
        x: Math.round(room.ball.x * 10) / 10,
        y: Math.round(room.ball.y * 10) / 10,
        vx: Math.round(room.ball.vx * 10) / 10,
        vy: Math.round(room.ball.vy * 10) / 10,
        carrierIdx: room.ball.carrierIdx
      },
      scoreA: room.scoreA,
      scoreB: room.scoreB,
      timeLeft: Math.round(room.timeLeft * 10) / 10,
      extraTime: room.extraTime,
      running: room.running,
      frozenUntilMs: room.frozenUntilMs,
      serverNow: now(),
      msg: room.msg,
      events: room.events
    };
  }

  function broadcastState() {
    nsp.emit('state', snapshot());
    room.events = [];
  }

  function clampNum(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  nsp.on('connection', (socket) => {
    socket.on('join', (payload = {}) => {
      const name = String(payload.name || 'Player').slice(0, 24);
      const idx = findHumanSlot();
      if (idx < 0) {
        socket.emit('roomFull');
        return;
      }
      const p = room.players[idx];
      p.socketId = socket.id;
      p.name = name;
      p.isBot = false;
      inputs[idx] = makeEmptyInput();
      socket.emit('welcome', { youIdx: idx, perTeam: room.perTeam, W, H });
      console.log(`[rugby join] ${name} -> idx ${idx} (${p.team}#${p.jersey})`);
    });

    socket.on('input', (data = {}) => {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx < 0) return;
      const inp = inputs[idx];
      if (!inp) return;
      inp.dx = clampNum(data.dx, -1, 1);
      inp.dy = clampNum(data.dy, -1, 1);
      inp.aimX = clampNum(data.aimX, 0, W);
      inp.aimY = clampNum(data.aimY, 0, H);
    });

    socket.on('tackle', () => {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx < 0) return;
      if (inputs[idx]) inputs[idx].tackleQueued = true;
    });

    socket.on('request', () => {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx < 0) return;
      if (inputs[idx]) inputs[idx].requestQueued = true;
    });

    socket.on('passRelease', (data = {}) => {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx < 0) return;
      const power = clampNum(data.power, 0, 1);
      const aimX = clampNum(data.aimX, 0, W);
      const aimY = clampNum(data.aimY, 0, H);
      if (inputs[idx]) inputs[idx].passQueued = { power, aimX, aimY };
    });

    socket.on('setMode', (data = {}) => {
      const n = Math.max(1, Math.min(MAX_PER_TEAM, Number(data.perTeam) || 3));
      if (n === room.perTeam) return;
      room.perTeam = n;
      startMatch();
      nsp.emit('modeChanged', { perTeam: n });
    });

    socket.on('disconnect', () => {
      detachSocket(socket.id);
    });
  });

  startMatch();
  setInterval(tick, TICK_MS);

  console.log('[rugby] namespace /rugby attached');
}

module.exports = { attachRugby };
