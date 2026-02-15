const els = {
  status: document.getElementById('status'),
  serverUrl: document.getElementById('serverUrl'),
  name: document.getElementById('name'),
  roomCode: document.getElementById('roomCode'),
  createRoomBtn: document.getElementById('createRoomBtn'),
  joinRoomBtn: document.getElementById('joinRoomBtn'),
  connectHint: document.getElementById('connectHint'),
  roomValue: document.getElementById('roomValue'),
  phaseValue: document.getElementById('phaseValue'),
  timeValue: document.getElementById('timeValue'),
  youValue: document.getElementById('youValue'),
  roleValue: document.getElementById('roleValue'),
  hostActions: document.getElementById('hostActions'),
  startGameBtn: document.getElementById('startGameBtn'),
  actionArea: document.getElementById('actionArea'),
  tokenBalance: document.getElementById('tokenBalance'),
  shopList: document.getElementById('shopList'),
  ownedList: document.getElementById('ownedList'),
  seats: document.getElementById('seats'),
  tableSub: document.getElementById('tableSub'),
  homePanel: document.getElementById('homePanel'),
  tablePanel: document.getElementById('tablePanel'),
  lobbyText: document.getElementById('lobbyText'),
  chatLog: document.getElementById('chatLog'),
  chatInput: document.getElementById('chatInput'),
  chatSendBtn: document.getElementById('chatSendBtn'),
  chatHint: document.getElementById('chatHint')
};

const STORAGE = {
  serverUrl: 'mafia_server_url',
  guestId: 'mafia_guest_id',
  name: 'mafia_name',
  profile: 'mafia_profile_v1'
};

