"use client";

import React from "react";

type LoadingStepsProps = {
  stages: readonly { title: string }[];
  activeStageIndex: number;
};

export default function LoadingSteps({ stages, activeStageIndex }: LoadingStepsProps) {
  return (
    <section
      aria-labelledby="stages-heading"
      className="w-full max-w-2xl rounded-2xl border-2 border-blue-500 bg-white p-6 shadow-[0_10px_30px_rgba(59,130,246,0.2)] backdrop-blur-xl transition-all duration-300"
    >
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">
            AI processing stages
          </p>
          <h2 id="stages-heading" className="mt-0.5 text-sm font-semibold text-black leading-tight">
            {stages[activeStageIndex]?.title}
          </h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-300 shrink-0">
          Stage {activeStageIndex + 1} of {stages.length}
        </span>
      </div>

      <div className="grid gap-1" role="list" aria-label="Loading stages">
        {stages.map((stage, index) => {
          const isComplete = index < activeStageIndex;
          const isActive = index === activeStageIndex;
          const isPending = index > activeStageIndex;

          return (
            <div
              key={stage.title}
              role="listitem"
              className={`group flex items-center gap-3 rounded-lg border px-2.5 py-3.5 transition duration-300 ${
                isActive
                  ? "border-blue-500 bg-blue-50/50 shadow-sm"
                  : isComplete
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-slate-800 bg-slate-900/90" // 🛠️ PENDING: LoadingCards jaisa dark style
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : isActive
                    ? "animate-pulse bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-slate-800 text-slate-500 border border-slate-700" // 🛠️ PENDING Icon style
                }`}
              >
                {isComplete ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-semibold">{index + 1}</span>
                )}
              </div>

              <div className="min-w-0 leading-tight">
                <p className={`text-[15px] font-semibold ${isPending ? "text-slate-200" : isActive ? "text-blue-900" : "text-black"}`}>
                  {stage.title}
                </p>
                <p className={`text-[12px] ${isPending ? "text-slate-400" : isComplete ? "text-emerald-700" : "text-blue-600"}`}>
                  {isComplete && "Completed"}
                  {isActive && "In progress"}
                  {isPending && "Pending"}
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