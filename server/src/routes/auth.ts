import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PreferredLang } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  lat: true,
  lng: true,
  preferredLang: true,
  createdAt: true,
  vendor: {
    select: {
      id: true,
      storeName: true,
      lat: true,
      lng: true,
      verified: true,
    },
  },
} as const;

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["customer", "vendor"]),
  preferredLang: z.enum(["en", "ta"]).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const loginSchema = z.object({
  /** Demo mode accepts any non-empty string (typos OK) */
  email: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  role: z.enum(["customer", "vendor"]).optional(),
});

/** Hackathon: any email/password signs in (create user if missing). Set AUTH_DEMO_MODE=false to enforce real auth. */
const DEMO_MODE = process.env.AUTH_DEMO_MODE !== "false";

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { name, email, password, role, preferredLang, lat, lng } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      preferredLang:
        preferredLang === "ta" ? PreferredLang.ta : PreferredLang.en,
      lat: lat ?? null,
      lng: lng ?? null,
    },
    select: userPublicSelect,
  });

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ user, token });
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;
    const preferredRole =
      parsed.data.role ??
      (email.includes("vendor") ||
      email.endsWith(".local") ||
      email.includes("bakery") ||
      email.includes("grocer") ||
      email.includes("gmail")
        ? "vendor"
        : "customer");

    let user = await prisma.user.findUnique({
      where: { email },
      select: { ...userPublicSelect, passwordHash: true },
    });

    if (DEMO_MODE) {
      if (!user) {
        const passwordHash = await bcrypt.hash(password || "demo", 10);
        const nameFromEmail =
          email.split("@")[0]?.replace(/[._]/g, " ") || "Demo User";
        user = await prisma.user.create({
          data: {
            name: nameFromEmail.replace(/\b\w/g, (c) => c.toUpperCase()),
            email,
            passwordHash,
            role: preferredRole,
            preferredLang: PreferredLang.en,
            lat: 13.06,
            lng: 80.25,
          },
          select: { ...userPublicSelect, passwordHash: true },
        });
      }

      // Demo vendor hub: ensure store for vendor accounts (and gmail demos)
      if (user.role === "vendor" || preferredRole === "vendor") {
        if (user.role !== "vendor") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "vendor" },
            select: { ...userPublicSelect, passwordHash: true },
          });
        }
        let vendor = await prisma.vendor.findUnique({
          where: { userId: user.id },
        });
        if (!vendor) {
          vendor = await prisma.vendor.create({
            data: {
              userId: user.id,
              storeName: `${user.name.split(" ")[0] || "Demo"}'s Market`,
              lat: user.lat ?? 13.06,
              lng: user.lng ?? 80.25,
              verified: false,
            },
          });
        }
        user = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { ...userPublicSelect, passwordHash: true },
        });
        void vendor;
      }

      const { passwordHash: _, ...publicUser } = user;
      const token = signToken({ userId: publicUser.id, role: publicUser.role });
      res.json({ user: publicUser, token, demo: true });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { passwordHash: _, ...publicUser } = user;
    const token = signToken({ userId: publicUser.id, role: publicUser.role });
    res.json({ user: publicUser, token });
  } catch (err) {
    console.error("POST /auth/login", err);
    res.status(500).json({ error: "Login failed — try again" });
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: userPublicSelect,
  });

  if (!user) {
    res.status(401).json({
      error: "Session expired — sign in again",
      code: "SESSION_EXPIRED",
    });
    return;
  }

  res.json({ user });
});

/** Persist language preference (EN/TA) for i18n later */
router.patch("/me/lang", requireAuth, async (req: AuthedRequest, res) => {
  const lang = req.body?.preferredLang;
  if (lang !== "en" && lang !== "ta") {
    res.status(400).json({ error: "preferredLang must be en or ta" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      preferredLang: lang === "ta" ? PreferredLang.ta : PreferredLang.en,
    },
    select: userPublicSelect,
  });
  res.json({ user });
});

export default router;
