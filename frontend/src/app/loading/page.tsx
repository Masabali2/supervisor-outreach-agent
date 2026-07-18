import React, { useEffect,useMemo, useState } from "react";
import ProgressBar from "@/components/loading/ProgressBar";
import LoadingSteps from "@/components/loading/LoadingSteps";
import LoadingCards from "@/components/loading/LoadingCards";
import TypingStatus from "@/components/loading/TypingStatus";

type StageDefinition = {
  title: string;
  target: number;
  messages: readonly [string, string];
};

type ProgressPayload = {
  progress: number;
  stageIndex: number;
  status: string;
  estimatedSeconds: number;
};

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    title: "Searching Universities",
    target: 25,
    messages: ["Searching universities in Canada...", "Found 24 universities"],
  },
  {
    title: "Finding Faculty Members",
    target: 60,
    messages: ["Scanning faculty directories...", "Locating candidate researchers"],
  },
  {
    title: "Analyzing Research Profiles",
    target: 85,
    messages: ["Reading professor profiles...", "Analyzing publications..."],
  },
  {
    title: "Ranking Best Supervisor Matches",
    target: 100,
    messages: ["Ranking supervisor compatibility...", "Finalizing match score"],
  },
];

const getNextStep = (current: number, target: number) => {
  const remaining = target - current;
  if (remaining <= 0) {
    return 0;
  }

  if (remaining <= 5) {
    return 1;
  }

  if (remaining <= 15) {
    return 2;
  }

  return Math.min(8, Math.max(2, Math.round(remaining / 7)));
};

const createInitialPayload = (): ProgressPayload => ({
  progress: 0,
  stageIndex: 0,
  status: STAGE_DEFINITIONS[0].messages[0],
  estimatedSeconds: 18,
});

export default function LoadingPage() {
  const [progressPayload, setProgressPayload] = useState<ProgressPayload>(createInitialPayload);

  useEffect(() => {
   let timeout: number | undefined;

    if (progressPayload.progress >= 100) {
      return;
    }

    const currentStage = STAGE_DEFINITIONS[progressPayload.stageIndex];

    if (progressPayload.progress >= currentStage.target) {
      if (progressPayload.stageIndex < STAGE_DEFINITIONS.length - 1) {
        timeout = window.setTimeout(() => {
          setProgressPayload((prev) => ({
            ...prev,
            stageIndex: prev.stageIndex + 1,
            status: STAGE_DEFINITIONS[prev.stageIndex + 1].messages[0],
          }));
        }, 900);
      }
    } else {
      const step = getNextStep(progressPayload.progress, currentStage.target);
      const nextProgress = Math.min(currentStage.target, progressPayload.progress + step);
      const progressRatio = nextProgress / currentStage.target;
      const nextStatus = progressRatio > 0.55 ? currentStage.messages[1] : currentStage.messages[0];

      timeout = window.setTimeout(() => {
        setProgressPayload((prev) => ({
          ...prev,
          progress: nextProgress,
          status: nextStatus,
        }));
      }, 140 + Math.max(0, 120 - step * 10));
    }

    return () => clearTimeout(timeout);
  }, [progressPayload]);

  useEffect(() => {
    if (progressPayload.progress >= 100) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgressPayload((prev) => ({
        ...prev,
        estimatedSeconds: Math.max(prev.estimatedSeconds - 1, 0),
      }));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [progressPayload.progress]);

  const progressState = useMemo(
    () => ({
      progress: progressPayload.progress,
      stageIndex: progressPayload.stageIndex,
      status: progressPayload.status,
      estimatedSeconds: progressPayload.estimatedSeconds,
    }),
    [progressPayload.progress, progressPayload.stageIndex, progressPayload.status, progressPayload.estimatedSeconds]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl animate-spin-slow" />
        <div className="absolute -bottom-16 right-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl animate-spin-reverse-slow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_30%)]" />
        <div className="absolute inset-x-0 top-1/2 h-24 bg-gradient-to-r from-transparent via-slate-800/25 to-transparent blur-2xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12">
        <section className="relative z-10 overflow-hidden rounded-[2.5rem] border border-slate-800/70 bg-slate-950/85 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur-2xl sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center justify-center rounded-[2.5rem] border border-indigo-500/20 bg-slate-900/70 px-5 py-4 shadow-[0_0_0_1px_rgba(99,102,241,0.1)] backdrop-blur-sm">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950/95 ring-1 ring-slate-700/60">
                  <div className="absolute inset-0 rounded-3xl bg-indigo-500/15 blur-2xl" />
                  <svg className="relative h-8 w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.122 2.121M18.364 18.364l-2.121-2.121M8.757 8.757L6.636 6.636" />
                  </svg>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-indigo-300">
                  Intelligent assistant booting
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Finding Your Perfect Research Supervisor
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
                  Our AI is discovering universities, analyzing faculty research, and ranking the best supervisor matches for you.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <TypingStatus />
            </div>
          </div>
        </section>

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <ProgressBar
              progress={progressState.progress}
              statusMessage={progressState.status}
              estimatedSeconds={progressState.estimatedSeconds}
            />
            <LoadingSteps stages={STAGE_DEFINITIONS} activeStageIndex={progressState.stageIndex} />
          </div>

          <LoadingCards />
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 22s linear infinite;
        }

        .animate-spin-reverse-slow {
          animation: spin-slow 28s linear infinite reverse;
        }
      `}</style>
    </main>
  );
}
