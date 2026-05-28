const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3010;
const TURN_MS = 20000;

const DATA_DIR = __dirname;
const HEROES_PATH = path.join(DATA_DIR, 'heroes.json');
const PROFILES_PATH = path.join(DATA_DIR, 'profiles.json');

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFileAtomic(filePath, data) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function nowMs() {
  return Date.now();
}

function clampRoomCode(roomCode) {
  const code = String(roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return code;
}

function leagueForPoints(points) {
  const p = Number(points) || 0;
  if (p >= 1200) return 'Diamond';
  if (p >= 900) return 'Platinum';
  if (p >= 600) return 'Gold';
  if (p >= 300) return 'Silver';
  return 'Bronze';
}

function defaultProfile() {
  return {
    name: '',
    points: 0,
    ownedHeroIds: ['blade_knight', 'ember_mage', 'stone_guard'],
    equippedHeroId: 'blade_knight',
    shards: 0
  };
}

function packRoll(heroes) {
  const weightsByRarity = {
    Common: 70,
    Rare: 25,
    Epic: 4.5,
    Legendary: 0.5
  };

  const pool = heroes
    .map((h) => ({ hero: h, w: Number(weightsByRarity[h.rarity] || 0) }))
    .filter((x) => x.w > 0);

  const total = pool.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) return x.hero;
  }
  return pool.length ? pool[pool.length - 1].hero : null;
}

function computeDamage(actionType, hero) {
  if (!hero) return 0;
  if (actionType === 'skill') return Number(hero.skill && hero.skill.damage) || 0;
  return Number(hero.baseDamage) || 0;
}

function initialCooldowns(hero) {
  return {
    skill: 0,
    skillMax: Math.max(0, Number(hero && hero.skill && hero.skill.cooldownTurns) || 0)
  };
}

function sanitizeName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  return n.slice(0, 16);
}

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

const heroes = readJsonFile(HEROES_PATH, []);
const heroesById = new Map(heroes.map((h) => [h.id, h]));

let profiles = readJsonFile(PROFILES_PATH, {});
if (!profiles || typeof profiles !== 'object') profiles = {};

function getOrCreateProfile(guestId) {
  const id = String(guestId || '').trim();
  if (!id) return null;
  if (!profiles[id]) profiles[id] = defaultProfile();
  const p = profiles[id];
  if (!Array.isArray(p.ownedHeroIds)) p.ownedHeroIds = defaultProfile().ownedHeroIds.slice();
  if (typeof p.equippedHeroId !== 'string' || !p.equippedHeroId) p.equippedHeroId = defaultProfile().equippedHeroId;
  if (!p.ownedHeroIds.includes(p.equippedHeroId)) p.ownedHeroIds.push(p.equippedHeroId);
  if (!Number.isFinite(Number(p.points))) p.points = 0;
  if (!Number.isFinite(Number(p.shards))) p.shards = 0;
  return p;
}

function persistProfiles() {
  writeJsonFileAtomic(PROFILES_PATH, profiles);
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/heroes', (req, res) => {
  res.json({ heroes });
});

app.get('/api/profile', (req, res) => {
  const guestId = String(req.query.guestId || '').trim();
  const profile = getOrCreateProfile(guestId);
  if (!profile) return res.status(400).json({ error: 'missing_guestId' });
  persistProfiles();
  res.json({ profile: { ...profile, league: leagueForPoints(profile.points) } });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const rooms = new Map();
const socketToRoom = new Map();

function roomSummary(room) {
  return {
    roomCode: room.roomCode,
    ranked: room.ranked,
    phase: room.phase,
    players: room.players.map((p) => ({
      socketId: p.socketId,
      guestId: p.guestId,
      name: p.name,
      heroId: p.heroId,
      ready: p.ready
    })),
    battle: room.battle ? battlePublicState(room.battle) : null
  };
}

function battlePublicState(battle) {
  return {
    turnSocketId: battle.turnSocketId,
    turnEndsAt: battle.turnEndsAt,
    players: Object.fromEntries(Object.entries(battle.players).map(([socketId, bp]) => [socketId, {
      heroId: bp.heroId,
      hp: bp.hp,
      maxHp: bp.maxHp,
      skillCd: bp.cooldowns.skill
    }]))
  };
}

function ensureRoom(roomCode, ranked) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      roomCode,
      ranked: Boolean(ranked),
      phase: 'lobby',
      players: [],
      battle: null,
      turnTimer: null
    });
  }
  return rooms.get(roomCode);
}

