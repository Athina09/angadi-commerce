export type Category =
  | "Vegetables"
  | "Fruits"
  | "Dairy"
  | "Bakery"
  | "Snacks"
  | "Beverages"
  | "Staples"
  | "Household"
  | "Personal Care"
  | "Stationery";

export const CATEGORIES: Category[] = [
  "Vegetables",
  "Fruits",
  "Dairy",
  "Bakery",
  "Snacks",
  "Beverages",
  "Staples",
  "Household",
  "Personal Care",
  "Stationery",
];

export type SortOption = "newest" | "price-asc" | "price-desc";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  mrp?: number;
  stock: number;
  unit: string;
  imageUrl: string;
  createdAt: string;
}

export interface StockUpdatePayload {
  productId: string;
  newStock: number;
}

export interface PartnerStore {
  id: string;
  name: string;
  tagline: string;
  distanceKm: number;
  rating: number;
  etaMinutes: number;
  accent: string;
  priceFactor: number;
  upiId: string;
}

export interface StoreListing {
  storeId: string;
  price: number;
  stock: number;
  productUrl: string;
}
