# Angadi

Hyperlocal fruits / vegetables / grocery marketplace — **Catalog + Listing** model so a customer can click one product and see every nearby shop that stocks it.

## Architecture

```
┌─────────────────┐     JWT + REST      ┌─────────────────┐
│  React Client   │◄───────────────────►│  Express API    │
│  /shop + /vendor│     Socket.IO       │  /server        │
└─────────────────┘◄───────────────────►└────────┬────────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         ▼                       ▼                       ▼
                  ┌─────────────┐        ┌──────────────┐        ┌─────────────┐
                  │ PostgreSQL  │        │ FastAPI ML   │        │ Local/Cloud │
                  │ Catalog +   │◄───────│ forecast /   │        │ image store │
                  │ Listing     │  SQL   │ recommend /  │        │             │
                  └─────────────┘        │ insights     │        └─────────────┘
                                         └──────────────┘
```

**Core differentiator:** `Catalog` = canonical item (e.g. Tomato). `Listing` = one vendor’s price/stock for that item. Storefront browses Catalog; product detail loads nearby Listings via Haversine.

## Build status (hackathon order)

1. **Done** — Monorepo + Prisma Catalog/Listing schema + Tamil Nadu seed + auth E2E
2. Next — `GET /catalog` + `GET /catalog/:id/listings` (distance sort)
3. Cart + checkout with atomic stock decrement + concurrency test
4. Vendor listings CRUD + orders
5. Socket.IO live stock
6. ML/insights microservice
7. i18n EN/TA
8. Polish + env audit

## Assumption (confirm if needed)

**Tamil-based approach** = (A) UI language toggle EN/TA *and* (B) Tamil Nadu seed (Chennai coords, bilingual product names). Say if you only want one of these.

## Quick start

```bash
docker compose up -d
npm install
npx prisma db push   # or migrate
npm run db:seed
npm run dev:server   # :4000
npm run dev:client   # :5173
```

### Demo accounts (password `password123`)

| Role     | Email                     | Notes                       |
|----------|---------------------------|-----------------------------|
| Customer | aisha@example.com         | Chennai location on profile |
| Vendor   | ravi@greengrocer.local    | verified                    |
| Vendor   | meera@bakery.local        | verified · pantry           |
| Vendor   | omar@spicebazaar.local    | verified                    |
| Vendor   | lakshmi@thottam.local     | unverified (pending)        |

### Auth endpoints

- `POST /auth/register` — `{ name, email, password, role, preferredLang?, lat?, lng? }`
- `POST /auth/login` → `{ user, token }`
- `GET /auth/me` — Bearer JWT (includes `preferredLang`, vendor.`verified`)
- `PATCH /auth/me/lang` — `{ preferredLang: "en"|"ta" }`
- `GET /health`

Seed: **18 catalog items**, **62 listings** across 4 Chennai-area vendors, historical orders for forecasts.
