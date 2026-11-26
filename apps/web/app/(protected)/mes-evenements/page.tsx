import MyEventsList from "@/components/MyEventsList";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Mes événements · EventHub",
  description: "Les soirées que tu organises sur EventHub.",
};

export default function MyEventsPage() {
  return (
    <main className="min-h-dvh flex-1 bg-[#f6f1e7] px-6 py-14 text-[#1a120e] sm:px-12">
      <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
        EVENTHUB
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
        Mes événements
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#6d6258]">
        Tes soirées passées et à venir.
      </p>
      <MyEventsList />
    </main>
  );
}
