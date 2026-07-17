/**
 * Dummy RAG client — proxies to ML service keyword pipeline.
 * Falls back to a local stub if ML is down. Not production.
 */

const ML_BASE = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
);

export type RagCitation = {
  id: string;
  source: string;
  topic: string;
  score: number;
  snippet: string;
};

export type RagResult = {
  answer: string;
  citations: RagCitation[];
  mode: string;
  retrieved: number;
  weight?: string;
  region?: string;
};

function localDummy(query: string, source?: string): RagResult {
  return {
    answer: `(dummy RAG · offline) Stub answer for “${query}”${
      source ? ` [${source}]` : ""
    }. Start ml-service for corpus retrieve.`,
    citations: [],
    mode: "dummy-offline",
    retrieved: 0,
  };
}

export async function ragQuery(
  query: string,
  opts?: { source?: string; topK?: number }
): Promise<RagResult> {
  try {
    const res = await fetch(`${ML_BASE}/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        source: opts?.source,
        topK: opts?.topK ?? 3,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return localDummy(query, opts?.source);
    return (await res.json()) as RagResult;
  } catch {
    return localDummy(query, opts?.source);
  }
}

export async function ragHeatmapBrief(opts: {
  weight?: string;
  region?: string;
  competitorCount?: number;
}): Promise<RagResult> {
  try {
    const res = await fetch(`${ML_BASE}/rag/heatmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight: opts.weight ?? "density",
        region: opts.region ?? "Chennai",
        competitorCount: opts.competitorCount ?? 0,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return localDummy(`heatmap ${opts.weight ?? "density"}`, "heatmap");
    }
    return (await res.json()) as RagResult;
  } catch {
    return localDummy(`heatmap ${opts.weight ?? "density"}`, "heatmap");
  }
}
