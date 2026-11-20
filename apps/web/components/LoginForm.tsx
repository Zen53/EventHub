"use client";

import { loginBodySchema } from "@eventhub/schemas";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [valid, setValid] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = loginBodySchema.safeParse({ email, password });

    if (!result.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if ((key === "email" || key === "password") && next[key] === undefined) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      setValid(false);
      return;
    }

    setErrors({});
    setValid(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
          CONNEXION
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
          Bon retour
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#6d6258]">
          Entre ton email et ton mot de passe pour retrouver la salle.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="email">
        <span className="font-medium text-[#1a120e]">Email</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={errors.email ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((current) => ({ ...current, email: undefined }));
            setValid(false);
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            errors.email ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {errors.email ? (
          <span className="text-xs text-[#c2410c]">{errors.email}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="password">
        <span className="font-medium text-[#1a120e]">Mot de passe</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={errors.password ? true : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
            setValid(false);
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            errors.password ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {errors.password ? (
          <span className="text-xs text-[#c2410c]">{errors.password}</span>
        ) : null}
      </label>

      {valid ? (
        <p className="rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm text-[#166534]">
          Formulaire valide.
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-1 h-12 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
      >
        Se connecter
      </button>

      <p className="text-sm text-[#6d6258] text-center">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-[#e24a1b]">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
