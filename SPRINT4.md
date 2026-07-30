# Sprint 4 — Déploiement Kubernetes (IAM + Catalogue), en local

Déploiement des deux services prioritaires sur le Kubernetes de Docker Desktop.
Les manifestes sont **identiques** à ceux qui iront sur EKS : seuls la cible
(`kubectl context`) et le mode de PostgreSQL (StatefulSet local → RDS managé)
changeront. Le local sert de banc de mise au point gratuit (« Catégorie 0 »).

## Livré
- **Trois namespaces** repris du diagramme d'architecture : `gateway` (Kong),
  `applications` (IAM, Catalogue), `infra-middlewares` (bases auto-hébergées).
- **Bases en StatefulSet** avec stockage persistant (`volumeClaimTemplates`) :
  MongoDB (Catalogue) et PostgreSQL (IAM — **local uniquement**, RDS sur EKS).
- **ConfigMaps + Secrets** : `JWT_SECRET` dans un **unique Secret partagé**
  (IAM + Catalogue), `DATABASE_URL` et `MONGODB_URI` pointant sur le DNS interne
  du cluster (`*.svc.cluster.local`).
- **Deployments + Services (ClusterIP)** des deux services, avec sondes
  **liveness/readiness** sur `/api/v1/health` (F-4.1.d) et un **initContainer**
  qui applique le schéma Prisma (`db push`) avant le démarrage d'IAM.
- **Kong Ingress Controller** (Helm, mode DB-less) : `KongConsumer`,
  `KongPlugin` (jwt, rate-limiting) et `Ingress` — la config `kong.yml` des
  sprints précédents entièrement traduite en ressources Kubernetes natives.
- **Endpoints de santé** ajoutés aux deux services (support des sondes).

## Architecture Kubernetes (à retenir)
- **Un StatefulSet, pas un Deployment, pour une base** : identité stable +
  volume persistant attaché. Le **Service headless** associé donne un nom DNS
  fixe au pod.
- **Routage par méthode HTTP** (KIC) : lecture et écriture partageant les mêmes
  chemins, deux `Ingress` les séparent via `konghq.com/methods` — GET en clair,
  POST/PUT/PATCH/DELETE sous plugin `jwt`. Le service vérifie ensuite le rôle
  (défense en profondeur, comme au Sprint 2).
- **Cohérence du `JWT_SECRET`** garantie par construction : une seule source
  (le Secret partagé), dont le credential Kong reprend la valeur.
- **Point d'entrée unique** : le proxy Kong, exposé par Docker Desktop sur
  `http://localhost` (port 80). Plus de `:8000` ni d'accès direct `:3001/:3002`.

## Difficultés rencontrées et solutions
Chaque incident ci-dessous a été diagnostiqué par les logs, pas deviné.

**1. Prisma incompatible avec l'image Docker (OpenSSL).**
L'initContainer d'IAM plantait en boucle (`Init:CrashLoopBackOff`) avec
`Please manually install OpenSSL` puis `Could not parse schema engine response`.
Cause : le moteur natif de Prisma ne trouvait pas la bonne version d'OpenSSL
dans l'image de base. Solution en deux temps : (a) passer le `Dockerfile` d'IAM
de `node:22-alpine` à `node:22-slim` **et** y installer OpenSSL
(`apt-get install -y openssl`) dans les deux étapes ; (b) déclarer la cible du
moteur dans `schema.prisma` : `binaryTargets = ["native", "debian-openssl-3.0.x"]`.

**2. Le cluster réutilisait une ancienne image (`:latest`).**
Après correction, le pod rejouait la même erreur : Kubernetes réutilisait
l'image en cache sur le nœud, car le tag `:latest` combiné à
`imagePullPolicy: IfNotPresent` lui faisait croire que rien n'avait changé.
Solution : **tag d'image immuable** (`iam-service:v2` au lieu de `:latest`) dans
`iam-deployment.yaml`. Bonne pratique conservée : un tag versionné rend le
déploiement déterministe (sur EKS, ce sera le hash du commit Git).

**3. Sortie de build décalée (`dist/src/main.js`).**
Le `scripts/seed.ts` du Catalogue, hors de `src/`, était happé par le build et
décalait toute l'arborescence de sortie — l'image n'aurait pas démarré
(`CMD node dist/main`). Solution : ajout d'un `tsconfig.build.json` (rootDir
`src`, exclusion de `scripts` et des specs).

**4. Mauvaise adresse dans Postman.**
Les collections héritaient d'adresses des sprints en docker-compose
(`:3001` en direct, `:8000` pour l'ancien Kong). En Kubernetes, tout passe par
Kong sur `http://localhost`. Solution : mettre les variables d'URL des deux
collections à `http://localhost`.

**5. Le piège du « mauvais pod ».**
Chaque `kubectl rollout restart` crée un pod au **nom différent** ; les anciens
subsistent quelques minutes en erreur. Réflexe pris : toujours lire le log du
pod le plus récent (`AGE` le plus faible), et utiliser
`kubectl rollout status` pour attendre la stabilisation.

## Mise en route (rappel)
Détail complet dans `infra/k8s/README.md`. Ordre : valider le build IAM → builder
les deux images → `helm install` de Kong → `kubectl apply` des manifestes →
seed du Catalogue (via `kubectl port-forward` de MongoDB) → création de l'admin
(register `CLIENT` puis promotion `ADMIN_METIER` par `kubectl exec` sur
`postgres-0`) → tests Postman sur `http://localhost`.

## Points de vigilance
- **Deux environnements indépendants** : docker-compose (Sprints 1-3) et
  Kubernetes ont chacun **leurs propres bases**. Un compte ou des produits créés
  dans l'un n'existent pas dans l'autre. Ne jamais les faire tourner ensemble.
- **Amorçage admin** : aucune route ne crée d'admin (ce serait une faille) ; le
  premier est promu hors bande, en base, **avant** le login (le rôle est figé
  dans le JWT à la connexion).
- **RAM Docker Desktop** : un pod bloqué en `Pending` est presque toujours un
  manque de mémoire (WSL2 s'autorise ~50 % de la RAM ; 16 Go suffisent).

## Corrections à committer
`services/iam/Dockerfile` (slim + openssl), `services/iam/prisma/schema.prisma`
(`binaryTargets`), `services/iam/package.json` (`prisma` en dependencies),
`infra/k8s/applications/iam-deployment.yaml` (tag `v2`),
`services/catalogue/tsconfig.build.json`, et les endpoints `health/` des deux
services. Sans eux, un `git clone` sur une autre machine rejouerait les
incidents 1 à 3.

## Reste à faire (Sprint 4, suite)
- **Démonstration de résilience** : supprimer un pod et observer sa recréation
  automatique (preuve des sondes / haute disponibilité).
- **Bascule EKS** via **Terraform** : VPC 3-tiers, cluster EKS, node group, RDS
  (remplace le StatefulSet PostgreSQL), ECR (push des images), 1 NAT Gateway
  (arbitrage coût staging). Discipline apply/destroy pour maîtriser la facture.
- **Observabilité** (US 4.2) : Prometheus, Grafana, Jaeger, ELK.
