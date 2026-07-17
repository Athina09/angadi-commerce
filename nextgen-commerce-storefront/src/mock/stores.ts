import type { PartnerStore, Product, StoreListing } from "@/types/product";

export const ANGADI_STORE_ID = "angadi";
export const ANGADI_STORE_NAME = "Angadi";

export const PARTNER_STORES: PartnerStore[] = [
  {
    id: "quickbasket",
    name: "QuickBasket",
    tagline: "Fast lane groceries · 20-min slots",
    distanceKm: 1.2,
    rating: 4.6,
    etaMinutes: 25,
    accent: "#C65D3B",
    priceFactor: 0.92,
    upiId: "quickbasket@upi",
  },
  {
    id: "freshmart",
    name: "FreshMart Express",
    tagline: "Neighbourhood fresh · same-day",
    distanceKm: 2.4,
    rating: 4.4,
    etaMinutes: 40,
    accent: "#7A8B6F",
    priceFactor: 1.05,
    upiId: "freshmart@okaxis",
  },
  {
    id: "citygrocer",
    name: "City Grocer",
    tagline: "Wide aisle staples · reliable stock",
    distanceKm: 3.1,
    rating: 4.2,
    etaMinutes: 55,
    accent: "#E8A317",
    priceFactor: 0.98,
    upiId: "citygrocer@paytm",
  },
];

export function getStoreById(id: string): PartnerStore | undefined {
  return PARTNER_STORES.find((s) => s.id === id);
}

export function partnerPrice(product: Product, store: PartnerStore): number {
  return Math.max(1, Math.round(product.price * store.priceFactor));
}

export function partnerStock(product: Product, store: PartnerStore): number {
  const base = product.stock;
  if (base <= 0) return 0;
  const offset = store.id === "quickbasket" ? 2 : store.id === "freshmart" ? -1 : 0;
  return Math.max(0, base + offset);
}

export function getListingsFor(product: Product): StoreListing[] {
  return PARTNER_STORES.map((store) => ({
    storeId: store.id,
    price: partnerPrice(product, store),
    stock: partnerStock(product, store),
    productUrl: `/partner/${store.id}/product/${product.id}`,
  })).sort((a, b) => a.price - b.price);
}
