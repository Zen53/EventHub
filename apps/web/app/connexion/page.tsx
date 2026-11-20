import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connexion · EventHub",
  description: "Connecte-toi à EventHub.",
};

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-[#f6f1e7] px-6 text-[#1a120e]">
      <div className="w-full max-w-md">
        <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
          CONNEXION
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ton compte est créé.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6d6258]">
          Tu n’es pas encore connecté. Le formulaire de connexion sera branché
          ensuite.
        </p>
        <Link
          href="/inscription"
          className="mt-8 inline-block text-sm font-medium text-[#e24a1b]"
        >
          Retour à l’inscription
        </Link>
      </div>
    </main>
  );
}
