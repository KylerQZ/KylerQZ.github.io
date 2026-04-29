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
      uncommon: 0.793,
      rare: 0.15,
      epic: 0.02,
      legendary: 0.02,
      chroma: 0.01,
      supreme: 0.005,
      mystical: 0.002,
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
              <button class="btn" type="button" data-open-pack="${escapeHtml(p?.id || "")}">Open</button>
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

    return `
      <article class="blook-card blook-card-small ${lockedClass}" data-blook-id="${escapeHtml(b.id)}">
        <div class="blook-art blook-art-small" role="img" aria-label="${name} artwork" style="${img ? `background-image:url('${img}')` : ""}"></div>
        <div class="blook-meta">
          <div class="blook-name">${name}</div>
          <div class="blook-sub">
            <span class="blook-rarity ${rarityClass}">${rarity}</span>
            <span class="blook-qty">x${qty}</span>
          </div>
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
  if (el.packOpenHint) el.packOpenHint.textContent = "Click to open";
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
  if (el.packOpenSubtitle) el.packOpenSubtitle.textContent = "Click the pack to open";

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
    el.packOpenResult.innerHTML = `
      <div class="blook-anim mystical-anim" data-mystical-final="${escapeHtml(finalImg)}">
        <div class="mystical-rainbow" aria-hidden="true"></div>
        <div class="mystical-frog" role="img" aria-label="${escapeHtml(name)}" style="${img ? `background-image:url('${escapeHtml(img)}')` : ""}"></div>
        <div class="blook-card explode explode-mystical mystical-final mystical-shush" hidden>
          <div class="blook-art" role="img" aria-label="${escapeHtml(name)} artwork" style="${finalImg ? `background-image:url('${escapeHtml(finalImg)}')` : img ? `background-image:url('${escapeHtml(img)}')` : ""}"></div>
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
  const raw = String(location.hash || "").replace(/^#/, "").replace(/\?.*$/, "");
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

  if (target === "packopen") {
    renderPackOpenPage();
  }
}

async function enterApp(user) {
  setSignedInUI();

  const raw = String(location.hash || "").replace(/^#/, "");
  const currentPage = raw.replace(/\?.*$/, "");
  if (!location.hash || getPageFromHash() !== currentPage) {
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
