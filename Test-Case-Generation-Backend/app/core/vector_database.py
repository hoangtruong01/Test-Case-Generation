
import ollama
from app.core.config import settings
import chromadb.config
import chromadb
from typing import Sequence

chromadb_client = chromadb.Client(
    settings=chromadb.config.Settings(
        persist_directory="../vector_data",
        is_persistent=True,
        anonymized_telemetry=True,
    )
)
collection = chromadb_client.get_or_create_collection(name="requirements")


def chromadb_healthcheck() -> None:

    try:
        if hasattr(chromadb_client, "heartbeat"):
            chromadb_client.heartbeat()
        else:
            chromadb_client.list_collections()
    except Exception as exc:
        raise RuntimeError("ChromaDB healthcheck failed") from exc


def embed_text(text: str) -> Sequence[float]:
    response = ollama.embeddings(
        model=str(settings.LOCAL_EMBED_MODEL),
        prompt=text,
        options=None,
        keep_alive=None
    )
    return response.embedding


def upsert_requirements(doc_id: str, text: str, metadata: dict | None = None):
    vector: Sequence[float] = embed_text(text)

    collection.upsert(
        ids=[doc_id],
        embeddings=[vector],
        metadatas=[metadata or {}],
        documents=[text]
    )


def vector_search(query: str, limit: int = 5):
    vector = embed_text(query)

    results = collection.query(
        query_embeddings=[vector],
        query_texts=None,
        query_images=None,
        query_uris=None,
        ids=None,
        n_results=limit,
        where=None,
        where_document=None,
        include=["metadatas", "documents", "distances"]
    )

    return results
