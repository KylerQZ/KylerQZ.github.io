const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 12);

const PHASE_MS = {
  day: 60000,
  voting: 30000,
  night: 30000
};

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function cleanName(name) {
  const n = String(name || '').trim().slice(0, 16);
  return n || 'Player';
}

function cleanRoomCode(code) {
  return String(code || '').trim().toUpperCase().slice(0, 8);
}

function roomPlayersPublic(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive
  }));
}

function emitRoomState(room) {
  const timeRemainingMs = room.phaseEndAt ? Math.max(0, room.phaseEndAt - Date.now()) : null;
  io.to(room.code).emit('roomState', {
    hostId: room.hostId,
    phase: room.phase,
    timeRemainingMs,
    players: roomPlayersPublic(room)
  });
}

function systemToRoom(room, text) {
  io.to(room.code).emit('systemMessage', { text, at: nowTime() });
}

function systemToSocket(socket, text) {
  socket.emit('systemMessage', { text, at: nowTime() });
}

function clearRoomTimers(room) {
  if (room.phaseTimer) {
    clearTimeout(room.phaseTimer);
    room.phaseTimer = null;
  }
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
  room.phaseEndAt = null;
}

function startTick(room) {
  if (room.tickInterval) return;
  room.tickInterval = setInterval(() => emitRoomState(room), 1000);
}

function setPhase(room, phase) {
  room.phase = phase;
  room.votes = new Map();
  room.nightActions = {
    mafiaKills: new Map(),
    doctorHeals: new Map(),
    detectiveChecks: new Map()
  };

  clearRoomTimers(room);

  if (phase === 'lobby' || phase === 'results') {
    emitRoomState(room);
    return;
  }

  const duration = PHASE_MS[phase] || 30000;
  room.phaseEndAt = Date.now() + duration;
  startTick(room);
  emitRoomState(room);
  room.phaseTimer = setTimeout(() => advancePhase(room.code), duration);
}

function alivePlayers(room) {
  return Array.from(room.players.values()).filter((p) => p.alive);
}

function checkWin(room) {
  const alive = alivePlayers(room);
  const mafiaAlive = alive.filter((p) => p.role === 'mafia').length;
  const villagersAlive = alive.length - mafiaAlive;

  if (mafiaAlive <= 0) {
    systemToRoom(room, 'Villagers win! All Mafia have been eliminated.');
    setPhase(room, 'results');
    return true;
  }

  if (mafiaAlive >= villagersAlive) {
    systemToRoom(room, 'Mafia win! They control the town.');
    setPhase(room, 'results');
    return true;
  }

  return false;
}

function pickTopVote(voteMap) {
  const counts = new Map();
  for (const targetId of voteMap.values()) {
    if (!targetId) continue;
    counts.set(targetId, (counts.get(targetId) || 0) + 1);
  }
  let bestId = null;
  let bestCount = 0;
  let tied = false;
  for (const [id, c] of counts.entries()) {
    if (c > bestCount) {
      bestId = id;
      bestCount = c;
      tied = false;
    } else if (c === bestCount) {
      tied = true;
    }
  }
  if (!bestId || tied) return null;
  return bestId;
}

function advancePhase(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.phase === 'day') {
    systemToRoom(room, 'Voting time.');
    setPhase(room, 'voting');
    return;
  }

  if (room.phase === 'voting') {
    const eliminatedId = pickTopVote(room.votes);
    if (eliminatedId && room.players.has(eliminatedId)) {
      const p = room.players.get(eliminatedId);
      if (p.alive) {
        p.alive = false;
        systemToRoom(room, `${p.name} was eliminated.`);
      } else {
        systemToRoom(room, 'No one was eliminated.');
      }
    } else {
      systemToRoom(room, 'No one was eliminated.');
    }

    emitRoomState(room);
    if (checkWin(room)) return;

    systemToRoom(room, 'Night falls.');
    setPhase(room, 'night');
    return;
  }

  if (room.phase === 'night') {
    const killTarget = pickTopVote(room.nightActions.mafiaKills);
    const healTarget = pickTopVote(room.nightActions.doctorHeals);

    if (killTarget && room.players.has(killTarget)) {
      const target = room.players.get(killTarget);
      if (target.alive) {
        if (healTarget && healTarget === killTarget) {
          systemToRoom(room, 'Someone was attacked but survived.');
        } else {
          target.alive = false;
          systemToRoom(room, `${target.name} died during the night.`);
        }
      }
    } else {
      systemToRoom(room, 'It was a quiet night.');
    }

    emitRoomState(room);
    if (checkWin(room)) return;

    systemToRoom(room, 'Day breaks. Discuss.');
    setPhase(room, 'day');
    return;
  }
}

function assignRoles(room) {
  const players = Array.from(room.players.values());

  const shuffled = players.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const n = shuffled.length;
  const mafiaCount = Math.max(1, Math.floor((n - 1) / 4));
  const detectiveCount = n >= 5 ? 1 : 0;
  const doctorCount = n >= 6 ? 1 : 0;

  let idx = 0;
  for (let i = 0; i < mafiaCount; i++) shuffled[idx++].role = 'mafia';
  for (let i = 0; i < detectiveCount; i++) shuffled[idx++].role = 'detective';
  for (let i = 0; i < doctorCount; i++) shuffled[idx++].role = 'doctor';
  for (; idx < n; idx++) shuffled[idx].role = 'villager';

  for (const p of players) {
    const s = io.sockets.sockets.get(p.id);
    if (s) s.emit('yourRole', { role: p.role });
  }
}

