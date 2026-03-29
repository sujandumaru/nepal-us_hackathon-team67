from __future__ import annotations

from pydantic import BaseModel

from app.graph.state import GraphState
from app.services.rag import VisaKnowledgeBase
from app.services.web_search import WebSearchService


class RouteDecision(BaseModel):
    next_step: str
    reason: str


class GraphNodes:
    def __init__(self, llm, rag: VisaKnowledgeBase, web_search: WebSearchService) -> None:
        self.llm = llm
        self.rag = rag
        self.web_search = web_search

    def supervisor(self, state: GraphState) -> dict:
        prompt = (
            "You are a routing supervisor for a US visa assistant. "
            "Choose exactly one next_step from: retrieval, web_search, final_answer.\\n"
            "Prefer retrieval for policy/process questions that likely exist in local docs. "
            "Use web_search for latest updates, wait times, fees, or recent policy changes. "
            "Choose final_answer only when enough context is already gathered.\\n\\n"
            f"Question: {state['question']}\\n"
            f"Retrieval done: {state['retrieval_done']}\\n"
            f"Web search done: {state['web_done']}\\n"
            f"Current retrieval context length: {len(state['retrieval_context'])}\\n"
            f"Current web context length: {len(state['web_context'])}\\n"
        )

        try:
            decision = self.llm.with_structured_output(
                RouteDecision).invoke(prompt)
            next_step = decision.next_step
            reason = decision.reason
        except Exception:
            # Fallback routing if structured output is unavailable.
            if not state["retrieval_done"]:
                next_step = "retrieval"
                reason = "Fallback: retrieve local policy context first."
            elif not state["web_done"]:
                next_step = "web_search"
                reason = "Fallback: gather latest web updates next."
            else:
                next_step = "final_answer"
                reason = "Fallback: enough context gathered for final response."

        if next_step not in {"retrieval", "web_search", "final_answer"}:
            next_step = "final_answer"

        return {"next_step": next_step, "route_reason": reason}

    def retrieval_agent(self, state: GraphState) -> dict:
        context, sources = self.rag.retrieve(state["question"])
        return {
            "retrieval_context": context,
            "retrieval_sources": sources,
            "retrieval_done": True,
        }

    def web_search_agent(self, state: GraphState) -> dict:
        context, sources = self.web_search.search(state["question"])
        return {"web_context": context, "web_sources": sources, "web_done": True}

    def compose_answer_prompt(self, state: GraphState) -> str:
        return (
            "You are a specialized US visa assistant. Provide practical, accurate, and concise help. "
            "When uncertain, clearly say what to verify on official sources (USCIS, travel.state.gov, CBP).\\n"
            "Do not provide legal advice; include a short disclaimer when needed.\\n\\n"
            f"User question: {state['question']}\\n\\n"
            "Retrieved local context:\\n"
            f"{state['retrieval_context'] or 'None'}\\n\\n"
            "Web search context:\\n"
            f"{state['web_context'] or 'None'}\\n"
        )

    def answer_agent(self, state: GraphState) -> dict:
        prompt = self.compose_answer_prompt(state)
        response = self.llm.invoke(prompt)
        content = response.content if hasattr(
            response, "content") else str(response)
        return {"final_answer": content}
