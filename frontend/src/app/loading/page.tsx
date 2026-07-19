"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressBar from "@/components/loading/ProgressBar";
import LoadingSteps from "@/components/loading/LoadingSteps";
import LoadingCards from "@/components/loading/LoadingCards";
import TypingStatus from "@/components/loading/TypingStatus";

type StageDefinition = {
  title: string;
  target: number;
};

type ProgressPayload = {
  progress: number;
  stageIndex: number;
  status: string;
};

const STAGE_DEFINITIONS: StageDefinition[] = [
  { title: "University Finder Agent", target: 25 },
  { title: "Faculty Finder Agent", target: 60 },
  { title: "Research Profiler Agent", target: 85 },
  { title: "Supervisor Ranker Agent", target: 95 },
];

const createInitialPayload = (): ProgressPayload => ({
  progress: 0,
  stageIndex: 0,
  status: "Connecting to Multi-Agent Pipeline...",
});

export default function LoadingPage() {
  const [progressPayload, setProgressPayload] = useState<ProgressPayload>(createInitialPayload);
  const [requestError, setRequestError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // 🛠️ FIX: Initialized pipeline analytics state to forward stats to LoadingCards component
  const [pipelineData, setPipelineData] = useState({
    universities: 0,
    faculty: 0,
    ranked: 0,
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  const hasFired = useRef(false);

  const country = searchParams.get("country")?.trim() ?? "";
  const region = searchParams.get("region")?.trim() ?? "";
  const degree = searchParams.get("degree") ?? "";
  const field = searchParams.get("field")?.trim() ?? "";

  useEffect(() => {
    if (!country || !field || (degree !== "Masters" && degree !== "PhD")) {
      router.replace("/");
      return;
    }

    if (hasFired.current) return;
    hasFired.current = true;

    const runStreamingSearch = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, region, degree, field }),
          }
        );

        if (response.status === 409) {
          throw new Error("A search pipeline execution is already active in another session. Please wait.");
        }

        if (!response.ok) {
          throw new Error("Failed to initialize system runtime pipeline.");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        if (!reader) throw new Error("Readable stream pipeline is unavailable.");

        let chunkBuffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          chunkBuffer += decoder.decode(value, { stream: true });
          const streamLines = chunkBuffer.split("\n\n");

          chunkBuffer = streamLines.pop() ?? "";

          for (const rawLine of streamLines) {
            if (rawLine.startsWith("data: ")) {
              const cleanData = rawLine.replace("data: ", "").trim();
              const payload = JSON.parse(cleanData);

              if (payload.error) {
                throw new Error(payload.error);
              }

              // 🛠️ FIX: Live stream state capture mechanism to pipe metrics into state fields
              if (payload.universities !== undefined || payload.faculty !== undefined || payload.ranked !== undefined) {
                setPipelineData((prev) => ({
                  ...prev,
                  universities: payload.universities ?? prev.universities,
                  faculty: payload.faculty ?? prev.faculty,
                  ranked: payload.ranked ?? prev.ranked,
                }));
              }

              if (payload.complete) {
                setIsComplete(true);
                setProgressPayload({
                  progress: 100,
                  stageIndex: 3,
                  status: `Found ${payload.ranked ?? 0} supervisor matches across ${payload.universities ?? 0} universities!`,
                });
                window.setTimeout(() => router.replace("/results"), 800);
                return;
              }

              setProgressPayload({
                progress: typeof payload.progress === "number" ? payload.progress : 0,
                stageIndex: typeof payload.stage_index === "number" ? payload.stage_index : 0,
                status: payload.status ?? "Processing pipeline payload...",
              });
            }
          }
        }
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "The execution pipeline aborted unexpectedly.");
      }
    };

    void runStreamingSearch();
    return () => {};
  }, [country, degree, field, region, router]);

  const progressState = useMemo(() => {
    const rawIndex = progressPayload.stageIndex;
    const cleanIndex = typeof rawIndex === "number" && !Number.isNaN(rawIndex) ? rawIndex : 0;

    return {
      progress: typeof progressPayload.progress === "number" ? progressPayload.progress : 0,
      stageIndex: Math.min(Math.max(cleanIndex, 0), STAGE_DEFINITIONS.length - 1),
      status: progressPayload.status || "Processing...",
    };
  }, [progressPayload]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-12 text-foreground sm:px-6 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl animate-spin-slow" />
        <div className="absolute -bottom-16 right-16 h-80 w-80 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl animate-spin-reverse-slow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--muted),_transparent_40%)] opacity-40" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12">
        <section className="relative z-10 overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-sm backdrop-blur-md sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-muted/60 px-4 py-4 shadow-sm">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-background border border-border">
                  <svg className="relative h-6 w-6 text-muted-foreground animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.122 2.121M18.364 18.364l-2.121-2.121M8.757 8.757L6.636 6.636" />
                  </svg>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Supervisor Outreach Agent Pipeline
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Finding Your Perfect Research Supervisor
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Real-time synchronization active. Progress updates stream directly from executing agent kernels.
                </p>

                {requestError && (
                  <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-medium">{requestError}</p>
                    <button type="button" className="mt-3 font-semibold text-foreground underline hover:opacity-80" onClick={() => router.replace("/")}>
                      Return to search
                    </button>
                  </div>
                )}
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
            />
            <LoadingSteps
              stages={STAGE_DEFINITIONS}
              activeStageIndex={progressState.stageIndex}
            />
          </div>

          <LoadingCards
            activeStageIndex={progressState.stageIndex}
            isComplete={isComplete}
            stats={pipelineData}
          />
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