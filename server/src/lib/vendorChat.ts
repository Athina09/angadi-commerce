/**
 * Vendor hub AI assistant — context answers from live inventory.
 * Uses OPENAI_API_KEY when set; otherwise a professional rule-based advisor.
 * Not a trained spoilage model — freshness answers cite hybrid decay scores.
 */

import { prisma } from "./prisma.js";
import { computeFreshness } from "./freshness.js";
import { CRITICAL_STOCK_LT } from "./notify.js";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ListingContext = {
  id: string;
  name: string;
  category: string;
  stock: number;
  threshold: number;
  price: number;
  market: number;
  freshnessPct: number;
  freshnessBand: string;
  curve: string;
};

async function loadVendorContext(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      listings: {
        include: {
          catalog: {
            select: {
              name: true,
              category: true,
              shelfLifeDays: true,
              decayCurveType: true,
            },
          },
        },
        orderBy: { stock: "asc" },
        take: 40,
      },
    },
  });
  if (!vendor) return null;

  const listings: ListingContext[] = vendor.listings.map((l) => {
    const fresh = computeFreshness({
      shelfLifeDays: l.catalog.shelfLifeDays,
      decayCurveType: l.catalog.decayCurveType,
      lastCheckedAt: l.lastCheckedAt,
      lastCheckQualityScore: l.lastCheckQualityScore,
    });
    return {
      id: l.id,
      name: l.catalog.name.split("(")[0].trim(),
      category: l.catalog.category,
      stock: l.stock,
      threshold: l.lowStockThreshold,
      price: l.price,
      market: l.competitorRefPrice,
      freshnessPct: fresh.percent,
      freshnessBand: fresh.band,
      curve: l.catalog.decayCurveType,
    };
  });

  return {
    storeName: vendor.storeName,
    verified: vendor.verified,
    listings,
    critical: listings.filter((l) => l.stock < CRITICAL_STOCK_LT),
    low: listings.filter((l) => l.stock <= l.threshold),
    fading: listings.filter(
      (l) => l.freshnessBand === "fading" || l.freshnessBand === "discard_soon"
    ),
    underMarket: listings.filter((l) => l.price < l.market * 0.92),
  };
}

function contextSummary(ctx: NonNullable<Awaited<ReturnType<typeof loadVendorContext>>>) {
  const lines = [
    `Store: ${ctx.storeName} (${ctx.verified ? "verified" : "pending verification"})`,
    `SKUs: ${ctx.listings.length}`,
    `Critical stock (<${CRITICAL_STOCK_LT}): ${ctx.critical.map((l) => `${l.name} (${l.stock})`).join(", ") || "none"}`,
    `Low stock: ${ctx.low
      .slice(0, 6)
      .map((l) => `${l.name} (${l.stock})`)
      .join(", ") || "none"}`,
    `Freshness watch: ${ctx.fading
      .slice(0, 6)
      .map((l) => `${l.name} ${l.freshnessPct}%`)
      .join(", ") || "none"}`,
    `Priced under market: ${ctx.underMarket
      .slice(0, 4)
      .map((l) => `${l.name} ₹${l.price} vs ₹${l.market}`)
      .join(", ") || "none"}`,
  ];
  return lines.join("\n");
}

