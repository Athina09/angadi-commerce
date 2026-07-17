import { useState } from "react";
import type { Product } from "@/types/product";
import { cn } from "@/utils/cn";

export function ProductImage({
  product,
  className,
  alt,
}: {
  product: Pick<Product, "name" | "imageUrl" | "category">;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-terracotta-50 text-terracotta-500 font-display text-2xl",
          className
        )}
        aria-hidden
      >
        {product.name.slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={alt ?? product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
