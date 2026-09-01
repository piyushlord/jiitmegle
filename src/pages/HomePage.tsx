import { Video, Mic, SkipForward, ShieldCheck, Users, Sparkles } from 'lucide-react';

type HomePageProps = {
  onConnect: () => void;
  cameraError: string | null;
};

export function HomePage({ onConnect, cameraError }: HomePageProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          JIIT students only
        </div>

        {/* logo */}
        <h1 className="bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          JIITMEGLE
        </h1>

        <p className="mt-4 text-xl font-semibold text-slate-100 sm:text-2xl">
          Meet someone from JIIT.
        </p>
        <p className="mt-2 max-w-md text-sm text-slate-400 sm:text-base">
          Random video conversations with fellow students.
        </p>

        {/* connect button */}
        <button
          onClick={onConnect}
          className="group mt-10 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-12 py-4 text-lg font-bold text-white shadow-xl shadow-sky-500/30 transition hover:shadow-sky-400/50 hover:brightness-110 active:scale-[0.98]"
        >
          CONNECT
          <span className="inline-block transition group-hover:translate-x-1">→</span>
        </button>

        {cameraError && (
          <div className="mt-6 max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-300">
            {cameraError}
          </div>
        )}

        {/* feature pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <FeaturePill icon={<Video className="h-4 w-4" />} label="Video" />
          <FeaturePill icon={<Mic className="h-4 w-4" />} label="Voice" />
          <FeaturePill icon={<SkipForward className="h-4 w-4" />} label="Next" />
          <FeaturePill icon={<ShieldCheck className="h-4 w-4" />} label="Private P2P" />
        </div>

        {/* privacy + safety */}
        <div className="mt-10 flex max-w-lg flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Your video and audio are not recorded.
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 text-left text-xs leading-relaxed text-slate-500 backdrop-blur">
            <p className="mb-1 font-semibold text-slate-400">Safety Notice</p>
            Be respectful. Do not share personal information. Report inappropriate behavior by ending
            the call immediately. This platform connects you with random JIIT students — exercise
            caution as you would with any stranger.
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
            <Users className="h-3.5 w-3.5" />
            You'll be matched with another online student.
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur">
      {icon}
      {label}
    </div>
  );
}
