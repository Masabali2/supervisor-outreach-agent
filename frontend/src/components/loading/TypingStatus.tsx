"use client";

import { useEffect, useState } from "react";

const phrases = [
  "Searching university websites...",
  "Finding professors...",
  "Reading faculty profiles...",
  "Analyzing publications...",
  "Ranking supervisor matches...",
] as const;

export default function TypingStatus() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const isComplete = displayText === currentPhrase;
    const isCleared = displayText === "";

    const timeout = setTimeout(() => {
      if (isComplete && !isDeleting) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && isCleared) {
        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % phrases.length);
        return;
      }

      setDisplayText((current) => {
        if (isDeleting) {
          return current.slice(0, -1);
        }
        return current + currentPhrase.charAt(current.length);
      });
    }, isComplete ? 1000 : isDeleting ? 45 : 75);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <section className="w-full rounded-[2rem] border-2 border-blue-500 bg-white p-3.5 shadow-[0_10px_30px_rgba(59,130,246,0.3)] backdrop-blur-xl transition duration-300 sm:p-4.5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Live AI status
            </p>
            <p className="mt-1 text-lg font-semibold text-black sm:text-xl">
              Intelligent supervisor discovery
            </p>
          </div>
          <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-300">
            Typing...
          </span>
        </div>

        {/* Status Box: White fill, black outline */}
        <div className="overflow-hidden rounded-3xl border-2 border-black bg-white px-5 py-6">
          <p className="min-h-[3rem] text-base font-medium leading-8 text-black sm:text-lg" aria-live="polite">
            {displayText}
            <span className="ml-1 inline-block h-6 w-1 rounded bg-black align-middle animate-cursor-blink" />
          </p>
        </div>
      </div>

      <style jsx>{`
        .animate-cursor-blink {
          animation: blink 1.1s step-end infinite;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}