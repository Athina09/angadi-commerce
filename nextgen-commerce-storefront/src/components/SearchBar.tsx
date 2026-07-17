import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { debounce } from "@/utils/debounce";
import { cn } from "@/utils/cn";

export function SearchBar({
  onSearch,
  className,
  initial = "",
}: {
  onSearch: (q: string) => void;
  className?: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  const debounced = useMemo(() => debounce(onSearch, 300), [onSearch]);

  useEffect(() => {
    debounced(value);
  }, [value, debounced]);

  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">Search products</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the market…"
        className="w-full rounded-full border border-terracotta-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-soft outline-none focus:border-terracotta-400 transition-colors"
      />
    </label>
  );
}
