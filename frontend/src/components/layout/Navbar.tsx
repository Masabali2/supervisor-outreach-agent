"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navigationLinks = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

const ctaClassName =
  "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(79,70,229,0.85)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_18px_38px_-10px_rgba(79,70,229,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]";

export default function Navbar() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const updateScrolledState = () => setHasScrolled(window.scrollY > 12);
    const animationFrame = window.requestAnimationFrame(() => setIsLoaded(true));

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrolledState);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ease-out ${
        isLoaded ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      <div
        className={`relative transition-all duration-500 ease-out ${
          hasScrolled
            ? "border-slate-200/70 bg-white/85 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-md text-lg font-bold tracking-[-0.04em] text-slate-950 transition-transform duration-300 hover:scale-[1.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label="SupervisorAI home"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-sky-500 text-xs font-black tracking-normal text-white shadow-sm">
              S
            </span>
            <span>SupervisorAI</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <ul className="flex items-center gap-7">
              {navigationLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="group relative inline-flex items-center rounded-md px-1.5 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    {link.label}
                    <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-violet-600 to-sky-500 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>

            <a href="#search" className={ctaClassName}>
              Get Started
            </a>
          </nav>

          <button
            type="button"
          className="relative flex size-10 items-center justify-center rounded-full text-slate-900 transition-all duration-200 hover:bg-slate-900/5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span className="sr-only">Toggle navigation menu</span>
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                isMobileMenuOpen ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                isMobileMenuOpen ? "scale-x-0 opacity-0" : "opacity-100"
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                isMobileMenuOpen ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>

        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-px origin-center bg-gradient-to-r from-transparent via-indigo-400 to-transparent transition-all duration-500 ${
            hasScrolled ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
          }`}
        />
      </div>

      <div
        className={`fixed inset-x-0 top-16 h-[calc(100dvh-4rem)] transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-pointer bg-slate-950/15 backdrop-blur-[1px]"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          tabIndex={isMobileMenuOpen ? 0 : -1}
        />

        <nav
          id="mobile-navigation"
          className={`relative z-10 mx-4 mt-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.3)] transition-all duration-300 ease-out ${
            isMobileMenuOpen ? "translate-y-0 scale-100" : "-translate-y-4 scale-[0.98]"
          }`}
          aria-label="Mobile navigation"
        >
          <ul className="space-y-1">
            {navigationLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="flex rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  onClick={closeMobileMenu}
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#search"
            className={`${ctaClassName} mt-3 w-full`}
            onClick={closeMobileMenu}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          >
            Get Started
          </a>
        </nav>
      </div>
    </header>
  );
}
