import CatalogueGrid from "@/components/CatalogueGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue · EventHub",
  description: "Les soirées à venir sur EventHub.",
};

export default function CataloguePage() {
  return (
    <main className="min-h-dvh flex-1 bg-[#f6f1e7] px-6 py-14 text-[#1a120e] sm:px-12">
      <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
        EVENTHUB
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
        Catalogue
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#6d6258]">
        Les soirées à venir. N&apos;hésitez pas à prendre ta place !
      </p>
      <CatalogueGrid />
    </main>
  );
}
