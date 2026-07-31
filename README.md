# eLocation Backend (NestJS + TypeORM)

Plateforme de mise en relation pour annonces (immobilier, véhicules, etc.). Backend API construite avec NestJS et MySQL, incluant auth JWT, gestion d’annonces, paiements simulés et panneau admin, avec documentation Swagger.

## Sommaire
- Présentation générale
- Architecture & Tech Stack
- Arborescence du projet
- Installation & Configuration
- Lancer l’application
- Documentation API (Swagger)
- Modèles de données (entités)
- Authentification & rôles
- Annonces (Ads)
- Catégories
- Paiements
- Administration
- Uploads de fichiers
- Sécurité & bonnes pratiques
- Scripts NPM utiles
- Roadmap (évolutions possibles)

## Présentation générale
eLocation est une API permettant:
- l’enregistrement et la connexion d’utilisateurs
- la création et la gestion d’annonces avec photos
- la catégorisation des annonces
- la simulation de paiements mobile money (MTN/Moov)
- des fonctionnalités d’administration: modération, statistiques, listings

## Architecture & Tech Stack
- Framework: NestJS (v10)
- Base de données: MySQL (TypeORM)
- Authentification: JWT (Passport)
- Validation: class-validator + class-transformer
- Fichiers: Multer (stockage local `uploads/`)
- Configuration: @nestjs/config (.env)
- Documentation: @nestjs/swagger (UI sur `/api-docs`)

## Arborescence du projet
```
project/
  src/
    auth/
    users/
    ads/
    categories/
    payments/
    admin/
    common/
    app.module.ts
    main.ts
  uploads/
  package.json
  tsconfig.json
  README.md
```

## Installation & Configuration
### Prérequis
- Node.js >= 16
- MySQL (base dédiée)

### Dépendances
```bash
npm install
```

### Variables d’environnement (.env)
Créez un fichier `.env` à la racine de `project/`:
```env
# App
PORT=3000
NODE_ENV=development

# DB (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=
DB_PASSWORD=secret
DB_NAME=elocation_db

# JWT
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

# Uploads
MAX_FILE_SIZE=5242880
```

Note: En développement, le schéma est synchronisé automatiquement (cf. `app.module.ts`). Pour la production, utilisez des migrations et désactivez la synchronisation automatique.

## Lancer l’application
```bash
# Développement (watch)
npm run start:dev

# Production
npm run build
npm run start:prod
```
API: `http://localhost:3000`

## Documentation API (Swagger)
- UI: `http://localhost:3000/api-docs`
- Auth Bearer: activez l’icône Authorize et collez votre JWT pour tester les routes protégées.

## Modèles de données (entités)
### User
Champs principaux:
- id (uuid)
- email (optionnel, unique)
- firstName, lastName
- phone (unique)
- password (haché, exclu de la sérialisation)
- profilePicture (optionnel)
- birthDate (optionnel)
- lastLogin (MAJ au login)
- role (enum: USER, ADMIN)
- isActive (bool, `true` à l’inscription – bascule à `false` si un admin désactive le compte)
- createdAt, updatedAt

Relations:
- 1:N avec `ads`
- 1:N avec `payments`

### Category
- id, name, description, isActive, createdAt, updatedAt
- Relation: 1:N avec `ads`

### Ad
- id, title, description, price, location, isAvailable, isActive
- photos (array JSON), whatsappLink, whatsappNumber
- userId, categoryId
- createdAt, updatedAt

### Payment
- id, amount, provider (MTN/MOOV), status (PENDING, COMPLETED, FAILED, CANCELLED)
- phoneNumber, transactionId, externalTransactionId, description
- userId
- createdAt, updatedAt

## Authentification & rôles
### Flux d’inscription
1) `POST /auth/register`: crée un utilisateur actif (`isActive=true`) et renvoie directement un `access_token` : l’utilisateur est connecté à la sortie du formulaire.
2) `POST /auth/login`: connexion via email + mot de passe, refusée si `isActive=false` (compte désactivé par un admin).

