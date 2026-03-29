from __future__ import annotations

from langchain_community.tools import DuckDuckGoSearchRun, TavilySearchResults
from langchain_community.utilities.tavily_search import TavilySearchAPIWrapper

from app.core.config import Settings


class WebSearchService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        tavily_key = settings.tavily_api_key.strip()
        if not tavily_key:
            self.tool = DuckDuckGoSearchRun()
            self.provider = "duckduckgo"
            return

        try:
            api_wrapper = TavilySearchAPIWrapper(tavily_api_key=tavily_key)
            self.tool = TavilySearchResults(
                max_results=5, api_wrapper=api_wrapper)
            self.provider = "tavily"
        except Exception:
            # Keep service functional even when Tavily key is invalid/unavailable.
            self.tool = DuckDuckGoSearchRun()
            self.provider = "duckduckgo"

    def search(self, query: str) -> tuple[str, list[str]]:
        result = self.tool.invoke(query)

        if isinstance(result, list):
            snippets = []
            sources = []
            for idx, item in enumerate(result, start=1):
                title = item.get("title", "")
                content = item.get("content", "")
                url = item.get("url", "")
                snippets.append(f"[{idx}] {title}\n{content}\nURL: {url}")
                if url:
                    sources.append(url)
            return "\n\n".join(snippets), sources

        text_result = str(result)
        source_label = f"web-search:{self.provider}"
        return text_result, [source_label]
