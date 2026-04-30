// 1) Create a Firebase project
// 2) Enable Authentication -> Email/Password
// 3) Create Firestore
// 4) Create a Web App and paste the config below

// FIREBASE_CONFIG_HERE
const firebaseConfig = {
  apiKey: "AIzaSyBbG4rg9u5WhFrXE1XiwIoxhb1T-8QP4Q8",
  authDomain: "chocolet-717fd.firebaseapp.com",
  databaseURL: "https://chocolet-717fd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chocolet-717fd",
  storageBucket: "chocolet-717fd.firebasestorage.app",
  messagingSenderId: "128335491787",
  appId: "1:128335491787:web:3628f50b613556ba4b214e",
  measurementId: "G-RYR5LY7PER",
};

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const el = {
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  appNav: document.getElementById("appNav"),
  navBtns: Array.from(document.querySelectorAll("[data-nav]")),
  pages: Array.from(document.querySelectorAll("[data-page]")),
  packsList: document.getElementById("packsList"),
  packOpenTitle: document.getElementById("packOpenTitle"),
  packOpenSubtitle: document.getElementById("packOpenSubtitle"),
  packOpenBackdrop: document.getElementById("packOpenBackdrop"),
  packOpenPack: document.getElementById("packOpenPack"),
  packOpenArt: document.getElementById("packOpenArt"),
  packOpenHint: document.getElementById("packOpenHint"),
  packOpenResult: document.getElementById("packOpenResult"),
  packOpenBackBtn: document.getElementById("packOpenBackBtn"),
  authForm: document.getElementById("authForm"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  signUpBtn: document.getElementById("signUpBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authMsg: document.getElementById("authMsg"),

  accountCard: document.getElementById("accountCard"),
  usernameText: document.getElementById("usernameText"),
  daysText: document.getElementById("daysText"),
  tokensText: document.getElementById("tokensText"),
  blooksCountText: document.getElementById("blooksCountText"),
  blooksList: document.getElementById("blooksList"),
  editUsernameBtn: document.getElementById("editUsernameBtn"),

  avatarBox: document.getElementById("avatarBox"),
  headerAvatar: document.getElementById("headerAvatar"),
  avatarEditor: document.getElementById("avatarEditor"),
  avatarSelect: document.getElementById("avatarSelect"),
  avatarSetBtn: document.getElementById("avatarSetBtn"),
  avatarMsg: document.getElementById("avatarMsg"),

  dailyWheelBtn: document.getElementById("dailyWheelBtn"),
  dailyWheelMsg: document.getElementById("dailyWheelMsg"),

  bazaarList: document.getElementById("bazaarList"),
  bazaarMsg: document.getElementById("bazaarMsg"),

  adminNavBtn: document.getElementById("adminNavBtn"),
  adminPinInput: document.getElementById("adminPinInput"),
  adminUnlockBtn: document.getElementById("adminUnlockBtn"),
  adminUnlockMsg: document.getElementById("adminUnlockMsg"),
  adminTotalAccounts: document.getElementById("adminTotalAccounts"),
  adminOnlineNow: document.getElementById("adminOnlineNow"),
  adminPresenceDocs: document.getElementById("adminPresenceDocs"),
  adminBlookSelect: document.getElementById("adminBlookSelect"),
  adminBlookQty: document.getElementById("adminBlookQty"),
  adminGrantBtn: document.getElementById("adminGrantBtn"),
  adminSetBtn: document.getElementById("adminSetBtn"),
  adminMsg: document.getElementById("adminMsg"),

  adminTokensQty: document.getElementById("adminTokensQty"),
  adminAddTokensBtn: document.getElementById("adminAddTokensBtn"),
  adminSetTokensBtn: document.getElementById("adminSetTokensBtn"),

  creatorNavBtn: document.getElementById("creatorNavBtn"),
  creatorUsers: document.getElementById("creatorUsers"),
  creatorMsg: document.getElementById("creatorMsg"),
  creatorSelected: document.getElementById("creatorSelected"),
  creatorTokensQty: document.getElementById("creatorTokensQty"),
  creatorAddTokensBtn: document.getElementById("creatorAddTokensBtn"),
  creatorSetTokensBtn: document.getElementById("creatorSetTokensBtn"),
  creatorBlookSelect: document.getElementById("creatorBlookSelect"),
  creatorBlookQty: document.getElementById("creatorBlookQty"),
  creatorGrantBtn: document.getElementById("creatorGrantBtn"),
  creatorSetBtn: document.getElementById("creatorSetBtn"),

  adminPacksGrid: document.getElementById("adminPacksGrid"),
  adminPackProbs: document.getElementById("adminPackProbs"),

  chatList: document.getElementById("chatList"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),

  playerModal: document.getElementById("playerModal"),
  playerModalClose: document.getElementById("playerModalClose"),
  playerModalBody: document.getElementById("playerModalBody"),
};

const ADMIN_PIN = "67120925";
const CREATOR_PIN = "zql2012";
const ADMIN_UNLOCK_KEY = "chocolet_admin_unlocked";
const CREATOR_UNLOCK_KEY = "chocolet_creator_unlocked";

let currentUserData;
let chatUnsub;
let bazaarUnsub;
const playerCache = new Map();
let chatFallbackMode = false;
let presenceInterval;
let adminPresenceUnsub;
let creatorPresenceUnsub;
let creatorSelectedUid;
let creatorAllUsers;
let currentShownPage;

const MYSTICAL_SHUSH_IMG = "./assets/blooks/Screenshot 2026-04-29 at 20.05.55.png";

const PACK_COST = 20;

const QUICK_SELL_TOKENS = {
  uncommon: 5,
  rare: 20,
  epic: 75,
  legendary: 100,
  chroma: 300,
  supreme: 500,
  mystical: 700,
};

function setBazaarMsg(message) {
  if (el.bazaarMsg) el.bazaarMsg.textContent = message || "";
}

function setDailyWheelMsg(message) {
  if (el.dailyWheelMsg) el.dailyWheelMsg.textContent = message || "";
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function randIntInclusive(min, max) {
  const a = Math.floor(Number(min) || 0);
  const b = Math.floor(Number(max) || 0);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

async function spinDailyWheel() {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);
  const today = todayKey();
  const reward = randIntInclusive(700, 2000);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const last = String(data?.lastDailyWheel || "");
    if (last === today) throw new Error("ALREADY_SPUN");
    const current = Math.max(0, Number(data?.tokens) || 0);
    const next = current + reward;
    tx.set(ref, { tokens: next, lastDailyWheel: today }, { merge: true });
  });

  const after = await getDoc(ref);
  if (after.exists()) {
    currentUserData = after.data();
    renderAccount(currentUserData);
    renderPacks();
  }
  return reward;
}

async function handleDailyWheel() {
  setDailyWheelMsg("");
  try {
    const reward = await spinDailyWheel();
    if (typeof reward === "number") setDailyWheelMsg(`You won ${reward} tokens!`);
  } catch (e) {
    if (String(e?.message || "") === "ALREADY_SPUN") setDailyWheelMsg("Already spun today.");
    else setDailyWheelMsg("Spin failed.");
  }
}

async function loadCreatorUsersOnce() {
  if (!db) return [];
  if (Array.isArray(creatorAllUsers)) return creatorAllUsers;
  const snap = await getDocs(collection(db, "users"));
  creatorAllUsers = snap.docs.map((d) => {
    const data = d.data() || {};
    return { uid: d.id, username: String(data.username || "player") };
  });
  creatorAllUsers.sort((a, b) => String(a.username).localeCompare(String(b.username)));
  return creatorAllUsers;
}

async function addTokensForCurrentUser(delta) {
  if (!db || !auth?.currentUser) return 0;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);

  let nextTokens = 0;
  let nextData;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const current = Math.max(0, Number(data?.tokens) || 0);
    const next = current + (Number(delta) || 0);
    if (next < 0) {
      throw new Error("NOT_ENOUGH_TOKENS");
    }
    nextTokens = next;
    tx.update(ref, { tokens: next });
    nextData = { ...data, tokens: next };
  });

  if (nextData) {
    currentUserData = { ...(currentUserData || {}), tokens: nextTokens };
    renderAccount({ ...nextData, blooks: currentUserData?.blooks || nextData.blooks || {} });
    renderPacks();
  }
  return nextTokens;
}

async function setTokensForCurrentUser(amount) {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);
  const next = Math.max(0, Math.floor(Number(amount) || 0));
  await updateDoc(ref, { tokens: next });
  currentUserData = { ...(currentUserData || {}), tokens: next };
  renderAccount(currentUserData);
  renderPacks();
  return next;
}

async function handleAdminAddTokens() {
  if (!isAdminUnlocked()) return;
  const amt = Math.max(0, Math.floor(Number(el.adminTokensQty?.value) || 0));
  try {
    await addTokensForCurrentUser(amt);
    setAdminMsg("Tokens added.");
  } catch {
    setAdminMsg("Token update failed.");
  }
}

