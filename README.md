# Plateforme E-commerce en Architecture Microservices

Projet de stage — Smartovate Ltd. Architecture cloud-native sur AWS (EKS), quatre microservices découplés.

## Structure du mono-repo

```
ecommerce-microservices/
├── .github/workflows/     CI/CD (GitHub Actions : lint, test, build, push ECR)
├── services/
│   ├── iam/               Service IAM — authentification, JWT (NestJS + PostgreSQL/Prisma)
│   ├── catalogue/         Service Catalogue — produits, stock (NestJS + MongoDB)   \[à venir]
│   ├── panier/            Service Panier — panier utilisateur (NestJS + Redis)      \[à venir]
│   └── commandes/         Service Commandes — commandes, Saga (NestJS + PostgreSQL) \[à venir]
├── infra/
│   ├── docker-compose.yml Environnement local : PostgreSQL, MongoDB, Redis, RabbitMQ, Kong
│   └── kong/              Configuration déclarative de l'API Gateway
├── docs/                  Différents diagrammes et documents de conception
├── .eslintrc.js           Règles de lint partagées (ESLint)
├── .prettierrc            Formatage partagé (Prettier)
└── .gitignore
```

## Principe : Database-per-Service

Chaque service est seul maître de sa base. Aucun service ne lit la base d'un autre ; toute donnée externe passe par une API. Voir le journal des ADR (docs/).

## Démarrage rapide (environnement local)

```bash
# 1. Lancer l'infrastructure (bases + broker + passerelle)
cd infra \&\& docker compose up -d

# 2. Lancer le service IAM
cd ../services/iam
cp .env.example .env
npm install
npx prisma migrate dev      # crée le schéma en base
npm run start:dev           # démarre en mode watch
```

Le service IAM écoute sur `http://localhost:3001`. Les routes sont exposées via Kong sur `http://localhost:8000/api/v1/\*`.

## Qualité

* **ESLint + Prettier** : lint et formatage (config partagée à la racine).
* **SonarQube Community** : analyse de qualité (intégrée à la CI).
* Tests unitaires par service (`npm test`).

