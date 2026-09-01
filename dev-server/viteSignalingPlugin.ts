import type { Plugin } from 'vite';
import { createSignalingServer } from '../dev-server/signalingServer';

export function devSignalingPlugin(): Plugin {
  let wss: ReturnType<typeof createSignalingServer> | null = null;

  return {
    name: 'jiitmegle-signaling',
    configureServer(server) {
      const port = 3001;
      wss = createSignalingServer(port);
      server.httpServer?.on('close', () => {
        wss?.close();
      });
      console.log(`  🔌 JIITMEGLE signaling server running on ws://localhost:${port}`);
    },
    configurePreviewServer(server) {
      const port = 3001;
      wss = createSignalingServer(port);
      server.httpServer?.on('close', () => {
        wss?.close();
      });
    },
  };
}