async function handleAdminSetTokens() {
  if (!isAdminUnlocked()) return;
  const amt = Math.max(0, Math.floor(Number(el.adminTokensQty?.value) || 0));
  try {
    await setTokensForCurrentUser(amt);
    setAdminMsg("Tokens set.");
  } catch {
    setAdminMsg("Token update failed.");
  }
}

function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_UNLOCK_KEY) === "1";
}

function isCreatorUnlocked() {
  return localStorage.getItem(CREATOR_UNLOCK_KEY) === "1";
}

function setAdminUnlocked() {
  localStorage.setItem(ADMIN_UNLOCK_KEY, "1");
}

function setCreatorUnlocked() {
  localStorage.setItem(CREATOR_UNLOCK_KEY, "1");
}

function applyAdminUIState() {
  if (el.adminNavBtn) el.adminNavBtn.hidden = !isAdminUnlocked();
  if (el.creatorNavBtn) el.creatorNavBtn.hidden = !isCreatorUnlocked();
}

function setAdminMsg(message) {
  if (el.adminMsg) el.adminMsg.textContent = message || "";
}

function setCreatorMsg(message) {
  if (el.creatorMsg) el.creatorMsg.textContent = message || "";
}

function populateCreatorBlookSelect() {
  if (!el.creatorBlookSelect) return;
  const opts = [...blooksCatalog]
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((b) => {
      const n = escapeHtml(String(b.name || "Blook"));
      return `<option value="${n}">${n}</option>`;
    })
    .join("");
  el.creatorBlookSelect.innerHTML = opts;
}

function renderCreatorUsers(items) {
  if (!el.creatorUsers) return;
  if (!Array.isArray(items) || items.length === 0) {
    el.creatorUsers.innerHTML = "<div class=\"placeholder\">No players yet.</div>";
    return;
  }

  const now = Date.now();
  el.creatorUsers.innerHTML = items
    .map((x) => {
      const uid = escapeHtml(String(x.uid || ""));
      const name = escapeHtml(String(x.username || "player"));
      const ts = x.lastSeen?.toDate ? x.lastSeen.toDate() : null;
      const online = ts ? now - ts.getTime() <= 65000 : false;
      const status = online ? "Online" : "Offline";
      return `
        <div class="bazaar-row">
          <div class="bazaar-meta">
            <div class="bazaar-title">${name}</div>
            <div class="bazaar-sub">${status}</div>
          </div>
          <div>
            <button class="btn btn-xs" type="button" data-creator-pick="${uid}">Edit</button>
          </div>
        </div>
      `.trim();
    })
    .join("");

  el.creatorUsers.querySelectorAll("[data-creator-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      creatorSelectedUid = btn.getAttribute("data-creator-pick") || "";
      if (el.creatorSelected) el.creatorSelected.textContent = creatorSelectedUid || "—";
      setCreatorMsg("");
    });
  });
}

function startCreatorPresenceListener() {
  if (!db) return;
  if (creatorPresenceUnsub) return;
  if (!el.creatorUsers) return;

  loadCreatorUsersOnce()
    .then(() => {
      renderCreatorUsers((creatorAllUsers || []).map((u) => ({ ...u })));
    })
    .catch(() => {});

  creatorPresenceUnsub = onSnapshot(
    collection(db, "presence"),
    (snap) => {
      const pres = new Map(snap.docs.map((d) => [d.id, d.data()]));
      const base = Array.isArray(creatorAllUsers) ? creatorAllUsers : [];
      const merged = base.map((u) => ({ ...u, ...(pres.get(u.uid) || {}) }));
      for (const [uid, data] of pres.entries()) {
        if (!merged.some((x) => x.uid === uid)) merged.push({ uid, ...(data || {}) });
      }
      merged.sort((a, b) => String(a.username || "").localeCompare(String(b.username || "")));
      renderCreatorUsers(merged);
    },
    () => {
      renderCreatorUsers([]);
    },
  );
}

function stopCreatorPresenceListener() {
  if (creatorPresenceUnsub) {
    creatorPresenceUnsub();
    creatorPresenceUnsub = undefined;
  }
}

async function addTokensForUser(uid, delta) {
  if (!db) return;
  const id = String(uid || "");
  if (!id) return;
  const ref = doc(db, "users", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const current = Math.max(0, Number(data?.tokens) || 0);
    const next = Math.max(0, current + (Number(delta) || 0));
    tx.set(ref, { tokens: next }, { merge: true });
  });
}

async function setTokensForUser(uid, amount) {
  if (!db) return;
  const id = String(uid || "");
  if (!id) return;
  const next = Math.max(0, Math.floor(Number(amount) || 0));
  await updateDoc(doc(db, "users", id), { tokens: next });
}

async function addBlookQtyForUserId(uid, blookName, qty) {
  if (!db) return;
  const id = String(uid || "");
  const name = String(blookName || "");
  const addQty = Math.max(1, Math.floor(Number(qty) || 1));
  if (!id || !name) return;
  const ref = doc(db, "users", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
    blooks[name] = (Number(blooks[name]) || 0) + addQty;
    tx.set(ref, { blooks }, { merge: true });
  });
}

async function setBlookQtyForUserId(uid, blookName, qty) {
  if (!db) return;
  const id = String(uid || "");
  const name = String(blookName || "");
  const next = Math.max(0, Math.floor(Number(qty) || 0));
  if (!id || !name) return;
  const ref = doc(db, "users", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
    if (next <= 0) delete blooks[name];
    else blooks[name] = next;
    tx.set(ref, { blooks }, { merge: true });
  });
}

function setAdminUnlockMsg(message) {
  if (el.adminUnlockMsg) el.adminUnlockMsg.textContent = message || "";
}

function setAvatarMsg(message) {
  if (!el.avatarMsg) return;
  el.avatarMsg.textContent = message || "";
}

function ownedBlookNames(userDoc) {
  const b = userDoc?.blooks && typeof userDoc.blooks === "object" ? userDoc.blooks : {};
  return Object.entries(b)
    .filter(([, qty]) => (Number(qty) || 0) > 0)
    .map(([name]) => String(name));
}

function populateAvatarSelect(userDoc) {
  if (!el.avatarSelect) return;
  const owned = new Set(ownedBlookNames(userDoc));
  const opts = [
    `<option value="">Default</option>`,
    ...blooksCatalog
      .filter((b) => owned.has(String(b?.name || "")))
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((b) => {
        const n = escapeHtml(String(b?.name || "Blook"));
        return `<option value="${n}">${n}</option>`;
      }),
  ].join("");
  el.avatarSelect.innerHTML = opts;

  const current = String(userDoc?.avatarBlook || "");
  el.avatarSelect.value = current;
}

function renderAvatar(userDoc) {
  const boxes = [el.avatarBox, el.headerAvatar].filter(Boolean);
  if (el.headerAvatar) el.headerAvatar.hidden = false;

  const avatarName = String(userDoc?.avatarBlook || "");
  const blook = avatarName ? getBlookByName(avatarName) : null;

  const isMystical = String(blook?.rarity || "").toLowerCase() === "mystical";
  for (const box of boxes) {
    if (!box) continue;
    box.classList.toggle("avatar-mystical", isMystical);
    if (blook?.image) {
      box.style.background = "";
      if (isMystical) {
        box.style.backgroundImage = "";
        box.style.setProperty("--avatar-base", `url('${blook.image}')`);
        box.style.setProperty("--avatar-shush", `url('${MYSTICAL_SHUSH_IMG}')`);
      } else {
        box.style.removeProperty("--avatar-base");
        box.style.removeProperty("--avatar-shush");
        box.style.backgroundImage = `url('${blook.image}')`;
      }
      box.style.backgroundSize = "cover";
      box.style.backgroundPosition = "center";
    } else {
      box.style.removeProperty("--avatar-base");
      box.style.removeProperty("--avatar-shush");
      box.style.backgroundImage = "";
      const c = String(userDoc?.avatarColor || "#000");
      box.style.background = c;
    }
  }
}

function pct(n) {
  const num = Number(n) || 0;
  return `${(num * 100).toFixed(2)}%`;
}

function renderAdminPackProbabilities(packId) {
  if (!el.adminPackProbs) return;
  const id = String(packId || "");
  const pool = packPools[id];
  if (!pool) {
    el.adminPackProbs.textContent = "Pack not found.";
    return;
  }

  const weights = pool.weights && typeof pool.weights === "object" ? pool.weights : {};
  const rarityLines = Object.keys(weights)
    .map((r) => {
      const w = Number(weights[r]) || 0;
      return { rarity: String(r), w };
    })
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w);

  const total = rarityLines.reduce((a, x) => a + x.w, 0) || 1;
  const rarityPct = new Map(rarityLines.map((x) => [x.rarity, x.w / total]));

  const rarityHtml = rarityLines
    .map((x) => `<div class="prob-row"><div>${escapeHtml(x.rarity)}</div><div>${pct(rarityPct.get(x.rarity))}</div></div>`)
    .join("");

  const blookRows = [];
  for (const [rarity, names] of Object.entries(pool)) {
    if (rarity === "weights") continue;
    if (!Array.isArray(names) || names.length === 0) continue;
    const rp = rarityPct.get(String(rarity)) || 0;
    const each = rp / names.length;
    for (const n of names) {
      blookRows.push({ rarity: String(rarity), name: String(n), p: each });
    }
  }

  blookRows.sort((a, b) => b.p - a.p);
  const blookHtml = blookRows
    .map(
      (x) =>
        `<div class="prob-row"><div>${escapeHtml(x.name)} <span class="prob-sub">(${escapeHtml(x.rarity)})</span></div><div>${pct(x.p)}</div></div>`,
    )
    .join("");

  el.adminPackProbs.innerHTML = `
    <div class="prob-block">
      <div class="prob-title">Rarity chances</div>
      <div class="prob-list">${rarityHtml || "—"}</div>
    </div>
    <div class="prob-block">
      <div class="prob-title">Blook chances</div>
      <div class="prob-list">${blookHtml || "—"}</div>
    </div>
  `.trim();
}

