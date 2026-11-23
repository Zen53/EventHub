# EventHub

EventHub est une plateforme de billetterie d'événements. Les visiteurs y découvrent les concerts, pièces de théâtre, compétitions sportives, conférences et festivals à venir ; les organisateurs y publient leurs événements et en gèrent les places.

## Ce que l'on peut faire

**Aujourd'hui**

- Parcourir le catalogue des événements à venir, avec leur ville, leur type et leur date.
- Ouvrir la fiche d'un événement : description, date, heure et lieu.
- Créer un compte, se connecter et se déconnecter.
- Consulter son profil.

**À venir**

- Publier, modifier et annuler un événement en tant qu'organisateur.
- Proposer plusieurs catégories de billets, avec une capacité par catégorie.
- Réserver des billets pour un événement.
- Modifier son profil, réinitialiser son mot de passe et supprimer son compte.

Les contrats d'API détaillés sont dans [`docs/`](docs/) : [événements](docs/contrat-event.md) et [utilisateurs](docs/contrat-user.md).

## Organisation du dépôt

| Dossier | Rôle |
| --- | --- |
| [`apps/web`](apps/web) | Front Next.js, servi sur le port 3000. Il relaie les appels du navigateur vers l'API. |
| [`apps/api-core`](apps/api-core) | API NestJS sur PostgreSQL (Drizzle), servie sur le port 3001, documentée en OpenAPI sur `/docs`. |
| [`packages/schemas`](packages/schemas) | Schémas Zod partagés par le front et l'API. |

## Lancer le projet avec Docker

Prérequis : Docker avec Compose.

```bash
docker compose up --build
```

Compose démarre PostgreSQL, applique les migrations, charge les données de démo, puis lance l'API et le front.

- Front : http://localhost:3000
- API : http://localhost:3001 (documentation OpenAPI sur http://localhost:3001/docs)

Pour repartir d'une base vide :

```bash
docker compose down -v
```

## Lancer le projet en local

Prérequis : Node 22.12 ou plus récent (24 recommandé), pnpm et un PostgreSQL local.

### 1. Installer

Depuis la racine du dépôt, installer les trois projets et construire `packages/schemas` :

```bash
pnpm install:all
```

### 2. Configurer l'API

```bash
cp apps/api-core/.env.example apps/api-core/.env
```

Dans `apps/api-core/.env`, renseigner `DATABASE_URL` avec l'URL de votre base PostgreSQL et `JWT_ACCESS_SECRET` avec un secret d'au moins 32 caractères, par exemple généré avec :

```bash
openssl rand -base64 48
```

L'API refuse de démarrer si une variable manque ou est invalide.

### 3. Créer le schéma et charger les données de démo

```bash
cd apps/api-core && pnpm db:migrate && pnpm db:seed
```

Le seed crée un organisateur de démo et une dizaine d'événements datés à partir d'aujourd'hui (dont un passé et un annulé). Il peut être relancé sans créer de doublons : il recale les dates des événements.

Compte de démo, pour le développement local uniquement : `demo@eventhub.local` / `demo-password`.

### 4. Démarrer

Dans deux terminaux, depuis la racine :

```bash
pnpm start:api
```

```bash
pnpm start:web
```

Le front est sur http://localhost:3000 et l'API sur http://localhost:3001. Le front appelle l'API sur `http://localhost:3001` par défaut ; la variable `API_URL` permet d'en changer.

## Vérifier

Depuis la racine :

```bash
pnpm test
```

```bash
pnpm lint:api && pnpm typecheck:api && pnpm format:check:api
```

```bash
pnpm lint:web && pnpm typecheck:web
```
