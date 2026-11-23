import { getEventById } from "@/lib/events";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const instant = false;

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatEventDate(startsAt: string) {
  const when = new Date(startsAt);
  return {
    dayNumber: when.toLocaleDateString("fr-FR", { day: "numeric" }),
    month: when
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", "")
      .toUpperCase(),
    weekday: when.toLocaleDateString("fr-FR", { weekday: "long" }),
    day: when.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: when.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEventById(id);
    if (!event) {
      return { title: "Événement introuvable · EventHub" };
    }
    return {
      title: `${event.title} · EventHub`,
      description: event.description,
    };
  } catch {
    return { title: "Événement · EventHub" };
  }
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;

  let event;
  try {
    event = await getEventById(id);
  } catch {
    return (
      <main className="min-h-dvh flex-1 bg-[#f6f1e7] px-6 py-14 text-[#1a120e] sm:px-12">
        <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
          EVENTHUB
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Événement
        </h1>
        <p className="mt-6 max-w-md rounded-2xl bg-[#fde8e4] px-4 py-3 text-sm text-[#c2410c]">
          Impossible de charger cet événement pour le moment.
        </p>
        <Link
          href="/catalogue"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#e24a1b]"
        >
          <ArrowLeftIcon />
          Retour au catalogue
        </Link>
      </main>
    );
  }

  if (!event) {
    notFound();
  }

  const { dayNumber, month, weekday, day, time } = formatEventDate(
    event.startsAt,
  );

  return (
    <main className="min-h-dvh flex-1 bg-[#f6f1e7] text-[#1a120e]">
      <section className="relative overflow-hidden bg-[#1a120e]">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="h-[min(56vh,460px)] w-full object-cover sm:h-[min(60vh,560px)]"
          />
        ) : (
          <div className="h-[min(56vh,460px)] w-full bg-[#1a120e] sm:h-[min(60vh,560px)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a120e] via-[#1a120e]/45 to-[#1a120e]/15" />
        <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[#e24a1b]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[-8%] h-64 w-64 rounded-full bg-[#f3d7a1]/15 blur-3xl" />

        <div className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-12 sm:pb-12">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-medium tracking-[0.28em] text-[#f3d7a1]">
              EVENTHUB
            </p>
            <div className="mt-1 h-px w-16 bg-[#e24a1b]" />
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#f6f1e7] sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#f6f1e7]/85 sm:text-base">
              <span className="capitalize">
                {weekday} {day}
              </span>
              <span className="mx-2 text-[#f3d7a1]/50">·</span>
              <span>{time}</span>
              <span className="mx-2 text-[#f3d7a1]/50">·</span>
              <span>
                {event.location.name}, {event.location.city}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-12 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          <div className="min-w-0 flex-1">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6d6258] transition hover:text-[#e24a1b]"
            >
              <ArrowLeftIcon />
              Retour au catalogue
            </Link>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-[#6d6258] sm:text-base sm:leading-8">
              {event.description}
            </p>

            <p className="mt-6 text-sm text-[#6d6258]">
              <span className="font-medium text-[#1a120e]">
                {event.location.name}
              </span>
              <span className="mx-2 text-[#e6dfd4]">·</span>
              {event.location.address}, {event.location.city}
            </p>
          </div>

          <aside className="w-full shrink-0 lg:sticky lg:top-10 lg:w-72">
            <div className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(26,18,14,0.08)] sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex min-w-14 flex-col items-center rounded-2xl bg-[#f6f1e7] px-3 py-2.5">
                  <span className="text-xl font-semibold leading-none">
                    {dayNumber}
                  </span>
                  <span className="mt-1 text-[10px] font-medium tracking-[0.14em] text-[#e24a1b]">
                    {month}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs text-[#6d6258]">
                    {time} · {event.location.city}
                  </p>
                </div>
              </div>

              <p className="mt-5 line-clamp-4 text-sm leading-6 text-[#6d6258]">
                {event.description}
              </p>

              <button
                type="button"
                disabled
                className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#e24a1b] text-sm font-semibold text-white opacity-45"
              >
                Réserver bientôt
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