function renderChatMessages(msgs) {
  if (!el.chatList) return;
  if (!Array.isArray(msgs) || msgs.length === 0) {
    el.chatList.innerHTML = "<div class=\"placeholder\">No messages yet.</div>";
    return;
  }

  el.chatList.innerHTML = msgs
    .map((m) => {
      const u = escapeHtml(m.username || "player");
      const t = escapeHtml(m.text || "");
      const admin = Boolean(m.isAdmin);
      const creator = Boolean(m.isCreator);
      const uid = escapeHtml(String(m.uid || ""));
      const avatarName = String(m.avatarBlook || "");
      const avatarBlook = avatarName ? getBlookByName(avatarName) : null;
      const avatarImg = escapeHtml(String(avatarBlook?.image || ""));
      const userClass = admin ? "chat-user admin" : "chat-user";
      const title = creator ? ` <span class="title-badge">CREATOR</span>` : "";
      return `
        <div class="chat-msg">
          <button class="chat-avatar" type="button" data-player-uid="${uid}" aria-label="View player" style="${avatarImg ? `background-image:url('${avatarImg}')` : ""}"></button>
          <div class="chat-main">
            <div class="${userClass}">${u}${title}</div>
            <div class="chat-text">${t}</div>
          </div>
        </div>
      `.trim();
    })
    .join("");

  el.chatList.querySelectorAll("[data-player-uid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-player-uid") || "";
      openPlayerModal(uid);
    });
  });

  el.chatList.scrollTop = el.chatList.scrollHeight;
}

function closePlayerModal() {
  if (!el.playerModal) return;
  el.playerModal.hidden = true;
}

async function openPlayerModal(uid) {
  if (!db) return;
  const id = String(uid || "");
  if (!id) return;
  if (!el.playerModal || !el.playerModalBody) return;

  el.playerModal.hidden = false;
  el.playerModalBody.innerHTML = `<div class="placeholder">Loading…</div>`;

  let data = playerCache.get(id);
  if (!data) {
    try {
      const snap = await getDoc(doc(db, "users", id));
      data = snap.exists() ? snap.data() : null;
      if (data) playerCache.set(id, data);
    } catch {
      data = null;
    }
  }

  if (!data) {
    el.playerModalBody.innerHTML = `<div class="placeholder">Player not found.</div>`;
    return;
  }

  const username = escapeHtml(String(data.username || "player"));
  const isAdmin = Boolean(data.isAdmin);
  const tokens = Math.max(0, Number(data.tokens) || 0);
  const blooks = data?.blooks && typeof data.blooks === "object" ? data.blooks : {};
  const blooksOwned = Object.values(blooks).reduce((a, v) => a + (Number(v) || 0), 0);

  const avatarName = String(data.avatarBlook || "");
  const avatarBlook = avatarName ? getBlookByName(avatarName) : null;
  const avatarImg = escapeHtml(String(avatarBlook?.image || ""));

  const nameHtml = isAdmin ? `<span class="rainbow-name">${username}</span>` : username;

  el.playerModalBody.innerHTML = `
    <div class="player-card">
      <div class="player-avatar" aria-hidden="true" style="${avatarImg ? `background-image:url('${avatarImg}')` : ""}"></div>
      <div class="player-meta">
        <div class="player-name">${nameHtml}</div>
        <div class="bazaar-sub">${escapeHtml(id)}</div>
      </div>
    </div>
    <div class="player-stats">
      <div class="player-stat"><div class="label">Tokens</div><div class="value">${tokens}</div></div>
      <div class="player-stat"><div class="label">Blooks owned</div><div class="value">${blooksOwned}</div></div>
    </div>
  `.trim();
}

function startChatListener() {
  if (!db || !auth?.currentUser) return;
  if (!el.chatList) return;
  if (chatUnsub) return;

  const q = chatFallbackMode
    ? query(collection(db, "chatMessages"), limit(60))
    : query(collection(db, "chatMessages"), orderBy("createdAt", "asc"), limit(60));
  chatUnsub = onSnapshot(
    q,
    (snap) => {
      try {
        const msgs = snap.docs.map((d) => d.data());
        renderChatMessages(msgs);
      } catch {
        el.chatList.innerHTML = "<div class=\"placeholder\">Chat failed to render.</div>";
      }
    },
    () => {
      if (!chatFallbackMode) {
        chatFallbackMode = true;
        stopChatListener();
        startChatListener();
        return;
      }
      el.chatList.innerHTML = "<div class=\"placeholder\">Chat failed to load.</div>";
    },
  );
}

function stopChatListener() {
  if (chatUnsub) {
    chatUnsub();
    chatUnsub = undefined;
  }
}

async function sendChatMessage(text) {
  if (!db || !auth?.currentUser) return;
  const cleaned = String(text || "").trim().slice(0, 160);
  if (!cleaned) return;

  const username = String(currentUserData?.username || "player");
  await addDoc(collection(db, "chatMessages"), {
    text: cleaned,
    uid: auth.currentUser.uid,
    username,
    avatarBlook: String(currentUserData?.avatarBlook || ""),
    isAdmin: Boolean(currentUserData?.isAdmin),
    isCreator: Boolean(currentUserData?.isCreator),
    createdAt: serverTimestamp(),
  });
}

function renderBazaarListings(listings) {
  if (!el.bazaarList) return;
  if (!Array.isArray(listings) || listings.length === 0) {
    el.bazaarList.innerHTML = "<div class=\"placeholder\">No listings yet.</div>";
    return;
  }

  const myUid = String(auth?.currentUser?.uid || "");
  el.bazaarList.innerHTML = listings
    .map((l) => {
      const id = escapeHtml(String(l.id || ""));
      const name = escapeHtml(String(l.blookName || "Blook"));
      const price = escapeHtml(String(l.price || "0"));
      const sellerName = escapeHtml(String(l.sellerUsername || "player"));
      const sellerIsAdmin = Boolean(l.sellerIsAdmin);
      const sellerUid = String(l.sellerUid || "");

      const avatarName = String(l.sellerAvatarBlook || "");
      const avatarBlook = avatarName ? getBlookByName(avatarName) : null;
      const avatarImg = escapeHtml(String(avatarBlook?.image || ""));

      const sellerHtml = sellerIsAdmin
        ? `<span class="rainbow-name">${sellerName}</span>`
        : `<span>${sellerName}</span>`;

      const action =
        sellerUid && myUid && sellerUid === myUid
          ? `<button class="btn btn-xs btn-secondary" type="button" data-bazaar-cancel="${id}">Cancel</button>`
          : `<button class="btn btn-xs" type="button" data-bazaar-buy="${id}">Buy</button>`;

      return `
        <div class="bazaar-row">
          <div class="chat-avatar" aria-hidden="true" style="${avatarImg ? `background-image:url('${avatarImg}')` : ""}"></div>
          <div class="bazaar-meta">
            <div class="bazaar-title">${name}</div>
            <div class="bazaar-sub">Seller: ${sellerHtml} · Price: ${price}</div>
          </div>
          <div>${action}</div>
        </div>
      `.trim();
    })
    .join("");

  el.bazaarList.querySelectorAll("[data-bazaar-buy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-bazaar-buy") || "";
      await buyBazaarListing(id);
    });
  });

  el.bazaarList.querySelectorAll("[data-bazaar-cancel]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-bazaar-cancel") || "";
      await cancelBazaarListing(id);
    });
  });
}

function startBazaarListener() {
  if (!db || !auth?.currentUser) return;
  if (!el.bazaarList) return;
  if (bazaarUnsub) return;

  const q = query(collection(db, "bazaarListings"), orderBy("createdAt", "desc"), limit(60));
  bazaarUnsub = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderBazaarListings(items);
    },
    () => {
      renderBazaarListings([]);
    },
  );
}

function stopBazaarListener() {
  if (bazaarUnsub) {
    bazaarUnsub();
    bazaarUnsub = undefined;
  }
}

