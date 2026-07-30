# Installation de Kong Ingress Controller (KIC)

Kong est installé via Helm en mode DB-less dans le namespace `gateway`.
Le namespace est créé par `00-namespaces.yaml` (à appliquer avant).

```bash
helm repo add kong https://charts.konghq.com
helm repo update
helm install kong kong/ingress -n gateway --wait
```

Le chart `kong/ingress` déploie le controller ET le proxy. Sur Docker Desktop,
le Service proxy est de type LoadBalancer et devient accessible sur
http://localhost (ports 80/443). Vérifier :

```bash
kubectl get svc -n gateway            # EXTERNAL-IP = localhost
kubectl get pods -n gateway           # controller + proxy en Running
```

Les ressources de configuration (KongConsumer, KongPlugin, Ingress) vivent dans
le namespace `applications` ; KIC les découvre automatiquement (il surveille
tous les namespaces).
