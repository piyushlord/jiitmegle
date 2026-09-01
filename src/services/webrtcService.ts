

type TrackHandler = (stream: MediaStream) => void;
type IceCandidateHandler = (candidate: RTCIceCandidateInit) => void;
type StateHandler = (state: RTCPeerConnectionState) => void;

export class WebRTCService {
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private trackHandlers = new Set<TrackHandler>();
  private iceHandlers = new Set<IceCandidateHandler>();
  private stateHandlers = new Set<StateHandler>();
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private getIceServers(): RTCIceServer[] {
    return [
      {
        urls:
          (import.meta.env.VITE_STUN_SERVER as string | undefined) ||
          'stun:stun.l.google.com:19302',
      },
    ];
  }

  createPeer(): RTCPeerConnection {
    this.closePeer();
    this.pendingCandidates = [];

    this.peer = new RTCPeerConnection({ iceServers: this.getIceServers() });

    this.peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.trackHandlers.forEach((h) => h(stream));
    };

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON() as RTCIceCandidateInit;
        this.iceHandlers.forEach((h) => h(candidate));
      }
    };

    this.peer.onconnectionstatechange = () => {
      if (this.peer) {
        this.stateHandlers.forEach((h) => h(this.peer!.connectionState));
      }
    };

    return this.peer;
  }

  addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    if (!this.peer) this.createPeer();

    stream.getTracks().forEach((track) => {
      this.peer!.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peer) throw new Error('Peer not initialized');
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async acceptOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peer) throw new Error('Peer not initialized');
    await this.peer.setRemoteDescription(offer);
    // apply any buffered candidates
    await this.flushPendingCandidates();
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peer) throw new Error('Peer not initialized');
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peer) throw new Error('Peer not initialized');
    await this.peer.setRemoteDescription(answer);
    await this.flushPendingCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peer) return;
    if (!this.peer.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.peer.addIceCandidate(candidate);
    } catch {
      // ignore — can happen during teardown
    }
  }

  private async flushPendingCandidates() {
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const c of queued) {
      try {
        await this.peer!.addIceCandidate(c);
      } catch {
        // ignore
      }
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  closePeer() {
    if (this.peer) {
      this.peer.ontrack = null;
      this.peer.onicecandidate = null;
      this.peer.onconnectionstatechange = null;
      try {
        this.peer.close();
      } catch {
        // already closed
      }
      this.peer = null;
    }
  }

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  onRemoteTrack(handler: TrackHandler) {
    this.trackHandlers.add(handler);
    return () => this.trackHandlers.delete(handler);
  }

  onIceCandidate(handler: IceCandidateHandler) {
    this.iceHandlers.add(handler);
    return () => this.iceHandlers.delete(handler);
  }

  onConnectionStateChange(handler: StateHandler) {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  get hasPeer(): boolean {
    return this.peer !== null;
  }
}
