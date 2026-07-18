"use client";

type LoadingStepsProps = {
  stages: readonly { title: string }[];
  activeStageIndex: number;
};

export default function LoadingSteps({ stages, activeStageIndex }: LoadingStepsProps) {
  return (
    <section
      aria-labelledby="stages-heading"
      className="w-full max-w-2xl rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.38)] backdrop-blur-xl transition-all duration-300 sm:p-7"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            AI processing stages
          </p>
          <h2 id="stages-heading" className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {stages[activeStageIndex]?.title}
          </h2>
        </div>
        <span className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-slate-700/60">
          Stage {activeStageIndex + 1} of {stages.length}
        </span>
      </div>

      <div className="grid gap-3" role="list" aria-label="Loading stages">
        {stages.map((stage, index) => {
          const isComplete = index < activeStageIndex;
          const isActive = index === activeStageIndex;

          return (
            <div
              key={stage.title}
              role="listitem"
              className={`group flex items-center gap-4 rounded-3xl border px-4 py-4 transition duration-300 ${
                isActive
                  ? "border-indigo-500/50 bg-slate-900/80 shadow-[0_0_40px_rgba(99,102,241,0.18)]"
                  : "border-slate-800/80 bg-slate-950/80 hover:-translate-y-0.5 hover:border-slate-700"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold ${
                  isComplete
                    ? "bg-emerald-500/15 text-emerald-400"
                    : isActive
                    ? "animate-pulse bg-indigo-500/15 text-indigo-300"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {isComplete ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              <div className="min-w-0">
                <p className={`text-sm font-medium ${isActive ? "text-white" : "text-slate-300"}`}>
                  {stage.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {isComplete && "Completed"}
                  {isActive && "In progress"}
                  {!isActive && !isComplete && "Pending"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .animate-pulse {
          animation: pulse 1.7s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.88; }
        }
      `}</style>
    </section>
  );
}
