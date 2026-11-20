"use client";

import { registerBodySchema } from "@eventhub/schemas";
import { useState, type FormEvent } from "react";

type Field = "firstName" | "lastName" | "email" | "password" | "phone";

const phoneError =
  "Le numéro n'est pas valide. Exemple : 06 12 34 56 78.";

/** Numéro français saisi librement → E.164 attendu par l'API (`+33612345678`). */
function toInternationalPhone(input: string): string {
  const compact = input.replace(/[\s.\-()/]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0")) return `+33${compact.slice(1)}`;
  return `+33${compact}`;
}

const emptyValues: Record<Field, string> = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
};

export default function RegisterForm() {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [valid, setValid] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setValid(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phone = toInternationalPhone(values.phone);
    const result = registerBodySchema.safeParse({
      email: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
      ...(phone ? { phone } : {}),
    });

    if (!result.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && next[key as Field] === undefined) {
          next[key as Field] = key === "phone" ? phoneError : issue.message;
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
          INSCRIPTION
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a120e]">
          Créer un compte
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d6258]">
          Quelques informations, et la salle t’ouvre ses portes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label="Prénom"
          autoComplete="given-name"
          value={values.firstName}
          error={errors.firstName}
          onChange={(value) => update("firstName", value)}
        />
        <Field
          id="lastName"
          label="Nom"
          autoComplete="family-name"
          value={values.lastName}
          error={errors.lastName}
          onChange={(value) => update("lastName", value)}
        />
      </div>

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(value) => update("email", value)}
      />

      <Field
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, une lettre et un chiffre."
        value={values.password}
        error={errors.password}
        onChange={(value) => update("password", value)}
      />

      <Field
        id="phone"
        label="Téléphone"
        type="tel"
        autoComplete="tel"
        optional
        placeholder="06 12 34 56 78"
        hint="Un numéro français suffit. L'indicatif +33 est ajouté automatiquement."
        value={values.phone}
        error={errors.phone}
        onChange={(value) => update("phone", value)}
      />

      {valid ? (
        <p className="rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm text-[#166534]">
          Formulaire valide. La création du compte sera envoyée à l’API au
          ticket suivant.
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-1 h-12 rounded-xl bg-[#e24a1b] text-sm font-semibold text-white transition hover:bg-[#c73d14]"
      > 
        Créer mon compte
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  optional = false,
  hint,
  value,
  error,
  onChange,
}: {
  id: Field;
  label: string;
  type?: string;
  autoComplete: string;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const messageId = `${id}-message`;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
      <span className="flex items-baseline justify-between font-medium text-[#1a120e]">
        {label}
        {optional ? (
          <span className="text-xs font-normal text-[#8a7d72]">optionnel</span>
        ) : null}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 rounded-xl border bg-white px-4 text-[#1a120e] outline-none transition placeholder:text-[#b3a79c] focus:border-[#e24a1b] ${
          error ? "border-[#c2410c]" : "border-[#e6dfd4]"
        }`}
      />
      {error ? (
        <span id={messageId} className="text-xs text-[#c2410c]">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="text-xs text-[#8a7d72]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
