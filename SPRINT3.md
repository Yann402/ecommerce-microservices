# Sprint 3 — Service Catalogue (produits, catégories, stock, MongoDB)

## Livré
- **Service NestJS `catalogue`** (port `3002`), persistance **MongoDB** via Mongoose, base dédiée `catalogue` (Database per Service).
- **Schémas** `Product` et `Category` (référence par `categorieId`, pas d'objet imbriqué).
- **Lecture publique** :
  - `GET /api/v1/products` — liste **paginée** (`page`, `taille`), filtre optionnel `categorieId` (F-2.2.a).
  - `GET /api/v1/products/:id` — détail d'un produit (F-2.2.b).
  - `GET /api/v1/categories` — liste des catégories.
- **CRUD admin** réservé au rôle `ADMIN_METIER` (F-2.2.d) :
  - `POST /api/v1/products`, `PUT /api/v1/products/:id`, `DELETE /api/v1/products/:id` (suppression **logique**).
  - `POST /api/v1/categories`.
- **Décrément de stock atomique conditionnel** (méthode de service, préparée pour la Saga du Sprint Commandes) — voir Bug 1.
- **Kong** : routage **par méthode HTTP** (GET public, écritures sous plugin `jwt`) ; service `catalogue-service` déclaré.
- **4 tests unitaires** verts (pagination, 404, décrément suffisant/insuffisant).
- **Collection Postman** (parcours ordonné login → catégorie → produit → CRUD) et **script de seed** (`npm run seed`).

## Routes et contrôle d'accès

| Méthode | Route                     | Accès                | Exigence |
|--------:|---------------------------|----------------------|----------|
| GET     | `/api/v1/products`        | Public               | F-2.2.a  |
| GET     | `/api/v1/products/:id`    | Public               | F-2.2.b  |
| POST    | `/api/v1/products`        | JWT + `ADMIN_METIER` | F-2.2.d  |
| PUT     | `/api/v1/products/:id`    | JWT + `ADMIN_METIER` | F-2.2.d  |
| DELETE  | `/api/v1/products/:id`    | JWT + `ADMIN_METIER` | F-2.2.d  |
| GET     | `/api/v1/categories`      | Public               | —        |
| POST    | `/api/v1/categories`      | JWT + `ADMIN_METIER` | —        |

## Décisions de conception (à retenir)
- **Identifiant en UUID (`String`)** plutôt qu'`ObjectId` Mongo : cohérent avec IAM et référençable tel quel par Panier/Commandes, sans exposer l'implémentation de persistance.
- **Prix en `Decimal128`** (jamais un flottant) : précision monétaire exacte et tri correct en base. Sérialisé en chaîne dans le JSON via un `transform` (l'objet Decimal128 brut n'est pas exposé). L'arithmétique (`montantTotal`) sera convertie proprement au Sprint Commandes.
- **Suppression logique** (`actif = false`) : un produit « supprimé » sort des listes publiques mais reste en base pour préserver l'intégrité des commandes déjà passées.
- **Intégrité applicative** : à la création/màj d'un produit, l'existence de la catégorie est vérifiée (`400` si inconnue), MongoDB n'ayant pas de clé étrangère.
- **CRUD catégories minimal** (créer + lister) : corollaire de la relation `Product 0..* → 1 Category` du diagramme de classes — nécessaire pour rattacher un produit, réduit au strict minimum.
- **Images sur S3 en URLs référencées** (ADR-10) : la base stocke `listeUrlsImages` ; l'upload de fichiers n'est pas géré côté service.
- **Gardes de sécurité dupliquées** depuis IAM (autonomie du microservice), plutôt qu'un module partagé.

## Sécurité — défense en profondeur (rappel Sprint 2 appliqué au Catalogue)
- **Kong authentifie** : sur les écritures, la signature du JWT est validée à l'entrée (jeton absent/invalide → `401`).
- **Le service autorise** : `RolesGuard` lit le rôle du JWT validé et exige `ADMIN_METIER` (sinon `403`).
- **Routage par méthode** : lecture et écriture partageant les mêmes chemins, la séparation public/protégé se fait par méthode HTTP (GET libre, POST/PUT/PATCH/DELETE sous plugin `jwt`).

## Bug anticipé — Bug 1 (stock négatif)
Le décrément s'appuie sur un `findOneAndUpdate` **atomique** sur le document :

```
{ _id, actif: true, stock: { $gte: quantite } }  →  { $inc: { stock: -quantite } }
```

La condition « stock suffisant » et le décrément sont évalués **ensemble** : deux commandes concurrentes sur le dernier article ne peuvent pas faire passer le stock en négatif. Un résultat `null` (condition non satisfaite) signale un stock insuffisant et déclenchera la compensation Saga au Sprint Commandes.

## Points de vigilance
- **Amorçage du premier administrateur** : l'inscription crée un `CLIENT` (`@default(CLIENT)`) et aucune route ne crée d'admin (ce serait une faille). Le premier admin est promu **hors bande** en base : `UPDATE users SET role='ADMIN_METIER' WHERE email='…'`. Le rôle étant figé dans le JWT au login, promouvoir **avant** de se connecter.
- **Seed** : `npm run seed` réinitialise la base (`deleteMany` puis insertion). À lancer une fois pour amorcer, pas à chaque test — MongoDB persiste via le volume `mongo_data`.
- **MongoDB** : servi par le conteneur du `docker-compose` sur `27017` (aucun MongoDB natif → pas de contournement de port, contrairement à PostgreSQL/5433).
- **502/503 vs 401** : `401` = sécurité normale ; `502/503` = Kong ne joint pas le service en amont (service non démarré ou `host.docker.internal`).

## Dépendances de service (pour tester)
- **Authentification** (register/login) : IAM (`3001`) + PostgreSQL + Kong.
- **Catalogue** (produits/catégories) : Catalogue (`3002`) + MongoDB + Kong.

## En attente (hors périmètre Sprint 3)
- Push image vers **ECR** et intégration **SonarQube** : conditionnés à l'accès AWS.
- **Upload réel** des images sur S3 : différé (URLs seulement pour l'instant).

## Prochain sprint (S4) : conteneurisation, déploiement Kubernetes et observabilité
