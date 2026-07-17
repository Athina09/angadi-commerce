import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/services/api";
import { currentStock } from "@/services/socket";
import { useSocket } from "@/hooks/useSocket";
import type { Category, Product, SortOption } from "@/types/product";

type Filters = {
  search: string;
  category: Category | "All";
  sort: SortOption;
};

export function useProducts({ search, category, sort }: Filters) {
  const [raw, setRaw] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const { pulsingIds } = useSocket();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setRaw(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const products = useMemo(() => {
    void tick;
    let list = raw.map((p) => ({
      ...p,
      stock: currentStock(p.id, p.stock),
    }));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (category !== "All") list = list.filter((p) => p.category === category);
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
    return list;
  }, [raw, search, category, sort, tick]);

  return { products, loading, error, pulsingIds, retry: load };
}
