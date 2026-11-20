# @eventhub/schemas

Schémas Zod partagés entre `apps/api-core` et `apps/web`. Ils sont la source de vérité du contrat HTTP : le back valide les requêtes avec, le front valide ses formulaires et lit les réponses avec les mêmes règles et les mêmes messages.

## Installation

Le package est lié en local dans chaque app :

```json
"@eventhub/schemas": "link:../../packages/schemas"
```

`zod` 4 est une peer dependency : l'app consommatrice l'installe elle-même.

Le package est consommé depuis `dist/`. Il faut le compiler après chaque modification :

```bash
pnpm build:schemas   # une fois
pnpm dev:schemas     # en continu pendant le développement
```

## Contenu

| Export | Rôle |
| --- | --- |
| `registerBodySchema`, `RegisterBody` | Corps de `POST /auth/register` |
| `loginBodySchema`, `LoginBody` | Corps de `POST /auth/login` |
| `loginResponseSchema`, `LoginResponse` | Réponse de `POST /auth/login` |
| `refreshResponseSchema`, `RefreshResponse` | Réponse de `POST /auth/refresh` |
| `userSchema`, `User` | Utilisateur renvoyé par l'API |
| `emailSchema`, `passwordSchema`, `nameSchema`, `phoneSchema` | Champs réutilisables |
| `errorResponseSchema`, `ErrorResponse` | Enveloppe d'erreur de l'API |
| `fieldErrorSchema`, `FieldError` | Détail d'une erreur de champ |
| `errorCatalog`, `ErrorCode`, `errorCodes`, `errorCodeSchema` | Codes d'erreur, avec leur statut HTTP et leur message |

Les corps de requête sont stricts : un champ inconnu est refusé. Les messages de validation sont en français et peuvent être affichés tels quels à l'utilisateur.

## Usages

### Côté API (`apps/api-core`)

Valider un corps de requête :

```ts
import { loginBodySchema, type LoginBody } from '@eventhub/schemas';

@Post('login')
login(@Body({ schema: loginBodySchema }) body: LoginBody) {}
```

Lever une erreur du catalogue : le statut et le message viennent de `errorCatalog`.

```ts
throw new AppError('INVALID_CREDENTIALS');
```

### Côté web (`apps/web`)

Valider un formulaire avant l'envoi :

```ts
import { registerBodySchema } from '@eventhub/schemas';

const result = registerBodySchema.safeParse(values);
if (!result.success) {
  // result.error.issues contient le champ (path) et le message
}
```

Lire une erreur renvoyée par l'API :

```ts
import { errorResponseSchema } from '@eventhub/schemas';

const payload = errorResponseSchema.safeParse(await response.json());
if (payload.success) {
  payload.data.error.code;    // 'EMAIL_ALREADY_USED', 'VALIDATION_ERROR'…
  payload.data.error.details; // erreurs par champ, ou null
}
```

## Faire évoluer un schéma

1. Modifier le schéma dans `src/` et son test `*.spec.ts`.
2. L'exporter depuis `src/index.ts` s'il est nouveau.
3. Lancer `pnpm test:schemas` puis `pnpm build:schemas`.
4. Mettre à jour le contrat correspondant dans `docs/`.

Un changement de schéma touche les deux apps : vérifier que le back et le front restent compatibles.
