export function EmptyState({
  title = "No products found",
  description = "Try another search or clear filters to see the full shelf.",
  actionLabel = "Clear filters",
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-terracotta-200 bg-terracotta-50 font-display text-4xl text-terracotta-400">
        —
      </div>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-ink/55">{description}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full border border-ink/20 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-white transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
