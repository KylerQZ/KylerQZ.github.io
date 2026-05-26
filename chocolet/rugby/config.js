// Chocoby rugby — server URL config.
// The rugby simulation runs on the existing chocolet/pvp-hero-battle server
// under the Socket.io namespace `/rugby`.
//
// Order of precedence:
//   1. ?server=...  query param override
//   2. saved value in localStorage (`chocoby_server_url`)
//   3. localhost  -> http://localhost:3010
//   4. PROD_SERVER_URL below

// EDIT this to your deployed chocolet server (the same host pvp-hero-battle uses).
export const PROD_SERVER_URL = "REPLACE_WITH_YOUR_SERVER_URL";

const STORAGE_KEY = "chocoby_server_url";
export const RUGBY_NAMESPACE = "/rugby";

export function getServerUrl() {
  let base;
  try {
    const params = new URLSearchParams(location.search);
    const override = params.get("server");
    if (override) {
      localStorage.setItem(STORAGE_KEY, override);
      base = override;
    }
  } catch {}
  if (!base) {
    try { base = localStorage.getItem(STORAGE_KEY) || ""; } catch {}
  }
  if (!base) {
    if (
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname.startsWith("192.168.") ||
      location.hostname.startsWith("10.")
    ) {
      base = "http://localhost:3010";
    } else {
      base = PROD_SERVER_URL;
    }
  }
  return base.replace(/\/+$/, "") + RUGBY_NAMESPACE;
}

export function setServerUrl(url) {
  try { localStorage.setItem(STORAGE_KEY, url); } catch {}
}
