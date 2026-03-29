from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.graph.nodes import GraphNodes
from app.graph.state import GraphState


def build_graph(nodes: GraphNodes):
    graph = StateGraph(GraphState)

    graph.add_node("supervisor", nodes.supervisor)
    graph.add_node("retrieval", nodes.retrieval_agent)
    graph.add_node("web_search", nodes.web_search_agent)
    graph.add_node("answer", nodes.answer_agent)

    graph.add_edge(START, "supervisor")

    graph.add_conditional_edges(
        "supervisor",
        lambda state: state["next_step"],
        {
            "retrieval": "retrieval",
            "web_search": "web_search",
            "final_answer": "answer",
        },
    )

    graph.add_edge("retrieval", "supervisor")
    graph.add_edge("web_search", "supervisor")
    graph.add_edge("answer", END)

    return graph.compile()
