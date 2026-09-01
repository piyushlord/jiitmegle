import { useEffect, useRef } from 'react';

type VideoTileProps = {
  stream: MediaStream | null;
  className?: string;
  mirrored?: boolean;
  placeholder?: React.ReactNode;
};

export function VideoTile({ stream, className = '', mirrored = false, placeholder }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        // autoplay can fail if not user-activated; muted video usually plays
      });
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />
      {!stream && placeholder}
    </div>
  );
}
