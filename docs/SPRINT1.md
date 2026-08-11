# Sprint 1 — Fondations (26 juil → 1 août)

## Livré
- **Mono-repo** structuré (services / infra / docs) avec ESLint + Prettier partagés (ADR-22).
- **Environnement local** `docker-compose` : PostgreSQL, MongoDB, Redis, RabbitMQ, Kong.
- **Kong** configuré en mode déclaratif : routage `/api/v1/*`, rate limiting (US 1.2).
- **Service IAM** (squelette fonctionnel, NestJS + Prisma) :
  - Entité `User` + énumération `Role` (conforme au diagramme de classes).
  - `POST /api/v1/auth/register` — inscription avec hachage bcrypt (F-2.1.a, F-2.1.b).
  - `POST /api/v1/auth/login` — retourne un JWT signé (F-2.1.c).
  - 3 tests unitaires **verts** (hachage, JWT, rejet 401).
- **CI/CD** GitHub Actions : install → lint → test → build → push ECR (US 1.1).
- **Dockerfile** multi-stage pour l'image IAM.

## Vérifié
- Compilation TypeScript : OK.
- Tests unitaires : 3/3 passés.

## Reste à faire (branché mais à activer avec les accès)
- Migration Prisma sur la vraie base (`npx prisma migrate dev`).
- Validation JWT côté Kong (plugin `jwt`) quand un service protégé existera (F-2.1.d).
- Secrets AWS pour la CI (`AWS_ROLE_ARN`, `SONAR_TOKEN`).

## Prochain sprint (S2) : Service IAM complet + intégration Kong bout-en-bout
