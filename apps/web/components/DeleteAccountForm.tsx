"use client";

import { apiFetch, logout } from "@/lib/auth";
import {
  deleteMeBodySchema,
  type ErrorCode,
  errorResponseSchema,
} from "@eventhub/schemas";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

const genericError = "Impossible de supprimer ton compte pour le moment.";

const errorMessages: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: "Ta session a expiré. Reconnecte-toi pour continuer.",
  ACCOUNT_HAS_UPCOMING_EVENTS:
    "Tu organises encore des événements à venir. Annule-les ou attends qu'ils soient passés avant de supprimer ton compte.",
};

/** Suppression du compte depuis le profil : DELETE /me (EV-84, EV-85, EV-86). */
export default function DeleteAccountForm() {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (submitting) return;
    setOpen(false);
    setPassword("");
    setPasswordError(undefined);
    setFormError(undefined);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    passwordRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || submitting) return;
      setOpen(false);
      setPassword("");
      setPasswordError(undefined);
      setFormError(undefined);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const parsed = deleteMeBodySchema.safeParse({ password });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setPasswordError(issue?.message ?? "Le mot de passe est obligatoire.");
      return;
    }

    setPasswordError(undefined);
    setSubmitting(true);
    try {
      const response = await apiFetch("/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 204) {
        await logout();
        router.replace("/");
        return;
      }

      const payload = errorResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!payload.success) {
        setFormError(genericError);
        return;
      }

      const { code, details } = payload.data.error;
      if (code === "WRONG_PASSWORD") {
        setPasswordError("Ton mot de passe est incorrect.");
        return;
      }
      if (code === "ACCOUNT_HAS_UPCOMING_EVENTS") {
        setFormError(errorMessages.ACCOUNT_HAS_UPCOMING_EVENTS);
        return;
      }

      const detail = details?.find((item) => item.field === "password");
      if (detail) {
        setPasswordError(detail.message);
        return;
      }

      setFormError(errorMessages[code] ?? genericError);
    } catch {
      setFormError(genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:items-end">
        <div>
          <p className="text-xs font-medium tracking-[0.28em] text-[#c2410c]">
            ZONE SENSIBLE
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
            Supprimer mon compte
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#6d6258]">
            Action définitive : ton compte sera anonymisé et tu ne pourras plus
            te connecter.
          </p>
        </div>
        <div className="lg:justify-self-start">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-12 rounded-xl border border-[#c2410c]/35 px-5 text-sm font-semibold text-[#c2410c] transition hover:border-[#c2410c] hover:bg-[#c2410c] hover:text-white"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[#1a120e]/55 backdrop-blur-[2px] transition"
            onClick={close}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[#e6dfd4] bg-[#f6f1e7] p-6 shadow-[0_24px_80px_rgba(26,18,14,0.28)] sm:p-7"
          >
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
                  CONFIRMATION
                </p>
                <h2
                  id={titleId}
                  className="mt-2 text-2xl font-semibold tracking-tight text-[#1a120e]"
                >
                  Supprimer ton compte ?
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-[#6d6258]"
                >
                  Entre ton mot de passe pour confirmer. Cette action ne peut
                  pas être annulée.
                </p>
              </div>

              <label
                className="flex flex-col gap-1.5 text-sm"
                htmlFor="delete-password"
              >
                <span className="font-medium text-[#1a120e]">Mot de passe</span>
                <input
                  ref={passwordRef}
                  id="delete-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={
                    passwordError ? "delete-password-message" : undefined
                  }
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError(undefined);
                    setFormError(undefined);
                  }}
                  className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
                    passwordError ? "border-[#c2410c]" : "border-[#e6dfd4]"
                  }`}
                />
                {passwordError ? (
                  <span
                    id="delete-password-message"
                    className="text-xs text-[#c2410c]"
                  >
                    {passwordError}
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

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  className="h-12 flex-1 rounded-xl border border-[#e6dfd4] bg-white text-sm font-semibold text-[#1a120e] transition hover:border-[#e24a1b] disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 flex-1 rounded-xl bg-[#c2410c] text-sm font-semibold text-white transition hover:bg-[#9a3412] disabled:opacity-60"
                >
                  {submitting ? "Suppression…" : "Confirmer la suppression"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
