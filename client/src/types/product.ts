export type Category =
  | "Vegetables"
  | "Fruits"
  | "Dairy"
  | "Bakery"
  | "Snacks"
  | "Beverages";

export const CATEGORIES: Category[] = [
  "Vegetables",
  "Fruits",
  "Dairy",
  "Bakery",
  "Snacks",
  "Beverages",
];

export type SortOption = "price-asc" | "price-desc" | "newest";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  /** Current selling price in INR */
  price: number;
  /** Original MRP when discounted */
  mrp?: number;
  stock: number;
  imageUrl: string;
  unit: string;
  createdAt: string;
}

export interface StockUpdatePayload {
  productId: string;
  newStock: number;
}

export interface NearbyStoreOffer {
  storeId: string;
  storeName: string;
  distanceKm: number;
  stock: number;
  price: number;
  productUrl: string;
}
