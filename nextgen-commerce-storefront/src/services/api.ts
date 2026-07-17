import axios, { AxiosError } from "axios";
import { PRODUCTS, getProductById } from "@/mock/products";
import type { Product } from "@/types/product";

const baseURL = import.meta.env.VITE_API_URL as string | undefined;

export const HAS_BACKEND = Boolean(baseURL);

export const api = axios.create({
  baseURL: baseURL ?? "/api",
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ngc-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      (error.code === "ECONNABORTED"
        ? "The request timed out. Check your connection and try again."
        : "Something went wrong while talking to the server.");
    return Promise.reject(new Error(message));
  }
);

function simulateLatency<T>(data: T, ms = 450): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), ms);
  });
}

export async function fetchProducts(): Promise<Product[]> {
  if (!HAS_BACKEND) return simulateLatency(PRODUCTS);
  const { data } = await api.get<Product[]>("/products");
  return data;
}

export async function fetchProduct(id: string): Promise<Product> {
  if (!HAS_BACKEND) {
    const product = getProductById(id);
    if (!product) throw new Error("Product not found");
    return simulateLatency(product, 300);
  }
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export async function apiAddToCart(productId: string, qty: number): Promise<void> {
  if (!HAS_BACKEND) return simulateLatency(undefined, 200);
  await api.post("/cart", { productId, qty });
}

export async function apiUpdateCartItem(productId: string, qty: number): Promise<void> {
  if (!HAS_BACKEND) return simulateLatency(undefined, 200);
  await api.put(`/cart/${productId}`, { qty });
}

export async function apiRemoveCartItem(productId: string): Promise<void> {
  if (!HAS_BACKEND) return simulateLatency(undefined, 200);
  await api.delete(`/cart/${productId}`);
}
