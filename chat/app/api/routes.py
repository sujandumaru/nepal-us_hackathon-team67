from functools import lru_cache
import json
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.graph.nodes import GraphNodes
from app.graph.workflow import build_graph
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag import VisaKnowledgeBase
from app.services.web_search import WebSearchService

router = APIRouter(prefix="/api", tags=["chat"])


@dataclass
class AssistantRuntime:
    llm: Any
    graph: Any
    nodes: GraphNodes


def _initial_state(question: str) -> dict[str, Any]:
    return {
        "question": question,
        "retrieval_context": "",
        "retrieval_sources": [],
        "retrieval_done": False,
        "web_context": "",
        "web_sources": [],
        "web_done": False,
        "next_step": "retrieval",
        "route_reason": "",
        "final_answer": "",
    }


def _run_context_phase(nodes: GraphNodes, question: str, max_steps: int = 6) -> dict[str, Any]:
    print("[context] start")
    state = _initial_state(question)

    for step in range(max_steps):
        state.update(nodes.supervisor(state))
        print(f"[context] step={step + 1} next={state['next_step']}")

        if state["next_step"] == "retrieval" and not state["retrieval_done"]:
            print("[context] run retrieval agent")
            state.update(nodes.retrieval_agent(state))
            continue

        if state["next_step"] == "web_search" and not state["web_done"]:
            print("[context] run web_search agent")
            state.update(nodes.web_search_agent(state))
            continue

        if state["next_step"] == "final_answer":
            print("[context] final answer ready")
            break

        if state["retrieval_done"] and state["web_done"]:
            print("[context] retrieval and web_search complete")
            break

    print("[context] complete")
    return state


def _chunk_to_text(chunk: Any) -> str:
    content = getattr(chunk, "content", chunk)

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text")
                if text:
                    parts.append(str(text))
        return "".join(parts)

    return str(content) if content is not None else ""


def _sse(event_name: str, data: dict[str, Any]) -> str:
    return f"event: {event_name}\\ndata: {json.dumps(data, ensure_ascii=False)}\\n\\n"


@lru_cache
def get_assistant_runtime() -> AssistantRuntime:
    print("[runtime] load settings")
    settings = get_settings()

    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured.")

    chat_model = settings.gemini_model.strip()
    if chat_model.startswith("models/"):
        chat_model = chat_model.split("/", maxsplit=1)[1]

    print(f"[runtime] init llm model={chat_model}")
    llm = ChatGoogleGenerativeAI(
        model=chat_model,
        temperature=settings.gemini_temperature,
        google_api_key=settings.gemini_api_key,
    )

    print("[runtime] build/load vector index")
    rag = VisaKnowledgeBase(settings)
    rag.build_index()

    print("[runtime] init web search")
    web_search = WebSearchService(settings)

    print("[runtime] compile graph")
    nodes = GraphNodes(llm=llm, rag=rag, web_search=web_search)
    graph = build_graph(nodes)

    print("[runtime] ready")
    return AssistantRuntime(llm=llm, graph=graph, nodes=nodes)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    print("[chat] request received")

    try:
        runtime = get_assistant_runtime()
    except Exception as exc:  # pragma: no cover
        print(f"[chat] runtime init failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    initial_state = _initial_state(payload.question)

    try:
        print("[chat] invoke graph")
        result = runtime.graph.invoke(initial_state)
    except Exception as exc:
        print(f"[chat] graph failed: {exc}")
        raise HTTPException(
            status_code=500, detail=f"Chat processing failed: {exc}") from exc

    sources = list(dict.fromkeys(result.get(
        "retrieval_sources", []) + result.get("web_sources", [])))
    print(f"[chat] complete sources={len(sources)}")

    return ChatResponse(
        answer=result.get("final_answer", ""),
        sources=sources,
        route_reason=result.get("route_reason", "No route reason provided."),
    )


@router.post("/chat/stream")
def chat_stream(payload: ChatRequest) -> StreamingResponse:
    print("[stream] request received")

    try:
        runtime = get_assistant_runtime()
    except Exception as exc:  # pragma: no cover
        print(f"[stream] runtime init failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        state = _run_context_phase(runtime.nodes, payload.question)
        sources = list(dict.fromkeys(
            state.get("retrieval_sources", []) + state.get("web_sources", [])))
        route_reason = state.get("route_reason", "No route reason provided.")
        prompt = runtime.nodes.compose_answer_prompt(state)
        print(f"[stream] context prepared sources={len(sources)}")
    except Exception as exc:
        print(f"[stream] context failed: {exc}")
        raise HTTPException(
            status_code=500, detail=f"Context building failed: {exc}") from exc

    def event_stream():
        print("[stream] emit meta")
        yield _sse("meta", {"sources": sources, "route_reason": route_reason})

        try:
            for chunk in runtime.llm.stream(prompt):
                text = _chunk_to_text(chunk)
                if text:
                    yield _sse("token", {"text": text})
            yield _sse("done", {"status": "ok"})
            print("[stream] done")
        except Exception as exc:  # pragma: no cover
            print(f"[stream] failed: {exc}")
            yield _sse("error", {"message": str(exc)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)
