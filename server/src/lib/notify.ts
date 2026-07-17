import { prisma } from "./prisma.js";
import { getIO } from "./io.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

/** User rule: stock less than 4 → live email/SMS */
export const CRITICAL_STOCK_LT = 4;

type NotifyPayload = {
  vendorId: string;
  listingId: string;
  catalogName: string;
  stock: number;
  lowStockThreshold: number;
};

type ChannelResult = {
  channel: "email" | "sms";
  to: string;
  ok: boolean;
  mode: "live" | "demo";
  detail: string;
};

/** Cooldown so sim ticks don't spam the same SKU (manual stock edits bypass) */
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 90_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHONE_STORE = join(__dirname, "../../.data/vendor-alert-phones.json");

/** In-memory + disk so prefs survive server restarts */
const vendorPhones = new Map<string, string>();

function loadPhoneStore() {
  try {
    if (!existsSync(PHONE_STORE)) return;
    const raw = JSON.parse(readFileSync(PHONE_STORE, "utf8")) as Record<
      string,
      string
    >;
    for (const [id, phone] of Object.entries(raw)) {
      vendorPhones.set(id, phone);
    }
  } catch {
    /* ignore */
  }
}

function savePhoneStore() {
  try {
    mkdirSync(dirname(PHONE_STORE), { recursive: true });
    const obj: Record<string, string> = {};
    for (const [id, phone] of vendorPhones) obj[id] = phone;
    writeFileSync(PHONE_STORE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.warn("Could not persist alert phones", err);
  }
}

loadPhoneStore();

/** Normalize IN mobiles: 6379479639 → +916379479639 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function setVendorAlertPhone(vendorId: string, phone: string) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) vendorPhones.delete(vendorId);
  else vendorPhones.set(vendorId, cleaned);
  savePhoneStore();
}

export function getVendorAlertPhone(vendorId: string): string | null {
  return (
    vendorPhones.get(vendorId) ||
    (process.env.ALERT_DEMO_PHONE
      ? normalizePhone(process.env.ALERT_DEMO_PHONE)
      : null) ||
    null
  );
}

function defaultAlertPhone(): string {
  return normalizePhone(
    process.env.ALERT_DEMO_PHONE || "6379479639"
  );
}

function shouldSend(
  listingId: string,
  stock: number,
  force = false
): boolean {
  if (stock >= CRITICAL_STOCK_LT) return false;
  if (force) {
    lastSent.set(listingId, Date.now());
    return true;
  }
  const prev = lastSent.get(listingId) ?? 0;
  if (Date.now() - prev < COOLDOWN_MS) return false;
  lastSent.set(listingId, Date.now());
  return true;
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<ChannelResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const from =
    process.env.SMTP_FROM ||
    process.env.ALERT_FROM ||
    "Angadi Alerts <onboarding@resend.dev>";

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn("Resend failed", text);
        return demoEmail(to, subject, body, text);
      }
      return {
        channel: "email",
        to,
        ok: true,
        mode: "live",
        detail: `Resend → ${to}`,
      };
    } catch (err) {
      console.warn("Email send failed", err);
      return demoEmail(to, subject, body, String(err));
    }
  }

  return demoEmail(to, subject, body);
}

function demoEmail(
  to: string,
  subject: string,
  body: string,
  note?: string
): ChannelResult {
  console.log(
    `\n📧 [DEMO EMAIL ALERT]\nTo: ${to}\nSubject: ${subject}\n${body}${note ? `\n(${note})` : ""}\n`
  );
  return {
    channel: "email",
    to,
    ok: true,
    mode: "demo",
    detail: note
      ? `Demo log (${note})`
      : "Demo log — set RESEND_API_KEY for live email",
  };
}

async function sendSmsViaTwilio(
  to: string,
  message: string
): Promise<ChannelResult | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return null;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("Twilio failed", text);
    return null;
  }
  return {
    channel: "sms",
    to,
    ok: true,
    mode: "live",
    detail: `Twilio → ${to}`,
  };
}

async function sendSmsViaFast2Sms(
  to: string,
  message: string
): Promise<ChannelResult | null> {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return null;
  const numbers = to.replace(/^\+91/, "").replace(/\D/g, "");
  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    return?: boolean;
    message?: string | string[];
  };
  if (!res.ok || data.return === false) {
    console.warn("Fast2SMS failed", data);
    return null;
  }
  return {
    channel: "sms",
    to,
    ok: true,
    mode: "live",
    detail: `Fast2SMS → ${to}`,
  };
}

/** Local Mac → SMS via iPhone Continuity (green bubble), NOT iMessage */
async function sendSmsViaMacMessages(
  to: string,
  message: string
): Promise<ChannelResult | null> {
  if (process.platform !== "darwin") return null;
  if (process.env.SMS_LOCAL_MAC === "false") return null;

  const digits = to.replace(/\D/g, "");
  const candidates = Array.from(
    new Set(
      [
        to,
        digits.length === 10 ? `+91${digits}` : null,
        digits.length === 12 && digits.startsWith("91") ? `+${digits}` : null,
        digits.length >= 10 ? digits.slice(-10) : null,
        digits,
      ].filter(Boolean) as string[]
    )
  );

  const safeMsg = message
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .slice(0, 300);

  for (const num of candidates) {
    const safeTo = num.replace(/"/g, "");
    // Prefer SMS service (needs iPhone Text Message Forwarding). Fall back to iMessage.
    const script = `
on run
  tell application "Messages"
    set targetService to missing value
    try
      set targetService to first service whose service type is SMS
    end try
    if targetService is missing value then
      try
        set targetService to first service whose service type is iMessage
      end try
    end if
    if targetService is missing value then error "No Messages SMS/iMessage service"
    set targetBuddy to buddy "${safeTo}" of targetService
    send "${safeMsg}" to targetBuddy
  end tell
  return "ok"
end run
`;
    try {
      await execFileAsync("osascript", ["-e", script], { timeout: 20000 });
      console.log(`📱 Mac Continuity SMS accepted → ${safeTo}`);
      return {
        channel: "sms",
        to: safeTo.startsWith("+") ? safeTo : `+91${safeTo.slice(-10)}`,
        ok: true,
        mode: "live",
        detail: `Mac→iPhone SMS Continuity → ${safeTo} (enable Text Message Forwarding on iPhone if it doesn't arrive)`,
      };
    } catch (err) {
      console.warn(`Mac SMS failed for ${safeTo}`, err);
    }
  }
  return null;
}

async function sendSms(to: string, message: string): Promise<ChannelResult> {
  try {
    const twilio = await sendSmsViaTwilio(to, message);
    if (twilio) return twilio;
  } catch (err) {
    console.warn("Twilio error", err);
  }
  try {
    const f2s = await sendSmsViaFast2Sms(to, message);
    if (f2s) return f2s;
  } catch (err) {
    console.warn("Fast2SMS error", err);
  }
  try {
    const mac = await sendSmsViaMacMessages(to, message);
    if (mac) return mac;
  } catch (err) {
    console.warn("Mac SMS error", err);
  }
  return demoSms(to, message);
}

function demoSms(to: string, message: string, note?: string): ChannelResult {
  console.log(
    `\n📱 [DEMO SMS ALERT]\nTo: ${to}\n${message}${note ? `\n(${note})` : ""}\n`
  );
  return {
    channel: "sms",
    to,
    ok: true,
    mode: "demo",
    detail: note
      ? `Demo log (${note})`
      : "Demo log — set TWILIO_* or FAST2SMS_API_KEY for carrier SMS",
  };
}

function emitNotify(vendorId: string, payload: unknown) {
  try {
    getIO().to(`vendor:${vendorId}`).emit("stock-notify", payload);
    getIO().to("listings").emit("stock-notify", payload);
  } catch (err) {
    console.warn("emit stock-notify failed", err);
  }
}

/**
 * Live notify when stock < 4. Always emits Socket event; email/SMS live or demo.
 * Pass force:true for manual stock edits so the vendor gets SMS immediately.
 */
export async function notifyIfCriticalStock(
  payload: NotifyPayload,
  opts?: { force?: boolean }
) {
  if (!shouldSend(payload.listingId, payload.stock, opts?.force)) return null;

  const vendor = await prisma.vendor.findUnique({
    where: { id: payload.vendorId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!vendor) return null;

  const emailTo = vendor.user.email;
  const phoneTo =
    getVendorAlertPhone(payload.vendorId) || defaultAlertPhone();

  // Persist default so prefs UI shows the number
  if (!getVendorAlertPhone(payload.vendorId)) {
    setVendorAlertPhone(payload.vendorId, phoneTo);
  }

  const subject = `⚠️ Low stock: ${payload.catalogName} (${payload.stock} left)`;
  const body = [
    `Hi ${vendor.user.name},`,
    ``,
    `Critical stock alert from Angadi Vendor Hub.`,
    ``,
    `Product: ${payload.catalogName}`,
    `Stock now: ${payload.stock} (alert when < ${CRITICAL_STOCK_LT})`,
    `Your threshold setting: ${payload.lowStockThreshold}`,
    `Store: ${vendor.storeName}`,
    ``,
    `Restock soon to avoid lost sales.`,
    `— Angadi`,
  ].join("\n");

  const smsBody = `Angadi: ${payload.catalogName} stock ${payload.stock} (<${CRITICAL_STOCK_LT}). Restock now. — ${vendor.storeName}`;

  const [email, sms] = await Promise.all([
    sendEmail(emailTo, subject, body),
    sendSms(phoneTo, smsBody),
  ]);

  const event = {
    id: `notify-${Date.now()}`,
    vendorId: payload.vendorId,
    listingId: payload.listingId,
    catalogName: payload.catalogName,
    stock: payload.stock,
    at: new Date().toISOString(),
    channels: [email, sms],
    message: `${payload.catalogName}: ${payload.stock} left — SMS → ${phoneTo}`,
  };

  emitNotify(payload.vendorId, event);
  console.log(
    `📣 Critical stock notify → SMS ${sms.mode} ${phoneTo} | email ${email.mode}`
  );
  return event;
}
