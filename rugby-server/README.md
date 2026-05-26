# Chocoby Rugby Server

Authoritative Socket.io server for the multiplayer rugby game in `/chocolet/rugby/`.

## Run locally

```bash
cd rugby-server
npm install
npm start
```

The server listens on `http://localhost:3011` by default. Set `PORT` env var to override.

The client (`chocolet/rugby/`) auto-detects `localhost` and connects to `http://localhost:3011`.
You can override with `?server=https://your-server.example.com` in the URL.

To play locally, open `http://localhost:8765/chocolet/rugby/` in two or more browser tabs while the server is running. Each tab takes a player slot; bots fill the rest.

## Deploy to Render (free tier)

1. Push this repo to GitHub.
2. On [render.com](https://render.com), click **New** → **Blueprint**.
3. Connect your GitHub account and pick this repo.
4. Render reads `rugby-server/render.yaml` and creates the service.
5. Wait for it to build and note the URL (e.g. `https://chocoby-rugby.onrender.com`).
6. Update `chocolet/rugby/config.js` — change the `PROD_SERVER_URL` to your URL.
7. Commit and push. The chocolet client now connects to your live server.

> Note: Render free tier sleeps after ~15 min of inactivity and takes ~30 s to wake.

## Deploy to Railway

1. `railway init` in this folder, or use the Railway dashboard "Deploy from GitHub".
2. Set root directory to `rugby-server/`.
3. Railway auto-detects `npm start`.
4. Update `chocolet/rugby/config.js` with the public URL.

## Endpoints

- `GET /` — sanity message
- `GET /health` — JSON `{ ok, players, perTeam }`
- `Socket.io` on the same origin

## Game protocol (Socket.io events)

### Client → Server

- `join` `{ name }` — request a slot. Server replies with `welcome`.
- `input` `{ dx, dy, aimX, aimY, mouseDown }` — sent ~30 Hz.
- `passRelease` `{ power, aimX, aimY }` — fired when LMB released while charging.
- `tackle` — F key.
- `request` — call for a pass (LMB without ball).
- `setMode` `{ perTeam }` — change team size 1/2/3 (resets match).

### Server → Client

- `welcome` `{ youIdx, perTeam, W, H }`
- `state` (every tick) — full snapshot: players, ball, score, time, msg, extraTime, frozenUntilMs, perTeam, events.
- `roomFull` — sent if no human slot is available.

`events` is a list of `{ type, x, y, scale, mag, durMs }` for impact rings and screen shakes since the last tick.
