// 1) Create a Firebase project
// 2) Enable Authentication -> Email/Password
// 3) Create Firestore
// 4) Create a Web App and paste the config below

// FIREBASE_CONFIG_HERE
const firebaseConfig = {
  apiKey: "AIzaSyBbG4r9gu5WhFrXE1XiwIoxhblT-8QP4Q8",
  authDomain: "chocolet-717fd.firebaseapp.com",
  databaseURL: "https://chocolet-717fd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chocolet-717fd",
  storageBucket: "chocolet-717fd.firebasestorage.app",
  messagingSenderId: "128335491787",
  appId: "1:128335491787:web:3628f50b613556ba4b214e",
  measurementId: "G-RYR5LY7PER",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
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
  app = initializeApp(firebaseConfig);
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

  const { html, count } = formatBlooks(userDoc.blooks);

  el.usernameText.textContent = username;
  el.tokensText.textContent = String(tokens);
  el.daysText.textContent = String(days);
  el.blooksCountText.textContent = String(count);
  el.blooksList.innerHTML = html;
}

function setSignedOutUI() {
  el.accountCard.hidden = true;
  el.signOutBtn.hidden = true;
}

function setSignedInUI() {
  el.accountCard.hidden = false;
  el.signOutBtn.hidden = false;
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

// Start auth listener only if config is present.
if (ensureConfigPresent()) {
  initFirebase();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setSignedOutUI();
      return;
    }

    setSignedInUI();

    try {
      const { data } = await getOrCreateUserDoc(user);
      renderAccount(data);
    } catch (err) {
      setMsg(err?.message || "Failed to load account data.");
    }
  });
}
