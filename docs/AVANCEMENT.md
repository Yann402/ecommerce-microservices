# Suivi d'avancement — Plateforme e-commerce en architecture microservices

Ce document retrace le déroulé du projet, organisé en cinq sprints. Il présente,
pour chaque sprint, ce qui a été réalisé et les points marquants. Le déroulé réel
s'est étendu sur cinq sprints (le cadre initial en prévoyait quatre) et les dates
ont été décalées par rapport au planning prévisionnel, tout en restant dans la
même période globale de deux mois.

\---

## Sprint 1 — Fondations

Mise en place du socle du projet.

* **Dépôt mono-repo** structuré (services / infrastructure / documentation), avec
configuration partagée du linter et du formateur de code.
* **Environnement de développement local** via docker-compose : PostgreSQL,
MongoDB, Redis, RabbitMQ et la passerelle Kong.
* **Passerelle Kong** configurée en mode déclaratif : routage des requêtes sur
`/api/v1/\\\*` et limitation de débit (rate limiting).
* **Service IAM** (gestion des utilisateurs), premier service fonctionnel :
inscription avec hachage du mot de passe (bcrypt), connexion retournant un
jeton JWT signé. Trois tests unitaires validés.
* **Chaîne d'intégration continue** (GitHub Actions) : installation, analyse de
code, tests, construction de l'image Docker.
* **Image Docker** de l'IAM construite via un Dockerfile multi-étapes.

\---

## Sprint 2 — Sécurité : authentification et autorisation

Consolidation du service IAM et mise en place de la sécurité de bout en bout.

* **Jeton JWT enrichi** (émetteur identifié) pour la vérification par la
passerelle.
* **Garde d'authentification** et **garde d'autorisation par rôle** : contrôle
d'accès fin selon le rôle de l'utilisateur.
* **Routes protégées** : profil de l'utilisateur connecté (tout jeton valide) et
liste des utilisateurs (réservée à l'administrateur).
* **Kong valide le jeton** à l'entrée : une requête sans jeton valide est rejetée
avant même d'atteindre le service.
* Six tests unitaires validés ; collection Postman complétée.

**Principe de sécurité retenu** — défense en profondeur : la passerelle
*authentifie* (validité du jeton à l'entrée), le service *autorise* (décision
d'accès selon le rôle). L'algorithme HS256 est utilisé en développement ; RS256
(clés asymétriques) serait retenu en production pour ne pas partager le secret de
signature avec la passerelle.

\---

## Sprint 3 — Service Catalogue

Développement du catalogue de produits, sur base documentaire MongoDB.

* **Service Catalogue** (base dédiée MongoDB, principe « une base par service »).
* **Consultation publique** : liste paginée des produits (filtrable par
catégorie), détail d'un produit, liste des catégories.
* **Gestion réservée à l'administrateur** : création, modification et suppression
(logique) des produits ; création de catégories.
* **Décrément de stock atomique et conditionnel** : la vérification du stock et sa
décrémentation sont évaluées ensemble, ce qui empêche tout stock négatif en cas
de commandes concurrentes sur le dernier article. Cette mécanique prépare la
compensation du processus d'achat (Sprint 4).
* **Routage par méthode HTTP** au niveau de Kong : lecture libre, écritures
protégées.
* Quatre tests unitaires validés ; collection Postman et script d'amorçage.

**Décisions de conception notables** : identifiants en UUID (cohérence entre
services, sans exposer l'implémentation de persistance) ; prix stockés en décimal
exact (jamais en flottant) pour la précision monétaire ; suppression logique des
produits (préservation de l'intégrité des commandes déjà passées) ; vérification
applicative de l'existence de la catégorie (MongoDB n'ayant pas de clé étrangère).

\---

## Sprint 4 — Processus d'achat et déploiement Kubernetes

Cœur métier de la plateforme et passage sur orchestrateur.

### Services Panier et Commandes

* **Service Panier** (stockage Redis, un panier par utilisateur) : ajout,
modification et suppression d'articles ; vérification de disponibilité auprès du
Catalogue via un appel synchrone protégé par un **disjoncteur** (circuit
breaker), pour éviter qu'une lenteur du Catalogue ne se propage.
* **Service Commandes** (base PostgreSQL dédiée) : transformation d'un panier en
commande, paiement simulé (mock configurable), gestion du cycle de vie de la
commande.

### Saga chorégraphiée (transaction distribuée)

* Le processus d'achat est orchestré par **messagerie asynchrone** (RabbitMQ) :
Commandes publie un événement, le Catalogue décrémente le stock, puis confirme
ou signale une rupture ; en cas de rupture, une **compensation** annule la
commande. Le panier est vidé une fois la commande confirmée.
* Le contexte (identifiant utilisateur, identifiant de trace) est propagé dans les
en-têtes des messages, de bout en bout.

### Déploiement Kubernetes (local)

* **Déploiement des quatre services** sur le Kubernetes de Docker Desktop, avec
trois namespaces (passerelle, applications, middlewares).
* **Bases de données en StatefulSet** avec stockage persistant.
* **Sondes de vivacité et de disponibilité**, **ConfigMaps** et **Secrets**,
**Kong Ingress Controller** (traduction de la configuration en ressources
Kubernetes natives).
* **Démonstration de résilience** : la suppression d'un pod entraîne sa
recréation automatique par l'orchestrateur.

\---

## Sprint 5 — Observabilité et industrialisation cloud

Supervision complète et préparation du déploiement cloud.

### Observabilité (trois piliers)

* **Métriques** : Prometheus collecte les métriques applicatives (débit, latence,
codes de retour) et système ; tableau de bord Grafana construit sur mesure.
* **Traçage distribué** : Jaeger, avec instrumentation OpenTelemetry. Le contexte
de trace est propagé à travers la passerelle, les appels synchrones **et** la
messagerie asynchrone — une commande est traçable de bout en bout, compensation
comprise.
* **Journalisation centralisée** : Loki (via Promtail), intégré à Grafana. Choix
de Loki plutôt qu'ELK pour sa légèreté et son intégration native.

### Industrialisation cloud

* **Infrastructure as code** (Terraform) : registre d'images ECR provisionné, et
description validée de l'infrastructure EKS cible (VPC, cluster, nœuds).
* **Pipeline CI/CD complet** : construction, test et **push automatique des quatre
images** vers ECR, avec authentification sécurisée (utilisateur technique à
permissions minimales).
* Le déploiement complet sur EKS a été **préparé et validé** (plan Terraform), non
appliqué par arbitrage de coût — voir perspectives.

\---

## Perspectives

* **Déploiement effectif de l'ensemble de la plateforme sur AWS EKS.**
L'infrastructure a été décrite et validée (plan Terraform) ; son application
complète, ainsi que le déploiement des services sur le cluster managé,
constituent la suite naturelle du projet.

## Hors périmètre

Certains éléments ont été volontairement exclus du projet, conformément au cadre
initial ou par arbitrage assumé :

* **Interface utilisateur (frontend)** : seules des API REST sont fournies,
testables via Postman.
* **Intégration bancaire réelle** : le paiement est simulé par un *mock*
configurable.
* **Gestion avancée des stocks et de la logistique d'expédition.**

