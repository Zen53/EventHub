# Contrat de données : User

## Conventions générales

Ce sont les mêmes que pour le [contrat Event](contrat-event.md).

| Sujet            | Choix                                         |
| ---------------- | --------------------------------------------- |
| Format           | JSON                                          |
| Nommage          | `camelCase`                                   |
| Identifiants     | UUID v4, en chaîne                            |
| Dates            | ISO 8601 en UTC (`"2026-11-13T10:00:00Z"`)    |
| Champ absent     | Renvoyé à `null`, jamais omis                 |
| Authentification | En-tête `Authorization: Bearer <accessToken>` |

## Modèle `User`

Il n'y a **pas de rôle** : tout utilisateur connecté peut à la fois réserver et organiser des événements.

| Champ       | Type              | Obligatoire | Contraintes                                                                    | Rempli par |
| ----------- | ----------------- | ----------- | ------------------------------------------------------------------------------ | ---------- |
| `id`        | string (UUID)     | oui         | Unique                                                                         | back       |
| `email`     | string            | oui         | Format email valide, 254 caractères maximum, unique. Enregistré en minuscules. | client     |
| `firstName` | string            | oui         | 1 à 50 caractères                                                              | client     |
| `lastName`  | string            | oui         | 1 à 50 caractères                                                              | client     |
| `phone`     | string            | non         | Format international E.164 (`"+33612345678"`)                                  | client     |
| `createdAt` | string (ISO 8601) | oui         |                                                                                | back       |
| `updatedAt` | string (ISO 8601) | oui         |                                                                                | back       |

Le **mot de passe** n'est jamais renvoyé par l'API, même haché.
En base, il est stocké haché (bcrypt ou argon2) dans un champ `passwordHash`, qui ne fait pas partie du contrat.

### Règles du mot de passe

- 8 à 72 caractères (72 est la limite de bcrypt)
- au moins une lettre et au moins un chiffre

### Vues d'un utilisateur

| Vue         | Utilisée par                                   | Champs                                                           |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `User`      | `GET /me`, `PATCH /me`, inscription, connexion | Tous les champs ci-dessus. Le téléphone reste optionnel.         |
| `Organizer` | Le champ `organizer` d'un `Event`              | `id`, `firstName`, `lastName` seulement. Ni email, ni téléphone. |

## Gestion des tokens

| Token          | Durée de vie | Où il circule                                                                                                                     |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `accessToken`  | 15 minutes   | Dans le corps de la réponse. Le front le garde **en mémoire** et l'envoie dans l'en-tête `Authorization`.                         |
| `refreshToken` | 7 jours      | Dans un **cookie `httpOnly`, `Secure`, `SameSite=Strict`**, limité au chemin `/auth`. Le JavaScript du front ne peut pas le lire. |

- Le front et le back sont servis sur le **même domaine**. Le navigateur envoie donc le cookie tout seul sur les appels à `/auth/*` : pas de configuration CORS, et `SameSite=Strict` fonctionne.
- Quand l'access token expire, l'API répond `401 UNAUTHORIZED`. Le front appelle alors `POST /auth/refresh`, puis rejoue la requête.
- À chaque refresh, le back émet un **nouveau** refresh token et invalide l'ancien (rotation).

## Endpoints d'authentification

### `POST /auth/register` : créer un compte

- **Authentification** : non requise
- **Corps de la requête**

```json
{
  "email": "camille@exemple.fr",
  "password": "motdepasse123",
  "firstName": "Camille",
  "lastName": "Durand",
  "phone": "+33612345678"
}
```

- **Réponse `201`** : le `User` créé. L'utilisateur n'est **pas** connecté : aucun token n'est émis. Le front le renvoie vers la page de connexion.

```json
{
  "id": "a1b2c3d4-0000-4000-8000-000000000002",
  "email": "camille@exemple.fr",
  "firstName": "Camille",
  "lastName": "Durand",
  "phone": "+33612345678",
  "createdAt": "2026-11-13T10:00:00Z",
  "updatedAt": "2026-11-13T10:00:00Z"
}
```

- **Erreurs** : `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_USED`

### `POST /auth/login` : se connecter

- **Authentification** : non requise
- **Corps de la requête**

```json
{
  "email": "camille@exemple.fr",
  "password": "motdepasse123"
}
```

