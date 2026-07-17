import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SortDropdown } from "@/components/SortDropdown";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useProducts } from "@/hooks/useProducts";
import { CATEGORIES, type Category, type SortOption } from "@/types/product";

const SORT_VALUES: SortOption[] = ["newest", "price-asc", "price-desc"];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("q") ?? "";
  const rawCategory = searchParams.get("category");
  const category: Category | "All" = CATEGORIES.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : "All";
  const rawSort = searchParams.get("sort");
  const sort: SortOption = SORT_VALUES.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "newest";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (params) => {
          if (value) params.set(key, value);
          else params.delete(key);
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const { products, loading, error, pulsingIds, retry } = useProducts({
    search,
    category,
    sort,
  });

  const heading = useMemo(() => {
    if (search) return `Results for “${search}”`;
    if (category !== "All") return category;
    return "Fresh from the neighbourhood";
  }, [search, category]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mustard-500">
          Live inventory · partner stores nearby
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{heading}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {loading
            ? "Stocking the shelves…"
            : `${products.length} product${products.length === 1 ? "" : "s"} on the shelf`}
        </p>
      </section>

      <div className="mb-6 flex flex-col gap-4">
        <CategoryFilter
          value={category}
          onChange={(next) => setParam("category", next === "All" ? null : next)}
        />
        <div className="flex justify-end">
          <SortDropdown
            value={sort}
            onChange={(next) => setParam("sort", next === "newest" ? null : next)}
          />
        </div>
      </div>

      {loading ? (
        <ProductSkeletonGrid />
      ) : error ? (
        <EmptyState
          title="Couldn't load the shelves"
          description={error}
          actionLabel="Try again"
          onAction={retry}
        />
      ) : products.length === 0 ? (
        <EmptyState onAction={() => setSearchParams({}, { replace: true })} />
      ) : (
        <ProductGrid products={products} pulsingIds={pulsingIds} />
      )}
    </main>
  );
}
