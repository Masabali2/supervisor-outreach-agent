"use client";

const cards = [
  "Professor A",
  "Professor B",
  "Professor C",
  "Professor D",
] as const;

export default function LoadingCards() {
  return (
    <section aria-labelledby="cards-heading" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <h2 id="cards-heading" className="sr-only">
        Professor previews loading
      </h2>

      {cards.map((card) => (
        <div
          key={card}
          className="group overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(15,23,42,0.45)]"
          aria-label={`${card} loading card`}
        >
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-800/70">
              <div className="absolute inset-0 animate-skeleton rounded-full bg-slate-700/60" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-3/4 rounded-full bg-slate-800/70">
                <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
              </div>
              <div className="h-3 rounded-full w-1/2 bg-slate-800/70">
                <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-3 rounded-full bg-slate-800/70">
              <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
            </div>
            <div className="h-3 rounded-full w-5/6 bg-slate-800/70">
              <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
            </div>
            <div className="h-3 rounded-full w-2/3 bg-slate-800/70">
              <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="h-8 min-w-[6rem] rounded-full bg-slate-800/70 px-3 py-2">
              <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="h-8 min-w-[4rem] rounded-full bg-slate-800/70 px-3 py-2">
                <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
              </span>
              <span className="h-8 min-w-[4rem] rounded-full bg-slate-800/70 px-3 py-2">
                <div className="h-full w-full animate-skeleton rounded-full bg-slate-700/60" />
              </span>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .animate-skeleton {
          position: relative;
          overflow: hidden;
        }

        .animate-skeleton::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          animation: shimmer 1.6s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