- **Réponse `200`** : l'access token et le `User`. Le refresh token est posé en cookie.

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "a1b2c3d4-0000-4000-8000-000000000002",
    "email": "camille@exemple.fr",
    "firstName": "Camille",
    "lastName": "Durand",
    "phone": "+33612345678",
    "createdAt": "2026-11-13T10:00:00Z",
    "updatedAt": "2026-11-13T10:00:00Z"
  }
}
```

- **Erreurs** : `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`
- Le message d'erreur reste le même que l'email soit inconnu ou que le mot de passe soit faux, pour ne pas révéler quels emails ont un compte.

### `POST /auth/refresh` : renouveler l'access token

- **Authentification** : le refresh token, envoyé automatiquement par le cookie. Pas de corps.
- **Réponse `200`** : un nouveau refresh token est posé en cookie

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

- **Erreurs** : `401 INVALID_REFRESH_TOKEN` (absent, expiré ou déjà utilisé). Le front renvoie alors vers la page de connexion.

### `POST /auth/logout` : se déconnecter

- **Authentification** : le refresh token, envoyé par le cookie. Pas de corps.
- **Réponse `204`** : sans corps. Le back invalide le refresh token et supprime le cookie.
- Répond `204` même si le token était déjà invalide : la déconnexion ne doit jamais échouer côté utilisateur.
- Le front supprime l'access token qu'il garde en mémoire.

### `POST /auth/forgot-password` : demander la réinitialisation du mot de passe (sprint 2)

- **Authentification** : non requise
- **Corps de la requête**

```json
{
  "email": "camille@exemple.fr"
}
```

- **Réponse `204`** : sans corps, **dans tous les cas**, que l'email ait un compte ou non. On ne révèle pas quels emails sont inscrits.
- Si l'email a un compte, le back envoie un mail contenant le lien `https://<domaine>/reset-password?token=<resetToken>`.
- Le `resetToken` :
  - est une chaîne aléatoire d'au moins 32 octets, stockée **hachée** en base ;
  - est valable **1 heure** et ne sert **qu'une fois** ;
  - est invalidé si l'utilisateur fait une nouvelle demande.
- **Erreurs** : `400 VALIDATION_ERROR` (email mal formé)

### `POST /auth/reset-password` : choisir un nouveau mot de passe (sprint 2)

- **Authentification** : non requise. C'est le `resetToken` qui prouve l'identité.
- **Corps de la requête**

```json
{
  "token": "k3J9xQ2...",
  "newPassword": "nouveaumotdepasse456"
}
```

- **Réponse `204`** : sans corps. Le mot de passe est changé, le `resetToken` est consommé, et **tous** les refresh tokens de l'utilisateur sont invalidés. Le front renvoie vers la page de connexion.
- **Erreurs** : `400 VALIDATION_ERROR` (mot de passe hors règles), `400 INVALID_RESET_TOKEN` (inconnu, expiré ou déjà utilisé)

## Endpoints du profil

### `GET /me` : consulter mon profil

- **Authentification** : requise
- **Réponse `200`** : le `User` complet, au même format que le champ `user` de l'inscription
- **Erreurs** : `401 UNAUTHORIZED`

### `PATCH /me` : modifier mes informations

- **Authentification** : requise
- **Corps** : n'importe quel sous-ensemble de `email`, `firstName`, `lastName`, `phone`. Seuls les champs envoyés sont modifiés. Envoyer `"phone": null` efface le téléphone.

```json
{
  "firstName": "Camille",
  "phone": null
}
```

- **Changement d'email** : l'email est l'identifiant de connexion. Pour le modifier, il faut aussi envoyer le mot de passe actuel dans `currentPassword`.

```json
{
  "email": "camille.durand@exemple.fr",
  "currentPassword": "motdepasse123"
}
```

- `currentPassword` absent alors que `email` est envoyé : `400 VALIDATION_ERROR`
- `currentPassword` incorrect : `403 WRONG_PASSWORD`
- `currentPassword` n'est pas exigé pour les autres champs.
- Les champs `id`, `createdAt`, `updatedAt` et `password` sont refusés (`400`). Le mot de passe a son propre endpoint.
- **Réponse `200`** : le `User` complet mis à jour
- **Erreurs** : `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 WRONG_PASSWORD`, `409 EMAIL_ALREADY_USED`

### `PATCH /me/password` : changer mon mot de passe (optionnel)

- **Authentification** : requise
- **Corps de la requête**

