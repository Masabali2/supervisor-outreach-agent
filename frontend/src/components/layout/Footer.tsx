import Link from "next/link";

const quickLinks = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

const repositoryUrl = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY_URL ?? "https://github.com";

export default function Footer() {
  return (
    <footer id="contact" className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="absolute -left-32 top-0 -z-10 size-80 rounded-full bg-indigo-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 -z-10 size-72 rounded-full bg-sky-500/15 blur-3xl"
      />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.7fr] lg:gap-16">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex rounded-md text-lg font-bold tracking-[-0.04em] text-white transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              SupervisorAI
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              AI-powered research supervisor discovery for ambitious Master&apos;s and PhD
              applicants.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Quick Links</h2>
            <nav className="mt-4" aria-label="Footer navigation">
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Project</h2>
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              GitHub Repository
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3h7v7M13 3 5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 9v3H3V4h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} SupervisorAI. Built for better research connections.
          </p>
        </div>
      </div>
    </footer>
  );
}
