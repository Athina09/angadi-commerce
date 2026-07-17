/**
 * Hybrid freshness scoring — category decay curve × last quality check.
 * Predicts days remaining until unsellable (not a trained spoilage DL model).
 */

export type DecayCurveType = "FAST_EARLY" | "LINEAR" | "SLOW";

export type FreshnessBand = "fresh" | "fading" | "discard_soon" | "expired";

export type FreshnessResult = {
  percent: number;
  band: FreshnessBand;
  label: FreshnessBand;
  text: string;
  confidence: "verified" | "estimated";
  confidenceText: string;
  daysSinceCheck: number;
  /** Predicted days until discard threshold — quality-aware */
  daysLeft: number;
  daysSurviveText: string;
  shelfLifeDays: number;
  curveFactor: number;
  qualityScore: number;
  decayCurveType: DecayCurveType;
};

const VERIFY_WINDOW_DAYS = 3;
/** Below this hybrid ratio → treat as discard / unsellable */
const DISCARD_THRESHOLD = 0.35;
const EXPIRED_THRESHOLD = 0.05;

export const DECAY_CURVES: Record<
  DecayCurveType,
  (days: number, shelfLife: number) => number
> = {
  LINEAR: (days, shelfLife) =>
    Math.max(0, 1 - days / Math.max(1, shelfLife)),
  FAST_EARLY: (days, shelfLife) => {
    const earlyDrop = Math.min(days, 2) * 0.25;
    const laterDrop = Math.max(0, days - 2) * (0.5 / Math.max(1, shelfLife));
    return Math.max(0, 1 - earlyDrop - laterDrop);
  },
  SLOW: (days, shelfLife) =>
    Math.max(0, 1 - days / (Math.max(1, shelfLife) * 1.5)),
};

export function daysBetween(from: Date | string, to: Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  return Math.max(0, Math.floor((to.getTime() - a.getTime()) / 86400000));
}

/**
 * How many more days until quality × decay drops below discard threshold.
 * Already-rotten produce → 0.
 */
export function predictDaysSurvive(input: {
  shelfLifeDays: number;
  decayCurveType: DecayCurveType;
  daysSinceCheck: number;
  qualityScore: number;
}): number {
  const quality = Math.max(0, Math.min(1, input.qualityScore));
  const curveFn =
    DECAY_CURVES[input.decayCurveType] ?? DECAY_CURVES.LINEAR;
  const shelf = Math.max(1, input.shelfLifeDays);
  const since = Math.max(0, input.daysSinceCheck);

  // Already at/below discard quality
  if (quality <= DISCARD_THRESHOLD) {
    if (quality <= EXPIRED_THRESHOLD) return 0;
    // Fading into discard — at most 1 day to sell/clear
    return quality < 0.25 ? 0 : 1;
  }

  const horizon = Math.ceil(shelf * 2) + 2;
  for (let d = 0; d <= horizon; d++) {
    const factor = curveFn(since + d, shelf);
    const ratio = quality * factor;
    if (ratio < DISCARD_THRESHOLD) {
      return Math.max(0, d);
    }
  }
  // Still above threshold at horizon — clamp to remaining nominal life
  return Math.max(0, Math.ceil(shelf - since));
}

export function freshnessPercent(input: {
  shelfLifeDays: number;
  decayCurveType: DecayCurveType;
  lastCheckedAt: Date | string;
  lastCheckQualityScore?: number;
  now?: Date;
}): number {
  const days = daysBetween(input.lastCheckedAt, input.now ?? new Date());
  const curveFn =
    DECAY_CURVES[input.decayCurveType] ?? DECAY_CURVES.LINEAR;
  const curveFactor = curveFn(days, input.shelfLifeDays);
  const quality = input.lastCheckQualityScore ?? 1.0;
  return Math.max(0, Math.min(1, quality * curveFactor));
}

function bandFor(percent: number): FreshnessBand {
  if (percent <= EXPIRED_THRESHOLD) return "expired";
  if (percent < DISCARD_THRESHOLD) return "discard_soon";
  if (percent < 0.7) return "fading";
  return "fresh";
}

function bandEmoji(band: FreshnessBand): string {
  switch (band) {
    case "fresh":
      return "🟢";
    case "fading":
      return "🟡";
    case "discard_soon":
    case "expired":
      return "🔴";
  }
}

function bandTitle(band: FreshnessBand, percent?: number): string {
  switch (band) {
    case "fresh":
      return "Fresh";
    case "fading":
      return "Fading";
    case "discard_soon":
      return percent != null && percent < 20 ? "Rotten" : "Discard soon";
    case "expired":
      return "Expired";
  }
}

function formatAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function formatDaysSurvive(daysLeft: number, band: FreshnessBand): string {
  if (band === "expired" || daysLeft <= 0) {
    return "0 days left — discard now";
  }
  if (daysLeft === 1) return "~1 day left";
  return `~${daysLeft} days left`;
}

/** Full hybrid freshness payload for API + UI badges */
export function computeFreshness(input: {
  shelfLifeDays: number;
  decayCurveType: DecayCurveType;
  lastCheckedAt: Date | string;
  lastCheckQualityScore?: number;
  now?: Date;
}): FreshnessResult {
  const now = input.now ?? new Date();
  const daysSinceCheck = daysBetween(input.lastCheckedAt, now);
  const qualityScore = input.lastCheckQualityScore ?? 1.0;
  const curveFn =
    DECAY_CURVES[input.decayCurveType] ?? DECAY_CURVES.LINEAR;
  const curveFactor = curveFn(daysSinceCheck, input.shelfLifeDays);
  const ratio = Math.max(0, Math.min(1, qualityScore * curveFactor));
  const percent = Math.round(ratio * 100);
  const band = bandFor(ratio);
  const verified = daysSinceCheck <= VERIFY_WINDOW_DAYS;
  const confidence = verified ? "verified" : "estimated";
  const confidenceText = verified
    ? `verified ${formatAgo(daysSinceCheck)}`
    : `est. — unverified ${daysSinceCheck}d`;

  const daysLeft = predictDaysSurvive({
    shelfLifeDays: input.shelfLifeDays,
    decayCurveType: input.decayCurveType,
    daysSinceCheck,
    qualityScore,
  });
  const daysSurviveText = formatDaysSurvive(daysLeft, band);

  return {
    percent,
    band,
    label: band,
    text: `${bandEmoji(band)} ${bandTitle(band, percent)} · ${percent}%`,
    confidence,
    confidenceText,
    daysSinceCheck,
    daysLeft,
    daysSurviveText,
    shelfLifeDays: input.shelfLifeDays,
    curveFactor: Math.round(curveFactor * 1000) / 1000,
    qualityScore,
    decayCurveType: input.decayCurveType,
  };
}

/** Map catalog name/category → seed decay curve */
export function suggestDecayCurve(
  name: string,
  category: string
): DecayCurveType {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (
    /spinach|keerai|coriander|herb|leaf|கீரை|கொத்தமல்லி|idli|milk|பால்/.test(
      n
    ) ||
    c === "herbs"
  ) {
    return "FAST_EARLY";
  }
  if (
    /coconut|தேங்காய்|rice|dal|oil|egg|onion|potato|grocery/.test(n) ||
    c === "grocery"
  ) {
    if (/egg|onion|potato/.test(n)) return "LINEAR";
    // Whole coconut flesh spoils faster once cracked / moldy — keep LINEAR for fresh coconut
    if (/coconut|தேங்காய்/.test(n) && !/oil|எண்ணெய்/.test(n)) return "LINEAR";
    return "SLOW";
  }
  return "LINEAR";
}
