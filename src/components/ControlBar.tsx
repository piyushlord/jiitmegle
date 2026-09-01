import { Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff } from 'lucide-react';

type ControlBarProps = {
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onNext: () => void;
  onEnd: () => void;
  disabled?: boolean;
};

export function ControlBar({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onNext,
  onEnd,
  disabled = false,
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <ControlButton
        active={micEnabled}
        onClick={onToggleMic}
        disabled={disabled}
        label={micEnabled ? 'Mute' : 'Unmute'}
        activeIcon={<Mic className="h-5 w-5" />}
        inactiveIcon={<MicOff className="h-5 w-5" />}
      />

      <ControlButton
        active={cameraEnabled}
        onClick={onToggleCamera}
        disabled={disabled}
        label={cameraEnabled ? 'Camera Off' : 'Camera On'}
        activeIcon={<Video className="h-5 w-5" />}
        inactiveIcon={<VideoOff className="h-5 w-5" />}
      />

      <button
        onClick={onNext}
        disabled={disabled}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 hover:shadow-sky-400/40 active:scale-95 disabled:opacity-40 disabled:hover:bg-sky-500 sm:h-16 sm:w-16"
        aria-label="Next"
      >
        <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <button
        onClick={onEnd}
        disabled={disabled}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-400 active:scale-95 disabled:opacity-40 sm:h-16 sm:w-16"
        aria-label="End call"
      >
        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
}

type ControlButtonProps = {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
};

function ControlButton({
  active,
  onClick,
  disabled = false,
  label,
  activeIcon,
  inactiveIcon,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-95 disabled:opacity-40 sm:h-16 sm:w-16 ${
        active
          ? 'bg-slate-700 text-white shadow-black/30 hover:bg-slate-600'
          : 'bg-rose-500/90 text-white shadow-rose-500/30 hover:bg-rose-500'
      }`}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}
