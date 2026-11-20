"use client";

import {
  type LoginBody,
  type LoginResponse,
  loginResponseSchema,
  refreshResponseSchema,
} from "@eventhub/schemas";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Session côté navigateur.
 *
 * - L'access token (15 min) vit uniquement en mémoire : jamais dans
 *   localStorage/sessionStorage, pour qu'un script injecté ne puisse pas le lire.
 * - Le refresh token est le cookie `refreshToken` posé par l'API (HttpOnly,
 *   Path=/auth) : le JS n'y a pas accès, le navigateur l'envoie seul à /auth/*.
 * - Au rechargement de la page, la mémoire est vide : on reconstruit la session
 *   avec POST /auth/refresh.
 */

export type SessionStatus = "unknown" | "authenticated" | "anonymous";

let accessToken: string | null = null;
let status: SessionStatus = "unknown";
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function setSession(token: string | null) {
  accessToken = token;
  status = token ? "authenticated" : "anonymous";
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Renouvelle l'access token à partir du cookie de refresh.
 * Les appels simultanés partagent la même requête : l'API fait tourner le
 * refresh token à chaque appel, deux requêtes en parallèle enverraient le même
 * cookie et la seconde serait refusée.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const response = await fetch("/auth/refresh", { method: "POST" });
      if (!response.ok) {
        setSession(null);
        return null;
      }
      const { accessToken: token } = refreshResponseSchema.parse(
        await response.json(),
      );
      setSession(token);
      return token;
    } catch {
      setSession(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Résout le statut de la session, en tentant un refresh s'il est inconnu. */
async function ensureSession(): Promise<string | null> {
  if (status === "unknown") return refreshAccessToken();
  return accessToken;
}

export type LoginResult =
  | { ok: true; data: LoginResponse }
  | { ok: false; response: Response };

export async function login(body: LoginBody): Promise<LoginResult> {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return { ok: false, response };
  const data = loginResponseSchema.parse(await response.json());
  setSession(data.accessToken);
  return { ok: true, data };
}

export async function logout(): Promise<void> {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } finally {
    setSession(null);
  }
}

/**
 * `fetch` vers l'API avec l'en-tête `Authorization: Bearer <accessToken>`.
 * Sur une 401 (token expiré), renouvelle le token une fois et rejoue la requête.
 * Si le renouvellement échoue, la session passe à "anonymous" et les routes
 * protégées redirigent vers la connexion.
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const token = await ensureSession();
  const response = await send(token);
  if (response.status !== 401) return response;

  const renewed = await refreshAccessToken();
  return renewed ? send(renewed) : response;
}

/** Statut de la session ; déclenche la restauration au premier rendu. */
export function useSession(): SessionStatus {
  const current = useSyncExternalStore(
    subscribe,
    () => status,
    () => "unknown" as const,
  );
  useEffect(() => {
    void ensureSession();
  }, []);
  return current;
}

/**
 * Cible de redirection après connexion, lue dans `?next=`.
 * Seuls les chemins internes sont acceptés (pas de `//evil.com` ni d'URL
 * absolue), pour qu'un lien piégé ne renvoie pas l'utilisateur hors du site.
 */
export function safeNextPath(value: string | null, fallback = "/profil") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.startsWith("/\\")) return fallback;
  return value;
}
