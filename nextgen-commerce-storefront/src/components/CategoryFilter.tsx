import { CATEGORIES, type Category } from "@/types/product";
import { cn } from "@/utils/cn";

export function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | "All";
  onChange: (c: Category | "All") => void;
}) {
  const chips: Array<Category | "All"> = ["All", ...CATEGORIES];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Categories">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
            value === c
              ? "bg-ink text-white"
              : "border border-terracotta-100 bg-white text-ink/65 hover:border-terracotta-300"
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