async function quickSellBlook(blookName) {
  if (!db || !auth?.currentUser) return;
  const name = String(blookName || "");
  if (!name) return;
  const rarity = getBlookRarityByName(name);
  const reward = Number(QUICK_SELL_TOKENS[rarity] || 0);
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : {};
      const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
      const qty = Number(blooks[name]) || 0;
      if (qty <= 0) throw new Error("NO_BLOOK");

      const nextQty = qty - 1;
      if (nextQty <= 0) delete blooks[name];
      else blooks[name] = nextQty;

      const currentTokens = Math.max(0, Number(data?.tokens) || 0);
      const nextTokens = currentTokens + reward;
      tx.update(ref, { blooks, tokens: nextTokens });
    });

    const after = await getDoc(ref);
    if (after.exists()) {
      currentUserData = after.data();
      renderAccount(currentUserData);
      renderBlooks(currentUserData);
      renderPacks();
    }
    setBazaarMsg(`Quick sold ${name} for ${reward} tokens.`);
  } catch {
    setBazaarMsg("Quick sell failed.");
  }
}

async function listBlookForSale(blookName, price) {
  if (!db || !auth?.currentUser) return;
  const name = String(blookName || "");
  const p = Math.max(1, Math.floor(Number(price) || 0));
  if (!name || !p) return;

  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const listingRef = doc(collection(db, "bazaarListings"));

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists() ? snap.data() : {};
      const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
      const qty = Number(blooks[name]) || 0;
      if (qty <= 0) throw new Error("NO_BLOOK");

      const nextQty = qty - 1;
      if (nextQty <= 0) delete blooks[name];
      else blooks[name] = nextQty;

      tx.update(userRef, { blooks });
      tx.set(listingRef, {
        blookName: name,
        price: p,
        sellerUid: uid,
        sellerUsername: String(data?.username || currentUserData?.username || "player"),
        sellerAvatarBlook: String(data?.avatarBlook || currentUserData?.avatarBlook || ""),
        sellerIsAdmin: Boolean(data?.isAdmin || currentUserData?.isAdmin),
        createdAt: serverTimestamp(),
      });
    });

    const after = await getDoc(userRef);
    if (after.exists()) {
      currentUserData = after.data();
      renderAccount(currentUserData);
      renderBlooks(currentUserData);
      renderPacks();
    }
    setBazaarMsg(`Listed ${name} for ${p} tokens.`);
  } catch {
    setBazaarMsg("Listing failed.");
  }
}

async function buyBazaarListing(listingId) {
  if (!db || !auth?.currentUser) return;
  const id = String(listingId || "");
  if (!id) return;

  setBazaarMsg("");
  const uid = auth.currentUser.uid;
  const buyerRef = doc(db, "users", uid);
  const listingRef = doc(db, "bazaarListings", id);

  try {
    await runTransaction(db, async (tx) => {
      const listingSnap = await tx.get(listingRef);
      if (!listingSnap.exists()) throw new Error("MISSING");
      const listing = listingSnap.data() || {};
      const sellerUid = String(listing?.sellerUid || "");
      const price = Math.max(0, Math.floor(Number(listing?.price) || 0));
      const blookName = String(listing?.blookName || "");
      if (!sellerUid || !price || !blookName) throw new Error("BAD");
      if (sellerUid === uid) throw new Error("SELF");

      const buyerSnap = await tx.get(buyerRef);
      const buyer = buyerSnap.exists() ? buyerSnap.data() : {};
      const buyerTokens = Math.max(0, Number(buyer?.tokens) || 0);
      if (buyerTokens < price) throw new Error("NOT_ENOUGH");

      const sellerRef = doc(db, "users", sellerUid);
      const sellerSnap = await tx.get(sellerRef);
      const seller = sellerSnap.exists() ? sellerSnap.data() : {};

      const buyerBlooks = buyer?.blooks && typeof buyer.blooks === "object" ? { ...buyer.blooks } : {};
      buyerBlooks[blookName] = (Number(buyerBlooks[blookName]) || 0) + 1;

      const sellerTokens = Math.max(0, Number(seller?.tokens) || 0);
      tx.update(buyerRef, { tokens: buyerTokens - price, blooks: buyerBlooks });
      tx.update(sellerRef, { tokens: sellerTokens + price });
      tx.delete(listingRef);
    });

    const after = await getDoc(buyerRef);
    if (after.exists()) {
      currentUserData = after.data();
      renderAccount(currentUserData);
      renderBlooks(currentUserData);
      renderPacks();
    }
    setBazaarMsg("Bought listing.");
  } catch {
    setBazaarMsg("Buy failed.");
  }
}

async function cancelBazaarListing(listingId) {
  if (!db || !auth?.currentUser) return;
  const id = String(listingId || "");
  if (!id) return;

  setBazaarMsg("");
  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const listingRef = doc(db, "bazaarListings", id);

  try {
    await runTransaction(db, async (tx) => {
      const listingSnap = await tx.get(listingRef);
      if (!listingSnap.exists()) throw new Error("MISSING");
      const listing = listingSnap.data() || {};
      const sellerUid = String(listing?.sellerUid || "");
      const blookName = String(listing?.blookName || "");
      if (sellerUid !== uid) throw new Error("NOPE");

      const userSnap = await tx.get(userRef);
      const user = userSnap.exists() ? userSnap.data() : {};
      const blooks = user?.blooks && typeof user.blooks === "object" ? { ...user.blooks } : {};
      blooks[blookName] = (Number(blooks[blookName]) || 0) + 1;
      tx.update(userRef, { blooks });
      tx.delete(listingRef);
    });

    const after = await getDoc(userRef);
    if (after.exists()) {
      currentUserData = after.data();
      renderAccount(currentUserData);
      renderBlooks(currentUserData);
      renderPacks();
    }
    setBazaarMsg("Canceled listing.");
  } catch {
    setBazaarMsg("Cancel failed.");
  }
}

async function setBlookQtyForUser(blookName, qty) {
  if (!auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
  const key = String(blookName || "Blook");
  const next = Math.max(0, Number(qty) || 0);
  if (next <= 0) {
    delete blooks[key];
  } else {
    blooks[key] = next;
  }
  await updateDoc(ref, { blooks });

  const merged = { ...data, blooks };
  currentUserData = merged;
  renderAccount(merged);
  renderBlooks(merged);
}

async function addBlookQtyForUser(blookName, delta) {
  if (!auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
  const key = String(blookName || "Blook");
  const add = Math.max(0, Number(delta) || 0);
  if (add <= 0) return;
  blooks[key] = (Number(blooks[key]) || 0) + add;
  await updateDoc(ref, { blooks });

  const merged = { ...data, blooks };
  currentUserData = merged;
  renderAccount(merged);
  renderBlooks(merged);
}

async function heartbeatPresence() {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const username = String(currentUserData?.username || "player");
  await setDoc(
    doc(db, "presence", uid),
    {
      username,
      lastSeen: serverTimestamp(),
    },
    { merge: true },
  );
}

function startPresence() {
  if (presenceInterval) return;
  heartbeatPresence().catch(() => {});
  presenceInterval = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    heartbeatPresence().catch(() => {});
  }, 20000);
}

function stopPresence() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = undefined;
  }
}

async function renderAdminStats() {
  if (!db) return;
  if (el.adminTotalAccounts) el.adminTotalAccounts.textContent = "…";
  try {
    const snap = await getCountFromServer(collection(db, "users"));
    if (el.adminTotalAccounts) el.adminTotalAccounts.textContent = String(snap.data().count ?? "0");
  } catch {
    if (el.adminTotalAccounts) el.adminTotalAccounts.textContent = "—";
  }
}

function startAdminPresenceListener() {
  if (!db) return;
  if (adminPresenceUnsub) return;

  adminPresenceUnsub = onSnapshot(
    collection(db, "presence"),
    (snap) => {
      const now = Date.now();
      let online = 0;
      for (const d of snap.docs) {
        const data = d.data();
        const ts = data?.lastSeen?.toDate ? data.lastSeen.toDate() : null;
        if (!ts) continue;
        if (now - ts.getTime() <= 65000) online += 1;
      }
      if (el.adminPresenceDocs) el.adminPresenceDocs.textContent = String(snap.size);
      if (el.adminOnlineNow) el.adminOnlineNow.textContent = String(online);
    },
    () => {
      if (el.adminPresenceDocs) el.adminPresenceDocs.textContent = "—";
      if (el.adminOnlineNow) el.adminOnlineNow.textContent = "—";
    },
  );
}

function stopAdminPresenceListener() {
  if (adminPresenceUnsub) {
    adminPresenceUnsub();
    adminPresenceUnsub = undefined;
  }
}

function populateAdminBlookSelect() {
  if (!el.adminBlookSelect) return;
  const opts = [...blooksCatalog]
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((b) => {
      const n = escapeHtml(String(b.name || "Blook"));
      return `<option value=\"${n}\">${n}</option>`;
    })
    .join("");
  el.adminBlookSelect.innerHTML = opts;
}

