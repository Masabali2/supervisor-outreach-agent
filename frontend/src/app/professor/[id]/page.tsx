"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Professor = {
  name: string;
  university: string;
  email?: string | null;
  fit_score: number;
  fit_reasoning: string;
  profile_summary?: string;
  recent_work?: unknown[];
  accepting_students?: boolean | string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function workLabel(work: unknown): string {
  if (typeof work === "string") return work;
  if (work && typeof work === "object") {
    const record = work as Record<string, unknown>;
    return String(record.title ?? record.name ?? record.link ?? "Publication");
  }
  return "Publication";
}

export default function ProfessorDetailsPage() {
  const params = useParams<{ id: string }>();
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [error, setError] = useState("");
  const professorId = Number(params.id);

  useEffect(() => {
    if (!Number.isInteger(professorId) || professorId < 0) {
      setError("Professor not found.");
      return;
    }
    fetch(`${apiUrl}/professor/${professorId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Professor not found.");
        return response.json();
      })
      .then(setProfessor)
      .catch((requestError: Error) => setError(requestError.message));
  }, [professorId]);

  if (error) {
    return <main className="mx-auto min-h-screen max-w-4xl bg-slate-50 px-5 py-12 text-slate-900"><Link href="/results" className="font-semibold text-indigo-600">← Back to results</Link><p className="mt-8 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p></main>;
  }
  if (!professor) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Loading professor details…</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-slate-50 px-5 py-12 text-slate-900">
      <Link href="/results" className="font-semibold text-indigo-600">← Back to results</Link>
      <article className="mt-6 rounded-2xl bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-3xl font-bold">{professor.name}</h1><p className="mt-1 text-slate-600">{professor.university}</p></div>
          <span className="rounded-full bg-indigo-50 px-4 py-2 font-semibold text-indigo-700">{professor.fit_score}/10 match</span>
        </div>
        <section className="mt-8"><h2 className="text-lg font-semibold">Why this is a match</h2><p className="mt-2 text-slate-700">{professor.fit_reasoning}</p></section>
        <section className="mt-6"><h2 className="text-lg font-semibold">Research summary</h2><p className="mt-2 text-slate-700">{professor.profile_summary || "No research summary is available yet."}</p></section>
        <section className="mt-6"><h2 className="text-lg font-semibold">Recent work</h2>{professor.recent_work?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{professor.recent_work.map((work, index) => <li key={index}>{workLabel(work)}</li>)}</ul> : <p className="mt-2 text-slate-600">No recent work found.</p>}</section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2"><div><h2 className="text-lg font-semibold">Institutional email</h2><p className="mt-2 text-slate-700">{professor.email || "Not available"}</p></div><div><h2 className="text-lg font-semibold">Accepting students</h2><p className="mt-2 text-slate-700">{professor.accepting_students === true ? "Likely accepting students" : "Unknown / no signal"}</p></div></section>
      </article>
    </main>
  );
}
