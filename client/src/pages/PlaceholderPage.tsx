export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-muted">
          Coming in the next build step. Auth is live — hang tight.
        </p>
      </div>
    </div>
  );
}
