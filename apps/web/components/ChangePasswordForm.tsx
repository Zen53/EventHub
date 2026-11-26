"use client";

import { apiFetch } from "@/lib/auth";
import {
  changePasswordBodySchema,
  type ErrorCode,
  errorResponseSchema,
} from "@eventhub/schemas";
import { useState, type FormEvent } from "react";

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

/** Messages affichés pour les codes que PATCH /me/password peut renvoyer. */
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
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setValues(emptyValues);
    setErrors({});
    setFormError(undefined);
  }

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
    } else if (!next.newPassword && values.confirmPassword !== values.newPassword) {
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
        setErrors({ currentPassword: "Ton mot de passe actuel est incorrect." });
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

  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        {done ? (
          <p
            role="status"
            className="rounded-2xl bg-[#e8f5ec] px-4 py-3 text-sm text-[#1f6b3a]"
          >
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
          className="h-12 rounded-xl border border-[#e6dfd4] bg-white text-sm font-semibold text-[#1a120e] transition hover:border-[#e24a1b]"
        >
          Changer mon mot de passe
        </button>
      </div>
    );
  }

  const input = (
    field: Field,
    label: string,
    autoComplete: string,
    hint?: string,
  ) => (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={field}>
      <span className="font-medium text-[#1a120e]">{label}</span>
      <input
        id={field}
        name={field}
        type="password"
        autoComplete={autoComplete}
        value={values[field]}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] || hint ? `${field}-message` : undefined}
        onChange={(event) => {
          setValues((current) => ({ ...current, [field]: event.target.value }));
          setErrors((current) => ({ ...current, [field]: undefined }));
          setFormError(undefined);
        }}
        className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition focus:border-[#e24a1b] ${
          errors[field] ? "border-[#c2410c]" : "border-[#e6dfd4]"
        }`}
      />
      {errors[field] ? (
        <span id={`${field}-message`} className="text-xs text-[#c2410c]">
          {errors[field]}
        </span>
      ) : hint ? (
        <span id={`${field}-message`} className="text-xs text-[#6d6258]">
          {hint}
        </span>
      ) : null}
    </label>
  );

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="change-password-title"
      className="flex flex-col gap-4 rounded-2xl border border-[#e6dfd4] bg-white px-5 py-5"
    >
      <h2
        id="change-password-title"
        className="text-lg font-semibold tracking-tight text-[#1a120e]"
      >
        Changer mon mot de passe
      </h2>

      {input("currentPassword", "Mot de passe actuel", "current-password")}
      {input(
        "newPassword",
        "Nouveau mot de passe",
        "new-password",
        "8 caractères minimum, une lettre et un chiffre.",
      )}
      {input("confirmPassword", "Confirmer le nouveau mot de passe", "new-password")}

      {formError ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#c2410c]"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex gap-3">
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
  );
}