```json
{
  "currentPassword": "motdepasse123",
  "newPassword": "nouveaumotdepasse456"
}
```

- **Réponse `204`** : sans corps. Tous les refresh tokens de l'utilisateur sont invalidés, sauf celui de la session en cours.
- **Erreurs** : `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 WRONG_PASSWORD`

### `DELETE /me` : supprimer mon compte (sprint 2)

- **Authentification** : requise, avec confirmation par le mot de passe
- **Corps de la requête**

```json
{
  "password": "motdepasse123"
}
```

- **Refusée** tant que l'utilisateur organise des événements **à venir** au statut `published` : il doit d'abord les annuler (`409 ACCOUNT_HAS_UPCOMING_EVENTS`).
- **Ce que fait le back** :
  1. Il **anonymise** le compte au lieu de supprimer la ligne, pour que les événements passés et les réservations gardent une référence valide : `email` remplacé par `deleted-<id>@eventhub.invalid`, `firstName` = `"Utilisateur"`, `lastName` = `"supprimé"`, `phone` = `null`, `passwordHash` effacé, `deletedAt` renseigné.
  2. Il invalide tous les refresh tokens de l'utilisateur et supprime le cookie.
  3. _(à partir du sprint 5)_ Il annule les réservations de l'utilisateur pour les événements à venir.
- L'email d'origine est libéré : il peut servir à créer un nouveau compte.
- Un compte anonymisé ne peut plus se connecter.
- **Réponse `204`** : sans corps. Le front supprime l'access token et renvoie vers l'accueil.
- **Erreurs** : `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 WRONG_PASSWORD`, `409 ACCOUNT_HAS_UPCOMING_EVENTS`

## Format des erreurs

Le même que pour le [contrat Event](contrat-event.md#format-des-erreurs) :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Certains champs sont invalides.",
    "details": [
      {
        "field": "password",
        "message": "Le mot de passe doit contenir au moins 8 caractères."
      }
    ]
  }
}
```

| Statut HTTP | `code`                        | Quand                                                                                                 |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| 400         | `VALIDATION_ERROR`            | Un ou plusieurs champs invalides (`details` rempli)                                                   |
| 401         | `UNAUTHORIZED`                | Access token absent, invalide ou expiré                                                               |
| 401         | `INVALID_CREDENTIALS`         | Email ou mot de passe incorrect à la connexion                                                        |
| 401         | `INVALID_REFRESH_TOKEN`       | Refresh token absent, expiré ou déjà utilisé                                                          |
| 400         | `INVALID_RESET_TOKEN`         | Lien de réinitialisation inconnu, expiré ou déjà utilisé                                              |
| 403         | `WRONG_PASSWORD`              | Mot de passe actuel incorrect (changement de mot de passe, changement d'email, suppression du compte) |
| 409         | `EMAIL_ALREADY_USED`          | Email déjà associé à un autre compte                                                                  |
| 409         | `ACCOUNT_HAS_UPCOMING_EVENTS` | Suppression du compte impossible : l'utilisateur organise des événements à venir                      |

## Décisions prises

| Sujet                   | Décision                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Après l'inscription     | Pas de connexion automatique : retour à la page de connexion                                                                                              |
| Mot de passe oublié     | Sprint 2                                                                                                                                                  |
| Changement d'email      | Le mot de passe actuel est redemandé                                                                                                                      |
| Suppression du compte   | Sprint 2, par anonymisation                                                                                                                               |
| Durées des tokens       | 15 minutes (access) et 7 jours (refresh)                                                                                                                  |
| Domaines                | Front et back sur le même domaine                                                                                                                         |
| Vérification de l'email | Pas à ce stade : un compte est utilisable dès l'inscription. À reconsidérer plus tard, en réutilisant le service d'envoi d'emails du mot de passe oublié. |

## Questions ouvertes

1. **Service d'envoi d'emails** : lequel utiliser ? En développement, un outil local qui capture les mails (Mailpit par exemple) suffit. Pour la démo, il faut un vrai service SMTP ou un fournisseur d'API d'emails.
2. **Suppression avec des événements à venir** : refuser la suppression (choix actuel) convient-il, ou faut-il annuler automatiquement ces événements ?
3. **Réservations à venir lors de la suppression** : elles seront annulées. Faut-il rembourser celles qui ont été payées ? À trancher avec le contrat Billetterie.
