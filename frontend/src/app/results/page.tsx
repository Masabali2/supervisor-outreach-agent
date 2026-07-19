"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Professor = { name: string; university: string; email: string; fit_score: number; fit_reasoning: string; accepting_students: boolean | string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function ResultsPage() {
  const [results, setResults] = useState<Professor[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${apiUrl}/results`).then(async response => { if (!response.ok) throw new Error("No completed search was found."); return response.json(); }).then(setResults).catch(error => setError(error.message)); }, []);
  return <main className="mx-auto min-h-screen max-w-5xl bg-slate-50 px-5 py-12 text-slate-900"><Link href="/" className="text-sm font-semibold text-indigo-600">← New search</Link><h1 className="mt-5 text-3xl font-bold">Ranked supervisors</h1>{error && <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}<div className="mt-8 grid gap-4">{results.map((professor, index) => <article key={`${professor.name}-${index}`} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{professor.name}</h2><p className="text-slate-600">{professor.university}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">{professor.fit_score}/10 match</span></div><p className="mt-3 text-slate-700">{professor.fit_reasoning}</p><p className="mt-3 text-sm">Accepting students: {professor.accepting_students === true ? "Likely" : "Unknown / no signal"}</p><Link className="mt-4 inline-block font-semibold text-indigo-600" href={`/professor/${index}`}>View details →</Link></article>)}</div></main>;
}