function maybeStartBattle(room) {
  if (room.phase !== 'lobby') return;
  if (room.players.length !== 2) return;
  if (!room.players.every((p) => p.ready && p.heroId && heroesById.has(p.heroId))) return;

  const p1 = room.players[0];
  const p2 = room.players[1];

  const h1 = heroesById.get(p1.heroId);
  const h2 = heroesById.get(p2.heroId);

  room.phase = 'battle';
  room.battle = {
    roomCode: room.roomCode,
    ranked: room.ranked,
    turnSocketId: Math.random() < 0.5 ? p1.socketId : p2.socketId,
    turnEndsAt: nowMs() + TURN_MS,
    players: {
      [p1.socketId]: {
        socketId: p1.socketId,
        guestId: p1.guestId,
        name: p1.name,
        heroId: p1.heroId,
        hp: Number(h1.health) || 100,
        maxHp: Number(h1.health) || 100,
        cooldowns: initialCooldowns(h1)
      },
      [p2.socketId]: {
        socketId: p2.socketId,
        guestId: p2.guestId,
        name: p2.name,
        heroId: p2.heroId,
        hp: Number(h2.health) || 100,
        maxHp: Number(h2.health) || 100,
        cooldowns: initialCooldowns(h2)
      }
    },
    log: []
  };

  setTurnTimer(room);
  io.to(room.roomCode).emit('roomState', roomSummary(room));
}

function clearTurnTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

function setTurnTimer(room) {
  clearTurnTimer(room);
  if (!room.battle) return;

  const delay = Math.max(0, room.battle.turnEndsAt - nowMs());
  room.turnTimer = setTimeout(() => {
    try {
      handleTurnTimeout(room);
    } catch {
      clearTurnTimer(room);
    }
  }, delay);
}

function handleTurnTimeout(room) {
  if (!room.battle) return;
  if (room.phase !== 'battle') return;

  const battle = room.battle;
  const actorSocketId = battle.turnSocketId;
  if (!battle.players[actorSocketId]) return;

  applyAction(room, actorSocketId, 'basic', true);
}

function decrementCooldowns(bp) {
  bp.cooldowns.skill = Math.max(0, (Number(bp.cooldowns.skill) || 0) - 1);
}

function applyAction(room, actorSocketId, actionType, auto) {
  const battle = room.battle;
  if (!battle) return;
  if (room.phase !== 'battle') return;
  if (battle.turnSocketId !== actorSocketId) return;

  const actor = battle.players[actorSocketId];
  if (!actor) return;

  const targetSocketId = Object.keys(battle.players).find((id) => id !== actorSocketId);
  const target = targetSocketId ? battle.players[targetSocketId] : null;
  if (!target) return;

  const actorHero = heroesById.get(actor.heroId);
  const targetHero = heroesById.get(target.heroId);

  let type = actionType === 'skill' ? 'skill' : 'basic';
  if (type === 'skill' && (Number(actor.cooldowns.skill) || 0) > 0) type = 'basic';

  const dmg = computeDamage(type === 'skill' ? 'skill' : 'basic', actorHero);

  target.hp = Math.max(0, (Number(target.hp) || 0) - dmg);

  if (type === 'skill') {
    actor.cooldowns.skill = Number(actorHero && actorHero.skill && actorHero.skill.cooldownTurns) || 0;
  }

  decrementCooldowns(actor);
  decrementCooldowns(target);

  const msg = {
    at: nowMs(),
    text: `${actor.name || 'Player'} used ${type === 'skill' ? (actorHero.skill && actorHero.skill.name) || 'Skill' : 'Basic Attack'} for ${dmg} damage${auto ? ' (auto)' : ''}.`
  };
  battle.log.push(msg);
  if (battle.log.length > 40) battle.log.shift();

  if (target.hp <= 0) {
    finishMatch(room, actorSocketId, targetSocketId);
    return;
  }

  battle.turnSocketId = targetSocketId;
  battle.turnEndsAt = nowMs() + TURN_MS;
  setTurnTimer(room);
  io.to(room.roomCode).emit('battleLog', msg);
  io.to(room.roomCode).emit('roomState', roomSummary(room));
}

