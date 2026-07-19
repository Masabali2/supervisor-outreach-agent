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
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6 lg:px-12">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl animate-spin-slow" />
        <div className="absolute -bottom-16 right-16 h-80 w-80 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl animate-spin-reverse-slow" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* 🛠️ UPDATED: Glowing blue border and shadow */}
        <section className="relative z-10 overflow-hidden rounded-[2rem] border-2 border-purple-500 bg-white px-5 py-3 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center justify-items-end w-full">

            {/* LEFT SIDE: Content */}
            <div className="space-y-2 text-center lg:text-left w-full">
              {/* 🛠️ UPDATED: Multi-color spinning icon */}
              <div className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200">
                  <div className="h-4 w-4 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 border-b-pink-500 border-l-amber-500 animate-spin" />
                </div>
              </div>

              {/* Headings */}
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Supervisor Outreach Agent Pipeline
                </p>
                <h1 className="text-xl font-bold tracking-tight text-black sm:text-2xl">
                  Finding Your Perfect Research Supervisor
                </h1>
                <p className="max-w-xl text-xs leading-normal text-slate-500">
                  Real-time synchronization active. Progress updates stream directly from executing agent kernels.
                </p>

                {requestError && (
                  <div className="rounded-lg border border-red-500 bg-red-50 p-2 text-xs text-red-600 mt-1">
                    <p className="font-medium">{requestError}</p>
                    <button type="button" className="mt-1 font-semibold text-black underline hover:opacity-80" onClick={() => router.replace("/")}>
                      Return to search
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Live Status */}
            <div className="w-full max-w-2xl lg:pl-4">
              <TypingStatus />
            </div>

          </div>
        </section>

        {/* Bottom Dashboard Grid Layout */}
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-4">
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