function createRoomIfMissing(roomCode) {
  if (rooms.has(roomCode)) return rooms.get(roomCode);
  const room = {
    code: roomCode,
    hostId: null,
    phase: 'lobby',
    phaseEndAt: null,
    phaseTimer: null,
    tickInterval: null,
    started: false,
    players: new Map(),
    votes: new Map(),
    nightActions: {
      mafiaKills: new Map(),
      doctorHeals: new Map(),
      detectiveChecks: new Map()
    }
  };
  rooms.set(roomCode, room);
  return room;
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (payload) => {
    const roomCode = cleanRoomCode(payload && payload.roomCode);
    if (!roomCode) return;

    const room = createRoomIfMissing(roomCode);

    if (room.started) {
      systemToSocket(socket, 'This room is already in-game.');
      return;
    }

    if (room.players.size >= MAX_PLAYERS) {
      systemToSocket(socket, 'Room is full.');
      return;
    }

    const name = cleanName(payload && payload.name);
    const guestId = String((payload && payload.guestId) || '').trim().slice(0, 64);

    room.players.set(socket.id, {
      id: socket.id,
      guestId,
      name,
      alive: true,
      role: null
    });

    if (!room.hostId) room.hostId = socket.id;

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit('roomJoined', {
      roomCode,
      playerId: socket.id,
      hostId: room.hostId,
      phase: room.phase,
      timeRemainingMs: room.phaseEndAt ? Math.max(0, room.phaseEndAt - Date.now()) : null,
      players: roomPlayersPublic(room)
    });

    systemToRoom(room, `${name} joined.`);
    emitRoomState(room);
  });

  socket.on('startGame', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (socket.id !== room.hostId) {
      systemToSocket(socket, 'Only the host can start the game.');
      return;
    }

    if (room.started) return;

    if (room.players.size < 4) {
      systemToSocket(socket, 'Need at least 4 players to start.');
      return;
    }

    room.started = true;
    for (const p of room.players.values()) {
      p.alive = true;
      p.role = null;
    }

    assignRoles(room);
    systemToRoom(room, 'Game started. Roles assigned.');
    systemToRoom(room, 'Day begins. Discuss.');
    setPhase(room, 'day');
  });

  socket.on('chatMessage', (payload) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const phase = room.phase || 'lobby';
    const isOutOfGame = phase === 'lobby' || phase === 'results';
    const isChatPhase = phase === 'day' || phase === 'voting';

    if (!isOutOfGame && !isChatPhase) {
      systemToSocket(socket, 'Chat is disabled right now.');
      return;
    }

    if (!isOutOfGame && !player.alive) {
      systemToSocket(socket, 'You cannot chat while dead.');
      return;
    }

    const text = String((payload && payload.text) || '').trim().slice(0, 200);
    if (!text) return;

    io.to(roomCode).emit('chatMessage', {
      name: player.name,
      text,
      at: nowTime()
    });
  });

  socket.on('submitVote', (payload) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.phase !== 'voting') return;

    const voter = room.players.get(socket.id);
    if (!voter || !voter.alive) return;

    const targetId = String((payload && payload.targetId) || '');
    const target = room.players.get(targetId);
    if (!target || !target.alive) return;

    room.votes.set(socket.id, targetId);
    systemToRoom(room, `${voter.name} voted for ${target.name}.`);
    emitRoomState(room);
  });

  socket.on('nightAction', (payload) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.phase !== 'night') return;

    const actor = room.players.get(socket.id);
    if (!actor || !actor.alive) return;

    const type = String((payload && payload.type) || '');
    const targetId = String((payload && payload.targetId) || '');
    const target = room.players.get(targetId);
    if (!target || !target.alive) return;

    if (type === 'kill') {
      if (actor.role !== 'mafia') return;
      room.nightActions.mafiaKills.set(socket.id, targetId);
      systemToSocket(socket, 'Kill locked in.');
      emitRoomState(room);
      return;
    }

    if (type === 'heal') {
      if (actor.role !== 'doctor') return;
      room.nightActions.doctorHeals.set(socket.id, targetId);
      systemToSocket(socket, 'Heal locked in.');
      emitRoomState(room);
      return;
    }

    if (type === 'investigate') {
      if (actor.role !== 'detective') return;
      room.nightActions.detectiveChecks.set(socket.id, targetId);
      const isMafia = target.role === 'mafia';
      socket.emit('actionResult', {
        text: `${target.name} is ${isMafia ? 'Mafia' : 'not Mafia'}.`,
        at: nowTime()
      });
      emitRoomState(room);
      return;
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const leaving = room.players.get(socket.id);
    room.players.delete(socket.id);

    if (leaving) systemToRoom(room, `${leaving.name} left.`);

    if (room.hostId === socket.id) {
      const next = room.players.keys().next();
      room.hostId = next.done ? null : next.value;
    }

    if (room.players.size === 0) {
      clearRoomTimers(room);
      rooms.delete(roomCode);
      return;
    }

    emitRoomState(room);

    if (room.started && room.phase !== 'results') {
      checkWin(room);
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`mafia-server listening on http://localhost:${PORT}`);
});
