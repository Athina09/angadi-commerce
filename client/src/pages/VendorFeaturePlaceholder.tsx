import { Link } from "react-router-dom";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";

type Props = {
  title: string;
  blurb: string;
  cta?: { to: string; label: string };
};

/** Lightweight placeholder so every sidebar feature is reachable */
export function VendorFeaturePlaceholder({ title, blurb, cta }: Props) {
  return (
    <VendorHubShell title={title}>
      <div className="rounded-[24px] bg-white border border-ink/6 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8 sm:p-10 max-w-2xl">
        <p className="text-base text-muted leading-relaxed">{blurb}</p>
        {cta && (
          <Link
            to={cta.to}
            className="inline-flex mt-6 h-12 items-center rounded-xl bg-terracotta text-white px-5 text-sm font-semibold"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </VendorHubShell>
  );
}
