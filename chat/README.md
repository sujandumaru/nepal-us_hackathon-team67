# Multi-Agentic Visa Assistant (LangGraph + FastAPI)

A backend chat API for personalized US visa Q&A using:

- A supervisor agent (LangGraph router)
- A retrieval agent (local RAG over `app/data/knowledge`)
- A web-search agent (Tavily if configured, otherwise DuckDuckGo)
- A final answer agent (LLM synthesis)

## 1. Setup

```bash
cd chatbot
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
```

Fill in your `.env`:

- `LLM_PROVIDER=openai` (default)
- `OPENAI_API_KEY` (or `KEY`) for OpenAI-compatible providers like OpenRouter
- `OPENAI_MODEL` (for OpenRouter, examples include `openai/gpt-4o-mini`)
- `OPENAI_BASE_URL` (OpenRouter: `https://openrouter.ai/api/v1`)
- `TAVILY_API_KEY` (optional, but recommended)

If you want Gemini instead:

- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY`

Local embedding and caching options:

- `USE_LOCAL_EMBEDDINGS=true` to avoid embedding API quota usage
- `LOCAL_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2`
- `FAISS_INDEX_DIR=app/data/index/faiss`
- `FORCE_REINDEX=true` only when you intentionally want to rebuild

## 2. Run API

```bash
uvicorn app.main:app --reload --port 8000
```

## 3. API Endpoints

- `GET /` : service info
- `GET /api/health` : health check
- `POST /api/chat` : ask question
- `POST /api/chat/stream` : ask question with streaming tokens (SSE)

Request body:

```json
{
    "question": "I have a B1/B2 refusal under 214(b). What should I do before reapplying?"
}
```

Response:

```json
{
    "answer": "...",
    "sources": ["app/data/knowledge/sample_visa_notes.md", "https://..."],
    "route_reason": "..."
}
```

Streaming endpoint emits SSE events:

- `meta` : includes `sources` and `route_reason`
- `token` : incremental answer chunks
- `done` : stream completed
- `error` : stream error payload

Next.js client example:

```ts
const response = await fetch("http://localhost:8000/api/chat/stream", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
    },
    body: JSON.stringify({ question }),
});

if (!response.body) throw new Error("Missing response body");

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() ?? "";

    for (const message of messages) {
        const eventLine = message
            .split("\n")
            .find((line) => line.startsWith("event: "));
        const dataLine = message
            .split("\n")
            .find((line) => line.startsWith("data: "));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.slice(7).trim();
        const data = JSON.parse(dataLine.slice(6));

        if (event === "meta") {
            console.log("sources", data.sources, "route", data.route_reason);
        }
        if (event === "token") {
            // Append token text to UI state
            console.log(data.text);
        }
        if (event === "done") {
            console.log("stream done");
        }
        if (event === "error") {
            console.error("stream error", data.message);
        }
    }
}
```

## 4. Add Your Knowledge Base

Drop `.md` or `.txt` files into:

- `app/data/knowledge`

Then restart the app to rebuild the in-memory FAISS index.

With local embeddings enabled, the index is persisted to disk and reused on next runs.
Re-embedding only happens when knowledge files change (or `FORCE_REINDEX=true`).

Or use the built-in crawler to download official F-1/H-1B sources:

```bash
python -m app.ingest.crawl --max-pages 35 --max-depth 1
```

Source seed list and domain whitelist are in:

- `app/data/source_registry.json`

Crawler output:

- Downloaded docs: `app/data/knowledge/*.md`
- Crawl report: `app/data/knowledge/manifest.json`

## 5. Notes

- This assistant is informational and not legal advice.
- For authoritative decisions, verify with USCIS, travel.state.gov, and CBP.
- Keep source list focused and curated for precision; avoid downloading entire manuals.
