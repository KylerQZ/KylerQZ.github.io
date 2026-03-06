const els = {
  status: document.getElementById('status'),
  serverUrl: document.getElementById('serverUrl'),
  name: document.getElementById('name'),
  roomCode: document.getElementById('roomCode'),
  connectBtn: document.getElementById('connectBtn'),
  joinBtn: document.getElementById('joinBtn'),
  connectHint: document.getElementById('connectHint'),

  leagueValue: document.getElementById('leagueValue'),
  pointsValue: document.getElementById('pointsValue'),
  shardsValue: document.getElementById('shardsValue'),
  equippedValue: document.getElementById('equippedValue'),

  roomValue: document.getElementById('roomValue'),
  readyBtn: document.getElementById('readyBtn'),
  leaveBtn: document.getElementById('leaveBtn'),

  heroSelect: document.getElementById('heroSelect'),
  collectionList: document.getElementById('collectionList'),

  selfHpFill: document.getElementById('selfHpFill'),
  selfHpText: document.getElementById('selfHpText'),
  oppHpFill: document.getElementById('oppHpFill'),
  oppHpText: document.getElementById('oppHpText'),

  basicBtn: document.getElementById('basicBtn'),
  skillBtn: document.getElementById('skillBtn'),
  turnPill: document.getElementById('turnPill'),
  timerPill: document.getElementById('timerPill'),

  battleLog: document.getElementById('battleLog'),

  openPackBtn: document.getElementById('openPackBtn'),
  packHint: document.getElementById('packHint'),
  packResult: document.getElementById('packResult')
};

const STORAGE = {
  serverUrl: 'phbg_server_url',
  guestId: 'phbg_guest_id',
  name: 'phbg_name',
  offlineProfile: 'phbg_offline_profile_v1'
};

const DEFAULT_HEROES = [
  {
    id: 'blade_knight',
    name: 'Blade Knight',
    rarity: 'Common',
    health: 105,
    baseDamage: 10,
    skill: { name: 'Cross Slash', damage: 18, cooldownTurns: 2, effectId: 'slash_x' }
  },
  {
    id: 'ember_mage',
    name: 'Ember Mage',
    rarity: 'Common',
    health: 98,
    baseDamage: 11,
    skill: { name: 'Fire Burst', damage: 19, cooldownTurns: 2, effectId: 'fire_burst' }
  },
  {
    id: 'stone_guard',
    name: 'Stone Guard',
    rarity: 'Common',
    health: 110,
    baseDamage: 9,
    skill: { name: 'Shield Bash', damage: 17, cooldownTurns: 2, effectId: 'impact' }
  },
  {
    id: 'storm_archer',
    name: 'Storm Archer',
    rarity: 'Rare',
    health: 100,
    baseDamage: 10,
    skill: { name: 'Volley', damage: 20, cooldownTurns: 3, effectId: 'arrows_rain' }
  },
  {
    id: 'shadow_duelist',
    name: 'Shadow Duelist',
    rarity: 'Epic',
    health: 102,
    baseDamage: 10,
    skill: { name: 'Night Pierce', damage: 22, cooldownTurns: 3, effectId: 'shadow_pierce' }
  },
  {
    id: 'celestial_samurai',
    name: 'Celestial Samurai',
    rarity: 'Legendary',
    health: 104,
    baseDamage: 11,
    skill: { name: 'Starfall Cut', damage: 22, cooldownTurns: 3, effectId: 'starfall' }
  }
];

const OFFLINE_BASIC_CD_MS = 900;
const OFFLINE_SKILL_CD_MS = 4500;
const OFFLINE_STUN_MS = 1200;

const state = {
  connected: false,
  socket: null,
  serverUrl: '',
  guestId: '',
  profile: null,
  heroes: [],
  heroesById: new Map(),
  room: null,
  selfSocketId: null,
  page: 'battle',
  ready: false,
  tickTimer: null,
  offline: false
};

function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function nowMs() {
  return Date.now();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return String(s) + 's';
  return m + ':' + pad2(r);
}

