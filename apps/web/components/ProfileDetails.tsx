"use client";

import { apiFetch, logout } from "@/lib/auth";
import {
  errorResponseSchema,
  updateMeBodySchema,
  userSchema,
  type User,
} from "@eventhub/schemas";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

const loadError = "Impossible de charger ton profil.";
const saveError = "Impossible d'enregistrer tes informations pour le moment.";
const phoneError = "Le numéro n'est pas valide. Exemple : 06 12 34 56 78.";

type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "currentPassword";

type Errors = Partial<Record<Field, string>>;

const fields: readonly Field[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "currentPassword",
];

const isField = (value: unknown): value is Field =>
  fields.includes(value as Field);

/** `+33612345678` (E.164, format de l'API) → `06 12 34 56 78`. */
function formatPhone(phone: string): string {
  const french = /^\+33(\d{9})$/.exec(phone);
  if (!french) return phone;
  return `0${french[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** Numéro français saisi librement → E.164 attendu par l'API. */
function toInternationalPhone(input: string): string {
  const compact = input.replace(/[\s.\-()/]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0")) return `+33${compact.slice(1)}`;
  return `+33${compact}`;
}

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(createdAt),
  );
}

type FormValues = Record<Field, string>;

const emptyValues: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currentPassword: "",
};

function valuesFromUser(user: User): FormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ? formatPhone(user.phone) : "",
    currentPassword: "",
  };
}

/** Profil connecté : lecture + mode édition (EV-36) branché sur PATCH /me (EV-37). */
export default function ProfileDetails() {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User>();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/me")
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const data = userSchema.parse(await response.json());
        if (!cancelled) {
          setUser(data);
          setValues(valuesFromUser(data));
        }
      })
      .catch(() => {
        if (!cancelled) setError(loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const emailChanged = Boolean(user && values.email.trim() !== user.email);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
    setSuccess(undefined);
  }

  function startEditing() {
    if (!user) return;
    setValues(valuesFromUser(user));
    setErrors({});
    setFormError(undefined);
    setSuccess(undefined);
    setEditing(true);
  }

  function cancelEditing() {
    if (submitting) return;
    if (user) setValues(valuesFromUser(user));
    setErrors({});
    setFormError(undefined);
    setEditing(false);
  }

  useEffect(() => {
    if (!editing) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || submitting) return;
      if (user) setValues(valuesFromUser(user));
      setErrors({});
      setFormError(undefined);
      setEditing(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editing, submitting, user]);

  async function onLogout() {
    await logout();
    router.replace("/connexion");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setFormError(undefined);
    setSuccess(undefined);

    const nextPhone = toInternationalPhone(values.phone);
    const currentPhone = user.phone ?? "";
    const body: Record<string, string | null> = {};

    if (values.firstName.trim() !== user.firstName) {
      body.firstName = values.firstName.trim();
    }
    if (values.lastName.trim() !== user.lastName) {
      body.lastName = values.lastName.trim();
    }
    if (values.email.trim() !== user.email) {
      body.email = values.email.trim();
      body.currentPassword = values.currentPassword;
    }
    if (nextPhone !== currentPhone) {
      body.phone = nextPhone || null;
    }

    const parsed = updateMeBodySchema.safeParse(body);
    if (!parsed.success) {
      const next: Errors = {};
      let rootMessage: string | undefined;
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && isField(key) && next[key] === undefined) {
          next[key] = key === "phone" ? phoneError : issue.message;
        } else if (issue.path.length === 0 && !rootMessage) {
          rootMessage = issue.message;
        }
      }
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setFormError(rootMessage ?? "Au moins un champ doit être modifié.");
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await apiFetch("/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (response.ok) {
        const updated = userSchema.parse(await response.json());
        setUser(updated);
        setValues(valuesFromUser(updated));
        setEditing(false);
        setSuccess("Tes informations ont été mises à jour.");
        return;
      }

      const payload = errorResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!payload.success) {
        setFormError(saveError);
        return;
      }

      const { code, message, details } = payload.data.error;
      if (code === "EMAIL_ALREADY_USED") {
        setErrors({ email: message });
        return;
      }
      if (code === "WRONG_PASSWORD") {
        setErrors({
          currentPassword: "Ton mot de passe actuel est incorrect.",
        });
        return;
      }

      const fromApi: Errors = {};
      for (const detail of details ?? []) {
        if (isField(detail.field) && fromApi[detail.field] === undefined) {
          fromApi[detail.field] =
            detail.field === "phone" ? phoneError : detail.message;
        }
      }
      if (Object.keys(fromApi).length > 0) {
        setErrors(fromApi);
        return;
      }

      setFormError(message || saveError);
    } catch {
      setFormError(saveError);
    } finally {
      setSubmitting(false);
    }
  }

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "EH";

  return (
    <section>
      <header className="relative overflow-hidden bg-[#1a120e] text-[#f6f1e7]">
        <div className="pointer-events-none absolute -right-16 top-[-20%] h-[28rem] w-[28rem] rounded-full bg-[#e24a1b]/28 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[10%] h-64 w-64 rounded-full bg-[#f3d7a1]/18 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-14 sm:px-12 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-5 sm:gap-6">
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#f6f1e7] text-xl font-semibold tracking-wide text-[#1a120e] sm:h-24 sm:w-24 sm:text-2xl"
            >
              {initials}
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-xs font-medium tracking-[0.35em] text-[#f3d7a1]">
                MON PROFIL
              </p>
              <div className="mt-1 h-px w-14 bg-[#e24a1b]" />
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
                {user ? `${user.firstName} ${user.lastName}` : "Mon profil"}
              </h1>
              {user ? (
                <p className="mt-3 text-base text-[#f6f1e7]/70">
                  Membre depuis le {formatMemberSince(user.createdAt)}
                </p>
              ) : null}
            </div>
          </div>

          {user ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startEditing}
                className="h-12 rounded-xl bg-[#e24a1b] px-5 text-sm font-semibold text-white transition hover:bg-[#c73d14]"
              >
                Modifier mon profil
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="h-12 rounded-xl border border-white/20 px-5 text-sm font-semibold text-[#f6f1e7] transition hover:border-[#e24a1b] hover:bg-[#e24a1b]"
              >
                Se déconnecter
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-12 sm:py-16">
        {success ? (
          <p role="status" className="mb-8 text-sm font-medium text-[#1f6b3a]">
            {success}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mb-8 text-sm text-[#c2410c]">
            {error}
          </p>
        ) : !user ? (
          <p role="status" className="text-sm text-[#6d6258]">
            Chargement…
          </p>
        ) : (
          <div>
            <div>
              <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
                COORDONNÉES
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Informations personnelles
              </h2>
            </div>

            <dl className="mt-10 grid gap-x-12 gap-y-0 sm:grid-cols-2">
              <InfoRow label="Prénom" value={user.firstName} />
              <InfoRow label="Nom" value={user.lastName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow
                label="Téléphone"
                value={user.phone ? formatPhone(user.phone) : "Non renseigné"}
                muted={!user.phone}
              />
            </dl>
          </div>
        )}
      </div>

      {editing && user ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[#1a120e]/55 backdrop-blur-[2px] transition"
            onClick={cancelEditing}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e6dfd4] bg-[#f6f1e7] p-6 shadow-[0_24px_80px_rgba(26,18,14,0.28)] sm:p-7"
          >
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-[#e24a1b]">
                  ÉDITION
                </p>
                <h2
                  id={titleId}
                  className="mt-2 text-2xl font-semibold tracking-tight text-[#1a120e]"
                >
                  Modifier mon profil
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-[#6d6258]"
                >
                  Mets à jour tes informations. Le mot de passe actuel est
                  demandé seulement si tu changes d&apos;email.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="Prénom"
                  autoComplete="given-name"
                  inputRef={firstFieldRef}
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

              {emailChanged ? (
                <Field
                  id="currentPassword"
                  label="Mot de passe actuel"
                  type="password"
                  autoComplete="current-password"
                  hint="Requis pour confirmer le changement d'email."
                  value={values.currentPassword}
                  error={errors.currentPassword}
                  onChange={(value) => update("currentPassword", value)}
                />
              ) : null}

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
                  onClick={cancelEditing}
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
    </section>
  );
}

function InfoRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="border-t border-[#1a120e]/10 py-6">
      <dt className="text-xs font-medium tracking-[0.2em] text-[#8a7d72]">
        {label.toUpperCase()}
      </dt>
      <dd
        className={`mt-2 min-w-0 break-all text-xl font-medium tracking-tight ${
          muted ? "text-[#6d6258]" : "text-[#1a120e]"
        }`}
      >
        {value}
      </dd>
    </div>
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
  inputRef,
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
  inputRef?: RefObject<HTMLInputElement | null>;
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
        ref={inputRef}
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
