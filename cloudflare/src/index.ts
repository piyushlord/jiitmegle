export interface Env {
  ROOM: DurableObjectNamespace;
}

export interface SessionState {
  sessionId: string;
  partnerId: string | null;
  roomId: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', {
        status: 426,
        headers: corsHeaders,
      });
    }

    // route all connections to a single matchmaking Durable Object
    const id = env.ROOM.idFromName('matchmaking');
    const stub = env.ROOM.get(id);

    return stub.fetch(request);
  },
};
