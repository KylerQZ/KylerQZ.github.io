const crypto = require("crypto");

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

const db = admin.firestore();

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function pinDocIdForEmail(email) {
  const normalized = normalizeEmail(email);
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return hash.slice(0, 32);
}

function randomPin(len = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function sha256(s) {
  return crypto.createHash("sha256").update(String(s || "")).digest("hex");
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

exports.requestLoginPin = onCall(async (req) => {
  const email = normalizeEmail(req.data?.email);
  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const apiKey = requireEnv("SENDGRID_API_KEY");
  const fromEmail = requireEnv("FROM_EMAIL");

  sgMail.setApiKey(apiKey);

  const now = Date.now();
  const pin = randomPin(14);
  const pinHash = sha256(pin);
  const expiresAtMs = now + 5 * 60 * 1000;

  const id = pinDocIdForEmail(email);
  const ref = db.collection("loginPins").doc(id);

  await ref.set({
    email,
    pinHash,
    attemptsLeft: 3,
    createdAtMs: now,
    expiresAtMs,
    used: false,
  });

  const subject = "Your Chocolet login PIN";
  const text = `Your login PIN is: ${pin}\n\nThis PIN expires in 5 minutes.`;

  try {
    await sgMail.send({
      to: email,
      from: fromEmail,
      subject,
      text,
    });
  } catch (e) {
    await ref.delete().catch(() => {});
    throw new HttpsError("internal", "Failed to send email.");
  }

  return { ok: true };
});

exports.verifyLoginPin = onCall(async (req) => {
  const email = normalizeEmail(req.data?.email);
  const pin = String(req.data?.pin || "").trim();

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }
  if (!pin) {
    throw new HttpsError("invalid-argument", "PIN is required.");
  }

  const id = pinDocIdForEmail(email);
  const ref = db.collection("loginPins").doc(id);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "No active PIN. Click Get PIN.");
  }

  const data = snap.data() || {};
  const now = Date.now();

  if (data.used) {
    await ref.delete().catch(() => {});
    throw new HttpsError("failed-precondition", "PIN already used. Click Get PIN.");
  }

  if (Number(data.expiresAtMs) <= now) {
    await ref.delete().catch(() => {});
    throw new HttpsError("deadline-exceeded", "PIN expired. Click Get PIN.");
  }

  const attemptsLeft = Math.max(0, Math.floor(Number(data.attemptsLeft) || 0));
  const pinHash = String(data.pinHash || "");
  const ok = sha256(pin) === pinHash;

  if (!ok) {
    const nextAttempts = attemptsLeft - 1;
    if (nextAttempts <= 0) {
      await ref.delete().catch(() => {});
      throw new HttpsError("permission-denied", "Wrong PIN. No tries left — click Get PIN.");
    }
    await ref.update({ attemptsLeft: nextAttempts });
    throw new HttpsError("permission-denied", `Wrong PIN. Tries left: ${nextAttempts}.`);
  }

  await ref.delete().catch(() => {});

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch {
    userRecord = await admin.auth().createUser({ email });
  }

  const token = await admin.auth().createCustomToken(userRecord.uid, { email });
  return { token };
});
