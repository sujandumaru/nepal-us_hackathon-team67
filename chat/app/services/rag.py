from __future__ import annotations

import hashlib
import json
from pathlib import Path

from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import Settings


class VisaKnowledgeBase:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.index_dir = Path(settings.faiss_index_dir)
        self.index_meta_path = self.index_dir / "meta.json"

        if settings.use_local_embeddings:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=settings.local_embedding_model,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
        else:
            embedding_model = settings.gemini_embedding_model.strip()
            if embedding_model and not embedding_model.startswith("models/"):
                embedding_model = f"models/{embedding_model}"

            self.embeddings = GoogleGenerativeAIEmbeddings(
                model=embedding_model,
                google_api_key=settings.gemini_api_key,
            )

        self.vectorstore: FAISS | None = None

    def _knowledge_files(self, knowledge_path: Path) -> list[Path]:
        files = []
        for path in knowledge_path.rglob("*"):
            if path.suffix.lower() in {".txt", ".md"}:
                files.append(path)
        return sorted(files)

    def _knowledge_fingerprint(self, files: list[Path]) -> str:
        hasher = hashlib.sha256()
        for path in files:
            stat = path.stat()
            hasher.update(str(path).encode("utf-8"))
            hasher.update(str(stat.st_mtime_ns).encode("utf-8"))
            hasher.update(str(stat.st_size).encode("utf-8"))
        return hasher.hexdigest()

    def _can_load_cached_index(self, fingerprint: str) -> bool:
        if self.settings.force_reindex:
            return False
        if not self.index_dir.exists() or not self.index_meta_path.exists():
            return False

        index_bin = self.index_dir / "index.faiss"
        index_pkl = self.index_dir / "index.pkl"
        if not index_bin.exists() or not index_pkl.exists():
            return False

        try:
            meta = json.loads(self.index_meta_path.read_text(encoding="utf-8"))
        except Exception:
            return False

        return meta.get("knowledge_fingerprint") == fingerprint

    def _save_index_meta(self, fingerprint: str) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)
        meta = {
            "knowledge_fingerprint": fingerprint,
            "use_local_embeddings": self.settings.use_local_embeddings,
            "local_embedding_model": self.settings.local_embedding_model,
            "gemini_embedding_model": self.settings.gemini_embedding_model,
        }
        self.index_meta_path.write_text(
            json.dumps(meta, indent=2), encoding="utf-8")

    def build_index(self) -> None:
        knowledge_path = Path(self.settings.knowledge_dir)
        if not knowledge_path.exists():
            return

        files = self._knowledge_files(knowledge_path)
        if not files:
            return

        fingerprint = self._knowledge_fingerprint(files)
        if self._can_load_cached_index(fingerprint):
            self.vectorstore = FAISS.load_local(
                str(self.index_dir),
                self.embeddings,
                allow_dangerous_deserialization=True,
            )
            return

        raw_docs: list[Document] = []
        for path in files:
            text = path.read_text(encoding="utf-8", errors="ignore").strip()
            if text:
                raw_docs.append(
                    Document(page_content=text, metadata={"source": str(path)})
                )

        if not raw_docs:
            return

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900, chunk_overlap=120)
        chunks = splitter.split_documents(raw_docs)
        self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.vectorstore.save_local(str(self.index_dir))
        self._save_index_meta(fingerprint)

    def retrieve(self, query: str) -> tuple[str, list[str]]:
        if self.vectorstore is None:
            return (
                "No local knowledge base documents are indexed yet. "
                "Add files to app/data/knowledge and restart.",
                [],
            )

        docs = self.vectorstore.similarity_search(
            query, k=self.settings.retrieval_k)
        context_parts = []
        sources = []
        for i, doc in enumerate(docs, start=1):
            source = doc.metadata.get("source", "unknown")
            context_parts.append(f"[{i}] Source: {source}\n{doc.page_content}")
            sources.append(source)

        return "\n\n".join(context_parts), sources
