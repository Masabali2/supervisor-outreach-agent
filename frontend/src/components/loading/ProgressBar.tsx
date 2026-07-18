"use client";

type ProgressBarProps = {
  progress: number;
  statusMessage: string;
  estimatedSeconds: number;
};

export default function ProgressBar({ progress, statusMessage, estimatedSeconds }: ProgressBarProps) {
  return (
    <section
      aria-labelledby="progress-heading"
      className="w-full max-w-2xl rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.4)] backdrop-blur-xl transition-all duration-300 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            AI progress
          </p>
          <h2 id="progress-heading" className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Searching supervisor matches
          </h2>
        </div>
        <div className="inline-flex items-center justify-center rounded-full bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-100 ring-1 ring-slate-700/70">
          {progress}%
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/80 p-1">
        <div
          className="relative h-5 overflow-hidden rounded-3xl bg-slate-950/90"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Supervisor search progress"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 shadow-[0_0_40px_rgba(99,102,241,0.25)] transition-all duration-1000 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06),rgba(255,255,255,0.12))] opacity-40" />
          <div className="absolute inset-y-0 left-0 w-full motion-safe:animate-shimmer opacity-50" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-400" aria-live="polite">
          {statusMessage}
        </p>
        <p className="text-sm font-medium text-slate-200">
          Estimated time remaining: {estimatedSeconds}s
        </p>
      </div>

      <style jsx>{`
        .animate-shimmer {
          animation: shimmer 2.2s linear infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
