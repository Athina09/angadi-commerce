export type SortOption = "newest" | "price-asc" | "price-desc";

export function sortCatalog<T extends { lowestPrice: number | null; name: string }>(
  items: T[],
  sort: SortOption,
  createdAt?: (item: T) => number
): T[] {
  const list = [...items];
  if (sort === "price-asc") {
    return list.sort((a, b) => (a.lowestPrice ?? 0) - (b.lowestPrice ?? 0));
  }
  if (sort === "price-desc") {
    return list.sort((a, b) => (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0));
  }
  if (createdAt) {
    return list.sort((a, b) => createdAt(b) - createdAt(a));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
