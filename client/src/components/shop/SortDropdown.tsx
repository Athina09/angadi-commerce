import type { SortOption } from "@/hooks/useShopProducts";

const OPTIONS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
];

export function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (s: SortOption) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-[10px] uppercase tracking-wider text-charcoal/45">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="rounded-full border border-charcoal/12 bg-white px-3 py-2 text-sm outline-none"
        aria-label="Sort products"
      >
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
