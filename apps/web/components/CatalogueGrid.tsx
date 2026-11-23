"use client";

import EventCard from "@/components/EventCard";
import { useEffect, useState } from "react";

export type CatalogueEvent = {
  id: string;
  title: string;
  startsAt: string;
  city: string;
  imageUrl: string | null;
};

type EventsResponse = {
  data: CatalogueEvent[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

/** 4 cartes par ligne × 2 lignes. */
const PAGE_SIZE = 8;

function isEventsResponse(value: unknown): value is EventsResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.data) || !body.meta || typeof body.meta !== "object") {
    return false;
  }
  const meta = body.meta as Record<string, unknown>;
  return (
    typeof meta.page === "number" &&
    typeof meta.limit === "number" &&
    typeof meta.total === "number"
  );
}

export default function CatalogueGrid() {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<CatalogueEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setLoading(true);
      setError(undefined);

      try {
        const response = await fetch(
          `/events?page=${page}&limit=${PAGE_SIZE}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setEvents([]);
          setTotal(0);
          setError("Impossible de charger le catalogue.");
          return;
        }

        const json: unknown = await response.json();
        if (!isEventsResponse(json)) {
          setEvents([]);
          setTotal(0);
          setError("Impossible de charger le catalogue.");
          return;
        }

        setEvents(
          json.data.map((event) => ({
            id: event.id,
            title: event.title,
            startsAt: event.startsAt,
            city: event.city,
            imageUrl: event.imageUrl ?? null,
          })),
        );
        setTotal(json.meta.total);
      } catch {
        if (controller.signal.aborted) return;
        setEvents([]);
        setTotal(0);
        setError("Impossible de charger le catalogue.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadEvents();
    return () => controller.abort();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) {
    return (
      <p className="mt-10 text-sm text-[#6d6258]">
        Chargement des soirées…
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-10 rounded-2xl bg-[#fde8e4] px-4 py-3 text-sm text-[#c2410c]">
        {error}
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="mt-10 rounded-2xl border border-[#e6dfd4] bg-white px-4 py-8 text-center text-sm text-[#6d6258]">
        Aucune soirée à venir pour le moment.
      </p>
    );
  }

  return (
    <div>
      <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {events.map((event) => (
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
            <span className="font-medium text-[#1a120e]">{page}</span> /{" "}
            {totalPages}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-11 rounded-xl border border-[#e6dfd4] bg-white px-4 text-sm font-medium text-[#1a120e] transition hover:border-[#e24a1b] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-28"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
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
