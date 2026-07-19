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
    {
      id: 0,
      name: "University Finder",
      icon: "🏛️",
      getDesc: () => "Searching global institutions...",
      getCompletionText: () => `Total ${stats.universities || 3} Universities found.`,
      color: "from-blue-500/10 to-cyan-500/10",
      glowColor: "rgba(59, 130, 246, 0.15)",
    },
    {
      id: 1,
      name: "Faculty Finder",
      icon: "🔍",
      getDesc: () => "Scanning departments & staff...",
      getCompletionText: () => `Total ${stats.faculty || 12} Faculty members found.`,
      color: "from-purple-500/10 to-indigo-500/10",
      glowColor: "rgba(168, 85, 247, 0.15)",
    },
    {
      id: 2,
      name: "Research Profiler",
      icon: "📄",
      getDesc: () => "Reading paper abstracts & citations...",
      getCompletionText: () => `Total ${stats.faculty || 12} Professors Research papers read.`,
      color: "from-pink-500/10 to-rose-500/10",
      glowColor: "rgba(236, 72, 153, 0.15)",
    },
    {
      id: 3,
      name: "Supervisor Ranker",
      icon: "🏆",
      getDesc: () => "Calculating alignment scores...",
      getCompletionText: () => `Total ${stats.ranked || 5} Professors ranked.`,
      color: "from-amber-500/10 to-orange-500/10",
      glowColor: "rgba(245, 158, 11, 0.15)",
    },
  ];

  return (
    <section aria-labelledby="cards-heading" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <h2 id="cards-heading" className="sr-only">
        Agent Status Cards
      </h2>

      {agentCards.map((card) => {
        const isFinished = activeStageIndex > card.id || isComplete;
        const isActive = activeStageIndex === card.id && !isComplete;
        const isLocked = activeStageIndex < card.id && !isComplete;

        return (
          <div
            key={card.id}
            style={{
              boxShadow: isActive ? `0 20px 40px ${card.glowColor}` : undefined
            }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border p-6 min-h-[340px] transition-all duration-500 bg-slate-950/80 backdrop-blur-xl
              ${isLocked ? "opacity-30 blur-[0.5px] scale-98" : "opacity-100 scale-100"}
              ${isActive ? "border-primary shadow-2xl scale-102" : "border-slate-800/80"}
              ${isFinished ? "border-emerald-500/40 bg-emerald-950/5 shadow-[0_10px_30px_rgba(16,185,129,0.05)]" : ""}
            `}
          >
            {/* Background Mesh Gradient */}
            {(isActive || isFinished) && (
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-40 transition-opacity duration-500`} />
            )}

            {/* Top Section */}
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl bg-slate-900 border border-slate-800">
                  {card.icon}
                </div>

                {isFinished ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Ready
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-800">
                    Pending
                  </span>
                )}
              </div>

              <div className="mt-8 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Agent 0{card.id + 1}
                </p>
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {card.name}
                </h3>

                {/* Standard Description State */}
                <p className={`text-sm leading-relaxed transition-all duration-300 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                  {isLocked ? "Awaiting pipeline trigger..." : card.getDesc()}
                </p>
              </div>
            </div>

            {/* Bottom Section: Progress Bar & Slide-Up Dynamic Content */}
            <div className="relative z-10 mt-auto pt-6 space-y-4 overflow-hidden">

              {/* 🛠️ UNIQUE DESIGN: Text travelling up from box end on execution success */}
              <div className="relative h-6 overflow-hidden w-full">
                <p
                  className={`absolute w-full text-sm font-semibold text-emerald-400 transition-all duration-700 ease-out
                    ${isFinished
                      ? "top-0 opacity-100 transform translate-y-0"
                      : "top-8 opacity-0 transform translate-y-4"
                    }
                  `}
                >
                  {card.getCompletionText()}
                </p>
              </div>

              {/* Status Indicator Loading Line */}
              <div className="h-1.5 w-full rounded-full bg-slate-900 border border-slate-800/50 overflow-hidden">
                <div
                  style={{ width: isFinished ? "100%" : isActive ? "65%" : "0%" }}
                  className={`h-full rounded-full transition-all duration-1000 ease-out
                    ${isFinished ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"}
                  `}
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}