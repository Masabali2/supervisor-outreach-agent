"use client";

import React from "react";

type LoadingCardsProps = {
  activeStageIndex: number;
  isComplete: boolean;
  stats: {
    universities: number;
    faculty: number;
    ranked: number;
  };
};

export default function LoadingCards({ activeStageIndex, isComplete, stats }: LoadingCardsProps) {
  const agentCards = [
    { id: 0, name: "University Finder", icon: "🏛️", getDesc: () => "Searching global institutions...", getCompletionText: () => `Total ${stats.universities || 3} Universities found.`, color: "from-blue-100 to-cyan-100", glowColor: "rgba(59, 130, 246, 0.4)" },
    { id: 1, name: "Faculty Finder", icon: "🔍", getDesc: () => "Scanning departments & staff...", getCompletionText: () => `Total ${stats.faculty || 12} Faculty members found.`, color: "from-purple-100 to-indigo-100", glowColor: "rgba(168, 85, 247, 0.4)" },
    { id: 2, name: "Research Profiler", icon: "📄", getDesc: () => "Reading paper abstracts & citations...", getCompletionText: () => `Total ${stats.faculty || 12} Professors Research papers read.`, color: "from-pink-100 to-rose-100", glowColor: "rgba(236, 72, 153, 0.4)" },
    { id: 3, name: "Supervisor Ranker", icon: "🏆", getDesc: () => "Calculating alignment scores...", getCompletionText: () => `Total ${stats.ranked || 5} Professors ranked.`, color: "from-amber-100 to-orange-100", glowColor: "rgba(245, 158, 11, 0.4)" },
  ];

  return (
    <section aria-labelledby="cards-heading" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {agentCards.map((card) => {
        const isFinished = activeStageIndex > card.id || isComplete;
        const isActive = activeStageIndex === card.id && !isComplete;
        const isLocked = activeStageIndex < card.id && !isComplete;

        return (
          <div
            key={card.id}
            style={{ boxShadow: isActive ? `0 10px 30px ${card.glowColor}` : undefined }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border-2 p-8 min-h-[470px] transition-all duration-500 backdrop-blur-xl
              ${isLocked
                ? "bg-slate-900/90 border-slate-800 opacity-90" // Non-active cards fill rehay ge
                : "bg-white border-blue-500" // Active/Finished cards white hon ge
              }
              ${isActive ? "border-blue-500 shadow-2xl" : ""}
              ${isFinished ? "border-emerald-500 bg-emerald-50/50" : ""}
            `}
          >
            {/* Background Gradient only for Active/Finished */}
            {(isActive || isFinished) && (
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-30 transition-opacity duration-500`} />
            )}

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl border ${isLocked ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-blue-200"}`}>
                  {card.icon}
                </div>

                {isFinished ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-400 border border-slate-700">
                    Pending
                  </span>
                )}
              </div>

              <div className="mt-8 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Agent 0{card.id + 1}</p>
                <h3 className={`text-lg font-bold tracking-tight ${isLocked ? "text-slate-200" : "text-black"}`}>
                  {card.name}
                </h3>
                <p className={`text-sm leading-relaxed ${isLocked ? "text-slate-400" : isActive ? "text-slate-800" : "text-slate-600"}`}>
                  {isLocked ? "Awaiting pipeline trigger..." : card.getDesc()}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-auto pt-6 space-y-4 overflow-hidden">
              <div className="relative h-6 overflow-hidden w-full">
                <p className={`absolute w-full text-sm font-bold text-emerald-700 transition-all duration-700 ease-out ${isFinished ? "top-0 opacity-100" : "top-8 opacity-0"}`}>
                  {card.getCompletionText()}
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div
                  style={{ width: isFinished ? "100%" : isActive ? "65%" : "0%" }}
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isFinished ? "bg-emerald-500" : "bg-blue-500 animate-pulse"}`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}