function escapeText(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function setStatus(text) {
  els.status.textContent = text;
}

function leagueForPoints(points) {
  const p = Number(points) || 0;
  if (p >= 1200) return 'Diamond';
  if (p >= 900) return 'Platinum';
  if (p >= 600) return 'Gold';
  if (p >= 300) return 'Silver';
  return 'Bronze';
}

function defaultOfflineProfile() {
  return {
    name: '',
    points: 0,
    league: 'Bronze',
    ownedHeroIds: ['blade_knight', 'ember_mage', 'stone_guard'],
    equippedHeroId: 'blade_knight',
    shards: 0
  };
}

function readOfflineProfile() {
  try {
    const raw = lsGet(STORAGE.offlineProfile);
    if (!raw) return defaultOfflineProfile();
    const p = JSON.parse(raw);
    const base = defaultOfflineProfile();
    const ownedHeroIds = Array.isArray(p.ownedHeroIds) ? p.ownedHeroIds.filter((id) => state.heroesById.has(id)) : base.ownedHeroIds.slice();
    const equippedHeroId = typeof p.equippedHeroId === 'string' && state.heroesById.has(p.equippedHeroId) ? p.equippedHeroId : base.equippedHeroId;
    if (!ownedHeroIds.includes(equippedHeroId)) ownedHeroIds.push(equippedHeroId);
    const points = Number.isFinite(Number(p.points)) ? Number(p.points) : 0;
    const shards = Number.isFinite(Number(p.shards)) ? Number(p.shards) : 0;
    const name = typeof p.name === 'string' ? p.name.slice(0, 16) : '';
    return {
      name,
      points,
      league: leagueForPoints(points),
      ownedHeroIds,
      equippedHeroId,
      shards
    };
  } catch {
    return defaultOfflineProfile();
  }
}

function saveOfflineProfile(profile) {
  lsSet(STORAGE.offlineProfile, JSON.stringify(profile));
}

function offlinePackRoll() {
  const weightsByRarity = {
    Common: 70,
    Rare: 25,
    Epic: 4.5,
    Legendary: 0.5
  };

  const pool = state.heroes
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

function offlineInitialCooldowns(hero) {
  return {
    skillCd: 0,
    skillMax: Math.max(0, Number(hero && hero.skill && hero.skill.cooldownTurns) || 0)
  };
}

function offlineComputeDamage(actionType, hero) {
  if (!hero) return 0;
  if (actionType === 'skill') return Number(hero.skill && hero.skill.damage) || 0;
  return Number(hero.baseDamage) || 0;
}

function offlineDecrementCds(bp) {
  bp.skillCd = Math.max(0, (Number(bp.skillCd) || 0) - 1);
}

function offlineMsUntil(t) {
  return Math.max(0, Number(t || 0) - nowMs());
}

function offlineIsStunned(bp) {
  return offlineMsUntil(bp.stunnedUntil) > 0;
}

function offlineCanUseBasic(bp) {
  return offlineMsUntil(bp.nextBasicAt) <= 0;
}

function offlineCanUseSkill(bp) {
  return offlineMsUntil(bp.nextSkillAt) <= 0;
}

function offlineRandInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(a + Math.random() * (b - a + 1));
}

function offlineStart() {
  state.offline = true;
  state.connected = false;
  state.socket = null;
  state.selfSocketId = 'self';

  state.heroes = DEFAULT_HEROES.slice();
  state.heroesById = new Map(state.heroes.map((h) => [h.id, h]));

  state.profile = readOfflineProfile();
  state.profile.league = leagueForPoints(state.profile.points);
  saveOfflineProfile(state.profile);

  setStatus('Offline');
  els.joinBtn.disabled = false;
  els.openPackBtn.disabled = false;
  els.joinBtn.textContent = 'Quick Play';
  els.connectBtn.textContent = 'Try Online';
  if (!String(els.roomCode.value || '').trim()) els.roomCode.value = 'OFFLINE';
  els.connectHint.textContent = 'Offline mode: battle vs AI, packs and profile saved locally.';
  renderAll();
}

function getOrCreateGuestId() {
  const existing = lsGet(STORAGE.guestId);
  if (existing) return existing;
  const id = 'g_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
  lsSet(STORAGE.guestId, id);
  return id;
}

function hydrateInputs() {
  els.serverUrl.value = lsGet(STORAGE.serverUrl) || 'http://localhost:3010';
  els.name.value = lsGet(STORAGE.name) || '';
  state.guestId = getOrCreateGuestId();
}

function readInputs() {
  return {
    serverUrl: String(els.serverUrl.value || '').trim(),
    name: String(els.name.value || '').trim().slice(0, 16),
    roomCode: String(els.roomCode.value || '').trim().toUpperCase()
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('http_' + res.status);
  return await res.json();
}

async function loadHeroesAndProfile(serverUrl) {
  const heroesResp = await fetchJson(serverUrl + '/api/heroes');
  state.heroes = Array.isArray(heroesResp.heroes) ? heroesResp.heroes : [];
  state.heroesById = new Map(state.heroes.map((h) => [h.id, h]));

  const profResp = await fetchJson(serverUrl + '/api/profile?guestId=' + encodeURIComponent(state.guestId));
  state.profile = profResp.profile || null;
}

function connect(serverUrl) {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }

  state.offline = false;
  els.joinBtn.textContent = 'Join Room';
  els.connectBtn.textContent = 'Connect';
  setStatus('Connecting...');
  els.connectHint.textContent = '';

  state.socket = io(serverUrl, {
    transports: ['websocket'],
    timeout: 8000
  });

  state.socket.on('connect', () => {
    state.connected = true;
    state.offline = false;
    setStatus('Connected');
    els.joinBtn.disabled = false;
    els.openPackBtn.disabled = false;
  });

  state.socket.on('connect_error', () => {
    state.connected = false;
    setStatus('Disconnected');
    els.joinBtn.disabled = true;
    els.openPackBtn.disabled = true;
    els.connectHint.textContent = 'Could not connect. Check the server URL and that the server is running.';
  });

  state.socket.on('disconnect', () => {
    state.connected = false;
    setStatus('Disconnected');
    els.joinBtn.disabled = true;
    els.openPackBtn.disabled = true;
  });

  state.socket.on('roomJoined', (payload) => {
    state.room = payload;
    state.selfSocketId = payload.selfSocketId;
    if (payload.profile) state.profile = payload.profile;
    state.ready = false;
    renderAll();
  });

  state.socket.on('roomState', (payload) => {
    if (!state.room) state.room = {};
    state.room = { ...state.room, ...payload };
    renderAll();
  });

  state.socket.on('battleLog', (msg) => {
    appendBattleLog(msg);
  });

  state.socket.on('matchFinished', (payload) => {
    appendBattleLog({ at: nowMs(), text: 'Match finished.' });
    if (payload && payload.ranked) {
      appendBattleLog({ at: nowMs(), text: 'Ranked result applied.' });
    }
  });

  state.socket.on('profileUpdate', (payload) => {
    if (payload && payload.profile) state.profile = payload.profile;
    renderProfile();
    renderHeroesLists();
  });

  state.socket.on('packResult', (payload) => {
    renderPackResult(payload);
  });

  state.socket.on('errorMessage', (payload) => {
    const text = payload && payload.text ? payload.text : 'Error';
    els.connectHint.textContent = text;
  });
}

function joinRoom() {
  const { name, roomCode } = readInputs();
  if (state.offline) {
    const code = roomCode || 'OFFLINE';

    lsSet(STORAGE.name, name);
    state.profile.name = name;
    state.profile.league = leagueForPoints(state.profile.points);
    saveOfflineProfile(state.profile);

    const heroId = state.profile.equippedHeroId;
    const aiHero = state.heroes[Math.floor(Math.random() * state.heroes.length)];

    state.room = {
      roomCode: code,
      ranked: true,
      phase: 'lobby',
      players: [
        { socketId: 'self', guestId: state.guestId, name: name || 'You', heroId, ready: false },
        { socketId: 'ai', guestId: 'ai', name: 'AI', heroId: aiHero ? aiHero.id : 'blade_knight', ready: true }
      ],
      battle: null
    };
    state.ready = false;
    els.connectHint.textContent = '';
    renderAll();
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  if (!roomCode) return;

  localStorage.setItem(STORAGE.name, name);

  state.socket.emit('joinRoom', {
    roomCode,
    guestId: state.guestId,
    name,
    ranked: true
  });
}

function leaveRoom() {
  if (state.offline) {
    state.room = null;
    state.ready = false;
    renderAll();
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  state.socket.emit('leaveRoom');
  state.room = null;
  state.ready = false;
  renderAll();
}

function setReady(ready) {
  if (!state.room || !state.room.roomCode) return;

  if (state.offline) {
    state.ready = ready;
    const self = state.room.players.find((p) => p.socketId === 'self');
    if (self) self.ready = ready;
    if (ready) offlineMaybeStartBattle();
    renderAll();
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  state.ready = ready;
  state.socket.emit('setReady', { ready });
  renderAll();
}

function selectHero(heroId) {
  if (state.offline) {
    if (!state.profile || !Array.isArray(state.profile.ownedHeroIds)) return;
    if (!state.profile.ownedHeroIds.includes(heroId)) return;
    const self = state.room && state.room.players ? state.room.players.find((p) => p.socketId === 'self') : null;
    if (self) self.heroId = heroId;
    renderAll();
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  state.socket.emit('selectHero', { heroId });
}

function equipHero(heroId) {
  if (state.offline) {
    if (!state.profile || !Array.isArray(state.profile.ownedHeroIds)) return;
    if (!state.profile.ownedHeroIds.includes(heroId)) return;
    state.profile.equippedHeroId = heroId;
    state.profile.league = leagueForPoints(state.profile.points);
    saveOfflineProfile(state.profile);
    renderProfile();
    renderHeroesLists();
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  state.socket.emit('equipHero', { guestId: state.guestId, heroId });
}

function openPack() {
  if (state.offline) {
    els.packHint.textContent = 'Opening...';
    const rolled = offlinePackRoll();
    if (!rolled) {
      els.packHint.textContent = 'Pack failed.';
      return;
    }
    let isNew = false;
    if (!state.profile.ownedHeroIds.includes(rolled.id)) {
      state.profile.ownedHeroIds.push(rolled.id);
      isNew = true;
    } else {
      state.profile.shards = (Number(state.profile.shards) || 0) + 10;
    }
    state.profile.league = leagueForPoints(state.profile.points);
    saveOfflineProfile(state.profile);
    renderProfile();
    renderHeroesLists();
    renderPackResult({ heroId: rolled.id, rarity: rolled.rarity, isNew, shards: state.profile.shards });
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  els.packHint.textContent = 'Opening...';
  state.socket.emit('openPack', { guestId: state.guestId });
}

function sendBattleIntent(action) {
  if (state.offline) {
    offlineApplyAction('self', action);
    return;
  }

  if (!state.socket || !state.socket.connected) return;
  state.socket.emit('battleIntent', { action });
}

function offlineMaybeStartBattle() {
  if (!state.room || state.room.phase !== 'lobby') return;
  if (!state.room.players || state.room.players.length !== 2) return;
  const self = state.room.players.find((p) => p.socketId === 'self');
  const ai = state.room.players.find((p) => p.socketId === 'ai');
  if (!self || !ai) return;
  if (!self.ready) return;
  if (!self.heroId || !state.heroesById.has(self.heroId)) return;
  if (!ai.heroId || !state.heroesById.has(ai.heroId)) return;

  const hSelf = state.heroesById.get(self.heroId);
  const hAi = state.heroesById.get(ai.heroId);

  state.room.phase = 'battle';
  state.room.battle = {
    startedAt: nowMs(),
    endedAt: null,
    aiNextAt: nowMs() + offlineRandInt(400, 900),
    players: {
      self: {
        heroId: self.heroId,
        hp: Number(hSelf.health) || 100,
        maxHp: Number(hSelf.health) || 100,
        nextBasicAt: 0,
        nextSkillAt: 0,
        stunnedUntil: 0
      },
      ai: {
        heroId: ai.heroId,
        hp: Number(hAi.health) || 100,
        maxHp: Number(hAi.health) || 100,
        nextBasicAt: 0,
        nextSkillAt: 0,
        stunnedUntil: 0
      }
    }
  };

  els.battleLog.innerHTML = '';
  appendBattleLog({ at: nowMs(), text: 'Battle started vs AI.' });
  renderAll();
}

function offlineFinishMatch(winnerId, loserId) {
  if (!state.room || !state.room.battle) return;
  state.room.phase = 'finished';
  state.room.battle.endedAt = nowMs();

  const winText = winnerId === 'self' ? 'You win!' : 'You lose.';
  appendBattleLog({ at: nowMs(), text: winText });

  if (winnerId === 'self') {
    state.profile.points = (Number(state.profile.points) || 0) + 25;
  } else {
    state.profile.points = Math.max(0, (Number(state.profile.points) || 0) - 20);
  }
  state.profile.league = leagueForPoints(state.profile.points);
  saveOfflineProfile(state.profile);
  renderProfile();
}

function offlineApplyAction(actorId, action) {
  if (!state.room || state.room.phase !== 'battle' || !state.room.battle) return;
  const battle = state.room.battle;
  if (!battle.players || !battle.players.self || !battle.players.ai) return;

  const targetId = actorId === 'self' ? 'ai' : 'self';
  const actor = battle.players[actorId];
  const target = battle.players[targetId];
  if (!actor || !target) return;

  if (battle.endedAt) return;
  if (offlineIsStunned(actor)) return;

  const actorHero = state.heroesById.get(actor.heroId);
  if (!actorHero) return;

  const isSkill = action === 'skill';

  if (isSkill) {
    if (!offlineCanUseSkill(actor)) return;
    const dmg = offlineComputeDamage('skill', actorHero);
    target.hp = Math.max(0, (Number(target.hp) || 0) - dmg);
    actor.nextSkillAt = nowMs() + OFFLINE_SKILL_CD_MS;
    target.stunnedUntil = Math.max(Number(target.stunnedUntil) || 0, nowMs() + OFFLINE_STUN_MS);
    appendBattleLog({ at: nowMs(), text: `${actorId === 'self' ? 'You' : 'AI'} used ${(actorHero.skill && actorHero.skill.name) || 'Skill'} for ${dmg} damage and stunned.` });
  } else {
    if (!offlineCanUseBasic(actor)) return;
    const dmg = offlineComputeDamage('basic', actorHero);
    target.hp = Math.max(0, (Number(target.hp) || 0) - dmg);
    actor.nextBasicAt = nowMs() + OFFLINE_BASIC_CD_MS;
    appendBattleLog({ at: nowMs(), text: `${actorId === 'self' ? 'You' : 'AI'} used Basic Attack for ${dmg} damage.` });
  }

  if (target.hp <= 0) {
    offlineFinishMatch(actorId, targetId);
  }
  renderAll();
}

function offlineAutoTick() {
  if (!state.offline) return;
  if (!state.room || state.room.phase !== 'battle' || !state.room.battle) return;

  const battle = state.room.battle;
  if (battle.endedAt) return;
  if (!battle.players || !battle.players.ai || !battle.players.self) return;

  const ai = battle.players.ai;
  if (offlineIsStunned(ai)) return;

  if (nowMs() < Number(battle.aiNextAt || 0)) return;
  battle.aiNextAt = nowMs() + offlineRandInt(450, 950);

  const aiHero = state.heroesById.get(ai.heroId);
  const canSkill = aiHero && aiHero.skill && offlineCanUseSkill(ai);
  const canBasic = offlineCanUseBasic(ai);
  if (!canSkill && !canBasic) return;

  const useSkill = canSkill && Math.random() < 0.35;
  offlineApplyAction('ai', useSkill ? 'skill' : 'basic');
}

function rarityBadge(rarity) {
  const r = String(rarity || 'Common');
  if (r === 'Legendary') return 'L';
  if (r === 'Epic') return 'E';
  if (r === 'Rare') return 'R';
  return 'C';
}

function renderProfile() {
  const p = state.profile;
  els.leagueValue.textContent = p && p.league ? String(p.league) : '-';
  els.pointsValue.textContent = p && Number.isFinite(Number(p.points)) ? String(p.points) : '-';
  els.shardsValue.textContent = p && Number.isFinite(Number(p.shards)) ? String(p.shards) : '-';

  const eq = p && p.equippedHeroId ? state.heroesById.get(p.equippedHeroId) : null;
  els.equippedValue.textContent = eq ? eq.name : '-';
}

function ownedSet() {
  const p = state.profile;
  return new Set((p && Array.isArray(p.ownedHeroIds) ? p.ownedHeroIds : []));
}

function renderHeroesLists() {
  const owned = ownedSet();

  // battle hero select
  els.heroSelect.innerHTML = state.heroes
    .filter((h) => owned.has(h.id))
    .map((h) => {
      const isEquipped = state.profile && state.profile.equippedHeroId === h.id;
      return `
        <div class="listItem">
          <div class="itemLeft">
            <div class="itemIcon">${escapeText(rarityBadge(h.rarity))}</div>
            <div class="itemText">
              <div class="itemName">${escapeText(h.name)} ${isEquipped ? '(Equipped)' : ''}</div>
              <div class="itemMeta">HP ${h.health} | DMG ${h.baseDamage} | Skill ${escapeText(h.skill && h.skill.name)} (${h.skill && h.skill.damage})</div>
            </div>
          </div>
          <button class="btn" data-select-hero="${escapeText(h.id)}">Select</button>
        </div>
      `;
    }).join('');

  // collection list
  els.collectionList.innerHTML = state.heroes
    .filter((h) => owned.has(h.id))
    .map((h) => {
      const isEquipped = state.profile && state.profile.equippedHeroId === h.id;
      return `
        <div class="listItem">
          <div class="itemLeft">
            <div class="itemIcon">${escapeText(rarityBadge(h.rarity))}</div>
            <div class="itemText">
              <div class="itemName">${escapeText(h.name)} ${isEquipped ? '(Equipped)' : ''}</div>
              <div class="itemMeta">HP ${h.health} | DMG ${h.baseDamage} | Skill ${escapeText(h.skill && h.skill.name)} (${h.skill && h.skill.damage})</div>
            </div>
          </div>
          <button class="btn primary" data-equip-hero="${escapeText(h.id)}">Equip</button>
        </div>
      `;
    }).join('');

  els.heroSelect.querySelectorAll('[data-select-hero]').forEach((btn) => {
    btn.addEventListener('click', () => selectHero(btn.getAttribute('data-select-hero')));
  });

  els.collectionList.querySelectorAll('[data-equip-hero]').forEach((btn) => {
    btn.addEventListener('click', () => equipHero(btn.getAttribute('data-equip-hero')));
  });
}

function renderRoom() {
  const roomCode = state.room && state.room.roomCode ? state.room.roomCode : null;
  els.roomValue.textContent = roomCode || '-';

  const inRoom = Boolean(roomCode);
  els.readyBtn.disabled = !inRoom;
  els.leaveBtn.disabled = !inRoom;

  els.readyBtn.textContent = state.ready ? 'Unready' : 'Ready';
}

function renderBattle() {
  const battle = state.room && state.room.battle ? state.room.battle : null;
  const selfId = state.selfSocketId;

  if (state.offline) {
    const inBattle = Boolean(battle && state.room && state.room.phase === 'battle');
    const ended = Boolean(battle && battle.endedAt);
    const self = inBattle && battle.players ? battle.players.self : null;

    const stunned = Boolean(self && offlineIsStunned(self));
    const basicCdMs = self ? offlineMsUntil(self.nextBasicAt) : null;
    const skillCdMs = self ? offlineMsUntil(self.nextSkillAt) : null;

    els.basicBtn.disabled = !inBattle || ended || stunned || !self || basicCdMs > 0;
    els.skillBtn.disabled = !inBattle || ended || stunned || !self || skillCdMs > 0;

    els.turnPill.textContent = ended ? 'Status: Finished' : (stunned ? 'Status: Stunned' : (inBattle ? 'Status: Fighting' : 'Status: -'));
    els.timerPill.textContent = self
      ? `CD: Basic ${fmtTime(basicCdMs)} | Skill ${fmtTime(skillCdMs)}`
      : 'CD: -';
  } else {
    const canAct = Boolean(battle && selfId && battle.turnSocketId === selfId);
    const skillCd = battle && selfId && battle.players && battle.players[selfId] ? battle.players[selfId].skillCd : null;

    els.basicBtn.disabled = !canAct;
    els.skillBtn.disabled = !canAct || (Number(skillCd) || 0) > 0;

    els.turnPill.textContent = battle ? (canAct ? 'Turn: You' : 'Turn: Opponent') : 'Turn: -';

    if (battle && Number.isFinite(Number(battle.turnEndsAt))) {
      els.timerPill.textContent = 'Time: ' + fmtTime(Number(battle.turnEndsAt) - nowMs());
    } else {
      els.timerPill.textContent = 'Time: -';
    }
  }

  if (battle && selfId && battle.players) {
    const self = state.offline ? battle.players.self : battle.players[selfId];
    const opp = state.offline
      ? battle.players.ai
      : (() => {
          const oppId = Object.keys(battle.players).find((id) => id !== selfId);
          return oppId ? battle.players[oppId] : null;
        })();

    if (self) {
      const pct = self.maxHp ? Math.max(0, Math.min(1, self.hp / self.maxHp)) : 0;
      els.selfHpFill.style.width = (pct * 100).toFixed(1) + '%';
      if (state.offline) {
        const stunned = offlineIsStunned(self);
        const bCd = offlineMsUntil(self.nextBasicAt);
        const sCd = offlineMsUntil(self.nextSkillAt);
        els.selfHpText.textContent = `${self.hp}/${self.maxHp} (Basic ${fmtTime(bCd)} | Skill ${fmtTime(sCd)}${stunned ? ' | STUNNED' : ''})`;
      } else {
        els.selfHpText.textContent = `${self.hp}/${self.maxHp} (Skill CD: ${self.skillCd})`;
      }
    } else {
      els.selfHpFill.style.width = '0%';
      els.selfHpText.textContent = '-';
    }

    if (opp) {
      const pct = opp.maxHp ? Math.max(0, Math.min(1, opp.hp / opp.maxHp)) : 0;
      els.oppHpFill.style.width = (pct * 100).toFixed(1) + '%';
      els.oppHpText.textContent = `${opp.hp}/${opp.maxHp}`;
    } else {
      els.oppHpFill.style.width = '0%';
      els.oppHpText.textContent = '-';
    }
  } else {
    els.selfHpFill.style.width = '0%';
    els.oppHpFill.style.width = '0%';
    els.selfHpText.textContent = '-';
    els.oppHpText.textContent = '-';
  }
}

function appendBattleLog(msg) {
  const at = msg && msg.at ? Number(msg.at) : nowMs();
  const text = msg && msg.text ? String(msg.text) : '';
  const d = new Date(at);
  const time = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());

  const div = document.createElement('div');
  div.className = 'logItem';
  div.innerHTML = `<span class="logWho">System</span><span class="logTime">${escapeText(time)}</span><div class="logText">${escapeText(text)}</div>`;
  els.battleLog.appendChild(div);
  els.battleLog.scrollTop = els.battleLog.scrollHeight;
}

function renderPackResult(payload) {
  els.packHint.textContent = '';
  if (!payload) return;
  const hero = state.heroesById.get(payload.heroId);
  const name = hero ? hero.name : payload.heroId;
  const isNew = Boolean(payload.isNew);
  const rarity = payload.rarity || (hero && hero.rarity) || 'Common';
  const shards = Number(payload.shards) || 0;
  els.packResult.innerHTML = `
    <div class="listItem">
      <div class="itemLeft">
        <div class="itemIcon">${escapeText(rarityBadge(rarity))}</div>
        <div class="itemText">
          <div class="itemName">${escapeText(name)} ${isNew ? '(New!)' : '(Duplicate)'} </div>
          <div class="itemMeta">Rarity: ${escapeText(rarity)} | Shards: ${shards}</div>
        </div>
      </div>
    </div>
  `;
}

function setPage(page) {
  state.page = page;
  document.querySelectorAll('.page').forEach((p) => p.style.display = 'none');
  const el = document.getElementById('page-' + page);
  if (el) el.style.display = '';
}

function renderAll() {
  renderProfile();
  renderRoom();
  renderHeroesLists();
  renderBattle();
}

function startTick() {
  if (state.tickTimer) clearInterval(state.tickTimer);
  state.tickTimer = setInterval(() => {
    renderBattle();
    offlineAutoTick();
  }, 250);
}

function bindUI() {
  document.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => setPage(btn.getAttribute('data-page')));
  });

  els.connectBtn.addEventListener('click', async () => {
    const { serverUrl, name } = readInputs();
    if (!serverUrl) return;

    lsSet(STORAGE.serverUrl, serverUrl);
    lsSet(STORAGE.name, name);

    try {
      els.connectHint.textContent = 'Loading...';
      await loadHeroesAndProfile(serverUrl);

      state.offline = false;
      renderAll();
      connect(serverUrl);
      els.connectHint.textContent = '';
    } catch {
      offlineStart();
    }
  });

  els.joinBtn.addEventListener('click', () => joinRoom());

  els.readyBtn.addEventListener('click', () => setReady(!state.ready));

  els.leaveBtn.addEventListener('click', () => leaveRoom());

  els.basicBtn.addEventListener('click', () => sendBattleIntent('basic'));
  els.skillBtn.addEventListener('click', () => sendBattleIntent('skill'));

  els.openPackBtn.addEventListener('click', () => openPack());
}

hydrateInputs();
bindUI();
setPage('battle');
startTick();
offlineStart();
window.addEventListener('error', (e) => {
  const msg = e && e.message ? String(e.message) : 'Runtime error';
  els.connectHint.textContent = msg;
});
