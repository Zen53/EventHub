# EventHub

EventHub est une plateforme de billetterie d'événements. Les visiteurs y découvrent les concerts, pièces de théâtre, compétitions sportives, conférences et festivals à venir ; les organisateurs y publient leurs événements et en gèrent les places.

## Ce que l'on peut faire

**Aujourd'hui**

- Parcourir le catalogue des événements à venir, page par page, avec leur date, leur heure et leur ville.
- Ouvrir la fiche d'un événement : description, date, heure et lieu.
- Créer un compte, se connecter et se déconnecter.
- Consulter son profil.

**À venir**

- Publier, modifier et annuler un événement en tant qu'organisateur.
- Proposer plusieurs catégories de billets, avec une capacité par catégorie.
- Réserver des billets pour un événement.
- Modifier son profil, réinitialiser son mot de passe et supprimer son compte.

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

Compose démarre PostgreSQL et Mailpit, applique les migrations, charge les données de démo, puis lance l'API et le front.

- Front : http://localhost:3000
- API : http://localhost:3001 (documentation OpenAPI sur http://localhost:3001/docs)
- Emails : http://localhost:8052 (Mailpit capture les emails envoyés par l'API, aucun ne part vers l'extérieur)

Pour repartir d'une base vide :

```bash
docker compose down -v
```

## Lancer le projet en local

Prérequis : Node 22.12 ou plus récent (24 recommandé), pnpm 12, un PostgreSQL local et Docker pour Mailpit.

### 1. Installer

Le dépôt est un workspace pnpm. Depuis la racine, une seule commande installe le front, l'API et `packages/schemas`, puis construit les schémas :

```bash
pnpm install
```

### 2. Configurer l'API

```bash
cp apps/api-core/.env.example apps/api-core/.env
```

Dans `apps/api-core/.env`, renseigner `DATABASE_URL` avec l'URL de votre base PostgreSQL et `JWT_ACCESS_SECRET` avec un secret d'au moins 32 caractères, par exemple généré avec :

```bash
openssl rand -base64 48
```

`SMTP_URL` et `MAIL_FROM` sont déjà réglés pour Mailpit, qui capture les emails envoyés par l'API. `WEB_URL` est l'adresse du front, vers laquelle pointent les liens envoyés par email. Pour le lancer seul :

```bash
docker compose up -d mailpit
```

Les emails s'affichent sur http://localhost:8052.

L'API refuse de démarrer si une variable manque ou est invalide.

### 3. Créer le schéma et charger les données de démo

```bash
cd apps/api-core && pnpm db:migrate && pnpm db:seed
```

Le seed crée un organisateur de démo et une dizaine d'événements datés à partir d'aujourd'hui (dont un passé et un annulé). Il peut être relancé sans créer de doublons : il remet à jour la date, la description et le lieu des événements de démo.

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
pnpm lint && pnpm typecheck && pnpm format:check:api
```

Chaque commande tourne sur tous les projets du workspace. Les variantes `:api`, `:web` et `:schemas` (`pnpm lint:web`, `pnpm test:api`…) ciblent un seul projet.
