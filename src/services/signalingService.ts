import type { ClientMessage, ServerMessage } from '@/types/signaling';

type MessageHandler = (message: ServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class SignalingService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.shouldReconnect = true;
      try {
        this.ws = new WebSocket(this.url);
      } catch {
        reject(new Error('Failed to open WebSocket connection'));
        return;
      }

      this.ws.onopen = () => {
        this.notifyStatus(true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.messageHandlers.forEach((h) => h(message));
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        this.ws = null;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          reject(new Error('WebSocket connection failed'));
        }
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.connect().catch(() => {
          // will retry again on close
        });
      }
    }, 2000);
  }

  send(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyStatus(connected: boolean) {
    this.statusHandlers.forEach((h) => h(connected));
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export function getSignalingUrl(): string {
  const fromEnv = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  if (fromEnv) return fromEnv;

  if (import.meta.env.DEV) {
    return `ws://${window.location.hostname}:3001`;
  }

  return `wss://${window.location.host}`;
}
