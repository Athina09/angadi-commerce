"""Dummy RAG pipeline — in-memory corpus + keyword retrieve. Not production."""

from .pipeline import DummyRAG, get_rag

__all__ = ["DummyRAG", "get_rag"]
