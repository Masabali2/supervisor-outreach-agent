# Supervisor Outreach Agent

An AI-assisted research-supervisor discovery tool for prospective Master's and PhD students. Enter a country, optional region, degree, and research field; the application discovers relevant universities, finds faculty, builds research profiles, and returns an explained, ranked shortlist.

The goal is not to replace a student's judgement. It turns the slow first pass of supervisor research into an auditable shortlist that the student can verify on official university pages before reaching out.

## What it does

- Finds universities relevant to the requested field and geography.
- Searches faculty directories and related pages for credible individual researchers.
- Cleans and validates candidate data, including malformed URLs, directory pages, duplicate people, social/aggregator links, and unreadable scraped content.
- Extracts research summaries and recent work where available.
- Scores supervisors for research fit, location, degree intent, and signals that they may be accepting students.
- Streams the four pipeline stages to the UI in real time, then presents ranked results and individual detail pages.

## Architecture

```text
Next.js web app
  Search form -> streaming progress dashboard -> ranked results -> professor details
                         |
                         v
FastAPI API (SSE)
  University Finder -> Faculty Finder -> Research Profiler -> Supervisor Ranker
         |                  |                   |                  |
  web search + pages   web pages/PDFs      profile pages       explained fit score
                         |
                         v
                 JSON caches in backend/data/
```

The frontend sends a `POST /search` request and reads Server-Sent Events (SSE) while the backend runs. The backend allows one active search at a time so concurrent runs cannot overwrite the shared JSON cache files.

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, React Hook Form, Zod
- **Backend:** Python, FastAPI, Uvicorn, Pydantic
- **Discovery and extraction:** Tavily (optional) or DuckDuckGo, Requests, Trafilatura, BeautifulSoup, pdfplumber
- **LLM layer:** Groq-compatible chat completions with structured JSON parsing, retry handling for rate limits, and configurable model selection

## Repository layout

```text
backend/
  agents/          # four pipeline stages
  data/            # bundled sample input/output caches
  utils/           # search, scraping/PDF extraction, LLM wrapper
  api.py           # streaming API and result endpoints
  main.py          # FastAPI application
frontend/
  src/app/         # landing, progress, results, and detail routes
  src/components/  # search form, loading UI, landing-page components
requirements.txt
```

## Quick start

### Prerequisites

- Python 3.10+
- Node.js 18.18+ (Node 20+ recommended)
- A Groq API key for a live search

### 1. Configure the backend

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in the repository root:

```dotenv
GROQ_API_KEY=your_groq_api_key
# Optional: defaults to llama-3.1-8b-instant
GROQ_MODEL=llama-3.1-8b-instant

# Optional: Tavily is used when supplied; otherwise DuckDuckGo is used.
TAVILY_API_KEY=your_tavily_api_key

# Optional pipeline defaults
MAX_UNIVERSITIES=20
MAX_FACULTY_PER_UNIVERSITY=5
```

Start the API:

```powershell
uvicorn backend.main:app --reload --port 8000
```

Confirm it is running at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). The API docs are available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Configure and start the frontend

In a second terminal:

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Submit a search and keep the backend running while the pipeline completes.

For a persistent frontend setting, create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Try the included sample data

The repository includes a completed example in `backend/data/`:

```json
{
  "country": "United States",
  "region": "Texas",
  "degree": "PhD",
  "field": "Machine Learning"
}
```

With the API running, open `http://localhost:3000/results` to inspect the bundled ranked candidates without first executing a live search. A new live search overwrites the JSON cache files in `backend/data/`.

To invoke the same example directly against the API:

```powershell
Invoke-WebRequest -Method POST -Uri http://127.0.0.1:8000/search `
  -ContentType "application/json" `
  -Body '{"country":"United States","region":"Texas","degree":"PhD","field":"Machine Learning"}'
```

The response is an SSE stream. When it reports completion, retrieve the ranked records with:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/results
```

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/search` | Runs the pipeline and streams stage updates as SSE |
| `GET` | `/results` | Returns the most recent ranked faculty list |
| `GET` | `/professor/{id}` | Returns one result by its index in the ranked list |

`POST /search` accepts:

```json
{
  "country": "Canada",
  "region": "Ontario",
  "degree": "Masters",
  "field": "Artificial Intelligence"
}
```

## How the ranking pipeline works

1. **University Finder** issues several geographically and field-focused searches, asks the LLM to deduplicate the raw results, then checks that each proposed homepage is reachable and has institutional signals.
2. **Faculty Finder** searches for relevant faculty pages, scrapes pages or falls back to result snippets, and normalizes candidates. It deliberately retains credible faculty even when an individual URL or recruitment signal is missing.
3. **Research Profiler** enriches candidates with research summaries and recent-work information from available pages.
4. **Supervisor Ranker** produces a fit score and human-readable reasoning, prioritizing research alignment while incorporating the requested region and availability signals.

## Product and engineering decisions

- **Evidence before polish:** results retain research summaries, recent work, availability signals, and fit reasoning so students can assess why a recommendation appeared.
- **Progress is first-class:** discovery can take time, so the API streams real stage-level status rather than leaving users on an unresponsive page.
- **Defensive web extraction:** university content is inconsistent. The pipeline checks content type, supports PDFs, uses a BeautifulSoup fallback, filters common non-profile domains, resolves relative links, deduplicates candidates, and avoids letting a bad URL discard a real researcher.
- **Safe shared output:** the single-search lock prevents two browser sessions from corrupting the JSON result caches.
- **Human verification remains required:** “accepting students” is a best-effort signal, not a guarantee. Verify each profile, funding status, deadlines, and contact details through official channels before applying or emailing.

## Collaboration with Codex and GPT-5.6

This project was built as a human-directed collaboration with Codex. The product direction and final choices remained with the project author: defining the student workflow, choosing the four-stage agent design, prioritizing transparent ranked results over opaque recommendations, and shaping the visual experience around a focused search form and live pipeline feedback.

Codex accelerated implementation by turning those decisions into working, connected pieces: scaffolding and refining the FastAPI/Next.js integration, implementing the SSE progress flow, tightening validation and data-cleaning rules, tracing issues across the frontend and backend, and iterating on the responsive search, loading, results, and detail views. It was especially useful for the repetitive but important engineering work around malformed URLs, duplicate candidates, scraped-page failures, structured JSON handling, and readable error paths.

GPT-5.6 contributed the reasoning and code-generation assistance used throughout those iterations: it helped translate requirements into concrete components and pipeline steps, propose edge-case handling, review integration points, and document the final system. Codex then made that assistance practical inside the codebase by navigating files, applying changes, and validating how the pieces fit together. The final result is therefore not a black-box generation: it reflects human product and design judgement, supported by GPT-5.6 reasoning and Codex's implementation workflow.

## Development commands

```powershell
# Backend (from repository root)
uvicorn backend.main:app --reload --port 8000

# Frontend (from frontend/)
npm run dev
npm run lint
npm run build
```

## Limitations

- Live discovery requires internet access and a valid `GROQ_API_KEY`; optional Tavily access can improve search coverage.
- University pages may block scraping, change structure, or contain stale information. The system falls back where possible, but output quality varies by source.
- The cache files hold only the most recent run and are local to the backend process; a production deployment should use per-user jobs and persistent storage.
- This tool assists research. It does not send outreach emails and should not be treated as admissions, funding, or availability confirmation.

## License

No license file is currently included. Add one before distributing or accepting external contributions.
