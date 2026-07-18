const workflowSteps = [
  {
    icon: "🎓",
    title: "Search Universities",
    description:
      "Discover universities matching your country, degree, and research interests.",
    iconClassName: "from-violet-600 to-indigo-500",
  },
  {
    icon: "👨‍🏫",
    title: "Discover Faculty",
    description:
      "Automatically identify professors working in your chosen research area.",
    iconClassName: "from-sky-500 to-cyan-500",
  },
  {
    icon: "🧠",
    title: "Analyze Research",
    description:
      "AI analyzes publications, research interests, and faculty profiles.",
    iconClassName: "from-fuchsia-500 to-violet-500",
  },
  {
    icon: "⭐",
    title: "Rank Best Matches",
    description:
      "Receive AI-ranked supervisor recommendations with match scores.",
    iconClassName: "from-amber-400 to-orange-500",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 overflow-hidden bg-slate-50/80 py-24 sm:py-28 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-100/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-28 bottom-0 size-72 rounded-full bg-sky-100/55 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            The research workflow, simplified
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">
            How SupervisorAI Works
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Our AI automatically discovers universities, finds faculty members, analyzes their
            research, and ranks the best supervisors for you.
          </p>
        </div>

        <ol className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-16 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <li key={step.title} className="group relative">
              <article className="relative h-full min-h-[240px] overflow-hidden rounded-[1.5rem] border border-white/90 bg-white/85 p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.24)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:border-indigo-200 hover:shadow-[0_24px_50px_-24px_rgba(79,70,229,0.28)]">
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-5 text-xs font-bold tracking-wide text-slate-300"
                >
                  0{index + 1}
                </span>
                <div
                  className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconClassName} text-2xl shadow-[0_10px_24px_-10px_rgba(79,70,229,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <span aria-hidden="true">{step.icon}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-violet-500 to-sky-500 transition-transform duration-300 group-hover:scale-x-100"
                />
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
