"use client";

import {
  errorResponseSchema,
  passwordSchema,
  resetPasswordBodySchema,
} from "@eventhub/schemas";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const genericError = "Enregistrement impossible pour le moment.";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const nextErrors: { password?: string; confirmPassword?: string } = {};
    const passwordResult = passwordSchema.safeParse(password);

    if (!passwordResult.success) {
      nextErrors.password =
        passwordResult.error.issues[0]?.message ??
        "Le mot de passe n'est pas valide.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirme ton mot de passe.";
    } else if (
      passwordResult.success &&
      confirmPassword !== passwordResult.data
    ) {
      nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      return;
    }

    const bodyResult = resetPasswordBodySchema.safeParse({
      token,
      newPassword: passwordResult.data,
    });

    if (!bodyResult.success) {
      const tokenIssue = bodyResult.error.issues.find((issue) =>
        issue.path.includes("token"),
      );
      if (tokenIssue) {
        setInvalidToken(true);
        return;
      }
      setFormError(genericError);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyResult.data),
      });

      if (response.status === 204) {
        router.replace("/connexion");
        return;
      }

      const payload = errorResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        setFormError(genericError);
        return;
      }

      const { code, message, details } = payload.data.error;

      if (code === "INVALID_RESET_TOKEN") {
        setInvalidToken(true);
        return;
      }

      if (code === "VALIDATION_ERROR") {
        const passwordDetail = details?.find(
          (detail) =>
            detail.field === "newPassword" || detail.field === "password",
        );
        if (passwordDetail) {
          setErrors({ password: passwordDetail.message });
          return;
        }
      }

      setFormError(message || genericError);
    } catch {
      setFormError(genericError);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || invalidToken) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1a120e]">
            Lien invalide
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d6258]">
            Ce lien de réinitialisation est incomplet, expiré ou déjà utilisé.
            Demande un nouveau lien depuis la page mot de passe oublié.
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
            setFormError(undefined);
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
            setFormError(undefined);
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

      {formError ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#c2410c]"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 h-12 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14] disabled:opacity-60"
      >
        {submitting ? "Enregistrement…" : "Enregistrer"}
      </button>

      <p className="text-center text-sm text-[#6d6258]">
        <Link href="/connexion" className="font-medium text-[#e24a1b]">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
