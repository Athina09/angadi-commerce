/** Partner storefronts — maps demo brands to seeded vendor slugs */

export type PartnerBrand = {
  id: string;
  name: string;
  tagline: string;
  priceFactor: number;
  upiId: string;
  accent: string;
  /** Match vendor storeName substring from seed */
  vendorMatch: string;
};

export const PARTNERS: PartnerBrand[] = [
  {
    id: "freshmart",
    name: "FreshMart Express",
    tagline: "Same-day neighbourhood fresh",
    priceFactor: 1.04,
    upiId: "freshmart@okaxis",
    accent: "#7A8B6F",
    vendorMatch: "Fresh Mart",
  },
  {
    id: "quickbasket",
    name: "QuickBasket",
    tagline: "20-minute grocery slots",
    priceFactor: 0.93,
    upiId: "quickbasket@upi",
    accent: "#C65D3B",
    vendorMatch: "Green Grocer",
  },
  {
    id: "citygrocer",
    name: "City Grocer",
    tagline: "Wide-aisle staples",
    priceFactor: 0.98,
    upiId: "citygrocer@paytm",
    accent: "#E8A317",
    vendorMatch: "Pantry",
  },
];

export function getPartner(id: string) {
  return PARTNERS.find((p) => p.id === id);
}

export function partnerPrice(base: number, partner: PartnerBrand) {
  return Math.max(1, Math.round(base * partner.priceFactor));
}
