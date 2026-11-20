"use client";

import { apiFetch, logout } from "@/lib/auth";
import { type User, userSchema } from "@eventhub/schemas";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Profil de l'utilisateur connecté, lu avec GET /me (en-tête Authorization). */
export default function AccountDetails() {
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
        if (!cancelled) setError("Impossible de charger ton profil.");
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
          MON COMPTE
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {user ? `Bonjour ${user.firstName}` : "Mon compte"}
        </h1>
      </div>

      {error ? (
        <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#c2410c]">
          {error}
        </p>
      ) : user ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border border-[#e6dfd4] bg-white px-5 py-4 text-sm">
          <dt className="text-[#6d6258]">Nom</dt>
          <dd>
            {user.firstName} {user.lastName}
          </dd>
          <dt className="text-[#6d6258]">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-[#6d6258]">Téléphone</dt>
          <dd>{user.phone ?? "—"}</dd>
        </dl>
      ) : (
        <p className="text-sm text-[#6d6258]">Chargement…</p>
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