const COSMETICS = [
  { id: 'none', name: 'None', icon: '🙂', price: 0 },
  { id: 'crown', name: 'Crown', icon: '👑', price: 250 },
  { id: 'top_hat', name: 'Top Hat', icon: '🎩', price: 200 },
  { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', price: 150 },
  { id: 'clown', name: 'Clown', icon: '🤡', price: 100 },
  { id: 'alien', name: 'Alien', icon: '👽', price: 125 }
];

function cosmeticsById() {
  const m = new Map();
  for (const c of COSMETICS) m.set(c.id, c);
  return m;
}

const COSMETICS_MAP = cosmeticsById();

function defaultProfile() {
  return {
    tokens: 300,
    owned: ['none'],
    equipped: 'none'
  };
}

function readProfile() {
  try {
    const raw = localStorage.getItem(STORAGE.profile);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw);
    const tokens = Number.isFinite(p.tokens) ? p.tokens : defaultProfile().tokens;
    const owned = Array.isArray(p.owned) ? p.owned.filter((id) => COSMETICS_MAP.has(id)) : defaultProfile().owned;
    const equipped = typeof p.equipped === 'string' && COSMETICS_MAP.has(p.equipped) ? p.equipped : 'none';
    if (!owned.includes('none')) owned.push('none');
    if (!owned.includes(equipped)) owned.push(equipped);
    return { tokens, owned, equipped };
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
}

let profile = readProfile();

function cosmeticIcon(cosmeticId) {
  const c = COSMETICS_MAP.get(cosmeticId || 'none') || COSMETICS_MAP.get('none');
  return c ? c.icon : '🙂';
}

function renderCosmeticsUI() {
  if (!els.tokenBalance || !els.shopList || !els.ownedList) return;

  els.tokenBalance.textContent = String(profile.tokens);

  const equipped = profile.equipped;
  const ownedSet = new Set(profile.owned);

  const shop = COSMETICS.filter((c) => !ownedSet.has(c.id));
  const owned = COSMETICS.filter((c) => ownedSet.has(c.id));

  els.shopList.innerHTML = shop.length
    ? shop.map((c) => {
        const disabled = profile.tokens < c.price;
        const buyLabel = disabled ? 'Need ' + (c.price - profile.tokens) : 'Buy';
        return `
          <div class="listItem">
            <div class="itemLeft">
              <div class="itemIcon">${escapeText(c.icon)}</div>
              <div class="itemText">
                <div class="itemName">${escapeText(c.name)}</div>
                <div class="itemMeta">${c.price} tokens</div>
              </div>
            </div>
            <button class="btn primary" data-buy="${escapeText(c.id)}" ${disabled ? 'disabled' : ''}>${buyLabel}</button>
          </div>
        `;
      }).join('')
    : `<div class="hint">No items in the shop.</div>`;

  els.ownedList.innerHTML = owned.map((c) => {
    const isEquipped = c.id === equipped;
    return `
      <div class="listItem">
        <div class="itemLeft">
          <div class="itemIcon">${escapeText(c.icon)}</div>
          <div class="itemText">
            <div class="itemName">${escapeText(c.name)}</div>
            <div class="itemMeta">${isEquipped ? 'Equipped' : 'Owned'}</div>
          </div>
        </div>
        <button class="btn ${isEquipped ? 'primary' : ''}" data-equip="${escapeText(c.id)}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? 'Equipped' : 'Equip'}</button>
      </div>
    `;
  }).join('');

  for (const btn of els.shopList.querySelectorAll('button[data-buy]')) {
    btn.addEventListener('click', () => buyCosmetic(btn.getAttribute('data-buy')));
  }
  for (const btn of els.ownedList.querySelectorAll('button[data-equip]')) {
    btn.addEventListener('click', () => equipCosmetic(btn.getAttribute('data-equip')));
  }
}

function buyCosmetic(id) {
  if (!id || !COSMETICS_MAP.has(id)) return;
  if (profile.owned.includes(id)) return;
  const c = COSMETICS_MAP.get(id);
  if (profile.tokens < c.price) return;
  profile.tokens -= c.price;
  profile.owned.push(id);
  saveProfile(profile);
  renderCosmeticsUI();
}

function equipCosmetic(id) {
  if (!id || !COSMETICS_MAP.has(id)) return;
  if (!profile.owned.includes(id)) return;
  profile.equipped = id;
  saveProfile(profile);
  renderCosmeticsUI();
  renderAll();

  if (socket && socket.connected && state.roomCode) {
    socket.emit('setCosmetic', { cosmeticId: id });
  }
}

function randomCode(len) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function getOrCreateGuestId() {
  let id = localStorage.getItem(STORAGE.guestId);
  if (!id) {
    id = 'g_' + crypto.randomUUID();
    localStorage.setItem(STORAGE.guestId, id);
  }
  return id;
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setStatus(text) {
  els.status.textContent = text;
}

function pushHint(text) {
  els.connectHint.textContent = text || '';
}

function escapeText(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let socket = null;
let state = {
  connected: false,
  roomCode: null,
  selfId: null,
  hostId: null,
  youName: null,
  role: null,
  phase: null,
  timeRemainingMs: null,
  players: []
};

function isInGamePhase(phase) {
  return phase === 'day' || phase === 'voting' || phase === 'night' || phase === 'results';
}

function canChatNow() {
  if (!state.connected) return false;
  if (!state.roomCode) return false;

  const phase = state.phase || 'lobby';
  const self = (state.players || []).find(p => p.id === state.selfId);
  const alive = self ? self.alive !== false : true;

  if (phase === 'lobby') return true;
  if (phase === 'results') return true;
  if (!alive) return false;
  return phase === 'day' || phase === 'voting';
}

function updateChatUI() {
  if (!els.chatInput || !els.chatSendBtn || !els.chatHint) return;

  const enabled = canChatNow();
  els.chatInput.disabled = !enabled;
  els.chatSendBtn.disabled = !enabled;

  if (!state.roomCode) {
    els.chatHint.textContent = 'Join a room to chat.';
    return;
  }

  const phase = state.phase || 'lobby';
  const self = (state.players || []).find(p => p.id === state.selfId);
  const alive = self ? self.alive !== false : true;
  if (phase === 'lobby') {
    els.chatHint.textContent = 'Lobby chat is enabled.';
    return;
  }

  if (phase === 'night') {
    els.chatHint.textContent = 'Night: chat is disabled.';
    return;
  }

  if (phase === 'results') {
    els.chatHint.textContent = 'Game ended. Lobby chat is enabled.';
    return;
  }

  if (!alive) {
    els.chatHint.textContent = 'You are dead: chat is disabled.';
    return;
  }

  els.chatHint.textContent = 'Chat is enabled during discussion/voting.';
}

function readInputs() {
  const serverUrl = (els.serverUrl.value || '').trim();
  const name = (els.name.value || '').trim();
  const roomCode = (els.roomCode.value || '').trim().toUpperCase();
  return { serverUrl, name, roomCode };
}

function persistInputs() {
  const { serverUrl, name } = readInputs();
  if (serverUrl) localStorage.setItem(STORAGE.serverUrl, serverUrl);
  if (name) localStorage.setItem(STORAGE.name, name);
}

function hydrateInputs() {
  els.serverUrl.value = localStorage.getItem(STORAGE.serverUrl) || 'http://localhost:3001';
  els.name.value = localStorage.getItem(STORAGE.name) || '';
}

function connect(serverUrl) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  setStatus('Connecting...');
  socket = io(serverUrl, {
    transports: ['websocket'],
    timeout: 8000
  });

  socket.on('connect', () => {
    state.connected = true;
    setStatus('Connected');
    pushHint('');
  });

  socket.on('connect_error', () => {
    state.connected = false;
    setStatus('Disconnected');
    pushHint('Could not connect. Check the server URL.');
  });

  socket.on('disconnect', () => {
    state.connected = false;
    setStatus('Disconnected');
  });

  socket.on('roomJoined', (payload) => {
    state.roomCode = payload.roomCode;
    state.selfId = payload.playerId;
    state.hostId = payload.hostId;
    state.role = payload.role || null;
    state.phase = payload.phase || null;
    state.timeRemainingMs = payload.timeRemainingMs ?? null;
    state.players = payload.players || [];
    renderAll();
  });

  socket.on('roomState', (payload) => {
    state.hostId = payload.hostId;
    state.phase = payload.phase;
    state.timeRemainingMs = payload.timeRemainingMs;
    state.players = payload.players;
    renderAll();
  });

  socket.on('yourRole', (payload) => {
    state.role = payload.role;
    renderAll();
  });

  socket.on('chatMessage', (msg) => {
    appendChat(msg);
  });

  socket.on('systemMessage', (msg) => {
    appendChat({
      name: 'System',
      text: msg.text,
      at: msg.at
    }, true);
  });

  socket.on('actionResult', (payload) => {
    if (payload && payload.text) {
      appendChat({ name: 'System', text: payload.text, at: payload.at }, true);
    }
  });

  socket.on('tokenAward', (payload) => {
    const amount = Number(payload && payload.amount);
    if (!Number.isFinite(amount) || amount === 0) return;
    profile.tokens += amount;
    saveProfile(profile);
    renderCosmeticsUI();
    appendChat({ name: 'System', text: `You earned ${amount} tokens.`, at: nowTime() }, true);
  });
}

function connectThen(serverUrl, fn) {
  connect(serverUrl);
  if (!socket) return;
  if (socket.connected) {
    fn();
    return;
  }

  socket.once('connect', () => fn());
}

function joinRoom(roomCode) {
  const { name } = readInputs();
  if (!socket || !socket.connected) return;
  if (!roomCode) return;
  const guestId = getOrCreateGuestId();
  socket.emit('joinRoom', {
    roomCode,
    guestId,
    name,
    equippedCosmeticId: profile.equipped
  });
}

function createRoom() {
  const code = randomCode(5);
  els.roomCode.value = code;
  joinRoom(code);
}

function renderAll() {
  els.roomValue.textContent = state.roomCode || '-';
  els.phaseValue.textContent = state.phase || '-';

  if (typeof state.timeRemainingMs === 'number') {
    const sec = Math.max(0, Math.ceil(state.timeRemainingMs / 1000));
    els.timeValue.textContent = sec + 's';
  } else {
    els.timeValue.textContent = '-';
  }

  const self = state.players.find(p => p.id === state.selfId);
  els.youValue.textContent = self ? self.name : '-';
  els.roleValue.textContent = state.role || '-';

  const isHost = state.selfId && state.hostId === state.selfId;
  els.hostActions.style.display = isHost && (!state.phase || state.phase === 'lobby' || state.phase === 'results') ? '' : 'none';

  els.tableSub.textContent = state.roomCode ? 'Room ' + state.roomCode : 'Join a room to sit down';

  const showTable = !!state.roomCode && isInGamePhase(state.phase);
  if (els.homePanel && els.tablePanel) {
    els.homePanel.style.display = showTable ? 'none' : '';
    els.tablePanel.style.display = showTable ? '' : 'none';
  }

  updateChatUI();

  renderCosmeticsUI();

  renderSeats();
  renderActionArea();
}

function renderSeats() {
  const container = els.seats;
  container.innerHTML = '';

  const players = state.players || [];
  const n = Math.max(players.length, 1);

  const radiusPct = 46;
  players.forEach((p, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = 50 + Math.cos(angle) * radiusPct;
    const y = 50 + Math.sin(angle) * radiusPct;

    const seat = document.createElement('div');
    seat.className = 'seat';
    seat.style.left = x + '%';
    seat.style.top = y + '%';

    const dead = p.alive === false;
    const meta = dead ? 'DEAD' : 'ALIVE';

    const cosmeticId = p.cosmeticId || (p.id === state.selfId ? profile.equipped : 'none');
    const icon = cosmeticIcon(cosmeticId);
    const showIcon = cosmeticId && cosmeticId !== 'none';

    seat.innerHTML = `
      <div class="seatBadge">
        <div class="seatName">${escapeText(p.name || 'Player')}</div>
        <div class="seatMeta ${dead ? 'dead' : ''}">${meta}</div>
        ${showIcon ? `<div class="seatCosmetic">${escapeText(icon)}</div>` : ''}
      </div>
    `;

    container.appendChild(seat);
  });
}

function clearActionArea() {
  els.actionArea.innerHTML = '';
}

function addActionNode(node) {
  els.actionArea.appendChild(node);
}

function renderActionArea() {
  clearActionArea();
  if (!state.roomCode) {
    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Join a room to play.';
    addActionNode(p);
    return;
  }

  const self = state.players.find(p => p.id === state.selfId);
  const alive = self ? self.alive !== false : true;

  if (!alive) {
    const p = document.createElement('div');
    p.className = 'pill danger';
    p.textContent = 'You are dead.';
    addActionNode(p);
    return;
  }

  if (!state.phase || state.phase === 'lobby') {
    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Waiting for the host to start.';
    addActionNode(p);
    return;
  }

  if (state.phase === 'results') {
    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Game ended. The host can start a new round.';
    addActionNode(p);
    return;
  }

  if (state.phase === 'night') {
    renderNightActions();
    return;
  }

  if (state.phase === 'voting') {
    renderVotingActions();
    return;
  }

  const p = document.createElement('div');
  p.className = 'pill ok';
  p.textContent = 'Discuss with the group.';
  addActionNode(p);
}

function aliveTargets({ includeSelf = false } = {}) {
  return (state.players || []).filter(p => p.alive !== false && (includeSelf || p.id !== state.selfId));
}

function renderNightActions() {
  const role = state.role;

  if (role === 'mafia') {
    const wrap = document.createElement('div');
    wrap.className = 'row';

    const select = document.createElement('select');
    select.style.flex = '1';
    select.style.padding = '10px 12px';
    select.style.borderRadius = '10px';
    select.style.background = 'rgba(0,0,0,0.25)';
    select.style.border = '1px solid rgba(255,255,255,0.08)';
    select.style.color = 'var(--text)';

    const targets = aliveTargets();
    select.innerHTML = '<option value="">Choose a target</option>' + targets.map(t => `<option value="${t.id}">${escapeText(t.name)}</option>`).join('');

    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = 'Kill';
    btn.onclick = () => {
      const id = select.value;
      if (!id) return;
      socket.emit('nightAction', { type: 'kill', targetId: id });
    };

    wrap.appendChild(select);
    wrap.appendChild(btn);

    addActionNode(wrap);

    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Night: pick who to eliminate.';
    addActionNode(p);
    return;
  }

  if (role === 'doctor') {
    const wrap = document.createElement('div');
    wrap.className = 'row';

    const select = document.createElement('select');
    select.style.flex = '1';
    select.style.padding = '10px 12px';
    select.style.borderRadius = '10px';
    select.style.background = 'rgba(0,0,0,0.25)';
    select.style.border = '1px solid rgba(255,255,255,0.08)';
    select.style.color = 'var(--text)';

    const targets = aliveTargets({ includeSelf: true });
    select.innerHTML = '<option value="">Choose someone to heal</option>' + targets.map(t => `<option value="${t.id}">${escapeText(t.name)}</option>`).join('');

    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = 'Heal';
    btn.onclick = () => {
      const id = select.value;
      if (!id) return;
      socket.emit('nightAction', { type: 'heal', targetId: id });
    };

    wrap.appendChild(select);
    wrap.appendChild(btn);
    addActionNode(wrap);

    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Night: protect someone.';
    addActionNode(p);
    return;
  }

  if (role === 'detective') {
    const wrap = document.createElement('div');
    wrap.className = 'row';

    const select = document.createElement('select');
    select.style.flex = '1';
    select.style.padding = '10px 12px';
    select.style.borderRadius = '10px';
    select.style.background = 'rgba(0,0,0,0.25)';
    select.style.border = '1px solid rgba(255,255,255,0.08)';
    select.style.color = 'var(--text)';

    const targets = aliveTargets();
    select.innerHTML = '<option value="">Choose someone to investigate</option>' + targets.map(t => `<option value="${t.id}">${escapeText(t.name)}</option>`).join('');

    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = 'Investigate';
    btn.onclick = () => {
      const id = select.value;
      if (!id) return;
      socket.emit('nightAction', { type: 'investigate', targetId: id });
    };

    wrap.appendChild(select);
    wrap.appendChild(btn);
    addActionNode(wrap);

    const p = document.createElement('div');
    p.className = 'pill';
    p.textContent = 'Night: learn if someone is Mafia.';
    addActionNode(p);
    return;
  }

  const p = document.createElement('div');
  p.className = 'pill';
  p.textContent = 'Night: waiting...';
  addActionNode(p);
}

function renderVotingActions() {
  const wrap = document.createElement('div');
  wrap.className = 'row';

  const select = document.createElement('select');
  select.style.flex = '1';
  select.style.padding = '10px 12px';
  select.style.borderRadius = '10px';
  select.style.background = 'rgba(0,0,0,0.25)';
  select.style.border = '1px solid rgba(255,255,255,0.08)';
  select.style.color = 'var(--text)';

  const targets = aliveTargets({ includeSelf: false });
  select.innerHTML = '<option value="">Vote to eliminate</option>' + targets.map(t => `<option value="${t.id}">${escapeText(t.name)}</option>`).join('');

  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = 'Vote';
  btn.onclick = () => {
    const id = select.value;
    if (!id) return;
    socket.emit('submitVote', { targetId: id });
  };

  wrap.appendChild(select);
  wrap.appendChild(btn);
  addActionNode(wrap);

  const p = document.createElement('div');
  p.className = 'pill';
  p.textContent = 'Voting is public. Choose carefully.';
  addActionNode(p);
}

function appendChat(msg, system = false) {
  const node = document.createElement('div');
  node.className = 'chatMsg';

  const name = escapeText(msg.name || (system ? 'System' : 'Player'));
  const text = escapeText(msg.text || '');
  const at = escapeText(msg.at || nowTime());

  node.innerHTML = `<div><span class="chatWho">${name}</span><span class="chatTime">${at}</span></div><div class="chatText">${text}</div>`;
  els.chatLog.appendChild(node);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function sendChat() {
  if (!socket || !socket.connected) return;

  if (!state.roomCode) {
    pushHint('Join a room to chat.');
    return;
  }

  if (!canChatNow()) {
    pushHint('Chat is disabled right now.');
    return;
  }

  const text = (els.chatInput.value || '').trim();
  if (!text) return;
  els.chatInput.value = '';
  socket.emit('chatMessage', { text });
}

hydrateInputs();

els.createRoomBtn.addEventListener('click', () => {
  const { serverUrl, name } = readInputs();
  if (!serverUrl) return pushHint('Enter a server URL.');
  if (!name) return pushHint('Enter a name.');
  persistInputs();
  connectThen(serverUrl, () => createRoom());
});

els.joinRoomBtn.addEventListener('click', () => {
  const { serverUrl, name, roomCode } = readInputs();
  if (!serverUrl) return pushHint('Enter a server URL.');
  if (!name) return pushHint('Enter a name.');
  if (!roomCode) return pushHint('Enter a room code.');
  persistInputs();
  connectThen(serverUrl, () => joinRoom(roomCode));
});

els.startGameBtn.addEventListener('click', () => {
  if (!socket || !socket.connected) return;
  socket.emit('startGame');
});

els.chatSendBtn.addEventListener('click', sendChat);
els.chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

renderAll();
