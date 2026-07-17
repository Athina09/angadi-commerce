# Angadi — Customer Storefront

Hyperlocal grocery marketplace demo: browse live inventory, compare partner stores, cart + UPI/COD checkout.

## Quick start

```bash
npm install
npm run dev
```

Opens on **http://localhost:5174**.

Works fully on **mock data** (no backend required). Optional:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Features

- 10 categories × up to 12 products (Vegetables, Fruits, Dairy, Bakery, Snacks, Beverages, Staples, Household, Personal Care, Stationery)
- Debounced search, category chips, sort
- Zustand cart with localStorage persistence
- Live stock pulse (Socket.IO or built-in simulator)
- Partner price comparison → **Buy from FreshMart / QuickBasket / City Grocer** opens partner storefront with Add to cart, Buy now UPI, and COD
- Checkout with address + UPI mock QR / COD
- Sonner toasts, Framer Motion, responsive layout

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | Typecheck |
