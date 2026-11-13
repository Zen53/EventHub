# Contrat de données : Event

## Conventions générales

| Sujet          | Choix                                                             |
| -------------- | ----------------------------------------------------------------- |
| Format         | JSON                                                              |
| Nommage        | `camelCase`                                                       |
| Identifiants   | UUID v4, en chaîne (`"3f2a…"`)                                    |
| Dates          | ISO 8601 en UTC (`"2026-12-05T19:30:00Z"`). Le front gère le fuseau horaire à l'affichage. |
| Champ absent   | Renvoyé à `null`, jamais omis                                     |
| Authentification | En-tête `Authorization: Bearer <accessToken>`                   |

## Modèle `Event`

| Champ         | Type              | Obligatoire | Contraintes                                   | Rempli par |
| ------------- | ----------------- | ----------- | --------------------------------------------- | ---------- |
| `id`          | string (UUID)     | oui         | Unique                                        | back       |
| `title`       | string            | oui         | 3 à 100 caractères                            | client     |
| `description` | string            | oui         | 10 à 5000 caractères                          | client     |
| `startsAt`    | string (ISO 8601) | oui         | Dans le futur au moment de la création        | client     |
| `endsAt`      | string (ISO 8601) | non         | Postérieure à `startsAt`                      | client     |
| `location`    | `Location`        | oui         | Voir ci-dessous                               | client     |
| `imageUrl`    | string (URL)      | non         | URL http(s) valide                            | client     |
| `type`        | string (enum)     | oui         | `concert`, `theatre`, `sport`, `conference`, `festival`, `other` | client |
| `status`      | string (enum)     | oui         | `published` ou `cancelled`. Vaut `published` à la création. | back |
| `ticketCategories` | `TicketCategory[]` | oui    | Au moins 1 catégorie, 10 au maximum, noms uniques dans l'événement | client |
| `totalCapacity` | entier          | oui         | Somme des `capacity` des catégories          | back       |
| `maxTicketsPerReservation` | entier | oui      | 1 à 10. Défaut : `4`                          | client     |
| `organizer`   | `Organizer`       | oui         | L'utilisateur connecté au moment de la création | back     |
| `createdAt`   | string (ISO 8601) | oui         |                                               | back       |
| `updatedAt`   | string (ISO 8601) | oui         |                                               | back       |

### `Location`

| Champ     | Type   | Obligatoire | Contraintes          |
| --------- | ------ | ----------- | -------------------- |
| `name`    | string | oui         | 2 à 100 caractères (ex. « Zénith ») |
| `address` | string | oui         | 5 à 200 caractères   |
| `city`    | string | oui         | 2 à 100 caractères   |

### `TicketCategory`

Une catégorie de places, par exemple « Fosse » ou « Balcon », avec son prix et son nombre de places.

| Champ        | Type          | Obligatoire | Contraintes                                     | Rempli par |
| ------------ | ------------- | ----------- | ----------------------------------------------- | ---------- |
| `id`         | string (UUID) | oui         | Unique                                          | back       |
| `name`       | string        | oui         | 2 à 50 caractères                               | client     |
| `priceCents` | entier        | oui         | En **centimes d'euro** (`2500` = 25,00 €). `0` pour une catégorie gratuite. | client |
| `capacity`   | entier        | oui         | 1 à 100 000 places                              | client     |

> Les prix sont en centimes, en entiers, pour éviter les erreurs d'arrondi des nombres décimaux. C'est aussi le format attendu par Stripe.

### `Organizer`

Vue publique réduite d'un `User`. Elle ne contient **jamais** l'email ni le mot de passe.

| Champ       | Type          |
| ----------- | ------------- |
| `id`        | string (UUID) |
| `firstName` | string        |
| `lastName`  | string        |

### `EventSummary` (version courte pour les listes)

Utilisée par le catalogue et « Mes événements », qui n'ont besoin que de l'essentiel.

| Champ       | Type              |
| ----------- | ----------------- |
| `id`        | string (UUID)     |
| `title`     | string            |
| `startsAt`  | string (ISO 8601) |
| `city`      | string            |
| `imageUrl`  | string \| null    |
| `type`      | string (enum)     |
| `status`    | string (enum)     |
| `minPriceCents` | entier        |

> Les champs de billetterie (catégories, prix, places, capacité) ne font **pas** partie de ce contrat.
> Ils seront définis dans le contrat Billetterie (sprint 3) et exposés par `GET /events/{id}/ticketing`.

## Endpoints

### `GET /events` : lister les événements

- **Authentification** : non requise
- **Paramètres de requête**

| Paramètre | Type   | Défaut | Description                                           |
| --------- | ------ | ------ | ----------------------------------------------------- |
| `page`    | entier | `1`    | Numéro de page, à partir de 1                         |
| `limit`   | entier | `20`   | Nombre d'éléments par page, maximum `50`              |
| `user_id` | UUID   | —      | Ne renvoie que les événements organisés par cet utilisateur (« Mes événements ») |