Le mot de passe oublié reste protégé par un code à 6 chiffres envoyé par email
(`/auth/send-password-reset-code` puis `/auth/reset-password`).

### Endpoints Auth
- `POST /auth/register` (public): firstName, lastName, phone, password, email (optionnel)
- `POST /auth/login` (public): login via email OU phone + password
- `GET /auth/profile` (JWT): profil courant

### Rôles & Accès
- USER: accès aux opérations standards (création d’annonces, etc.)
- ADMIN: gestion des utilisateurs, catégories, modération, stats

## Annonces (Ads)
- Création, édition, suppression (JWT requis)
- Recherche/filtre/pagination: `GET /ads?search=&categoryId=&minPrice=&maxPrice=&location=&isAvailable=&page=&limit=&sortBy=&sortOrder=`
- WhatsApp: génération d’un lien de contact basé sur `whatsappNumber`
- Upload des photos: `POST /ads/:id/upload-photos` (max 5, taille configurable via `MAX_FILE_SIZE`)

### Endpoints Ads
- `POST /ads` (JWT)
- `GET /ads` (public)
- `GET /ads/my-ads` (JWT)
- `GET /ads/:id` (public)
- `GET /ads/:id/whatsapp` (public)
- `PATCH /ads/:id` (JWT)
- `DELETE /ads/:id` (JWT)
- `PATCH /ads/:id/toggle-status` (JWT)
- `POST /ads/:id/upload-photos` (JWT)

## Catégories
- CRUD côté admin + seed initial
- `GET /categories` (public)
- `POST /categories` (ADMIN)
- `PATCH /categories/:id` (ADMIN)
- `DELETE /categories/:id` (ADMIN)
- `POST /categories/seed` (ADMIN)

## Paiements (simulation MTN/Moov)
- `POST /payments/initiate` (JWT): crée un paiement PENDING
- `POST /payments/verify` (JWT): simule la vérification (succès 80%)
- `GET /payments/my-payments` (JWT)
- `GET /payments/all` (ADMIN)
- `GET /payments/:id` (JWT)
- `GET /payments/real-estate-access/:userId` (ADMIN): exemple de contrôle d’accès aux contacts immo

## Administration
- Préfixe `/admin` (JWT + ADMIN):
  - `GET /admin/stats`: statistiques dashboard
  - `GET /admin/pending-ads`: annonces en attente
  - `PATCH /admin/ads/:id/moderate`: modération (approve/reject)
  - `GET /admin/recent-users`: derniers utilisateurs
  - `GET /admin/recent-payments`: derniers paiements

## Uploads de fichiers
- Répertoire local `uploads/` (créé au démarrage)
- Servi statiquement via `/uploads`
- Intercepteur Multer côté `AdsController`

## Sécurité & bonnes pratiques
- Mots de passe hachés (bcrypt)
- JWT + rôles (guards + décorateur `@Roles`)
- Validation forte des DTO (whitelist, forbidNonWhitelisted, transform)
- CORS activé
- Limites d’upload (type/poids)
- Emails stockés en lowercase (côté service)
- Unicité sur `phone`, `email` (si fourni)

## Scripts NPM utiles
```bash
# Lancer en dev
yarn start:dev || npm run start:dev

# Build & prod
npm run build
npm run start:prod

# Lint & format
npm run lint
npm run format

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

## Roadmap (évolutions possibles)
- Migrations TypeORM pour prod
- Stockage d’images sur S3/Cloud Storage
- Webhooks de paiement réels
- Logs & observabilité (Winston, OpenTelemetry)
- Rate limiting & protection brute-force

---
Pour tester rapidement:
1) `POST /auth/register` → copier le JWT renvoyé
2) `POST /auth/login` → copier le JWT
3) Ouvrir `http://localhost:3000/api-docs`, cliquer sur Authorize, coller le JWT
4) Appeler les routes protégées (users/ads/payments/admin)