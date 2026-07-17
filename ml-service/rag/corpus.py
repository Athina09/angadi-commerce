"""Seed documents for the dummy RAG corpus (hackathon placeholders)."""

from typing import TypedDict


class RagDoc(TypedDict):
    id: str
    source: str
    topic: str
    text: str


SEED_DOCS: list[RagDoc] = [
    {
        "id": "hm-001",
        "source": "heatmap",
        "topic": "competitor-density",
        "text": (
            "T. Nagar and Anna Nagar show high competitor density for produce. "
            "Vendors within 2km of Pondy Bazaar see 18–24% more evening footfall."
        ),
    },
    {
        "id": "hm-002",
        "source": "heatmap",
        "topic": "price-threat",
        "text": (
            "Price-threat heat spikes when nearby shops undercut tomatoes and bananas "
            "by more than 8%. Match or bundle rather than race to the bottom."
        ),
    },
    {
        "id": "hm-003",
        "source": "heatmap",
        "topic": "order-volume",
        "text": (
            "Order-volume heat maps peak 5–8pm near residential pockets in Adyar and "
            "Velachery. Pre-stage leafy greens before the rush."
        ),
    },
    {
        "id": "fx-001",
        "source": "freshness",
        "topic": "spoilage",
        "text": (
            "Leafy greens fade fastest (LINEAR decay). Discount at <55% quality; "
            "discard below 30%. Coconuts tolerate longer LINEAR windows."
        ),
    },
    {
        "id": "fx-002",
        "source": "freshness",
        "topic": "recheck",
        "text": (
            "Photo recheck with mold-aware scoring should auto-apply when confidence "
            "is high. Manual Rotten tag forces ~12% quality."
        ),
    },
    {
        "id": "inv-001",
        "source": "inventory",
        "topic": "restock",
        "text": (
            "Restock SKUs below low-stock threshold before noon for evening demand. "
            "Critical stock (<3 units) triggers WhatsApp/SMS alerts when configured."
        ),
    },
    {
        "id": "mkt-001",
        "source": "market",
        "topic": "pricing",
        "text": (
            "Chennai wholesale tomato reference sits near ₹28–36/kg depending on season. "
            "Stay within ±6% of competitorRefPrice to protect conversion."
        ),
    },
    {
        "id": "adm-001",
        "source": "admin",
        "topic": "region-heat",
        "text": (
            "Admin seller heatmap highlights high-priority vendors with elevated order "
            "volume and unresolved alerts across Tamil Nadu demo regions."
        ),
    },
]
