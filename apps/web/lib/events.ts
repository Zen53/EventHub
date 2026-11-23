import { cache } from "react";

const apiUrl = () => process.env.API_URL ?? "http://localhost:3001";

export type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  city: string;
  imageUrl: string | null;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: {
    name: string;
    address: string;
    city: string;
  };
  imageUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEventSummary(value: unknown): value is EventSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.startsAt === "string" &&
    typeof value.city === "string" &&
    (value.imageUrl === null || typeof value.imageUrl === "string")
  );
}

function isEventDetail(value: unknown): value is EventDetail {
  if (!isRecord(value) || !isRecord(value.location)) return false;
  const endsAtOk =
    value.endsAt === undefined ||
    value.endsAt === null ||
    typeof value.endsAt === "string";
  const imageOk =
    value.imageUrl === undefined ||
    value.imageUrl === null ||
    typeof value.imageUrl === "string";
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.startsAt === "string" &&
    endsAtOk &&
    typeof value.location.name === "string" &&
    typeof value.location.address === "string" &&
    typeof value.location.city === "string" &&
    imageOk
  );
}

export type EventsListResponse = {
  data: EventSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export function isEventsListResponse(
  value: unknown,
): value is EventsListResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    return false;
  }
  const meta = value.meta;
  return (
    typeof meta.page === "number" &&
    typeof meta.limit === "number" &&
    typeof meta.total === "number" &&
    value.data.every(isEventSummary)
  );
}

/** `GET /events/{id}` — côté serveur (RSC). */
export const getEventById = cache(
  async (id: string): Promise<EventDetail | null> => {
    const response = await fetch(`${apiUrl()}/events/${id}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("EVENT_FETCH_FAILED");
    }

    const json: unknown = await response.json();
    if (!isEventDetail(json)) {
      throw new Error("EVENT_INVALID_PAYLOAD");
    }

    return {
      ...json,
      endsAt: json.endsAt ?? null,
      imageUrl: json.imageUrl ?? null,
    };
  },
);
