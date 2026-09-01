import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage } from '../../src/types/signaling';

type Session = {
  id: string;
  ws: WebSocket;
  roomId: string | null;
  partnerId: string | null;
};

const sessions = new Map<string, Session>();
const queue: string[] = [];
const rooms = new Map<string, string[]>(); // roomId -> [sessionId, sessionId]

const STALE_TIMEOUT = 120_000;

export function createSignalingServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    let sessionId: string | null = null;

    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === 'join_queue') {
        sessionId = msg.sessionId;

        // prevent duplicate queue entries
        if (queue.includes(sessionId)) return;

        const session: Session = { id: sessionId, ws, roomId: null, partnerId: null };
        sessions.set(sessionId, session);

        // check for a waiting partner
        const partnerId = queue.shift();
        if (partnerId && partnerId !== sessionId) {
          const partner = sessions.get(partnerId);
          if (partner && partner.ws.readyState === WebSocket.OPEN) {
            // match them
            const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            session.roomId = roomId;
            session.partnerId = partnerId;
            partner.roomId = roomId;
            partner.partnerId = sessionId;
            rooms.set(roomId, [sessionId, partnerId]);

            // first one in queue is initiator
            partner.ws.send(JSON.stringify({ type: 'matched', roomId, initiator: true }));
            ws.send(JSON.stringify({ type: 'matched', roomId, initiator: false }));
          } else {
            // partner gone, re-add current to queue
            queue.push(sessionId);
            ws.send(JSON.stringify({ type: 'waiting' }));
          }
        } else {
          queue.push(sessionId);
          ws.send(JSON.stringify({ type: 'waiting' }));
        }
      } else if (msg.type === 'leave_queue') {
        removeFromQueue(msg.sessionId);
      } else if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice_candidate') {
        const session = sessions.get(msg.sessionId);
        if (!session?.partnerId) return;
        const partner = sessions.get(session.partnerId);
        if (!partner || partner.ws.readyState !== WebSocket.OPEN) return;

        if (msg.type === 'offer') {
          partner.ws.send(JSON.stringify({ type: 'offer', sdp: msg.sdp }));
        } else if (msg.type === 'answer') {
          partner.ws.send(JSON.stringify({ type: 'answer', sdp: msg.sdp }));
        } else if (msg.type === 'ice_candidate') {
          partner.ws.send(JSON.stringify({ type: 'ice_candidate', candidate: msg.candidate }));
        }
      } else if (msg.type === 'next') {
        const session = sessions.get(msg.sessionId);
        if (!session) return;
        // notify partner
        if (session.partnerId) {
          const partner = sessions.get(session.partnerId);
          if (partner && partner.ws.readyState === WebSocket.OPEN) {
            partner.ws.send(JSON.stringify({ type: 'peer_left' }));
            partner.roomId = null;
            partner.partnerId = null;
          }
        }
        if (session.roomId) {
          rooms.delete(session.roomId);
        }
        session.roomId = null;
        session.partnerId = null;
      } else if (msg.type === 'end_call') {
        const session = sessions.get(msg.sessionId);
        if (!session) return;
        if (session.partnerId) {
          const partner = sessions.get(session.partnerId);
          if (partner && partner.ws.readyState === WebSocket.OPEN) {
            partner.ws.send(JSON.stringify({ type: 'call_ended' }));
            partner.roomId = null;
            partner.partnerId = null;
          }
        }
        if (session.roomId) {
          rooms.delete(session.roomId);
        }
        removeFromQueue(session.id);
        sessions.delete(session.id);
      }
    });

    ws.on('close', () => {
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session) return;

      // notify partner
      if (session.partnerId) {
        const partner = sessions.get(session.partnerId);
        if (partner && partner.ws.readyState === WebSocket.OPEN) {
          partner.ws.send(JSON.stringify({ type: 'peer_left' }));
          partner.roomId = null;
          partner.partnerId = null;
        }
      }
      if (session.roomId) {
        rooms.delete(session.roomId);
      }
      removeFromQueue(sessionId);
      sessions.delete(sessionId);
    });

    ws.on('error', () => {
      // handled by close
    });
  });

  // stale session cleanup
  setInterval(() => {
    for (const [id, session] of sessions) {
      if (session.ws.readyState === WebSocket.CLOSED || session.ws.readyState === WebSocket.CLOSING) {
        removeFromQueue(id);
        sessions.delete(id);
      }
    }
  }, STALE_TIMEOUT);

  return wss;
}

function removeFromQueue(id: string) {
  const idx = queue.indexOf(id);
  if (idx !== -1) queue.splice(idx, 1);
}
