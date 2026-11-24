"use client";

import { passwordSchema } from "@eventhub/schemas";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [done, setDone] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { password?: string; confirmPassword?: string } = {};
    const passwordResult = passwordSchema.safeParse(password);

    if (!passwordResult.success) {
      nextErrors.password =
        passwordResult.error.issues[0]?.message ??
        "Le mot de passe n'est pas valide.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirme ton mot de passe.";
    } else if (passwordResult.success && confirmPassword !== passwordResult.data) {
      nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setDone(true);
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1a120e]">
            Lien invalide
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d6258]">
            Ce lien de réinitialisation est incomplet ou incorrect. Demande un
            nouveau lien depuis la page mot de passe oublié.
          </p>
        </div>
        <Link
          href="/mot-de-passe-oublie"
          className="flex h-12 items-center justify-center rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
        >
          Demander un nouveau lien
        </Link>
        <p className="text-center text-sm text-[#6d6258]">
          <Link href="/connexion" className="font-medium text-[#e24a1b]">
            Retour à la connexion
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
            C’EST FAIT
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
            Mot de passe mis à jour
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d6258]">
            Tu peux te reconnecter avec ton nouveau mot de passe.
          </p>
        </div>
        <Link
          href="/connexion"
          className="flex h-12 items-center justify-center rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-[#1a120e]">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d6258]">
          Choisis un mot de passe, puis confirme-le pour retrouver ta place.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="password">
        <span className="font-medium text-[#1a120e]">Nouveau mot de passe</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          aria-invalid={errors.password ? true : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            errors.password ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {errors.password ? (
          <span className="text-xs text-[#c2410c]">{errors.password}</span>
        ) : (
          <span className="text-xs text-[#6d6258]">
            8 caractères minimum, une lettre et un chiffre.
          </span>
        )}
      </label>

      <label
        className="flex flex-col gap-1.5 text-sm"
        htmlFor="confirmPassword"
      >
        <span className="font-medium text-[#1a120e]">
          Confirmer le mot de passe
        </span>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          aria-invalid={errors.confirmPassword ? true : undefined}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            errors.confirmPassword ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {errors.confirmPassword ? (
          <span className="text-xs text-[#c2410c]">
            {errors.confirmPassword}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        className="mt-1 h-12 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
      >
        Enregistrer
      </button>

      <p className="text-center text-sm text-[#6d6258]">
        <Link href="/connexion" className="font-medium text-[#e24a1b]">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
