# @eventhub/schemas

Schémas Zod partagés entre `apps/api-core` et `apps/web`. Ils sont la source de vérité du contrat HTTP : le back valide les requêtes avec, le front valide ses formulaires et lit les réponses avec les mêmes règles et les mêmes messages.

## Installation

Le package fait partie du workspace pnpm. Chaque app le déclare comme dépendance du workspace :

```json
"@eventhub/schemas": "workspace:*"
```

`zod` 4 est une peer dependency : l'app consommatrice l'installe elle-même.

Le package est consommé depuis `dist/`. Il faut le compiler après chaque modification :

```bash
pnpm build:schemas   # une fois
pnpm dev:schemas     # en continu pendant le développement
```

## Contenu

Chaque schéma est exporté avec son type TypeScript, inféré par `z.infer` : `fooSchema` va avec le type `Foo`. Les exports se rangent en quelques familles, reconnaissables à leur nom :

| Famille | Nommage | Rôle |
| --- | --- | --- |
| Corps de requête | `<action>BodySchema` | Ce que le client envoie à une route |
| Paramètres | `<action>QuerySchema`, `<ressource>IdParamsSchema` | La query ou les paramètres de chemin d'une route |
| Réponses | `<action>ResponseSchema` | Ce que l'API renvoie en cas de succès |
| Ressources | `<ressource>Schema` | Une entité exposée par l'API, par exemple `userSchema` |
| Champs | `<champ>Schema` | Une règle de champ réutilisable, par exemple `emailSchema` |
| Erreurs | `errorResponseSchema`, `errorCatalog` | L'enveloppe d'erreur et le catalogue des codes, avec leur statut HTTP |

La liste complète des exports se trouve dans `src/index.ts`.

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
