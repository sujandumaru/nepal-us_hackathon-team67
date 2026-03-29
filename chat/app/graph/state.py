from typing import Literal, TypedDict


class GraphState(TypedDict):
    question: str
    retrieval_context: str
    retrieval_sources: list[str]
    retrieval_done: bool

    web_context: str
    web_sources: list[str]
    web_done: bool

    next_step: Literal["retrieval", "web_search", "final_answer"]
    route_reason: str
    final_answer: str
