import { Loader2, AlertTriangle, Home } from 'lucide-react';
import { VideoTile } from '@/components/VideoTile';
import { ControlBar } from '@/components/ControlBar';
import type { CallState } from '@/types/signaling';

type CallPageProps = {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  errorMessage: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onNext: () => void;
  onEnd: () => void;
};

export function CallPage({
  callState,
  localStream,
  remoteStream,
  cameraEnabled,
  micEnabled,
  errorMessage,
  onToggleMic,
  onToggleCamera,
  onNext,
  onEnd,
}: CallPageProps) {
  const isWaiting = callState === 'WAITING' || callState === 'REQUESTING_MEDIA';
  const isConnecting = callState === 'MATCHED' || callState === 'CONNECTING';
  const isConnected = callState === 'CONNECTED';
  const showConnectingOverlay = isConnecting && !remoteStream;

  return (
    <div className="relative flex h-screen flex-col bg-slate-950">
      {/* status bar */}
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
        <StatusBadge callState={callState} />
      </div>

      {/* main video area */}
      <div className="relative flex-1">
        {/* remote video (large) */}
        <VideoTile
          stream={remoteStream}
          className="absolute inset-0 h-full w-full rounded-none"
          placeholder={
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isWaiting ? (
                <WaitingContent />
              ) : showConnectingOverlay ? (
                <ConnectingContent />
              ) : (
                <div className="text-slate-600">No video</div>
              )}
            </div>
          }
        />

        {/* local video (picture-in-picture) */}
        {localStream && (
          <div className="absolute bottom-4 right-4 z-10 h-28 w-40 overflow-hidden rounded-xl border-2 border-slate-700/50 shadow-2xl sm:h-40 sm:w-56">
            <VideoTile stream={localStream} mirrored className="h-full w-full rounded-none" />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <span className="text-xs text-slate-500">Camera off</span>
              </div>
            )}
          </div>
        )}

        {/* error banner */}
        {errorMessage && (
          <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 px-4">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 backdrop-blur">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* control bar */}
      <div className="relative z-20 border-t border-slate-800 bg-slate-900/80 px-4 py-5 backdrop-blur">
        <ControlBar
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onNext={onNext}
          onEnd={onEnd}
          disabled={isWaiting}
        />
        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className={micEnabled ? 'text-emerald-400' : 'text-rose-400'}>
            Mic {micEnabled ? 'on' : 'off'}
          </span>
          <span className={cameraEnabled ? 'text-emerald-400' : 'text-rose-400'}>
            Camera {cameraEnabled ? 'on' : 'off'}
          </span>
          <span className="text-slate-600">P2P encrypted</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ callState }: { callState: CallState }) {
  let text = '';
  let color = 'bg-slate-800 text-slate-300';

  switch (callState) {
    case 'REQUESTING_MEDIA':
      text = 'Accessing camera...';
      color = 'bg-sky-500/20 text-sky-300';
      break;
    case 'WAITING':
      text = 'Finding someone...';
      color = 'bg-sky-500/20 text-sky-300';
      break;
    case 'MATCHED':
    case 'CONNECTING':
      text = 'Connecting...';
      color = 'bg-amber-500/20 text-amber-300';
      break;
    case 'CONNECTED':
      text = 'Connected';
      color = 'bg-emerald-500/20 text-emerald-300';
      break;
    case 'ENDED':
      text = 'Call ended';
      color = 'bg-rose-500/20 text-rose-300';
      break;
    default:
      text = '';
  }

  if (!text) return null;

  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold backdrop-blur ${color}`}>
      {(callState === 'WAITING' || callState === 'REQUESTING_MEDIA') && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {callState === 'CONNECTED' && <Home className="h-3 w-3" />}
      {text}
    </div>
  );
}

function WaitingContent() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/30" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/20">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        </div>
      </div>
      <p className="text-lg font-semibold text-slate-300">Finding someone...</p>
      <p className="text-sm text-slate-500">Looking for another JIIT student online</p>
    </div>
  );
}

function ConnectingContent() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      <p className="text-lg font-semibold text-slate-300">Connecting video...</p>
      <p className="text-sm text-slate-500">Establishing peer connection</p>
    </div>
  );
}