- Par défaut, seuls les événements **à venir** sont renvoyés, triés par `startsAt` croissant.
- **Réponse `200`**

```json
{
  "data": [
    {
      "id": "3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90",
      "title": "Concert de jazz",
      "startsAt": "2026-12-05T19:30:00Z",
      "city": "Lyon",
      "imageUrl": "https://exemple.fr/jazz.jpg",
      "type": "concert",
      "status": "published",
      "minPriceCents": 2500
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### `GET /events/{id}` : consulter un événement

- **Authentification** : non requise
- **Réponse `200`**

```json
{
  "id": "3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90",
  "title": "Concert de jazz",
  "description": "Une soirée jazz avec le quartet de Lyon.",
  "startsAt": "2026-12-05T19:30:00Z",
  "endsAt": "2026-12-05T22:00:00Z",
  "location": {
    "name": "Salle Molière",
    "address": "18 quai de Bondy",
    "city": "Lyon"
  },
  "imageUrl": "https://exemple.fr/jazz.jpg",
  "type": "concert",
  "status": "published",
  "ticketCategories": [
    {
      "id": "c1d2e3f4-1111-4000-8000-000000000001",
      "name": "Fosse",
      "priceCents": 2500,
      "capacity": 300
    },
    {
      "id": "c1d2e3f4-1111-4000-8000-000000000002",
      "name": "Balcon",
      "priceCents": 4000,
      "capacity": 120
    }
  ],
  "totalCapacity": 420,
  "maxTicketsPerReservation": 4,
  "organizer": {
    "id": "a1b2c3d4-0000-4000-8000-000000000001",
    "firstName": "Dalyll",
    "lastName": "Martin"
  },
  "createdAt": "2026-11-13T10:00:00Z",
  "updatedAt": "2026-11-13T10:00:00Z"
}
```

- **Erreurs** : `404 EVENT_NOT_FOUND`

### `POST /events` : créer un événement

- **Authentification** : requise. L'organisateur est l'utilisateur connecté, il n'est **pas** envoyé dans le corps.
- **Corps de la requête**

```json
{
  "title": "Concert de jazz",
  "description": "Une soirée jazz avec le quartet de Lyon.",
  "startsAt": "2026-12-05T19:30:00Z",
  "endsAt": "2026-12-05T22:00:00Z",
  "location": {
    "name": "Salle Molière",
    "address": "18 quai de Bondy",
    "city": "Lyon"
  },
  "imageUrl": "https://exemple.fr/jazz.jpg",
  "type": "concert",
  "ticketCategories": [
    { "name": "Fosse", "priceCents": 2500, "capacity": 300 },
    { "name": "Balcon", "priceCents": 4000, "capacity": 120 }
  ],
  "maxTicketsPerReservation": 4
}
```

- **Réponse `201`** : l'`Event` complet, au même format que `GET /events/{id}`
- **Erreurs** : `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`

### `PATCH /events/{id}` : modifier un événement (sprint 3)

- **Authentification** : requise, et seul l'**organisateur** de l'événement peut le modifier
- **Corps** : n'importe quel sous-ensemble des champs de `POST /events`. Seuls les champs envoyés sont modifiés.
- **`ticketCategories`** : si le champ est envoyé, il remplace la liste entière.
  - Une catégorie envoyée **avec** son `id` est modifiée.
  - Une catégorie envoyée **sans** `id` est créée.
  - Une catégorie existante absente de la liste est supprimée, sauf si elle a déjà des réservations (`409`).
  - La `capacity` d'une catégorie ne peut pas descendre sous le nombre de places déjà réservées (`409`).
- **Réponse `200`** : l'`Event` complet mis à jour
- **Erreurs** : `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`, `409 TICKETS_ALREADY_SOLD`

### `DELETE /events/{id}` : supprimer un événement (sprint 3)

- **Authentification** : requise, et seul l'**organisateur** de l'événement peut le supprimer
- **Réponse `204`** : sans corps
- **Erreurs** : `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`

## Format des erreurs

Toutes les erreurs ont la même forme :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Certains champs sont invalides.",
    "details": [
      { "field": "title", "message": "Le titre doit contenir au moins 3 caractères." },
      { "field": "startsAt", "message": "La date doit être dans le futur." }
    ]
  }
}
```

| Statut HTTP | `code`             | Quand                                              |
| ----------- | ------------------ | -------------------------------- |
| 400         | `VALIDATION_ERROR` | Un ou plusieurs champs invalides |
| 401         | `UNAUTHORIZED`     | Token absent, invalide ou expiré |
| 403         | `FORBIDDEN`        | L'utilisateur n'est pas l'organisateur |
| 404         | `EVENT_NOT_FOUND`  | Aucun événement avec cet `id` |

`details` est présent seulement pour `VALIDATION_ERROR`, et vaut `null` sinon.