function populateAdminPackSelect() {
  if (!el.adminPacksGrid) return;
  const html = packs
    .map((p) => {
      const id = escapeHtml(String(p?.id || ""));
      const name = escapeHtml(String(p?.name || "Pack"));
      const img = escapeHtml(String(p?.image || ""));
      return `
        <button class="admin-pack" type="button" data-admin-pack="${id}">
          <div class="admin-pack-art" aria-hidden="true" style="${img ? `background-image:url('${img}')` : ""}"></div>
          <div class="admin-pack-name">${name}</div>
        </button>
      `.trim();
    })
    .join("\n");

  el.adminPacksGrid.innerHTML = html;

  el.adminPacksGrid.querySelectorAll("[data-admin-pack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-admin-pack") || "";
      el.adminPacksGrid.querySelectorAll(".admin-pack").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAdminPackProbabilities(id);
    });
  });

  const first = packs[0]?.id ? String(packs[0].id) : "";
  if (first) {
    const firstBtn = el.adminPacksGrid.querySelector("[data-admin-pack]");
    if (firstBtn) firstBtn.classList.add("active");
    renderAdminPackProbabilities(first);
  }
}

function setMsg(message) {
  el.authMsg.textContent = message || "";
}

function formatBlooks(blooks) {
  const entries = Object.entries(blooks || {});
  if (entries.length === 0) return { html: "—", count: 0 };

  entries.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  let count = 0;
  const html = entries
    .map(([name, qty]) => {
      const n = Number(qty) || 0;
      count += n;
      return `<div class="blook-item"><div>${escapeHtml(name)}</div><div>${n}</div></div>`;
    })
    .join("");

  return { html, count };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const packs = [
  {
    id: "chocolate-pack",
    name: "Chocolate Pack",
    description: "Your first pack.",
    image: "./assets/packs/chocolate-pack.png",
  },
];

const packPools = {
  "chocolate-pack": {
    uncommon: ["Milk Choco", "Dark Choco", "White Choco", "Mint Choco", "Strawberry Choco"],
    rare: ["Coconut Choco", "Hazelnut Choco"],
    epic: ["Chocolate Spoon"],
    legendary: ["Hot Cocoa"],
    chroma: ["Chocolate Cat", "Chocolate Bunny"],
    supreme: ["Chocolate Factory", "Crystal Spoon"],
    mystical: ["Mystical Frog"],
    weights: {
      uncommon: 0.7945,
      rare: 0.15,
      epic: 0.02,
      legendary: 0.02,
      chroma: 0.01,
      supreme: 0.005,
      mystical: 0.0005,
    },
  },
};

function randChoice(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(weights) {
  const w = weights && typeof weights === "object" ? weights : { uncommon: 1 };
  const entries = Object.entries(w)
    .map(([k, v]) => [k, Math.max(0, Number(v) || 0)])
    .filter(([, v]) => v > 0);
  if (entries.length === 0) return "uncommon";
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function getPackById(id) {
  return packs.find((p) => String(p?.id || "") === String(id || "")) || null;
}

function getBlookByName(name) {
  const n = String(name || "");
  return blooksCatalog.find((b) => String(b?.name || "") === n) || null;
}

function getBlookRarityByName(name) {
  return String(getBlookByName(name)?.rarity || "uncommon").toLowerCase();
}

function getPackIdFromHash() {
  const raw = String(location.hash || "");
  const m = raw.match(/^#packopen\?pack=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const blooksCatalog = [
  {
    id: "milk-choco",
    name: "Milk Choco",
    rarity: "uncommon",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.13.57.png",
  },
  {
    id: "dark-choco",
    name: "Dark Choco",
    rarity: "uncommon",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.14.11.png",
  },
  {
    id: "white-choco",
    name: "White Choco",
    rarity: "uncommon",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.14.48.png",
  },
  {
    id: "mint-choco",
    name: "Mint Choco",
    rarity: "uncommon",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.14.55.png",
  },
  {
    id: "strawberry-choco",
    name: "Strawberry Choco",
    rarity: "uncommon",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.15.04.png",
  },
  {
    id: "coconut-choco",
    name: "Coconut Choco",
    rarity: "rare",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.15.15.png",
  },
  {
    id: "hazelnut-choco",
    name: "Hazelnut Choco",
    rarity: "rare",
    image: "./assets/blooks/Screenshot 2026-04-29 at 17.15.22.png",
  },
  {
    id: "choco-spoon",
    name: "Chocolate Spoon",
    rarity: "epic",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.21.06.png",
  },
  {
    id: "hot-cocoa",
    name: "Hot Cocoa",
    rarity: "legendary",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.28.33.png",
  },
  {
    id: "choco-factory",
    name: "Chocolate Factory",
    rarity: "supreme",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.36.44.png",
  },
  {
    id: "crystal-spoon",
    name: "Crystal Spoon",
    rarity: "supreme",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.36.52.png",
  },
  {
    id: "choco-cat",
    name: "Chocolate Cat",
    rarity: "chroma",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.14.48.png",
  },
  {
    id: "choco-bunny",
    name: "Chocolate Bunny",
    rarity: "chroma",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.15.00.png",
  },
  {
    id: "mystical-frog",
    name: "Mystical Frog",
    rarity: "mystical",
    image: "./assets/blooks/Screenshot 2026-04-29 at 19.49.19.png",
  },
];

function renderPacks() {
  if (!el.packsList) return;

  if (!Array.isArray(packs) || packs.length === 0) {
    el.packsList.textContent = "—";
    return;
  }

  const tokens = Math.max(0, Number(currentUserData?.tokens) || 0);
  const canAfford = tokens >= PACK_COST;

  const html = packs
    .map((p) => {
      const name = escapeHtml(p?.name || "Pack");
      const desc = escapeHtml(p?.description || "");
      const img = escapeHtml(p?.image || "");
      const disabled = canAfford ? "" : "disabled";

      return `
        <article class="pack-card" data-pack-id="${escapeHtml(p?.id || "")}">
          <div class="pack-art" role="img" aria-label="${name} artwork" style="${img ? `background-image:url('${img}')` : ""}"></div>
          <div class="pack-body">
            <div class="pack-name">${name}</div>
            <div class="pack-desc">${desc} (Cost ${PACK_COST})</div>
            <div class="row">
              <button class="btn" type="button" data-open-pack="${escapeHtml(p?.id || "")}" ${disabled}>Open</button>
            </div>
          </div>
        </article>
      `.trim();
    })
    .join("\n");

  el.packsList.innerHTML = html;

  el.packsList.querySelectorAll("[data-open-pack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-pack") || "";
      location.hash = `#packopen?pack=${encodeURIComponent(id)}`;
    });
  });
}

