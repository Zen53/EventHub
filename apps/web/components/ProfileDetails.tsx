"use client";

import { apiFetch, logout } from "@/lib/auth";
import { type User, userSchema } from "@eventhub/schemas";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const loadError = "Impossible de charger ton profil.";

/** `+33612345678` (E.164, format de l'API) → `06 12 34 56 78`. Les autres pays restent tels quels. */
function formatPhone(phone: string): string {
  const french = /^\+33(\d{9})$/.exec(phone);
  if (!french) return phone;
  return `0${french[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** `2026-11-20T13:18:56.840Z` → `20 novembre 2026`. */
function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(createdAt),
  );
}

/** Profil de l'utilisateur connecté, en lecture seule, lu avec GET /me. */
export default function ProfileDetails() {
  const router = useRouter();
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    apiFetch("/me")
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const data = userSchema.parse(await response.json());
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setError(loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    await logout();
    router.replace("/connexion");
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
          MON PROFIL
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {user ? `${user.firstName} ${user.lastName}` : "Mon profil"}
        </h1>
        {user ? (
          <p className="mt-1 text-sm text-[#6d6258]">
            Membre depuis le {formatMemberSince(user.createdAt)}
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#c2410c]"
        >
          {error}
        </p>
      ) : user ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-2xl border border-[#e6dfd4] bg-white px-5 py-4 text-sm">
          <dt className="text-[#6d6258]">Prénom</dt>
          <dd>{user.firstName}</dd>
          <dt className="text-[#6d6258]">Nom</dt>
          <dd>{user.lastName}</dd>
          <dt className="text-[#6d6258]">Email</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="text-[#6d6258]">Téléphone</dt>
          <dd className={user.phone ? undefined : "text-[#6d6258]"}>
            {user.phone ? formatPhone(user.phone) : "Non renseigné"}
          </dd>
        </dl>
      ) : (
        <p role="status" className="text-sm text-[#6d6258]">
          Chargement…
        </p>
      )}

      <button
        type="button"
        onClick={onLogout}
        className="h-12 rounded-xl border border-[#e6dfd4] bg-white text-sm font-semibold text-[#1a120e] transition hover:border-[#e24a1b]"
      >
        Se déconnecter
      </button>
    </section>
  );
}
