// Chocoby rugby — server URL config.
// Edit PROD_SERVER_URL to your deployed server (Render/Railway/etc).
//
// Order of precedence:
//   1. ?server=... query param
//   2. localhost  -> http://localhost:3011
//   3. PROD_SERVER_URL

export const PROD_SERVER_URL = "https://chocoby-rugby.onrender.com";

export function getServerUrl() {
  try {
    const params = new URLSearchParams(location.search);
    const override = params.get("server");
    if (override) return override;
  } catch {}
  if (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname.startsWith("192.168.") ||
    location.hostname.startsWith("10.")
  ) {
    return "http://localhost:3011";
  }
  return PROD_SERVER_URL;
}
