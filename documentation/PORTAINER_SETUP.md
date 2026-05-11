# Setup Portainer pour YELOO+

## Réalité importante

Aujourd'hui, YELOO+ est déployé comme ceci :

- `frontend` sur **Vercel**
- `backend` sur **Render**

Portainer ne supervise **pas directement** Vercel ou Render comme il supervise un serveur Docker que tu contrôles toi-même.

Donc :

- **oui**, tu peux utiliser Portainer pour observer YELOO en **local** ou sur un **VPS Docker**
- **non**, Portainer ne va pas “entrer” dans Vercel/Render pour te montrer tes services live actuels

## Bonne nouvelle

Ton repo contient déjà :

- un service `portainer` dans `docker-compose.yml`
- un stack d'observabilité dans `docker-compose.observability.yml`
- un endpoint métriques backend : `/metrics`

Donc le chemin le plus simple est :

1. lancer YELOO en Docker localement
2. ouvrir Portainer pour voir les conteneurs
3. ouvrir Prometheus + Grafana pour voir les métriques

---

## Option 1 — Observer YELOO en local avec Portainer

### 1) Vérifie Docker Desktop

Assure-toi que Docker Desktop est lancé.

Teste :

```powershell
docker version
docker compose version
```

### 2) Depuis la racine du projet

Dans `C:\Users\oluac\Desktop\ImoCI`, lance :

```powershell
docker compose up -d db minio backend frontend portainer
docker compose -f docker-compose.observability.yml up -d
```

### 3) Ouvre les interfaces

- Portainer : `https://localhost:9443`
- Frontend local : `http://localhost:3000`
- Backend local : `http://localhost:8000/health`
- Prometheus : `http://localhost:9090`
- Grafana : `http://localhost:3001`

### 4) Premier accès Portainer

Au premier lancement, Portainer te demandera :

- de créer le compte admin Portainer
- puis de sélectionner l’environnement local Docker

Comme le conteneur Portainer est déjà monté sur :

- `/var/run/docker.sock`

il pourra voir directement les conteneurs Docker locaux.

---

## Ce que tu verras dans Portainer

Portainer va surtout te montrer :

- les conteneurs YELOO
- leur état (`running`, `stopped`, `restarting`)
- leurs logs
- leurs volumes
- leurs réseaux
- leur consommation basique

Pour les **vraies métriques applicatives** :

- requêtes
- temps de réponse
- santé API

utilise surtout :

- `Prometheus`
- `Grafana`

Portainer = gestion Docker  
Grafana/Prometheus = observabilité

---

## Option 2 — Observer YELOO “pour de vrai” en prod avec Portainer

Si tu veux une vraie supervision Portainer en production, il faut déployer YELOO sur :

- un **VPS**
- avec **Docker Compose**
- puis installer **Portainer** sur ce VPS

Dans ce modèle :

- Portainer supervise le serveur
- Prometheus scrape `/metrics`
- Grafana affiche les dashboards

Ça correspond beaucoup mieux à ton objectif “observer mon appli”.

---

## Pour ton setup actuel Vercel + Render

Le meilleur mix aujourd’hui est :

### Frontend Vercel

Utilise :

- logs Vercel
- analytics / speed insights si activés

### Backend Render

Utilise :

- logs Render
- health check `/health`
- métriques Render de base

### En plus

Tu peux garder en local ou sur VPS :

- Portainer pour voir les conteneurs
- Grafana pour les dashboards
- Prometheus pour les métriques

---

## Vérification rapide des métriques YELOO

Ton backend expose déjà :

- `GET /health`
- `GET /metrics`

Teste localement :

```powershell
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8000/metrics
```

Et en live Render :

```powershell
Invoke-WebRequest https://yeloo-api.onrender.com/health
Invoke-WebRequest https://yeloo-api.onrender.com/metrics
```

---

## Fichier Prometheus déjà prévu

Ton repo contient déjà un scrape config pour :

- `host.docker.internal:8000`
- `https://yeloo-api.onrender.com/metrics`

Donc Grafana/Prometheus sont déjà presque prêts pour YELOO.

---

## Recommandation simple

Si ton but est **observer vite**, fais ceci :

1. démarre Docker local
2. lance `docker compose up -d db minio backend frontend portainer`
3. lance `docker compose -f docker-compose.observability.yml up -d`
4. ouvre :
  - `https://localhost:9443`
  - `http://localhost:9090`
  - `http://localhost:3001`

Si ton but est **observer la vraie prod**, alors prochain move :

- on prépare un **déploiement VPS Docker Compose**
- puis on branche Portainer dessus

---

## Liens utiles

- Portainer CE Docker install: [https://docs.portainer.io/start/install-ce/server/docker](https://docs.portainer.io/start/install-ce/server/docker)
- Add Docker environment: [https://docs.portainer.io/admin/environments/add/docker](https://docs.portainer.io/admin/environments/add/docker)
- Portainer Agent note: [https://docs.portainer.io/admin/environments/add/docker/agent](https://docs.portainer.io/admin/environments/add/docker/agent)

