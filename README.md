# JIITMEGLE

Meet someone from JIIT — random 1-to-1 video chat for JIIT students.

Real WebRTC peer-to-peer video/audio. No recording. No fake users. No paid services.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Signaling**: Cloudflare Workers + Durable Objects (WebSocket)
- **WebRTC**: Direct P2P with free Google STUN server
- **Deployment**: Vercel (frontend) + Cloudflare Workers (signaling)

## Quick Start (Local Dev)

```bash
npm install
npm run dev
```

Open two browser windows/tabs to `http://localhost:5173`:
1. Window A → click **CONNECT**
2. Window B → click **CONNECT**
3. Both are matched → real video + audio call

The local dev environment includes a built-in WebSocket signaling server (runs automatically on port 3001 via a Vite plugin). No external setup needed for local testing.

## Production Deployment

### 1. Deploy the Cloudflare Signaling Server

```bash
cd cloudflare
npx wrangler login
npx wrangler deploy
```

After deployment, note the WebSocket URL, e.g.:
```
wss://jiitmegle-signaling.your-subdomain.workers.dev
```

### 2. Deploy the Frontend to Vercel

```bash
npm run build
```

Set the environment variable in Vercel:
```
VITE_SIGNALING_URL=wss://jiitmegle-signaling.your-subdomain.workers.dev
VITE_STUN_SERVER=stun:stun.l.google.com:19302
```

Deploy to Vercel (via CLI or GitHub integration):
```bash
npx vercel --prod
```

### 3. Test Cross-Device

1. Laptop → `https://your-app.vercel.app` → CONNECT
2. Phone → `https://your-app.vercel.app` → CONNECT
3. Matched → real WebRTC video + audio

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SIGNALING_URL` | WebSocket URL of the Cloudflare signaling server |
| `VITE_STUN_SERVER` | STUN server for WebRTC (default: `stun:stun.l.google.com:19302`) |

## Architecture

```
Vercel (React frontend)
        │
   WebSocket/WSS
        ↓
Cloudflare Worker
        ↓
  Durable Object
  matchmaking + rooms
      ↙       ↘
  User A        User B
      ↘       ↙
    WebRTC P2P
   🎥     🎤
```

Video and audio flow directly between peers. Cloudflare only handles matchmaking and signaling — never touches media.

## WebRTC Limitation

This MVP uses free STUN + direct P2P. Some restrictive networks/NATs (e.g. corporate Wi-Fi, symmetric NAT) may block direct P2P connections. A TURN relay can be added later if the project grows. Free TURN options like [Open Relay](https://www.metered.ca/tools/openrelay/) can be configured by adding a TURN server to the `iceServers` array in `src/services/webrtcService.ts`.

## Privacy

- Video and audio are NOT recorded
- Media flows peer-to-peer, not through any server
- No video/audio is uploaded or stored
- Sessions are anonymous and temporary

## Project Structure

```
src/
  components/    UI components (VideoTile, ControlBar)
  hooks/         useVideoChat — orchestrates signaling + WebRTC
  services/      signalingService (WebSocket), webrtcService (RTCPeerConnection)
  pages/         HomePage, CallPage
  types/         TypeScript message + state types

cloudflare/
  src/
    index.ts              Worker entry point (WebSocket upgrade)
    MatchmakingRoom.ts    Durable Object (queue, rooms, signaling relay)
  wrangler.toml           Cloudflare config

dev-server/
  signalingServer.ts      Local WebSocket server for dev testing
  viteSignalingPlugin.ts  Vite plugin that starts the dev signaling server
```

## Scripts

```bash
npm install         # install dependencies
npm run dev         # start dev server (includes local signaling server)
npm run build       # production build
npm run typecheck    # type check
npx wrangler dev    # run Cloudflare Worker locally
npx wrangler deploy # deploy Cloudflare Worker
```
