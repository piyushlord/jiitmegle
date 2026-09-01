import { useCallback, useEffect, useRef, useState } from 'react';
import type { CallState, ServerMessage } from '@/types/signaling';
import { SignalingService, getSignalingUrl } from '@/services/signalingService';
import { WebRTCService } from '@/services/webrtcService';

type Status = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function useVideoChat() {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [signalingStatus, setSignalingStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signalingRef = useRef<SignalingService | null>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);
  const sessionIdRef = useRef<string>('');
  const localStreamRef = useRef<MediaStream | null>(null);
  const initiatorRef = useRef(false);
  const isConnectingRef = useRef(false);
  const nextInProgressRef = useRef(false);

  const ensureServices = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService();
    }
    return webrtcRef.current;
  }, []);

  const teardownPeer = useCallback(() => {
    webrtcRef.current?.closePeer();
    setRemoteStream(null);
  }, []);

  const setupWebRTCHandlers = useCallback(() => {
    const webrtc = ensureServices();

    webrtc.onRemoteTrack((stream) => {
      setRemoteStream(stream);
      setCallState('CONNECTED');
    });

    webrtc.onIceCandidate((candidate) => {
      signalingRef.current?.send({
        type: 'ice_candidate',
        sessionId: sessionIdRef.current,
        candidate,
      });
    });

    webrtc.onConnectionStateChange((state) => {
      if (state === 'failed' || state === 'disconnected') {
        setErrorMessage('Connection lost. Try Next to find someone new.');
      }
    });
  }, [ensureServices]);

  const handleServerMessage = useCallback(
    async (message: ServerMessage) => {
      const webrtc = webrtcRef.current;
      if (!webrtc) return;

      switch (message.type) {
        case 'waiting':
          setCallState('WAITING');
          break;

        case 'matched': {
          initiatorRef.current = message.initiator;
          teardownPeer();
          setupWebRTCHandlers();
          webrtc.createPeer();

          const stream = localStreamRef.current;
          if (stream) {
            webrtc.addLocalStream(stream);
          }

          setCallState('MATCHED');

          if (message.initiator) {
            try {
              const offer = await webrtc.createOffer();
              signalingRef.current?.send({
                type: 'offer',
                sessionId: sessionIdRef.current,
                sdp: offer,
              });
              setCallState('CONNECTING');
            } catch {
              setErrorMessage('Failed to create offer.');
            }
          }
          break;
        }

        case 'offer': {
          try {
            await webrtc.acceptOffer(message.sdp);
            const answer = await webrtc.createAnswer();
            signalingRef.current?.send({
              type: 'answer',
              sessionId: sessionIdRef.current,
              sdp: answer,
            });
            setCallState('CONNECTING');
          } catch {
            setErrorMessage('Failed to accept offer.');
          }
          break;
        }

        case 'answer': {
          try {
            await webrtc.acceptAnswer(message.sdp);
          } catch {
            setErrorMessage('Failed to accept answer.');
          }
          break;
        }

        case 'ice_candidate': {
          await webrtc.addIceCandidate(message.candidate);
          break;
        }

        case 'peer_left':
        case 'call_ended': {
          teardownPeer();
          setCallState('WAITING');
          setErrorMessage(null);
          signalingRef.current?.send({
            type: 'join_queue',
            sessionId: sessionIdRef.current,
          });
          break;
        }

        case 'error': {
          setErrorMessage(message.message);
          break;
        }
      }
    },
    [teardownPeer, setupWebRTCHandlers],
  );

  const connect = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setErrorMessage(null);
    setCallState('REQUESTING_MEDIA');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setCameraEnabled(true);
      setMicEnabled(true);
      setCameraError(null);

      const webrtc = ensureServices();
      webrtc.addLocalStream(stream);

      const signaling = new SignalingService(getSignalingUrl());
      signalingRef.current = signaling;

      signaling.onStatusChange((connected) => {
        setSignalingStatus(connected ? 'connected' : 'disconnected');
      });

      signaling.onMessage(handleServerMessage);

      await signaling.connect();

      sessionIdRef.current = generateSessionId();
      signaling.send({ type: 'join_queue', sessionId: sessionIdRef.current });
      setCallState('WAITING');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      const lower = message.toLowerCase();
      if (lower.includes('permission') || lower.includes('denied')) {
        setCameraError('Camera and microphone access is required to use JIITMEGLE.');
      } else if (lower.includes('notfound') || lower.includes('device')) {
        setCameraError('No camera or microphone found. Please connect one and try again.');
      } else {
        setCameraError(message);
      }
      setCallState('IDLE');
      setSignalingStatus('error');
    } finally {
      isConnectingRef.current = false;
    }
  }, [ensureServices, handleServerMessage]);

  const next = useCallback(() => {
    if (nextInProgressRef.current) return;
    nextInProgressRef.current = true;

    teardownPeer();
    signalingRef.current?.send({ type: 'next', sessionId: sessionIdRef.current });
    setCallState('WAITING');
    setErrorMessage(null);

    setTimeout(() => {
      signalingRef.current?.send({
        type: 'join_queue',
        sessionId: sessionIdRef.current,
      });
      nextInProgressRef.current = false;
    }, 300);
  }, [teardownPeer]);

  const endCall = useCallback(() => {
    signalingRef.current?.send({ type: 'end_call', sessionId: sessionIdRef.current });
    teardownPeer();
    webrtcRef.current?.stopLocalStream();
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    signalingRef.current?.disconnect();
    signalingRef.current = null;
    setCallState('IDLE');
    setSignalingStatus('idle');
    setErrorMessage(null);
  }, [teardownPeer]);

  const toggleCamera = useCallback(() => {
    const newState = !cameraEnabled;
    webrtcRef.current?.toggleVideo(newState);
    setCameraEnabled(newState);
  }, [cameraEnabled]);

  const toggleMic = useCallback(() => {
    const newState = !micEnabled;
    webrtcRef.current?.toggleAudio(newState);
    setMicEnabled(newState);
  }, [micEnabled]);

  useEffect(() => {
    return () => {
      webrtcRef.current?.closePeer();
      webrtcRef.current?.stopLocalStream();
      signalingRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      signalingRef.current?.send({ type: 'end_call', sessionId: sessionIdRef.current });
      webrtcRef.current?.stopLocalStream();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    cameraEnabled,
    micEnabled,
    cameraError,
    signalingStatus,
    errorMessage,
    connect,
    next,
    endCall,
    toggleCamera,
    toggleMic,
  };
}

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
