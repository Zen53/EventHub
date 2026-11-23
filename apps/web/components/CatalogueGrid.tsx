"use client";

import EventCard from "@/components/EventCard";
import { useMemo, useState } from "react";

export type CatalogueEvent = {
  id: string;
  title: string;
  startsAt: string;
  city: string;
  imageUrl: string | null;
};

/** 4 cartes par ligne × 2 lignes, comme demandé pour le catalogue. */
const PAGE_SIZE = 8;

export default function CatalogueGrid({ events }: { events: CatalogueEvent[] }) {
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [events],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageEvents = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {pageEvents.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Pagination du catalogue"
        >
          <p className="order-first text-center text-sm text-[#6d6258] sm:order-none sm:text-left">
            Page{" "}
            <span className="font-medium text-[#1a120e]">{currentPage}</span>{" "}
            / {totalPages}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-11 rounded-xl border border-[#e6dfd4] bg-white px-4 text-sm font-medium text-[#1a120e] transition hover:border-[#e24a1b] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-28"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-11 rounded-xl bg-[#e24a1b] px-4 text-sm font-semibold text-white transition hover:bg-[#c73d14] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-28"
            >
              Suivant
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
