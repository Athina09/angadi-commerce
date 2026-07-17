/**
 * Node fallback when ml-service is down.
 * Deterministic category heuristic — still NOT a trained spoilage model.
 * Prefer OpenCV path via ML_SERVICE_URL/quality-check.
 */

import { createHash } from "crypto";

export type QualityComponents = {
  blemishRatio: number;
  blemishScore: number;
  saturationScore?: number;
};

export type QualityResult = {
  qualityScore: number;
  components: QualityComponents;
  method: string;
  model: string;
  note: string;
  source: "ml-opencv" | "node-fallback";
};

const LEAFY = /vegetable|herb|leaf|spinach|coriander|keerai|greens/i;

function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function bufferFingerprint(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

/** Rough brightness / “dark spot” signal from raw bytes (works without a decoder). */
function bufferToneStats(buf: Buffer): { darkShare: number; mean: number } {
  if (buf.length < 64) return { darkShare: 0.1, mean: 128 };
  const step = Math.max(1, Math.floor(buf.length / 4000));
  let sum = 0;
  let dark = 0;
  let n = 0;
  for (let i = 0; i < buf.length; i += step) {
    const v = buf[i]!;
    sum += v;
    if (v < 48) dark += 1;
    n += 1;
  }
  return {
    mean: sum / Math.max(n, 1),
    darkShare: dark / Math.max(n, 1),
  };
}

export function fallbackQualityScore(
  category: string,
  imageUrl?: string,
  imageBuffer?: Buffer
): QualityResult {
  const leafy = LEAFY.test(category);
  const seed = imageBuffer?.length
    ? bufferFingerprint(imageBuffer)
    : `${category}|${imageUrl ?? ""}`;
  const noise = hash01(seed) * 0.14;
  let blemishRatio = Math.min(0.42, 0.06 + noise);

  if (imageBuffer && imageBuffer.length > 0) {
    const tone = bufferToneStats(imageBuffer);
    // More dark-byte density → more “blemish-like” in the fallback
    blemishRatio = Math.min(
      0.55,
      Math.max(0.03, tone.darkShare * 1.8 + noise * 0.5)
    );
  }

  const blemishScore = Math.round((1 - blemishRatio) * 100) / 100;
  const components: QualityComponents = {
    blemishRatio: Math.round(blemishRatio * 1000) / 1000,
    blemishScore,
  };
  let qualityScore = blemishScore;
  let method = imageBuffer?.length
    ? "photo buffer heuristic (node fallback)"
    : "blemish-only (node fallback)";
  if (leafy) {
    const saturationScore = Math.round((0.68 + noise * 0.9) * 100) / 100;
    components.saturationScore = Math.min(1, saturationScore);
    qualityScore =
      Math.round((0.6 * blemishScore + 0.4 * components.saturationScore) * 100) /
      100;
    method = imageBuffer?.length
      ? "photo buffer + leafy (node fallback)"
      : "blemish+saturation leafy (node fallback)";
  }
  return {
    qualityScore,
    components,
    method,
    model: "opencv-heuristic",
    note: imageBuffer?.length
      ? "Scored your uploaded photo via node fallback (start ml-service for OpenCV). Not a trained DL model."
      : "Fallback heuristic — start ml-service for real OpenCV scoring. Not a trained DL model.",
    source: "node-fallback",
  };
}

export async function runQualityCheck(args: {
  category: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  filename?: string;
}): Promise<QualityResult> {
  const base = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  );

  try {
    if (args.imageBuffer && args.imageBuffer.length > 0) {
      const form = new FormData();
      form.append("category", args.category || "Vegetables");
      const bytes = new Uint8Array(args.imageBuffer);
      form.append(
        "file",
        new Blob([bytes], { type: "image/jpeg" }),
        args.filename || "produce.jpg"
      );
      const res = await fetch(`${base}/quality-check`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as Omit<QualityResult, "source">;
        return { ...data, source: "ml-opencv" };
      }
      console.warn(
        "ml-service quality-check status",
        res.status,
        await res.text().catch(() => "")
      );
    }

    if (args.imageUrl && !args.imageBuffer?.length) {
      const res = await fetch(`${base}/quality-check-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: args.imageUrl,
          category: args.category || "Vegetables",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as Omit<QualityResult, "source">;
        return { ...data, source: "ml-opencv" };
      }
    }
  } catch (err) {
    console.warn("ml-service quality-check unavailable", err);
  }

  return fallbackQualityScore(args.category, args.imageUrl, args.imageBuffer);
}