function ruleBasedReply(
  question: string,
  ctx: NonNullable<Awaited<ReturnType<typeof loadVendorContext>>>
): string {
  const q = question.toLowerCase();

  if (/hello|hi\b|hey|vanakkam|namaste/.test(q)) {
    return `Hello — I'm your Angadi vendor advisor for **${ctx.storeName}**. Ask about stock, freshness, pricing, or what to push this evening.`;
  }

  if (/critical|stock\s*<\s*4|out of stock|run.?out|alert|sms|email/.test(q)) {
    if (ctx.critical.length === 0) {
      return `No SKUs are under ${CRITICAL_STOCK_LT} units right now. Low-stock watchlist: ${
        ctx.low.slice(0, 4).map((l) => `**${l.name}** (${l.stock})`).join(", ") || "clear"
      }. Critical drops trigger email/SMS from Low-stock alerts.`;
    }
    return [
      `**Critical stock** (<${CRITICAL_STOCK_LT}) — restock or pause listing:`,
      ...ctx.critical.map((l) => `• **${l.name}** — ${l.stock} left`),
      `Live alerts fire automatically when stock crosses below ${CRITICAL_STOCK_LT}.`,
    ].join("\n");
  }

  if (/fresh|spoil|decay|quality|discard|fading/.test(q)) {
    if (ctx.fading.length === 0) {
      return `Freshness looks stable across your shelf (hybrid decay curves × quality score). Leafy items use **FAST_EARLY**; dry goods use **SLOW**. Recheck photos soon for higher confidence.`;
    }
    return [
      `**Freshness watch** (hybrid score — not a trained spoilage model):`,
      ...ctx.fading.slice(0, 6).map(
        (l) =>
          `• **${l.name}** — ${l.freshnessPct}% (${l.freshnessBand.replace("_", " ")}, ${l.curve})`
      ),
      `Promote fading SKUs this evening or mark a manual recheck on Live inventory.`,
    ].join("\n");
  }

  if (/price|margin|competitor|undercut|market/.test(q)) {
    if (ctx.underMarket.length === 0) {
      return `You're aligned with market on most SKUs. Spot-check Competitor map for zone undercuts, then nudge 3–5% only where conversion holds.`;
    }
    return [
      `**Margin room** vs reference market:`,
      ...ctx.underMarket.slice(0, 5).map(
        (l) =>
          `• **${l.name}** — yours ₹${l.price.toFixed(0)} · market ₹${l.market.toFixed(0)}`
      ),
      `Test a small uplift on high-viewer items first.`,
    ].join("\n");
  }

  if (/bundle|upsell|basket|evening|rush|timing|demand/.test(q)) {
    const top = ctx.listings.sort((a, b) => b.stock - a.stock)[0];
    const herb = ctx.listings.find((l) => /coriander|spinach|chilli|tomato/i.test(l.name));
    return [
      `**Evening demand (6–8 pm)** usually converts best for hyperlocal produce.`,
      top
        ? `Anchor a flash deal on **${top.name}**, then bundle with ${herb?.name ?? "a complementary vegetable"}.`
        : `Schedule a short promo window and feature your top viewed SKUs.`,
      `Keep critical-stock items out of deep discounts until replenished.`,
    ].join("\n");
  }

  if (/restock|reorder|inventory|what.*(buy|order)/.test(q)) {
    const criticalIds = new Set(ctx.critical.map((l) => l.id));
    const targets = [
      ...ctx.critical,
      ...ctx.low.filter((l) => !criticalIds.has(l.id)),
    ].slice(0, 6);
    if (targets.length === 0) {
      return `Inventory is healthy against your thresholds. Recheck Live inventory mid-afternoon before the evening rush.`;
    }
    return [
      `**Restock priority:**`,
      ...targets.map(
        (l) =>
          `• **${l.name}** — ${l.stock} left (threshold ${l.threshold})`
      ),
    ].join("\n");
  }

  if (/help|what can|capabilities|commands/.test(q)) {
    return [
      `I can advise on:`,
      `• Critical & low stock`,
      `• Freshness / decay curves`,
      `• Pricing vs market`,
      `• Bundles & evening timing`,
      `Ask in plain English — e.g. “What should I restock?”`,
    ].join("\n");
  }

  // Default briefing
  const headline =
    ctx.critical.length > 0
      ? `${ctx.critical.length} critical SKU(s) need attention`
      : ctx.fading.length > 0
        ? `${ctx.fading.length} item(s) fading on freshness`
        : "Shelf is in good shape";

  return [
    `**${ctx.storeName} — quick brief:** ${headline}.`,
    ctx.critical[0]
      ? `Top risk: **${ctx.critical[0].name}** (${ctx.critical[0].stock} left).`
      : ctx.low[0]
        ? `Watch: **${ctx.low[0].name}** at ${ctx.low[0].stock} units.`
        : `No urgent stock issues.`,
    `Try asking: “Show critical stock”, “Freshness watch”, or “Where is my margin room?”`,
  ].join("\n");
}

async function openAiReply(
  question: string,
  history: ChatMessage[],
  ctx: NonNullable<Awaited<ReturnType<typeof loadVendorContext>>>
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const system = `You are Angadi Vendor Advisor — concise, professional, actionable.
You help Indian hyperlocal produce vendors. Use ₹. Keep answers under 120 words.
Cite store facts from context. Freshness scores are hybrid decay curves × quality heuristics — NOT a trained deep-learning spoilage classifier. Be honest about that if asked.
Context:\n${contextSummary(ctx)}`;

  const messages = [
    { role: "system", content: system },
    ...history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 350,
        messages,
      }),
    });
    if (!res.ok) {
      console.warn("OpenAI chat failed", await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("OpenAI chat error", err);
    return null;
  }
}

export async function answerVendorChat(args: {
  vendorId: string;
  message: string;
  history?: ChatMessage[];
}): Promise<{ reply: string; mode: "live" | "advisor"; suggestions: string[] }> {
  const ctx = await loadVendorContext(args.vendorId);
  if (!ctx) {
    return {
      reply: "Complete vendor onboarding first so I can see your inventory.",
      mode: "advisor",
      suggestions: ["How do I get started?"],
    };
  }

  const question = args.message.trim().slice(0, 800);
  const history = args.history ?? [];

  const live = await openAiReply(question, history, ctx);
  const reply = live ?? ruleBasedReply(question, ctx);

  const suggestions = [
    "What should I restock?",
    "Show freshness watch",
    "Where is my margin room?",
    "Evening rush tips",
  ].filter((s) => !question.toLowerCase().includes(s.toLowerCase().slice(0, 8)));

  return {
    reply,
    mode: live ? "live" : "advisor",
    suggestions: suggestions.slice(0, 3),
  };
}
