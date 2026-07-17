export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  imageUrl: string;
  unit: string;
  storeId: string;
  storeName: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => boolean;
  removeItem: (productId: string, storeId: string) => void;
  updateQty: (productId: string, storeId: string, qty: number) => boolean;
  clearCart: () => void;
  getSubtotal: () => number;
  getCount: () => number;
  getQtyFor: (productId: string, storeId: string) => number;
  syncStock: (productId: string, newStock: number) => void;
}
