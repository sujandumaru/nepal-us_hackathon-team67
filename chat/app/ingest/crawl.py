from __future__ import annotations

import argparse
import io
import json
import re
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urldefrag, urlparse

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

REGISTRY_PATH = Path("app/data/source_registry.json")
OUTPUT_DIR = Path("app/data/knowledge")
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
)


@dataclass
class CrawlItem:
    url: str
    depth: int
    source_meta: dict[str, str]


def load_registry(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_output() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_url(url: str) -> str:
    clean, _fragment = urldefrag(url.strip())
    return clean


def is_allowed_domain(url: str, allowed_domains: set[str]) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in allowed_domains


def looks_relevant(url: str, keywords: list[str]) -> bool:
    lowered = url.lower()
    return any(keyword in lowered for keyword in keywords)


def passes_prefix_filter(url: str, prefixes: list[str]) -> bool:
    if not prefixes:
        return True
    return any(url.startswith(prefix) for prefix in prefixes)


def has_excluded_keyword(url: str, excluded_keywords: list[str]) -> bool:
    lowered = url.lower()
    return any(keyword in lowered for keyword in excluded_keywords)


def slugify_url(url: str) -> str:
    parsed = urlparse(url)
    base = f"{parsed.netloc}{parsed.path}".strip("/") or parsed.netloc
    base = re.sub(r"[^a-zA-Z0-9]+", "_", base)
    return base[:180].strip("_")


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    candidates = soup.select("main") or soup.select(
        "article") or [soup.body or soup]
    text = "\n\n".join(candidate.get_text("\n", strip=True)
                       for candidate in candidates)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def pdf_to_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").strip())
    text = "\n\n".join(part for part in pages if part)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_links(base_url: str, html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    for a_tag in soup.select("a[href]"):
        href = a_tag.get("href", "").strip()
        if not href:
            continue
        absolute = normalize_url(urljoin(base_url, href))
        if absolute.startswith("http"):
            links.append(absolute)
    return links


def write_doc(url: str, text: str, source_meta: dict[str, str], content_type: str) -> str:
    slug = slugify_url(url)
    file_path = OUTPUT_DIR / f"{slug}.md"
    now_iso = datetime.now(timezone.utc).isoformat()

    frontmatter = [
        "---",
        f'source_url: "{url}"',
        f'source_domain: "{urlparse(url).netloc}"',
        f'topic: "{source_meta.get("topic", "unknown")}"',
        f'audience: "{source_meta.get("audience", "unknown")}"',
        f'country_context: "{source_meta.get("country_context", "global")}"',
        f'content_type: "{content_type}"',
        f'last_fetched_utc: "{now_iso}"',
        "---",
        "",
        text,
        "",
    ]

    file_path.write_text("\n".join(frontmatter), encoding="utf-8")
    return str(file_path).replace("\\", "/")


def cleanup_existing_docs() -> None:
    if not OUTPUT_DIR.exists():
        return
    for path in OUTPUT_DIR.glob("*.md"):
        if path.name == "sample_visa_notes.md":
            continue
        path.unlink(missing_ok=True)


def crawl(max_pages: int, max_depth: int, delay_seconds: float, clean: bool) -> dict[str, Any]:
    registry = load_registry(REGISTRY_PATH)
    sources = registry.get("sources", [])
    allowed_domains = set(registry.get("allowed_domains", []))
    keywords = registry.get("relevant_keywords", [])
    excluded_keywords = registry.get("exclude_url_keywords", [])
    follow_prefixes = registry.get("follow_url_prefixes", [])

    if clean:
        cleanup_existing_docs()

    queue: deque[CrawlItem] = deque()
    for source in sources:
        queue.append(
            CrawlItem(
                url=normalize_url(source["url"]),
                depth=0,
                source_meta={
                    "topic": source.get("topic", "unknown"),
                    "audience": source.get("audience", "unknown"),
                    "country_context": source.get("country_context", "global"),
                },
            )
        )

    visited: set[str] = set()
    saved: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    while queue and len(saved) < max_pages:
        item = queue.popleft()
        url = normalize_url(item.url)

        if url in visited:
            continue
        visited.add(url)

        if not is_allowed_domain(url, allowed_domains):
            continue

        if not passes_prefix_filter(url, follow_prefixes):
            continue

        if has_excluded_keyword(url, excluded_keywords):
            continue

        try:
            response = session.get(url, timeout=20)
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover
            failures.append({"url": url, "error": str(exc)})
            continue

        content_type = response.headers.get("content-type", "").lower()

        try:
            if "pdf" in content_type or url.lower().endswith(".pdf"):
                text = pdf_to_text(response.content)
                discovered_links = []
                doc_type = "pdf"
            else:
                html = response.text
                text = html_to_text(html)
                discovered_links = extract_links(url, html)
                doc_type = "html"
        except Exception as exc:  # pragma: no cover
            failures.append({"url": url, "error": f"Parse failure: {exc}"})
            continue

        if len(text) < 200:
            failures.append(
                {"url": url, "error": "Content too short after extraction"})
            continue

        output_path = write_doc(url, text, item.source_meta, doc_type)
        saved.append(
            {
                "url": url,
                "path": output_path,
                "topic": item.source_meta.get("topic", "unknown"),
                "audience": item.source_meta.get("audience", "unknown"),
                "country_context": item.source_meta.get("country_context", "global"),
                "content_type": doc_type,
            }
        )

        if item.depth < max_depth:
            for discovered_url in discovered_links:
                if discovered_url in visited:
                    continue
                if not is_allowed_domain(discovered_url, allowed_domains):
                    continue
                if not passes_prefix_filter(discovered_url, follow_prefixes):
                    continue
                if has_excluded_keyword(discovered_url, excluded_keywords):
                    continue
                if not looks_relevant(discovered_url, keywords):
                    continue
                queue.append(
                    CrawlItem(
                        url=discovered_url,
                        depth=item.depth + 1,
                        source_meta=item.source_meta,
                    )
                )

        time.sleep(delay_seconds)

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "saved_count": len(saved),
        "failure_count": len(failures),
        "saved": saved,
        "failures": failures,
    }
    MANIFEST_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crawl official visa sources into local knowledge base.")
    parser.add_argument("--max-pages", type=int, default=35)
    parser.add_argument("--max-depth", type=int, default=1)
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()

    ensure_output()
    report = crawl(
        max_pages=args.max_pages,
        max_depth=args.max_depth,
        delay_seconds=args.delay,
        clean=args.clean,
    )
    print(json.dumps({
        "saved_count": report["saved_count"],
        "failure_count": report["failure_count"],
        "manifest": str(MANIFEST_PATH).replace('\\\\', '/'),
    }, indent=2))


if __name__ == "__main__":
    main()