function renderBlooks(userDoc) {
  if (!el.blooksList) return;

  const qtyByName = userDoc?.blooks && typeof userDoc.blooks === "object" ? userDoc.blooks : {};

  if (!Array.isArray(blooksCatalog) || blooksCatalog.length === 0) {
    el.blooksList.textContent = "—";
    return;
  }

  const rarityRank = {
    mystical: 7,
    supreme: 6,
    chroma: 5,
    legendary: 4,
    epic: 3,
    rare: 2,
    uncommon: 1,
    common: 0,
  };

  function itemFromCatalog(b) {
    const name = String(b?.name || "Blook");
    const qty = Number(qtyByName[name]) || 0;
    return {
      id: String(b?.id || name),
      name,
      rarity: String(b?.rarity || "uncommon").toLowerCase(),
      image: String(b?.image || ""),
      qty,
    };
  }

  function renderItemCard(b) {
    const name = escapeHtml(b.name);
    const rarity = escapeHtml(b.rarity);
    const img = escapeHtml(b.image);
    const qty = escapeHtml(String(b.qty));
    const rarityClass = `rarity-${escapeHtml(String(b.rarity || "uncommon").toLowerCase())}`;
    const lockedClass = Number(b.qty) > 0 ? "" : "blook-locked";
    const lockedLabel = Number(b.qty) > 0 ? "" : `<div class="blook-locked-label">LOCKED</div>`;
    const mysticalClass = String(b.rarity || "").toLowerCase() === "mystical" && Number(b.qty) > 0 ? "mystical-shush" : "";
    const artStyle =
      String(b.rarity || "").toLowerCase() === "mystical" && Number(b.qty) > 0
        ? `--mystical-base:url('${img}');--mystical-shush:url('${escapeHtml(MYSTICAL_SHUSH_IMG)}');`
        : img
          ? `background-image:url('${img}')`
          : "";

    const quickSell = QUICK_SELL_TOKENS[String(b.rarity || "uncommon").toLowerCase()] || 0;
    const actions =
      Number(b.qty) > 0
        ? `
            <div class="blook-actions">
              <button class="btn btn-xs" type="button" data-quick-sell="${name}">Quick sell +${quickSell}</button>
              <button class="btn btn-xs btn-secondary" type="button" data-list-bazaar="${name}">List</button>
            </div>
          `.trim()
        : "";

    return `
      <article class="blook-card blook-card-small ${lockedClass} ${mysticalClass}" data-blook-id="${escapeHtml(b.id)}">
        ${lockedLabel}
        <div class="blook-art blook-art-small" role="img" aria-label="${name} artwork" style="${artStyle}"></div>
        <div class="blook-meta">
          <div class="blook-name">${name}</div>
          <div class="blook-sub">
            <span class="blook-rarity ${rarityClass}">${rarity}</span>
            <span class="blook-qty">x${qty}</span>
          </div>
          ${actions}
        </div>
      </article>
    `.trim();
  }

  function blookNameSetForPack(packId) {
    const pool = packPools[String(packId || "")] || null;
    if (!pool || typeof pool !== "object") return new Set();

    const set = new Set();
    for (const [k, v] of Object.entries(pool)) {
      if (k === "weights") continue;
      if (!Array.isArray(v)) continue;
      for (const name of v) set.add(String(name));
    }
    return set;
  }

  const used = new Set();
  const sections = [];

  for (const p of packs) {
    const packId = String(p?.id || "");
    const packName = escapeHtml(String(p?.name || "Pack"));
    const names = blookNameSetForPack(packId);
    if (names.size === 0) continue;

    const items = blooksCatalog
      .filter((b) => names.has(String(b?.name || "")))
      .map(itemFromCatalog)
      .sort((a, b) => {
        const ra = rarityRank[a.rarity] ?? -1;
        const rb = rarityRank[b.rarity] ?? -1;
        if (rb !== ra) return rb - ra;
        return a.name.localeCompare(b.name);
      });

    for (const it of items) used.add(it.name);

    const grid = items.length ? items.map(renderItemCard).join("\n") : "";
    sections.push(
      `
        <section class="blooks-pack">
          <div class="blooks-pack-title">${packName}</div>
          <div class="blooks-grid blooks-grid-small">${grid || "—"}</div>
        </section>
      `.trim(),
    );
  }

  const otherItems = blooksCatalog
    .filter((b) => !used.has(String(b?.name || "")))
    .map(itemFromCatalog)
    .sort((a, b) => {
      const ra = rarityRank[a.rarity] ?? -1;
      const rb = rarityRank[b.rarity] ?? -1;
      if (rb !== ra) return rb - ra;
      return a.name.localeCompare(b.name);
    });

  if (otherItems.length) {
    sections.push(
      `
        <section class="blooks-pack">
          <div class="blooks-pack-title">Other</div>
          <div class="blooks-grid blooks-grid-small">${otherItems.map(renderItemCard).join("\n")}</div>
        </section>
      `.trim(),
    );
  }

  el.blooksList.innerHTML = sections.length ? sections.join("\n") : "—";

  el.blooksList.querySelectorAll("[data-quick-sell]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = btn.getAttribute("data-quick-sell") || "";
      await quickSellBlook(name);
    });
  });

  el.blooksList.querySelectorAll("[data-list-bazaar]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = btn.getAttribute("data-list-bazaar") || "";
      const raw = prompt(`List ${name} for how many tokens?`, "100");
      if (raw === null) return;
      const price = Math.max(1, Math.floor(Number(raw) || 0));
      if (!price) return;
      await listBlookForSale(name, price);
      location.hash = "#bazaar";
    });
  });
}

let packOpenReturnTimer;

function resetPackOpenUI() {
  if (packOpenReturnTimer) {
    clearTimeout(packOpenReturnTimer);
    packOpenReturnTimer = undefined;
  }
  if (el.packOpenResult) {
    el.packOpenResult.hidden = true;
    el.packOpenResult.classList.remove("reveal", "explode", "explode-uncommon", "explode-rare");
    el.packOpenResult.textContent = "";
  }
  if (el.packOpenHint) el.packOpenHint.textContent = `Click to open (Cost ${PACK_COST})`;
  if (el.packOpenPack) {
    el.packOpenPack.disabled = false;
    el.packOpenPack.hidden = false;
  }
}

function renderPackOpenPage() {
  if (!el.packOpenBackdrop || !el.packOpenArt || !el.packOpenTitle || !el.packOpenPack) return;
  resetPackOpenUI();

  const packId = getPackIdFromHash();
  const p = getPackById(packId);
  const name = p?.name || "Pack";
  const img = p?.image || "";

  el.packOpenTitle.textContent = name;
  if (el.packOpenSubtitle) el.packOpenSubtitle.textContent = `Click the pack to open (Cost ${PACK_COST})`;

  el.packOpenBackdrop.style.backgroundImage = img ? `url('${img}')` : "";
  el.packOpenArt.style.backgroundImage = img ? `url('${img}')` : "";
}

