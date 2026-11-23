"use client";

import { useSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Affiche `children` seulement si l'utilisateur est connecté ; sinon redirige
 * vers /connexion?next=<page demandée>.
 *
 * La vérification se fait dans le navigateur : le cookie de refresh est limité
 * à /auth, le serveur Next ne le reçoit pas en chargeant une page. Cette garde
 * sert l'expérience utilisateur ; la vraie protection des données reste l'API,
 * qui refuse toute requête sans access token valide.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "anonymous") return;
    const { pathname, search } = window.location;
    router.replace(`/connexion?next=${encodeURIComponent(pathname + search)}`);
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div
        role="status"
        className="flex min-h-dvh flex-1 items-center justify-center bg-[#f6f1e7] text-sm text-[#6d6258]"
      >
        Vérification de la session…
      </div>
    );
  }

  return children;
}
