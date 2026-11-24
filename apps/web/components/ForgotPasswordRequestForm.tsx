"use client";

import { emailSchema } from "@eventhub/schemas";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordRequestForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(
        result.error.issues[0]?.message ?? "L'email n'est pas valide.",
      );
      return;
    }

    setEmailError(undefined);
    setEmail(result.data);
    // EV-79 : appel API. Pour EV-77 on affiche seulement la confirmation.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
            C’EST PARTI
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
            Regarde tes emails
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d6258]">
            On vient d’envoyer un lien à{" "}
            <span className="font-medium text-[#1a120e]">{email}</span> pour
            choisir un nouveau mot de passe — s’il y a un compte EventHub avec
            cette adresse.
          </p>
        </div>

        <div className="rounded-2xl border border-[#e6dfd4] bg-white px-4 py-4 text-sm leading-6 text-[#6d6258]">
          <p>
            Rien reçu ? Attends une minute, puis jette un œil aux{" "}
            <span className="font-medium text-[#1a120e]">spams</span> / courrier
            indésirable.
          </p>
          <p className="mt-2">
            Le lien expire après un moment : utilise-le dès que tu l’as.
          </p>
        </div>

        <Link
          href="/connexion"
          className="flex h-12 items-center justify-center rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d6258]">
          Indique l’email de ton compte. On t’enverra un lien pour choisir un
          nouveau mot de passe.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm my-6" htmlFor="email">
        <span className="font-medium text-[#1a120e]">Email</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={emailError ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(undefined);
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            emailError ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {emailError ? (
          <span className="text-xs text-[#c2410c]">{emailError}</span>
        ) : null}
      </label>

      <button
        type="submit"
        className="mt-1 h-12 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
      >
        Envoyer le lien
      </button>

      <p className="text-center text-sm text-[#6d6258]">
        Tu t’en souviens ?{" "}
        <Link href="/connexion" className="font-medium text-[#e24a1b]">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
