/**
 * Hybrid freshness — category decay × quality check.
 * Predicts days remaining until unsellable (not a trained spoilage DL model).
 */

export type DecayCurveType = "FAST_EARLY" | "LINEAR" | "SLOW";

/** @deprecated prefer FreshnessBand — kept for InventoryAiInsights */
export type FreshnessLabel =
  | "fresh"
  | "sell_soon"
  | "near_expiry"
  | "expired"
  | "fading"
  | "discard_soon";

export type FreshnessBand = "fresh" | "fading" | "discard_soon" | "expired";

export type HybridFreshness = {
  percent: number;
  band: FreshnessBand;
  label: FreshnessLabel;
  text: string;
  confidence: "verified" | "estimated";
  confidenceText: string;
  daysSinceCheck: number;
  daysLeft: number;
  daysSurviveText: string;
  shelfLifeDays: number;
  decayCurveType: DecayCurveType;
};

const VERIFY_WINDOW_DAYS = 3;
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

function daysBetween(from: Date | string, to: Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  return Math.max(0, Math.floor((to.getTime() - a.getTime()) / 86400000));
}

function bandFor(percent: number): FreshnessBand {
  if (percent <= EXPIRED_THRESHOLD) return "expired";
  if (percent < DISCARD_THRESHOLD) return "discard_soon";
  if (percent < 0.7) return "fading";
  return "fresh";
}

function toLegacyLabel(band: FreshnessBand): FreshnessLabel {
  switch (band) {
    case "fresh":
      return "fresh";
    case "fading":
      return "sell_soon";
    case "discard_soon":
      return "near_expiry";
    case "expired":
      return "expired";
  }
}

function formatAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

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

  if (quality <= DISCARD_THRESHOLD) {
    if (quality <= EXPIRED_THRESHOLD) return 0;
    return quality < 0.25 ? 0 : 1;
  }

  const horizon = Math.ceil(shelf * 2) + 2;
  for (let d = 0; d <= horizon; d++) {
    const factor = curveFn(since + d, shelf);
    if (quality * factor < DISCARD_THRESHOLD) {
      return Math.max(0, d);
    }
  }
  return Math.max(0, Math.ceil(shelf - since));
}

export function formatDaysSurvive(
  daysLeft: number,
  band: FreshnessBand
): string {
  if (band === "expired" || daysLeft <= 0) {
    return "0 days left — discard now";
  }
  if (daysLeft === 1) return "~1 day left";
  return `~${daysLeft} days left`;
}

export type FreshnessInput = {
  shelfLifeDays: number;
  decayCurveType?: DecayCurveType | string | null;
  lastCheckedAt?: string | Date | null;
  listedAt?: string | Date;
  lastCheckQualityScore?: number | null;
};

/** Preferred hybrid scorer */
export function hybridFreshness(input: FreshnessInput): HybridFreshness {
  const curve = (input.decayCurveType as DecayCurveType) || "LINEAR";
  const checkAt = input.lastCheckedAt ?? input.listedAt ?? new Date();
  const daysSinceCheck = daysBetween(checkAt);
  const quality = input.lastCheckQualityScore ?? 1.0;
  const curveFn = DECAY_CURVES[curve] ?? DECAY_CURVES.LINEAR;
  const curveFactor = curveFn(daysSinceCheck, input.shelfLifeDays);
  const ratio = Math.max(0, Math.min(1, quality * curveFactor));
  const percent = Math.round(ratio * 100);
  const band = bandFor(ratio);
  const verified = daysSinceCheck <= VERIFY_WINDOW_DAYS;
  const daysLeft = predictDaysSurvive({
    shelfLifeDays: input.shelfLifeDays,
    decayCurveType: curve,
    daysSinceCheck,
    qualityScore: quality,
  });
  const daysSurviveText = formatDaysSurvive(daysLeft, band);

  const title =
    band === "fresh"
      ? "Fresh"
      : band === "fading"
        ? "Fading"
        : band === "discard_soon"
          ? percent < 20
            ? "Rotten"
            : "Discard soon"
          : "Expired";
  const emoji =
    band === "fresh" ? "🟢" : band === "fading" ? "🟡" : "🔴";

  return {
    percent,
    band,
    label: toLegacyLabel(band),
    text: `${emoji} ${title} · ${percent}%`,
    confidence: verified ? "verified" : "estimated",
    confidenceText: verified
      ? `verified ${formatAgo(daysSinceCheck)}`
      : `est. — unverified ${daysSinceCheck}d`,
    daysSinceCheck,
    daysLeft,
    daysSurviveText,
    shelfLifeDays: input.shelfLifeDays,
    decayCurveType: curve,
  };
}

/**
 * @deprecated calendar-only — prefer hybridFreshness
 */
export function freshnessFor(
  shelfLifeDays: number,
  listedAt: string | Date,
  extras?: Omit<FreshnessInput, "shelfLifeDays" | "listedAt">
): HybridFreshness {
  return hybridFreshness({
    shelfLifeDays,
    listedAt,
    ...extras,
  });
}

export function freshnessBadgeClass(label: FreshnessLabel | FreshnessBand): string {
  switch (label) {
    case "fresh":
      return "bg-emerald-50 text-emerald-800";
    case "sell_soon":
    case "fading":
      return "bg-amber-50 text-amber-800";
    case "near_expiry":
    case "discard_soon":
    case "expired":
      return "bg-red-50 text-red-700";
  }
}

export function freshnessConfidenceClass(
  confidence: "verified" | "estimated"
): string {
  return confidence === "verified"
    ? "text-muted"
    : "text-muted/80 italic";
}