async function grantBlookToUser(blookName) {
  if (!auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const blooks = data?.blooks && typeof data.blooks === "object" ? { ...data.blooks } : {};
  const key = String(blookName || "Blook");
  blooks[key] = (Number(blooks[key]) || 0) + 1;
  await updateDoc(ref, { blooks });

  renderAccount({ ...data, blooks });
  renderBlooks({ ...data, blooks });
}

function startMysticalSequence(root) {
  if (!root) return;

  const frog = root.querySelector(".mystical-frog");
  const finalCard = root.querySelector(".mystical-final");
  if (!frog || !finalCard) return;

  const finalPose = root.getAttribute("data-mystical-final") || "";

  const positions = Array.from({ length: 7 }).map(() => {
    const x = Math.floor(10 + Math.random() * 80);
    const y = Math.floor(12 + Math.random() * 70);
    return { x, y };
  });

  positions.forEach((p, i) => {
    window.setTimeout(() => {
      frog.style.left = `${p.x}%`;
      frog.style.top = `${p.y}%`;
      frog.classList.remove("mystical-teleport");
      void frog.offsetWidth;
      frog.classList.add("mystical-teleport");
    }, i * 200);
  });

  window.setTimeout(() => {
    frog.style.left = "50%";
    frog.style.top = "46%";
    if (finalPose) frog.style.backgroundImage = `url('${finalPose}')`;
    frog.classList.remove("mystical-teleport");
    void frog.offsetWidth;
    frog.classList.add("mystical-center");

    finalCard.hidden = false;
    finalCard.classList.remove("reveal");
    void finalCard.offsetWidth;
    finalCard.classList.add("reveal");
  }, positions.length * 200);

  window.setTimeout(() => {
    frog.classList.add("mystical-hide");
  }, positions.length * 200 + 520);
}

async function openCurrentPackOnce() {
  if (!auth?.currentUser) return;
  if (!el.packOpenPack || !el.packOpenResult) return;

  const packId = getPackIdFromHash();
  const pool = packPools[String(packId || "")] || null;
  if (!pool) {
    el.packOpenResult.hidden = false;
    el.packOpenResult.textContent = "This pack isn't set up yet.";
    return;
  }

  try {
    await addTokensForCurrentUser(-PACK_COST);
  } catch {
    el.packOpenResult.hidden = false;
    el.packOpenResult.textContent = `Not enough tokens. Cost ${PACK_COST}.`;
    if (el.packOpenPack) {
      el.packOpenPack.disabled = false;
      el.packOpenPack.hidden = false;
    }
    return;
  }

  el.packOpenPack.disabled = true;
  el.packOpenPack.hidden = true;

  const rarity = rollRarity(pool.weights);
  const name = randChoice(pool[rarity]) || randChoice(pool.uncommon) || "Blook";
  const blook = getBlookByName(name);
  const img = blook?.image || "";

  el.packOpenResult.hidden = false;
  el.packOpenResult.classList.remove("reveal", "explode", "explode-uncommon", "explode-rare");
  void el.packOpenResult.offsetWidth;

  const rarityLower = String(rarity).toLowerCase();
  const rarityClass = `rarity-${escapeHtml(rarityLower)}`;

  if (rarityLower === "mystical") {
    const finalImg = "./assets/blooks/Screenshot 2026-04-29 at 20.05.55.png";
    const baseImg = img || finalImg;
    el.packOpenResult.innerHTML = `
      <div class="blook-anim mystical-anim" data-mystical-final="${escapeHtml(finalImg)}">
        <div class="mystical-rainbow" aria-hidden="true"></div>
        <div class="mystical-frog" role="img" aria-label="${escapeHtml(name)}" style="${img ? `background-image:url('${escapeHtml(img)}')` : ""}"></div>
        <div class="blook-card explode explode-mystical mystical-final mystical-shush" hidden>
          <div class="blook-art" role="img" aria-label="${escapeHtml(name)} artwork" style="--mystical-base:url('${escapeHtml(baseImg)}');--mystical-shush:url('${escapeHtml(finalImg)}');"></div>
          <div class="blook-meta">
            <div class="blook-name">${escapeHtml(name)}</div>
            <div class="blook-sub">
              <span class="blook-rarity ${rarityClass}">${escapeHtml(String(rarity))}</span>
              <span class="blook-qty">New!</span>
            </div>
          </div>
        </div>
      </div>
    `.trim();

    grantBlookToUser(name).catch(() => {});
    startMysticalSequence(el.packOpenResult.querySelector(".mystical-anim"));

    packOpenReturnTimer = setTimeout(() => {
      if (getPageFromHash() === "packopen") {
        location.hash = "#market";
      }
    }, 4500);
    return;
  }

  const explodeClass =
    rarityLower === "chroma"
      ? "explode-chroma"
      : rarityLower === "supreme"
        ? "explode-supreme"
        : rarityLower === "legendary"
          ? "explode-legendary"
          : rarityLower === "epic"
            ? "explode-epic"
            : rarityLower === "rare"
              ? "explode-rare"
              : "explode-uncommon";

  const animClass =
    rarityLower === "chroma"
      ? "chroma-fall"
      : rarityLower === "supreme"
        ? "supreme-fireworks"
        : rarityLower === "legendary"
          ? "legendary-sweep"
          : rarityLower === "epic"
            ? "epic-spin"
            : "";

  const revealClass = rarityLower === "supreme" ? "" : "reveal";
  const supremeCardClass = rarityLower === "supreme" ? "supreme-flip" : "";

  const fireworksHtml =
    rarityLower === "supreme"
      ? `<div class="fireworks">${Array.from({ length: 10 })
          .map(() => {
            const x = Math.floor(10 + Math.random() * 80);
            const y = Math.floor(10 + Math.random() * 55);
            const d = Math.floor(Math.random() * 420);
            const s = (0.9 + Math.random() * 0.8).toFixed(2);
            return `<span class="firework" style="--x:${x}%;--y:${y}%;--d:${d}ms;--s:${s}"></span>`;
          })
          .join("")}</div>`
      : "";

  el.packOpenResult.innerHTML = `
    <div class="blook-anim ${animClass}">
      ${fireworksHtml}
      <div class="blook-card explode ${explodeClass} ${revealClass} ${supremeCardClass}">
        <div class="blook-art" role="img" aria-label="${escapeHtml(name)} artwork" style="${img ? `background-image:url('${escapeHtml(img)}')` : ""}"></div>
        <div class="blook-meta">
          <div class="blook-name">${escapeHtml(name)}</div>
          <div class="blook-sub">
            <span class="blook-rarity ${rarityClass}">${escapeHtml(String(rarity))}</span>
            <span class="blook-qty">New!</span>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  grantBlookToUser(name).catch(() => {});

  packOpenReturnTimer = setTimeout(() => {
    if (getPageFromHash() === "packopen") {
      location.hash = "#market";
    }
  }, 1000);
}

function usernameFromEmail(email) {
  const raw = String(email || "").split("@")[0] || "player";
  return raw.slice(0, 16);
}

function daysSince(date) {
  if (!date) return "0";
  const ms = Date.now() - date.getTime();
  return String(Math.max(0, Math.floor(ms / 86400000)));
}

function ensureConfigPresent() {
  const hasAny =
    firebaseConfig &&
    typeof firebaseConfig === "object" &&
    Object.values(firebaseConfig).some((v) => typeof v === "string" && v.length > 0);

  if (!hasAny) {
    setMsg("Paste your Firebase config into app.js first.");
    return false;
  }
  return true;
}

let app;
let auth;
let db;

function initFirebase() {
  if (!ensureConfigPresent()) return false;
  if (app && auth && db) return true;
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  return true;
}

async function getOrCreateUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { ref, data: snap.data() };
  }

  const data = {
    email: user.email || "",
    username: usernameFromEmail(user.email),
    avatarColor: "#000000",
    createdAt: serverTimestamp(),
    tokens: 0,
    moneyResetV1: true,
    blooks: {},
  };

  await setDoc(ref, data);
  const after = await getDoc(ref);
  return { ref, data: after.data() };
}

function renderAccount(userDoc) {
  const username = userDoc.username || "player";
  const tokens = Number(userDoc.tokens) || 0;
  const isAdmin = Boolean(userDoc.isAdmin);
  const isCreator = Boolean(userDoc.isCreator);

  const createdAt = userDoc.createdAt?.toDate ? userDoc.createdAt.toDate() : null;
  const days = createdAt ? daysSince(createdAt) : "0";

  const entries = Object.entries(userDoc.blooks || {});
  let count = 0;
  for (const [, qty] of entries) {
    count += Number(qty) || 0;
  }

  el.usernameText.innerHTML = isCreator
    ? `${escapeHtml(username)} <span class="title-badge">CREATOR</span>`
    : escapeHtml(username);
  el.usernameText.classList.toggle("rainbow-name", isAdmin);
  el.tokensText.textContent = String(tokens);
  el.daysText.textContent = String(days);
  el.blooksCountText.textContent = String(count);
  renderAvatar(userDoc);
  populateAvatarSelect(userDoc);
}

function setSignedOutUI() {
  el.authView.hidden = false;
  el.appView.hidden = true;
  el.appNav.hidden = true;
  el.accountCard.hidden = true;
  el.signOutBtn.hidden = true;
  applyAdminUIState();
  stopChatListener();
  stopBazaarListener();
  stopAdminPresenceListener();
  stopCreatorPresenceListener();
  stopPresence();
  if (el.packsList) el.packsList.textContent = "—";
  if (el.blooksList) el.blooksList.textContent = "—";
}

function setSignedInUI() {
  el.authView.hidden = true;
  el.appView.hidden = false;
  el.appNav.hidden = false;
  el.signOutBtn.hidden = false;
}

function getPageFromHash() {
  const raw = String(location.hash || "").replace(/^#/, "").replace(/\?.*$/, "");
  const valid = new Set(el.pages.map((p) => p.dataset.page));
  return valid.has(raw) ? raw : "stats";
}

function showPage(page) {
  const target = page || "stats";

  if (target === "admin" && !isAdminUnlocked()) {
    location.hash = "#stats";
    return;
  }

  if (target === "creator" && !isCreatorUnlocked()) {
    location.hash = "#stats";
    return;
  }

  for (const p of el.pages) {
    p.hidden = p.dataset.page !== target;
  }
  for (const b of el.navBtns) {
    b.classList.toggle("active", b.dataset.nav === target);
  }

  if (target === "packopen") {
    renderPackOpenPage();
  }

  if (currentShownPage !== target) {
    if (currentShownPage === "chat") stopChatListener();
    if (currentShownPage === "bazaar") stopBazaarListener();
    if (currentShownPage === "admin") stopAdminPresenceListener();
    if (currentShownPage === "creator") stopCreatorPresenceListener();
    currentShownPage = target;
  }

  if (target === "chat") {
    startChatListener();
  }
  if (target === "bazaar") {
    setBazaarMsg("");
    startBazaarListener();
  }
  if (target === "admin") {
    setAdminMsg("");
    populateAdminBlookSelect();
    populateAdminPackSelect();
    renderAdminStats().catch(() => {});
    startAdminPresenceListener();
  }
  if (target === "creator") {
    setCreatorMsg("");
    populateCreatorBlookSelect();
    startCreatorPresenceListener();
    if (el.creatorSelected) el.creatorSelected.textContent = creatorSelectedUid || "—";
  }
}

async function enterApp(user) {
  setSignedInUI();
  applyAdminUIState();

  const raw = String(location.hash || "").replace(/^#/, "");
  const currentPage = raw.replace(/\?.*$/, "");
  if (!location.hash || getPageFromHash() !== currentPage) {
    location.hash = "#stats";
  }

  const { data } = await getOrCreateUserDoc(user);
  currentUserData = data;

  if (!data?.moneyResetV1) {
    try {
      const uid = user.uid;
      const ref = doc(db, "users", uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists() ? snap.data() : {};
        const blooks = cur?.blooks && typeof cur.blooks === "object" ? { ...cur.blooks } : {};
        const frog = Number(blooks["Mystical Frog"]) || 0;
        if (frog > 1) blooks["Mystical Frog"] = 1;
        tx.set(ref, { tokens: 1000, blooks, moneyResetV1: true }, { merge: true });
        currentUserData = { ...cur, ...currentUserData, tokens: 1000, blooks, moneyResetV1: true };
      });
    } catch {
    }
  }

  renderAccount(currentUserData);
  renderBlooks(currentUserData);
  renderPacks();
  showPage(getPageFromHash());

  startPresence();
}

async function handleSetAvatar() {
  if (!auth?.currentUser) return;
  if (!el.avatarSelect) return;
  setAvatarMsg("");

  const picked = String(el.avatarSelect.value || "");
  const owned = new Set(ownedBlookNames(currentUserData));
  if (picked && !owned.has(picked)) {
    setAvatarMsg("You can only use owned blooks.");
    return;
  }

  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { avatarBlook: picked || "" });
    currentUserData = { ...(currentUserData || {}), avatarBlook: picked || "" };
    renderAvatar(currentUserData);
    setAvatarMsg("Avatar updated.");
    if (el.avatarEditor) el.avatarEditor.hidden = true;
  } catch {
    setAvatarMsg("Avatar update failed.");
  }
}

function toggleAvatarEditor(forceOpen) {
  if (!el.avatarEditor) return;
  if (typeof forceOpen === "boolean") {
    el.avatarEditor.hidden = !forceOpen;
  } else {
    el.avatarEditor.hidden = !el.avatarEditor.hidden;
  }
  if (!el.avatarEditor.hidden && el.avatarSelect) {
    el.avatarSelect.focus();
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  if (!initFirebase()) return;

  setMsg("");

  const email = el.email.value.trim();
  const password = el.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    setMsg("Signed in.");
    if (auth.currentUser) {
      await enterApp(auth.currentUser);
    }
  } catch (err) {
    setMsg(err?.message || "Sign in failed.");
  }
}

async function handleSignUp() {
  if (!initFirebase()) return;
  setMsg("");

  const email = el.email.value.trim();
  const password = el.password.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    setMsg("Account created.");
    if (auth.currentUser) {
      await enterApp(auth.currentUser);
    }
  } catch (err) {
    setMsg(err?.message || "Sign up failed.");
  }
}

async function handleSignOut() {
  if (!auth) return;
  await signOut(auth);
  setMsg("Signed out.");
}

async function handleEditUsername() {
  if (!auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = doc(db, "users", uid);

  const current = el.usernameText.textContent || "";
  const next = prompt("Pick your Chocolet username:", current);
  if (next === null) return;

  const cleaned = String(next).trim().slice(0, 16);
  if (!cleaned) {
    setMsg("Username can't be empty.");
    return;
  }

  try {
    await updateDoc(ref, { username: cleaned });
    el.usernameText.textContent = cleaned;
    currentUserData = { ...(currentUserData || {}), username: cleaned };
    heartbeatPresence().catch(() => {});
    setMsg("Username updated.");
  } catch (err) {
    setMsg(err?.message || "Username update failed.");
  }
}

async function handleAdminUnlock() {
  const pin = String(el.adminPinInput?.value || "").trim();
  const isAdminPin = pin === ADMIN_PIN;
  const isCreatorPin = pin === CREATOR_PIN;
  if (!isAdminPin && !isCreatorPin) {
    setAdminUnlockMsg("Wrong PIN.");
    return;
  }

  if (isCreatorPin) {
    setCreatorUnlocked();
    setAdminUnlocked();
  } else {
    setAdminUnlocked();
  }
  applyAdminUIState();

  if (isCreatorPin) setAdminUnlockMsg("Creator unlocked.");
  else setAdminUnlockMsg("Admin unlocked.");

  if (db && auth?.currentUser) {
    const patch = isCreatorPin ? { isCreator: true, isAdmin: true } : { isAdmin: true };
    updateDoc(doc(db, "users", auth.currentUser.uid), patch).catch(() => {});
    currentUserData = { ...(currentUserData || {}), ...patch };
    if (currentUserData) renderAccount(currentUserData);
  }
  if (el.adminPinInput) el.adminPinInput.value = "";
  location.hash = isCreatorPin ? "#creator" : "#admin";
}

async function handleCreatorAddTokens() {
  if (!isCreatorUnlocked()) return;
  if (!creatorSelectedUid) {
    setCreatorMsg("Pick a player first.");
    return;
  }
  const amt = Math.max(0, Math.floor(Number(el.creatorTokensQty?.value) || 0));
  try {
    await addTokensForUser(creatorSelectedUid, amt);
    setCreatorMsg("Tokens added.");
  } catch {
    setCreatorMsg("Token update failed.");
  }
}

async function handleCreatorSetTokens() {
  if (!isCreatorUnlocked()) return;
  if (!creatorSelectedUid) {
    setCreatorMsg("Pick a player first.");
    return;
  }
  const amt = Math.max(0, Math.floor(Number(el.creatorTokensQty?.value) || 0));
  try {
    await setTokensForUser(creatorSelectedUid, amt);
    setCreatorMsg("Tokens set.");
  } catch {
    setCreatorMsg("Token update failed.");
  }
}

async function handleCreatorGrant() {
  if (!isCreatorUnlocked()) return;
  if (!creatorSelectedUid) {
    setCreatorMsg("Pick a player first.");
    return;
  }
  const name = String(el.creatorBlookSelect?.value || "");
  const qty = Math.max(1, Math.floor(Number(el.creatorBlookQty?.value) || 1));
  if (!name) return;
  setCreatorMsg("");
  try {
    await addBlookQtyForUserId(creatorSelectedUid, name, qty);
    setCreatorMsg(`Granted ${qty}x ${name}.`);
  } catch {
    setCreatorMsg("Grant failed.");
  }
}

async function handleCreatorSetQty() {
  if (!isCreatorUnlocked()) return;
  if (!creatorSelectedUid) {
    setCreatorMsg("Pick a player first.");
    return;
  }
  const name = String(el.creatorBlookSelect?.value || "");
  const qty = Math.max(0, Math.floor(Number(el.creatorBlookQty?.value) || 0));
  if (!name) return;
  setCreatorMsg("");
  try {
    await setBlookQtyForUserId(creatorSelectedUid, name, qty);
    setCreatorMsg(`Set ${name} to x${qty}.`);
  } catch {
    setCreatorMsg("Set qty failed.");
  }dailyWheelBtn) el.dailyWheelBtn.addEventListener("click", handleDailyWheel);
if (el.
}

async function handleChatSubmit(e) {
  e.preventDefault();
  if (!el.chatInput) return;
  const text = el.chatInput.value;
  el.chatInput.value = "";
  try {
    await sendChatMessage(text);
  } catch {
    el.chatInput.value = text;
  }
}

async function handleAdminGrant() {
  if (!isAdminUnlocked()) return;
  const name = String(el.adminBlookSelect?.value || "");
  const qty = Math.max(1, Math.floor(Number(el.adminBlookQty?.value) || 1));
  if (!name) return;
  setAdminMsg("");
  try {
    await addBlookQtyForUser(name, qty);
    setAdminMsg(`Granted ${qty}x ${name}.`);
  } catch {
    setAdminMsg("Grant failed.");
  }
}

async function handleAdminSetQty() {
  if (!isAdminUnlocked()) return;
  const name = String(el.adminBlookSelect?.value || "");
  const qty = Math.max(1, Math.floor(Number(el.adminBlookQty?.value) || 1));
  if (!name) return;
  setAdminMsg("");
  try {
    await setBlookQtyForUser(name, qty);
    setAdminMsg(`Set ${name} to x${qty}.`);
  } catch {
    setAdminMsg("Set qty failed.");
  }
}
if (el.avatarBox) el.avatarBox.addEventListener("click", () => toggleAvatarEditor(true));

el.authForm.addEventListener("submit", handleSignIn);
el.signUpBtn.addEventListener("click", handleSignUp);
el.signOutBtn.addEventListener("click", handleSignOut);
el.editUsernameBtn.addEventListener("click", handleEditUsername);

if (el.adminUnlockBtn) el.adminUnlockBtn.addEventListener("click", handleAdminUnlock);
if (el.chatForm) el.chatForm.addEventListener("submit", handleChatSubmit);
if (el.adminGrantBtn) el.adminGrantBtn.addEventListener("click", handleAdminGrant);
if (el.adminSetBtn) el.adminSetBtn.addEventListener("click", handleAdminSetQty);
if (el.adminAddTokensBtn) el.adminAddTokensBtn.addEventListener("click", handleAdminAddTokens);
if (el.adminSetTokensBtn) el.adminSetTokensBtn.addEventListener("click", handleAdminSetTokens);
if (el.creatorAddTokensBtn) el.creatorAddTokensBtn.addEventListener("click", handleCreatorAddTokens);
if (el.creatorSetTokensBtn) el.creatorSetTokensBtn.addEventListener("click", handleCreatorSetTokens);
if (el.creatorGrantBtn) el.creatorGrantBtn.addEventListener("click", handleCreatorGrant);
if (el.creatorSetBtn) el.creatorSetBtn.addEventListener("click", handleCreatorSetQty);
if (el.avatarSetBtn) el.avatarSetBtn.addEventListener("click", handleSetAvatar);
if (el.headerAvatar) {
  el.headerAvatar.addEventListener("click", () => {
    location.hash = "#stats";
    window.setTimeout(() => toggleAvatarEditor(true), 0);
  });
}

if (el.playerModalClose) el.playerModalClose.addEventListener("click", closePlayerModal);
if (el.playerModal) {
  el.playerModal.querySelectorAll("[data-modal-close]").forEach((n) => {
    n.addEventListener("click", closePlayerModal);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!el.playerModal || el.playerModal.hidden) return;
  closePlayerModal();
});

document.addEventListener("visibilitychange", () => {
  if (!auth?.currentUser) return;
  heartbeatPresence().catch(() => {});
});

for (const b of el.navBtns) {
  b.addEventListener("click", () => {
    location.hash = `#${b.dataset.nav}`;
  });
}

if (el.packOpenBackBtn) {
  el.packOpenBackBtn.addEventListener("click", () => {
    location.hash = "#market";
  });
}

if (el.packOpenPack) {
  el.packOpenPack.addEventListener("click", async () => {
    await openCurrentPackOnce();
  });
}

window.addEventListener("hashchange", () => {
  if (!auth?.currentUser) return;
  showPage(getPageFromHash());
});

// Start auth listener only if config is present.
if (ensureConfigPresent()) {
  initFirebase();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setSignedOutUI();
      if (location.hash) location.hash = "";
      return;
    }

    try {
      await enterApp(user);
    } catch (err) {
      setMsg(err?.message || "Failed to load account data.");
    }
  });
}
