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
  doc,
  getDoc,
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
};

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
];

function renderPacks() {
  if (!el.packsList) return;

  if (!Array.isArray(packs) || packs.length === 0) {
    el.packsList.textContent = "—";
    return;
  }

  const html = packs
    .map((p) => {
      const name = escapeHtml(p?.name || "Pack");
      const desc = escapeHtml(p?.description || "");
      const img = escapeHtml(p?.image || "");

      return `
        <article class="pack-card" data-pack-id="${escapeHtml(p?.id || "")}">
          <div class="pack-art" role="img" aria-label="${name} artwork" style="${img ? `background-image:url('${img}')` : ""}"></div>
          <div class="pack-body">
            <div class="pack-name">${name}</div>
            <div class="pack-desc">${desc}</div>
            <div class="row">
              <button class="btn" type="button" disabled>Open (soon)</button>
            </div>
          </div>
        </article>
      `.trim();
    })
    .join("\n");

  el.packsList.innerHTML = html;
}

function renderBlooks(userDoc) {
  if (!el.blooksList) return;

  const qtyByName = userDoc?.blooks && typeof userDoc.blooks === "object" ? userDoc.blooks : {};

  if (!Array.isArray(blooksCatalog) || blooksCatalog.length === 0) {
    el.blooksList.textContent = "—";
    return;
  }

  const rarityRank = {
    rare: 2,
    uncommon: 1,
    common: 0,
  };

  const items = blooksCatalog
    .map((b) => {
      const name = String(b?.name || "Blook");
      const qty = Number(qtyByName[name]) || 0;
      return {
        id: String(b?.id || name),
        name,
        rarity: String(b?.rarity || "uncommon"),
        image: String(b?.image || ""),
        qty,
      };
    })
    .sort((a, b) => {
      const ra = rarityRank[a.rarity] ?? -1;
      const rb = rarityRank[b.rarity] ?? -1;
      if (rb !== ra) return rb - ra;
      return a.name.localeCompare(b.name);
    });

  const html = items
    .map((b) => {
      const name = escapeHtml(b.name);
      const rarity = escapeHtml(b.rarity);
      const img = escapeHtml(b.image);
      const qty = escapeHtml(String(b.qty));
      const rarityClass = `rarity-${escapeHtml(String(b.rarity || "uncommon").toLowerCase())}`;

      return `
        <article class="blook-card" data-blook-id="${escapeHtml(b.id)}">
          <div class="blook-art" role="img" aria-label="${name} artwork" style="${img ? `background-image:url('${img}')` : ""}"></div>
          <div class="blook-meta">
            <div class="blook-name">${name}</div>
            <div class="blook-sub">
              <span class="blook-rarity ${rarityClass}">${rarity}</span>
              <span class="blook-qty">x${qty}</span>
            </div>
          </div>
        </article>
      `.trim();
    })
    .join("\n");

  el.blooksList.innerHTML = `<div class="blooks-grid">${html}</div>`;
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
    blooks: {},
  };

  await setDoc(ref, data);
  const after = await getDoc(ref);
  return { ref, data: after.data() };
}

function renderAccount(userDoc) {
  const username = userDoc.username || "player";
  const tokens = Number(userDoc.tokens) || 0;

  const createdAt = userDoc.createdAt?.toDate ? userDoc.createdAt.toDate() : null;
  const days = createdAt ? daysSince(createdAt) : "0";

  const entries = Object.entries(userDoc.blooks || {});
  let count = 0;
  for (const [, qty] of entries) {
    count += Number(qty) || 0;
  }

  el.usernameText.textContent = username;
  el.tokensText.textContent = String(tokens);
  el.daysText.textContent = String(days);
  el.blooksCountText.textContent = String(count);
}

function setSignedOutUI() {
  el.authView.hidden = false;
  el.appView.hidden = true;
  el.appNav.hidden = true;
  el.accountCard.hidden = true;
  el.signOutBtn.hidden = true;
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
  const raw = String(location.hash || "").replace(/^#/, "");
  const valid = new Set(el.pages.map((p) => p.dataset.page));
  return valid.has(raw) ? raw : "stats";
}

function showPage(page) {
  const target = page || "stats";
  for (const p of el.pages) {
    p.hidden = p.dataset.page !== target;
  }
  for (const b of el.navBtns) {
    b.classList.toggle("active", b.dataset.nav === target);
  }
}

async function enterApp(user) {
  setSignedInUI();

  if (!location.hash || getPageFromHash() !== String(location.hash).replace(/^#/, "")) {
    location.hash = "#stats";
  }

  const { data } = await getOrCreateUserDoc(user);
  renderAccount(data);
  renderBlooks(data);
  renderPacks();
  showPage(getPageFromHash());
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
    setMsg("Username updated.");
  } catch (err) {
    setMsg(err?.message || "Username update failed.");
  }
}

el.authForm.addEventListener("submit", handleSignIn);
el.signUpBtn.addEventListener("click", handleSignUp);
el.signOutBtn.addEventListener("click", handleSignOut);
el.editUsernameBtn.addEventListener("click", handleEditUsername);

for (const b of el.navBtns) {
  b.addEventListener("click", () => {
    location.hash = `#${b.dataset.nav}`;
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
