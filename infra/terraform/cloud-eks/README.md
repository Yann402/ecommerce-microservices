# Infrastructure cloud EKS — description Terraform (cible)

Ce dossier contient la description **Terraform** de l'infrastructure cloud cible
du projet, sur **AWS EKS** (région `eu-west-3`, Paris). Il correspond au diagramme
d'architecture de référence AWS présenté dans le rapport.

## Statut : validé, non appliqué

Cette infrastructure a été **écrite et validée** par `terraform plan`
(19 ressources planifiées, sans erreur), mais **n'a pas été appliquée**
(`terraform apply`). Ce choix est délibéré et assumé :

- **Conformité au périmètre.** Le cahier des charges autorise un déploiement
  Kubernetes **local** (Docker Desktop / Minikube) _ou_ sur un service managé
  (EKS/AKS). Le déploiement local a été réalisé et validé ; le passage sur EKS
  constitue une extension préparée, non une exigence.

Le **déploiement effectif** de la plateforme sur EKS est documenté comme
**perspective** du projet (voir la conclusion du rapport).

## Contenu

| Fichier      | Rôle                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `vpc.tf`     | Réseau : VPC, sous-réseaux publics (2 zones de disponibilité), passerelle internet, table de routage. |
| `eks.tf`     | Cluster EKS (control plane) et groupe de nœuds de calcul, avec les rôles IAM associés.                |
| `outputs.tf` | Sorties utiles après création (nom et point d'accès du cluster).                                      |

## Choix de conception (staging)

Cette description vise un environnement de **démonstration** économique, et non
une configuration de production. Deux arbitrages notables :

- **Nœuds en sous-réseaux publics, sans passerelle NAT.** Les nœuds accèdent à
  internet directement via la passerelle internet (gratuite), ce qui évite le
  coût continu d'une **NAT Gateway**. En production, les nœuds seraient isolés en
  sous-réseaux privés derrière une NAT, pour la sécurité.
- **Base de données.** En cible complète, PostgreSQL serait fourni par un service
  managé (**RDS**), en remplacement du StatefulSet PostgreSQL utilisé en local.

Ces écarts par rapport à une architecture de production sont assumés et
documentés dans le rapport.

## Registre d'images (ECR)

Le registre d'images **ECR** — qui accueille les images poussées par la chaîne
CI/CD — est décrit et provisionné séparément (dossier Terraform parent). Il a été,
lui, réellement appliqué : les quatre images des services y sont poussées
automatiquement à chaque livraison sur la branche principale.

## Utilisation (pour référence)

```
# Depuis ce dossier, après configuration des identifiants AWS (SSO).
terraform init
terraform plan     # visualise les ressources sans rien créer
# terraform apply  # NON exécuté par défaut — création payante (EKS, nœuds)
# terraform destroy # à lancer immédiatement après toute création de test
```

> **Rappel de sécurité.** Toute création de ressources payantes doit être suivie
> d'une vérification qu'aucune ressource ne subsiste (cluster, instances, volumes,
> équilibreurs de charge), les ressources créées dynamiquement par Kubernetes
> pouvant échapper à un `terraform destroy`.
