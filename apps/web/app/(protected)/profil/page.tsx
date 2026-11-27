import ChangePasswordForm from "@/components/ChangePasswordForm";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import ProfileDetails from "@/components/ProfileDetails";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Mon profil · EventHub",
  description: "Consulte les informations de ton compte EventHub.",
};

export default function Page() {
  return (
    <main className="min-h-dvh flex-1 bg-[#f6f1e7] text-[#1a120e]">
      <ProfileDetails />

      <div className="mx-auto w-full max-w-6xl px-6 pb-16 sm:px-12 sm:pb-24">
        <section className="border-t border-[#1a120e]/10 pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
            <div>
              <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
                SÉCURITÉ
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Mot de passe
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#6d6258]">
                Mets à jour ton mot de passe pour garder ton compte protégé.
              </p>
            </div>
            <ChangePasswordForm />
          </div>
        </section>

        <section className="mt-14 border-t border-[#1a120e]/10 pt-12">
          <DeleteAccountForm />
        </section>
      </div>
    </main>
  );
}