function finishMatch(room, winnerSocketId, loserSocketId) {
  clearTurnTimer(room);

  const battle = room.battle;
  room.phase = 'finished';

  if (battle) {
    battle.turnSocketId = null;
    battle.turnEndsAt = null;
  }

  let rankedResult = null;

  if (battle && battle.ranked) {
    const w = battle.players[winnerSocketId];
    const l = battle.players[loserSocketId];
    if (w && l) {
      const wProfile = getOrCreateProfile(w.guestId);
      const lProfile = getOrCreateProfile(l.guestId);
      if (wProfile && lProfile) {
        wProfile.points = (Number(wProfile.points) || 0) + 25;
        lProfile.points = Math.max(0, (Number(lProfile.points) || 0) - 20);
        persistProfiles();
        rankedResult = {
          winnerGuestId: w.guestId,
          loserGuestId: l.guestId
        };

        io.to(winnerSocketId).emit('profileUpdate', { profile: { ...wProfile, league: leagueForPoints(wProfile.points) } });
        io.to(loserSocketId).emit('profileUpdate', { profile: { ...lProfile, league: leagueForPoints(lProfile.points) } });
      }
    }
  }

  io.to(room.roomCode).emit('matchFinished', {
    winnerSocketId,
    loserSocketId,
    ranked: Boolean(battle && battle.ranked),
    rankedResult
  });

  io.to(room.roomCode).emit('roomState', roomSummary(room));
}

