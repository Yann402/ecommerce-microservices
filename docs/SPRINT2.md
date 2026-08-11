# Sprint 2 — Service IAM complet & validation JWT par Kong

## Livré
- **Claim `iss`** ajouté au JWT (`iss: 'iam-service'`) — pont de vérification avec Kong.
- **Garde d'authentification** (`JwtAuthGuard`) : lit et vérifie le JWT, attache l'utilisateur à la requête.
- **Garde d'autorisation** (`RolesGuard`) + décorateur `@Roles()` : contrôle d'accès par rôle.
- **Routes protégées** :
  - `GET /api/v1/users/me` — profil de l'utilisateur connecté (tout JWT valide).
  - `GET /api/v1/users` — liste des utilisateurs, réservée au rôle `ADMIN_METIER` (F-2.1.d).
- **Kong** : plugin `jwt` activé sur `/api/v1/users` ; Consumer + credential de vérification déclarés. `/api/v1/auth` reste public.
- **6 tests unitaires** verts (3 auth + 3 autorisation par rôle).
- **Collection Postman** complétée : profil, accès sans jeton (401), route admin.

## Architecture de sécurité (à retenir)
- **Kong authentifie** : valide la signature du JWT à l'entrée. Jeton absent/invalide → 401, la requête n'atteint pas le service.
- **Le service autorise** : lit le rôle du JWT validé et décide de l'accès fin (profil vs admin).
- Algorithme : HS256 (secret partagé). En production, RS256 (clés asymétriques) éviterait de partager le secret de signature avec la passerelle.

## Point de vigilance
Le `secret` du credential Kong (kong.yml) doit rester identique au `JWT_SECRET` du service IAM. En production, injecter via un secret (ADR-21).

## Prochain sprint (S3) : service Catalogue (produits, stock, MongoDB)
