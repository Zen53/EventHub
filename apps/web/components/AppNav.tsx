"use client";

import { useSession } from "@/lib/auth";
import Link from "next/link";

const linkClass =
  "text-sm font-medium text-[#6d6258] transition hover:text-[#e24a1b]";

export default function AppNav() {
  const status = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="border-b border-[#e6dfd4] bg-[#f6f1e7]">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-12"
        aria-label="Navigation principale"
      >
        <Link
          href="/"
          className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]"
        >
          EVENTHUB
        </Link>

        <ul className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
          <li>
            <Link href="/catalogue" className={linkClass}>
              Catalogue
            </Link>
          </li>
          <li>
            <Link href="/mes-evenements" className={linkClass}>
              Mes événements
            </Link>
          </li>
          <li>
            <Link
              href={isAuthenticated ? "/profil" : "/connexion"}
              className={linkClass}
            >
              {isAuthenticated ? "Profil" : "Connexion"}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
