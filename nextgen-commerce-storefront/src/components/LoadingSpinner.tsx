import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function LoadingSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)} role="status">
      <Loader2 className="h-8 w-8 animate-spin text-terracotta-500" />
      <span className="text-sm text-ink/55">{label}</span>
    </div>
  );
}