function removeSocketFromRoom(socketId) {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  socketToRoom.delete(socketId);

  if (!room) return;

  const wasInBattle = Boolean(room.phase === 'battle' && room.battle && room.battle.players && room.battle.players[socketId]);

  room.players = room.players.filter((p) => p.socketId !== socketId);

  if (room.players.length === 0) {
    clearTurnTimer(room);
    rooms.delete(roomCode);
    return;
  }

  if (wasInBattle && room.players.length === 1) {
    const remaining = room.players[0];
    finishMatch(room, remaining.socketId, socketId);

    if (room.battle && room.battle.players && room.battle.players[socketId]) {
      delete room.battle.players[socketId];
    }
    return;
  }

  if (room.battle && room.battle.players && room.battle.players[socketId]) {
    delete room.battle.players[socketId];
  }

  io.to(room.roomCode).emit('roomState', roomSummary(room));
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (payload) => {
    const roomCode = clampRoomCode(payload && payload.roomCode);
    const guestId = String(payload && payload.guestId || '').trim();
    const name = sanitizeName(payload && payload.name);
    const ranked = Boolean(payload && payload.ranked);

    if (!roomCode) {
      socket.emit('errorMessage', { text: 'Invalid room code.' });
      return;
    }

    const profile = getOrCreateProfile(guestId);
    if (!profile) {
      socket.emit('errorMessage', { text: 'Missing guestId.' });
      return;
    }

    if (name) profile.name = name;
    persistProfiles();

    const room = ensureRoom(roomCode, ranked);
    if (room.players.length >= 2) {
      socket.emit('errorMessage', { text: 'Room is full.' });
      return;
    }

    removeSocketFromRoom(socket.id);

    const existing = room.players.find((p) => p.guestId === guestId);
    if (existing) {
      existing.socketId = socket.id;
      existing.name = name || existing.name;
    } else {
      room.players.push({
        socketId: socket.id,
        guestId,
        name: name || profile.name || 'Guest',
        heroId: profile.equippedHeroId,
        ready: false
      });
    }

    socketToRoom.set(socket.id, room.roomCode);
    socket.join(room.roomCode);

    socket.emit('roomJoined', {
      ...roomSummary(room),
      selfSocketId: socket.id,
      profile: { ...profile, league: leagueForPoints(profile.points) }
    });

    socket.to(room.roomCode).emit('roomState', roomSummary(room));
  });

  socket.on('setReady', (payload) => {
    const roomCode = socketToRoom.get(socket.id);
    const room = roomCode ? rooms.get(roomCode) : null;
    if (!room) return;

    const p = room.players.find((x) => x.socketId === socket.id);
    if (!p) return;

    p.ready = Boolean(payload && payload.ready);
    io.to(room.roomCode).emit('roomState', roomSummary(room));
    maybeStartBattle(room);
  });

  socket.on('selectHero', (payload) => {
    const roomCode = socketToRoom.get(socket.id);
    const room = roomCode ? rooms.get(roomCode) : null;
    if (!room) return;

    const heroId = String(payload && payload.heroId || '').trim();
    if (!heroesById.has(heroId)) return;

    const p = room.players.find((x) => x.socketId === socket.id);
    if (!p) return;

    const profile = getOrCreateProfile(p.guestId);
    if (!profile) return;

    if (!profile.ownedHeroIds.includes(heroId)) return;

    p.heroId = heroId;
    io.to(room.roomCode).emit('roomState', roomSummary(room));
  });

  socket.on('battleIntent', (payload) => {
    const roomCode = socketToRoom.get(socket.id);
    const room = roomCode ? rooms.get(roomCode) : null;
    if (!room || room.phase !== 'battle') return;

    const action = String(payload && payload.action || 'basic');
    if (action !== 'basic' && action !== 'skill') return;

    applyAction(room, socket.id, action, false);
  });

  socket.on('openPack', (payload) => {
    const guestId = String(payload && payload.guestId || '').trim();
    const profile = getOrCreateProfile(guestId);
    if (!profile) {
      socket.emit('errorMessage', { text: 'Missing guestId.' });
      return;
    }

    const rolled = packRoll(heroes);
    if (!rolled) {
      socket.emit('errorMessage', { text: 'Pack failed.' });
      return;
    }

    let isNew = false;
    if (!profile.ownedHeroIds.includes(rolled.id)) {
      profile.ownedHeroIds.push(rolled.id);
      isNew = true;
    } else {
      profile.shards = (Number(profile.shards) || 0) + 10;
    }

    persistProfiles();

    socket.emit('packResult', {
      heroId: rolled.id,
      rarity: rolled.rarity,
      isNew,
      shards: profile.shards
    });

    socket.emit('profileUpdate', { profile: { ...profile, league: leagueForPoints(profile.points) } });
  });

  socket.on('equipHero', (payload) => {
    const guestId = String(payload && payload.guestId || '').trim();
    const heroId = String(payload && payload.heroId || '').trim();
    const profile = getOrCreateProfile(guestId);
    if (!profile) return;

    if (!heroesById.has(heroId)) return;
    if (!profile.ownedHeroIds.includes(heroId)) return;

    profile.equippedHeroId = heroId;
    persistProfiles();

    socket.emit('profileUpdate', { profile: { ...profile, league: leagueForPoints(profile.points) } });
  });

  socket.on('leaveRoom', () => {
    removeSocketFromRoom(socket.id);
  });

  socket.on('disconnect', () => {
    removeSocketFromRoom(socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`pvp-hero-battle-server listening on http://localhost:${PORT}`);
});
