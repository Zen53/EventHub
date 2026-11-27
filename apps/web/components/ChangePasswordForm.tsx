"use client";

import { apiFetch } from "@/lib/auth";
import {
  changePasswordBodySchema,
  type ErrorCode,
  errorResponseSchema,
} from "@eventhub/schemas";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Field = "currentPassword" | "newPassword" | "confirmPassword";
type Errors = Partial<Record<Field, string>>;

const fields: readonly Field[] = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
];

const isField = (value: unknown): value is Field =>
  fields.includes(value as Field);

const genericError = "Impossible de changer ton mot de passe pour le moment.";

const errorMessages: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: "Ta session a expiré. Reconnecte-toi pour continuer.",
};

const emptyValues: Record<Field, string> = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/** Changement du mot de passe depuis le profil, avec PATCH /me/password (EV-54, EV-55). */
export default function ChangePasswordForm() {
  const titleId = useId();
  const descriptionId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function close() {
    if (submitting) return;
    setOpen(false);
    setValues(emptyValues);
    setErrors({});
    setFormError(undefined);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || submitting) return;
      setOpen(false);
      setValues(emptyValues);
      setErrors({});
      setFormError(undefined);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  function validate(): Errors {
    const next: Errors = {};
    const result = changePasswordBodySchema.safeParse({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (isField(key) && next[key] === undefined) next[key] = issue.message;
      }
    }
    if (!next.newPassword && values.newPassword === values.currentPassword) {
      next.newPassword =
        "Le nouveau mot de passe doit être différent de l'actuel.";
    }
    if (!values.confirmPassword) {
      next.confirmPassword = "Confirme ton nouveau mot de passe.";
    } else if (
      !next.newPassword &&
      values.confirmPassword !== values.newPassword
    ) {
      next.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await apiFetch("/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (response.status === 204) {
        close();
        setDone(true);
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
        setErrors({
          currentPassword: "Ton mot de passe actuel est incorrect.",
        });
        return;
      }

      const fromApi: Errors = {};
      for (const detail of details ?? []) {
        if (isField(detail.field) && fromApi[detail.field] === undefined) {
          fromApi[detail.field] = detail.message;
        }
      }
      if (Object.keys(fromApi).length > 0) {
        setErrors(fromApi);
        return;
      }

      setFormError(errorMessages[code] ?? genericError);
    } catch {
      setFormError(genericError);
    } finally {
      setSubmitting(false);
    }
  }

  function field(
    name: Field,
    label: string,
    autoComplete: string,
    hint?: string,
  ) {
    return (
      <label className="flex flex-col gap-1.5 text-sm" htmlFor={name}>
        <span className="font-medium text-[#1a120e]">{label}</span>
        <input
          ref={name === "currentPassword" ? firstFieldRef : undefined}
          id={name}
          name={name}
          type="password"
          autoComplete={autoComplete}
          value={values[name]}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={
            errors[name] || hint ? `${name}-message` : undefined
          }
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              [name]: event.target.value,
            }));
            setErrors((current) => ({ ...current, [name]: undefined }));
            setFormError(undefined);
          }}
          className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
            errors[name] ? "border-[#c2410c]" : "border-[#e6dfd4]"
          }`}
        />
        {errors[name] ? (
          <span id={`${name}-message`} className="text-xs text-[#c2410c]">
            {errors[name]}
          </span>
        ) : hint ? (
          <span id={`${name}-message`} className="text-xs text-[#6d6258]">
            {hint}
          </span>
        ) : null}
      </label>
    );
  }

  return (
    <>
      <div className="flex flex-col items-start gap-4 lg:justify-self-start">
        {done ? (
          <p role="status" className="text-sm font-medium text-[#1f6b3a]">
            Ton mot de passe a été changé. Tes autres appareils seront
            déconnectés.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
          className="h-12 rounded-xl border border-[#1a120e]/15 bg-transparent px-5 text-sm font-semibold text-[#1a120e] transition hover:border-[#e24a1b]"
        >
          Changer mon mot de passe
        </button>
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
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-4"
            >
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
                  SÉCURITÉ
                </p>
                <h2
                  id={titleId}
                  className="mt-2 text-2xl font-semibold tracking-tight text-[#1a120e]"
                >
                  Changer mon mot de passe
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-[#6d6258]"
                >
                  Choisis un nouveau mot de passe. Tes autres sessions seront
                  déconnectées.
                </p>
              </div>

              {field("currentPassword", "Mot de passe actuel", "current-password")}
              {field(
                "newPassword",
                "Nouveau mot de passe",
                "new-password",
                "8 caractères minimum, une lettre et un chiffre.",
              )}
              {field(
                "confirmPassword",
                "Confirmer le nouveau mot de passe",
                "new-password",
              )}

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
                  className="h-12 flex-1 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14] disabled:opacity-60"
                >
                  {submitting ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
