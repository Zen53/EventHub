import ForgotPasswordRequestForm from "@/components/ForgotPasswordRequestForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié · EventHub",
  description: "Réinitialise ton mot de passe EventHub.",
};

export default function Page() {
  return (
    <main className="grid min-h-dvh flex-1 bg-[#f6f1e7] text-[#1a120e] lg:grid-cols-2">
      <section className="relative overflow-hidden bg-[#1a120e] px-8 py-16 text-[#f6f1e7] sm:px-14 lg:px-16">
        <div className="pointer-events-none absolute -top-28 right-[-8%] h-96 w-96 rounded-full bg-[#e24a1b]/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-18%] left-[-8%] h-80 w-80 rounded-full bg-[#f3d7a1]/15 blur-3xl" />

        <div className="relative flex h-full max-w-2xl flex-col justify-center">
          <p className="text-xs font-medium tracking-[0.35em] text-[#f3d7a1]">
            EVENTHUB
          </p>
          <div className="mt-1 h-px w-16 bg-[#e24a1b]" />
          <h1 className="mt-2 text-6xl font-semibold leading-[1.15] tracking-tight sm:text-7xl">
            On te rouvre la porte.
          </h1>
          <p className="mt-2 max-w-md text-lg leading-8 text-[#f6f1e7]/75">
            Un email, un lien, et tu choisis un nouveau mot de passe.
          </p>
          <p className="mt-10 text-sm tracking-[0.22em] text-[#f3d7a1]/80">
            CONCERT · THÉÂTRE · FESTIVAL
          </p>
        </div>
      </section>

      <section className="flex items-center px-6 py-14 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <ForgotPasswordRequestForm />
        </div>
      </section>
    </main>
  );
}
