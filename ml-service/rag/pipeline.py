"""
Dummy RAG pipeline.

Flow (stub): ingest → keyword retrieve → template generate.
No embeddings, no vector DB, no real LLM — swap later.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .corpus import SEED_DOCS, RagDoc


@dataclass
class RetrieveHit:
    doc: RagDoc
    score: float


@dataclass
class RagAnswer:
    answer: str
    citations: list[dict[str, Any]]
    mode: str = "dummy"
    retrieved: int = 0


@dataclass
class DummyRAG:
    docs: list[RagDoc] = field(default_factory=lambda: list(SEED_DOCS))

    def ingest(self, docs: list[RagDoc]) -> int:
        """Append docs to the in-memory corpus (dummy)."""
        self.docs.extend(docs)
        return len(docs)

    def retrieve(
        self,
        query: str,
        *,
        source: str | None = None,
        top_k: int = 3,
    ) -> list[RetrieveHit]:
        tokens = {t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 2}
        if not tokens:
            tokens = {"market", "heat"}

        hits: list[RetrieveHit] = []
        for doc in self.docs:
            if source and doc["source"] != source:
                continue
            blob = f"{doc['topic']} {doc['text']}".lower()
            overlap = sum(1 for t in tokens if t in blob)
            # tiny boost for source match when query mentions it
            if source is None and any(t in doc["source"] for t in tokens):
                overlap += 0.5
            if overlap <= 0:
                continue
            hits.append(RetrieveHit(doc=doc, score=float(overlap)))

        hits.sort(key=lambda h: h.score, reverse=True)
        if not hits and self.docs:
            # always return something so UI/demo never empties
            pool = [d for d in self.docs if source is None or d["source"] == source]
            pool = pool or self.docs
            return [RetrieveHit(doc=pool[0], score=0.1)]
        return hits[:top_k]

    def generate(self, query: str, hits: list[RetrieveHit]) -> str:
        if not hits:
            return (
                f"(dummy RAG) No corpus hits for “{query}”. "
                "Ingest market notes or wire a real retriever later."
            )
        bullets = "\n".join(f"- [{h.doc['id']}] {h.doc['text']}" for h in hits)
        return (
            f"(dummy RAG) Based on {len(hits)} retrieved note(s) for “{query}”:\n"
            f"{bullets}\n"
            "— Replace keyword retrieve + template with embeddings + LLM when ready."
        )

    def query(
        self,
        query: str,
        *,
        source: str | None = None,
        top_k: int = 3,
    ) -> RagAnswer:
        hits = self.retrieve(query, source=source, top_k=top_k)
        return RagAnswer(
            answer=self.generate(query, hits),
            citations=[
                {
                    "id": h.doc["id"],
                    "source": h.doc["source"],
                    "topic": h.doc["topic"],
                    "score": h.score,
                    "snippet": h.doc["text"][:160],
                }
                for h in hits
            ],
            retrieved=len(hits),
        )

    def heatmap_brief(
        self,
        *,
        weight: str = "density",
        region: str = "Chennai",
        competitor_count: int = 0,
    ) -> RagAnswer:
        """Convenience path for competitor / admin heatmaps."""
        q = (
            f"heatmap {weight} competitors near {region} "
            f"price threat order volume density"
        )
        answer = self.query(q, source="heatmap", top_k=2)
        preface = (
            f"(dummy RAG · heatmap) {region}: {competitor_count} nearby shops, "
            f"weight={weight}.\n"
        )
        answer.answer = preface + answer.answer
        return answer


_rag: DummyRAG | None = None


def get_rag() -> DummyRAG:
    global _rag
    if _rag is None:
        _rag = DummyRAG()
    return _rag
