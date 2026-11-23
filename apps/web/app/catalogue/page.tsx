import CatalogueGrid, {
  type CatalogueEvent,
} from "@/components/CatalogueGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue · EventHub",
  description: "Les soirées à venir sur EventHub.",
};

/** Données de démo pour EV-63. Remplacées par GET /events en EV-64. */
const events: CatalogueEvent[] = [
  {
    id: "3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90",
    title: "Concert de jazz",
    startsAt: "2026-12-05T19:30:00Z",
    city: "Lyon",
    imageUrl:
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "8c1d2e3f-4a5b-4c6d-8e7f-901234567890",
    title: "Nuit des projecteurs",
    startsAt: "2026-12-12T20:00:00Z",
    city: "Paris",
    imageUrl:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "a9b8c7d6-e5f4-4a3b-8c2d-1e0f9a8b7c6d",
    title: "Festival du quai",
    startsAt: "2026-12-18T18:00:00Z",
    city: "Nantes",
    imageUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    title: "Scène ouverte",
    startsAt: "2026-12-08T21:00:00Z",
    city: "Bordeaux",
    imageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
    title: "Théâtre en chambre",
    startsAt: "2026-12-03T18:30:00Z",
    city: "Lille",
    imageUrl:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "d3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a",
    title: "Electro au hangar",
    startsAt: "2026-12-20T22:00:00Z",
    city: "Marseille",
    imageUrl:
      "https://images.unsplash.com/photo-1571266028241-f24b63f1540d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b",
    title: "Stand-up du jeudi",
    startsAt: "2026-12-10T19:00:00Z",
    city: "Toulouse",
    imageUrl:
      "https://images.unsplash.com/photo-1527224857830-43a7acc8508c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "f5a6b7c8-d9e0-4f1a-2b3c-4d5e6f7a8b9c",
    title: "Orchestre en plein air",
    startsAt: "2026-12-15T17:00:00Z",
    city: "Rennes",
    imageUrl:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "a6b7c8d9-e0f1-4a2b-3c4d-5e6f7a8b9c0d",
    title: "Slam & spoken word",
    startsAt: "2026-12-22T19:45:00Z",
    city: "Strasbourg",
    imageUrl:
      "https://images.unsplash.com/photo-1516280440612-62978823d0d1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b7c8d9e0-f1a2-4b3c-4d5e-6f7a8b9c0d1e",
    title: "Soirée salsa",
    startsAt: "2026-12-27T20:30:00Z",
    city: "Nice",
    imageUrl:
      "https://images.unsplash.com/photo-1547153760-18fc8630169a?auto=format&fit=crop&w=800&q=80",
  },
];

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
      <CatalogueGrid events={events} />
    </main>
  );
}
