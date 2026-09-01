import { DurableObject } from 'cloudflare:workers';

interface Session {
  sessionId: string;
  ws: WebSocket;
  partnerId: string | null;
  roomId: string | null;
}

interface ClientMessage {
  type: 'join_queue' | 'leave_queue' | 'offer' | 'answer' | 'ice_candidate' | 'next' | 'end_call';
  sessionId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ServerMessage {
  type: 'waiting' | 'matched' | 'offer' | 'answer' | 'ice_candidate' | 'peer_left' | 'call_ended' | 'error';
  roomId?: string;
  initiator?: boolean;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
}

export class MatchmakingRoom extends DurableObject {
  private sessions = new Map<string, Session>();
  private queue: string[] = [];
  private rooms = new Map<string, [string, string]>();

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join_queue': {
        // prevent duplicate entries
        if (this.sessions.has(msg.sessionId)) {
          // already has a session — check if in queue
          if (!this.queue.includes(msg.sessionId)) {
            this.tryMatch(msg.sessionId, ws);
          }
          return;
        }

        this.sessions.set(msg.sessionId, {
          sessionId: msg.sessionId,
          ws,
          partnerId: null,
          roomId: null,
        });

        this.tryMatch(msg.sessionId, ws);
        break;
      }

      case 'leave_queue': {
        this.removeFromQueue(msg.sessionId);
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice_candidate': {
        const session = this.sessions.get(msg.sessionId);
        if (!session?.partnerId) return;
        const partner = this.sessions.get(session.partnerId);
        if (!partner) return;

        const serverMsg: ServerMessage = { type: msg.type };
        if (msg.type === 'offer' || msg.type === 'answer') {
          serverMsg.sdp = msg.sdp;
        } else if (msg.type === 'ice_candidate') {
          serverMsg.candidate = msg.candidate;
        }
        partner.ws.send(JSON.stringify(serverMsg));
        break;
      }

      case 'next': {
        const session = this.sessions.get(msg.sessionId);
        if (!session) return;

        // notify partner
        if (session.partnerId) {
          const partner = this.sessions.get(session.partnerId);
          if (partner) {
            partner.ws.send(JSON.stringify({ type: 'peer_left' } satisfies ServerMessage));
            partner.partnerId = null;
            partner.roomId = null;
          }
        }
        if (session.roomId) {
          this.rooms.delete(session.roomId);
        }
        session.roomId = null;
        session.partnerId = null;

        // rejoin queue
        this.tryMatch(msg.sessionId, ws);
        break;
      }

      case 'end_call': {
        const session = this.sessions.get(msg.sessionId);
        if (!session) return;

        if (session.partnerId) {
          const partner = this.sessions.get(session.partnerId);
          if (partner) {
            partner.ws.send(JSON.stringify({ type: 'call_ended' } satisfies ServerMessage));
            partner.partnerId = null;
            partner.roomId = null;
          }
        }
        if (session.roomId) {
          this.rooms.delete(session.roomId);
        }
        this.removeFromQueue(msg.sessionId);
        this.sessions.delete(msg.sessionId);
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    // find session by ws
    let sessionId: string | null = null;
    for (const [id, session] of this.sessions) {
      if (session.ws === ws) {
        sessionId = id;
        break;
      }
    }
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.partnerId) {
      const partner = this.sessions.get(session.partnerId);
      if (partner) {
        partner.ws.send(JSON.stringify({ type: 'peer_left' } satisfies ServerMessage));
        partner.partnerId = null;
        partner.roomId = null;
      }
    }
    if (session.roomId) {
      this.rooms.delete(session.roomId);
    }
    this.removeFromQueue(sessionId);
    this.sessions.delete(sessionId);
  }

  async webSocketError(ws: WebSocket) {
    // handled by webSocketClose
  }

  private tryMatch(sessionId: string, ws: WebSocket) {
    // don't match with self
    const partnerId = this.queue.find((id) => id !== sessionId);

    if (partnerId) {
      const partner = this.sessions.get(partnerId);
      if (partner) {
        // remove partner from queue
        this.removeFromQueue(partnerId);

        const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const session = this.sessions.get(sessionId);
        if (session) {
          session.roomId = roomId;
          session.partnerId = partnerId;
        }
        partner.roomId = roomId;
        partner.partnerId = sessionId;
        this.rooms.set(roomId, [sessionId, partnerId]);

        // partner (first in queue) is initiator
        partner.ws.send(JSON.stringify({ type: 'matched', roomId, initiator: true } satisfies ServerMessage));
        ws.send(JSON.stringify({ type: 'matched', roomId, initiator: false } satisfies ServerMessage));
        return;
      }
    }

    // no partner available, add to queue
    if (!this.queue.includes(sessionId)) {
      this.queue.push(sessionId);
    }
    ws.send(JSON.stringify({ type: 'waiting' } satisfies ServerMessage));
  }

  private removeFromQueue(id: string) {
    const idx = this.queue.indexOf(id);
    if (idx !== -1) this.queue.splice(idx, 1);
  }
}
