"use client";

import { useEffect, useRef, useState } from "react";

import SearchForm from "@/components/forms/SearchForm";

const featureHighlights = [
  "University Search",
  "Faculty Discovery",
  "Research Analysis",
  "AI Ranking",
];

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const mouseGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsVisible(true));

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const heroElement = heroRef.current;
    const mouseGlowElement = mouseGlowRef.current;

    if (!heroElement || !mouseGlowElement) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const restingPosition = { x: 50, y: 42 };
    const currentPosition = { ...restingPosition };
    const targetPosition = { ...restingPosition };
    let animationFrame: number | null = null;

    const renderGlow = () => {
      currentPosition.x += (targetPosition.x - currentPosition.x) * 0.16;
      currentPosition.y += (targetPosition.y - currentPosition.y) * 0.16;

      mouseGlowElement.style.setProperty("--mouse-x", `${currentPosition.x}%`);
      mouseGlowElement.style.setProperty("--mouse-y", `${currentPosition.y}%`);

      const hasReachedTarget =
        Math.abs(targetPosition.x - currentPosition.x) < 0.05 &&
        Math.abs(targetPosition.y - currentPosition.y) < 0.05;

      animationFrame = hasReachedTarget ? null : window.requestAnimationFrame(renderGlow);
    };

    const queueGlowUpdate = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(renderGlow);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!desktopQuery.matches || event.pointerType === "touch") {
        return;
      }

      const bounds = heroElement.getBoundingClientRect();
      targetPosition.x = ((event.clientX - bounds.left) / bounds.width) * 100;
      targetPosition.y = ((event.clientY - bounds.top) / bounds.height) * 100;
      queueGlowUpdate();
    };

    const resetGlow = () => {
      targetPosition.x = restingPosition.x;
      targetPosition.y = restingPosition.y;
      queueGlowUpdate();
    };

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches && animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    heroElement.addEventListener("pointermove", handlePointerMove, { passive: true });
    heroElement.addEventListener("pointerleave", resetGlow);
    desktopQuery.addEventListener("change", handleViewportChange);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      heroElement.removeEventListener("pointermove", handlePointerMove);
      heroElement.removeEventListener("pointerleave", resetGlow);
      desktopQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  return (
    <section
      id="about"
      ref={heroRef}
      className="relative isolate overflow-hidden bg-slate-50 py-24 sm:py-28 lg:py-32 xl:py-36"
      aria-labelledby="hero-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(224,231,255,0.9),transparent_42%),linear-gradient(to_bottom,#ffffff,#f8fafc)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span className="aurora aurora-one" />
        <span className="aurora aurora-two" />
        <span className="aurora aurora-three" />
      </div>
      <div ref={mouseGlowRef} aria-hidden="true" className="mouse-glow pointer-events-none absolute inset-0 z-[2] hidden md:block" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-slate-50 to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <div
            className={`transition-all delay-75 duration-700 ease-out ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/75 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-violet-700 shadow-sm backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" />
              AI-Powered Research Supervisor Discovery
            </span>
          </div>

          <h1
            id="hero-heading"
            className={`mt-7 text-[clamp(2rem,9.5vw,3.75rem)] font-bold leading-[0.99] tracking-[-0.065em] text-slate-950 transition-all delay-150 duration-700 ease-out sm:text-6xl md:text-7xl lg:text-[5.5rem] lg:leading-[0.98] ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <span className="block">Find Your Ideal</span>
            <span className="block">Research Supervisor</span>
            <span className="block bg-gradient-to-r from-violet-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
              with AI
            </span>
          </h1>

          <p
            className={`mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 transition-all delay-300 duration-700 ease-out sm:text-lg sm:leading-8 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            Discover universities, analyze faculty research, and get ranked supervisor
            recommendations tailored to your Master&apos;s or PhD profile.
          </p>

          <div
            id="search"
            className={`mx-auto mt-10 w-full max-w-5xl scroll-mt-20 transition-all delay-[450ms] duration-700 ease-out sm:mt-12 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <div className="rounded-[2rem] border border-white/80 bg-white/35 p-1.5 shadow-[0_30px_90px_-34px_rgba(79,70,229,0.35)] backdrop-blur-xl sm:p-2">
              <SearchForm />
            </div>
          </div>
        </div>

        <ul
          className={`mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 transition-all delay-[600ms] duration-700 ease-out sm:mt-16 sm:gap-4 lg:grid-cols-4 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          }`}
          aria-label="SupervisorAI capabilities"
        >
          {featureHighlights.map((feature, index) => (
            <li key={feature}>
              <div className="group flex h-full min-h-[82px] items-center gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-4 text-left shadow-[0_12px_28px_-20px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-200 hover:bg-white hover:shadow-[0_18px_32px_-18px_rgba(79,70,229,0.25)]">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-xs font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                >
                  0{index + 1}
                </span>
                <span className="text-sm font-semibold leading-5 text-slate-800">{feature}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .aurora {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
          opacity: 0.2;
          will-change: transform;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }

        .aurora-one {
          top: -12%;
          left: -22%;
          width: 78%;
          height: 38%;
          background: linear-gradient(100deg, #8b5cf6 0%, #3b82f6 52%, #22d3ee 100%);
          animation-name: aurora-one;
          animation-duration: 26s;
          animation-delay: -8s;
        }

        .aurora-two {
          top: 28%;
          right: -26%;
          width: 74%;
          height: 34%;
          background: linear-gradient(110deg, #22d3ee 0%, #3b82f6 48%, #8b5cf6 100%);
          animation-name: aurora-two;
          animation-duration: 30s;
          animation-delay: -15s;
        }

        .aurora-three {
          bottom: -17%;
          left: 8%;
          width: 72%;
          height: 30%;
          background: linear-gradient(95deg, #3b82f6 0%, #8b5cf6 50%, #22d3ee 100%);
          animation-name: aurora-three;
          animation-duration: 24s;
          animation-delay: -4s;
        }

        .mouse-glow {
          background: radial-gradient(
            circle 22rem at var(--mouse-x, 50%) var(--mouse-y, 42%),
            rgb(139 92 246 / 0.16) 0%,
            rgb(59 130 246 / 0.1) 34%,
            transparent 70%
          );
        }

        @keyframes aurora-one {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1) rotate(-8deg);
          }
          50% {
            transform: translate3d(18%, 16%, 0) scale(1.08) rotate(4deg);
          }
        }

        @keyframes aurora-two {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1.02) rotate(9deg);
          }
          50% {
            transform: translate3d(-22%, -18%, 0) scale(0.96) rotate(-5deg);
          }
        }

        @keyframes aurora-three {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(0.98) rotate(4deg);
          }
          50% {
            transform: translate3d(14%, -24%, 0) scale(1.1) rotate(-7deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
