type EventCardEvent = {
  title: string;
  startsAt: string;
  city: string;
  imageUrl: string | null;
};

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-[#e24a1b]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ArrowIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function EventCard({ event }: { event: EventCardEvent }) {
  const when = new Date(event.startsAt);
  const dayNumber = when.toLocaleDateString("fr-FR", { day: "numeric" });
  const month = when
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const day = when.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = when.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-[#1a120e] shadow-[0_14px_36px_rgba(26,18,14,0.08)]">
      <div className="relative">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="h-32 w-full object-cover sm:h-36"
          />
        ) : (
          <div className="h-32 w-full bg-[#1a120e] sm:h-36" />
        )}
        <div className="absolute top-2.5 right-2.5 flex min-w-11 flex-col items-center rounded-2xl bg-white/95 px-2 py-1.5 text-[#1a120e] shadow-[0_8px_20px_rgba(26,18,14,0.18)] sm:top-3 sm:right-3 sm:min-w-12 sm:px-2.5">
          <span className="text-base font-semibold leading-none sm:text-lg">
            {dayNumber}
          </span>
          <span className="mt-1 text-[9px] font-medium tracking-[0.14em] text-[#e24a1b] sm:text-[10px]">
            {month}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <h2 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug tracking-tight sm:text-base">
            {event.title}
          </h2>
          <p className="shrink-0 pt-0.5 text-[10px] font-medium tracking-[0.14em] text-[#e24a1b] sm:text-[11px] sm:tracking-[0.16em]">
            {event.city.toUpperCase()}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e6dfd4] pt-3">
          <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-[#6d6258] sm:text-xs">
            <ClockIcon />
            <span>{day}</span>
            <span className="text-[#e6dfd4]">·</span>
            <span className="font-medium text-[#1a120e]">{time}</span>
          </p>
          <button
            type="button"
            aria-label={`Voir ${event.title}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e24a1b] text-white transition hover:bg-[#c73d14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e24a1b]"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
