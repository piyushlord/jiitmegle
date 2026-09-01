export type CallState =
  | 'IDLE'
  | 'REQUESTING_MEDIA'
  | 'WAITING'
  | 'MATCHED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDED';

export type MediaState = {
  cameraEnabled: boolean;
  micEnabled: boolean;
  cameraError: string | null;
  micError: string | null;
};

export type ClientMessage =
  | { type: 'join_queue'; sessionId: string }
  | { type: 'leave_queue'; sessionId: string }
  | { type: 'offer'; sessionId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sessionId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice_candidate'; sessionId: string; candidate: RTCIceCandidateInit }
  | { type: 'next'; sessionId: string }
  | { type: 'end_call'; sessionId: string };

export type ServerMessage =
  | { type: 'waiting' }
  | { type: 'matched'; roomId: string; initiator: boolean }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice_candidate'; candidate: RTCIceCandidateInit }
  | { type: 'peer_left' }
  | { type: 'call_ended' }
  | { type: 'error'; message: string };

export type SignalingMessage = ClientMessage | ServerMessage;
