# Déploiement rapide YELOO — Option A

Objectif : mettre YELOO en ligne vite pour tester sur mobile et montrer le produit.

Stack recommandée pour ce mode :

- Frontend : Vercel
- Backend FastAPI : Render Web Service avec Docker
- Base de données : Neon Postgres
- Stockage images/documents : Cloudflare R2
- DNS/SSL : Cloudflare

> Note honnête : le chat actuel est une messagerie interne YELOO v1. Il n'utilise pas encore Matrix et n'est pas encore en temps réel complet.

---

## 1. Préparer la base Neon

1. Créer un projet Neon.
2. Créer une base, par exemple `yeloo`.
3. Copier l'URL de connexion Postgres.
4. Utiliser cette valeur pour `DATABASE_URL` côté backend.

Format attendu :

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/yeloo?sslmode=require
```

Si Neon donne une URL qui commence par `postgresql://`, elle fonctionne généralement aussi avec SQLAlchemy, mais `postgresql+psycopg2://` garde notre intention claire.

---

## 2. Préparer Cloudflare R2

1. Créer un bucket, par exemple `yeloo-media`.
2. Créer une clé d'accès R2.
3. Activer un domaine public pour lire les fichiers, par exemple :
   - `https://media.yeloo.ci`
   - ou une URL publique R2 de test.
4. Renseigner ces variables côté backend :

```env
MINIO_ENDPOINT=ACCOUNT_ID.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your_r2_access_key
MINIO_SECRET_KEY=your_r2_secret_key
MINIO_BUCKET=yeloo-media
MINIO_SECURE=true
MINIO_PUBLIC_URL=https://media.yeloo.ci
MINIO_PUBLIC_URL_IS_BUCKET_ROOT=true
```

Pourquoi `MINIO_PUBLIC_URL_IS_BUCKET_ROOT=true` ?

Parce qu'avec R2 ou un domaine custom, l'URL publique pointe souvent directement vers la racine du bucket :

```text
https://media.yeloo.ci/fichier.jpg
```

et non :

```text
https://media.yeloo.ci/yeloo-media/fichier.jpg
```

---

## 3. Déployer le backend sur Render

Créer un nouveau Web Service Render depuis le repo GitHub `CharlesADC45/Yeloo`.

Configuration recommandée :

- Root directory : `backend`
- Environment : Docker
- Dockerfile path : `Dockerfile`
- Health check path : `/health`

Le fichier `render.yaml` à la racine donne aussi une base de Blueprint Render pour ce service.
Si tu utilises le Blueprint, Render te demandera quand même de remplir les variables marquées `sync: false`.

Variables à ajouter dans Render :

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/yeloo?sslmode=require
SECRET_KEY=change_me_to_a_long_random_secret
FRONTEND_ORIGIN=https://your-yeloo-frontend.vercel.app
FRONTEND_ORIGINS=https://your-yeloo-frontend.vercel.app,http://localhost:3000,http://127.0.0.1:3000
BOOTSTRAP_ADMIN_EMAIL=admin@yeloo.ci
BOOTSTRAP_ADMIN_PASSWORD=change_this_before_live
BOOTSTRAP_ADMIN_FULL_NAME=Super Admin Yeloo
MINIO_ENDPOINT=ACCOUNT_ID.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your_r2_access_key
MINIO_SECRET_KEY=your_r2_secret_key
MINIO_BUCKET=yeloo-media
MINIO_SECURE=true
MINIO_PUBLIC_URL=https://media.yeloo.ci
MINIO_PUBLIC_URL_IS_BUCKET_ROOT=true
```

Le Dockerfile exécute automatiquement :

```bash
alembic upgrade head
```

puis démarre l'API FastAPI sur le port fourni par Render.

Test après déploiement :

```text
https://yeloo-api.onrender.com/health
```

Réponse attendue :

```json
{"status":"ok"}
```

---

## 4. Déployer le frontend sur Vercel

Créer un projet Vercel depuis le repo GitHub `CharlesADC45/Yeloo`.

Configuration recommandée :

- Root directory : `frontend`
- Build command : `npm run build`
- Output : Next.js par défaut

Variables à ajouter dans Vercel :

```env
NEXT_PUBLIC_API_BASE_URL=https://yeloo-api.onrender.com
```

Le fichier `frontend/.vercelignore` évite d'envoyer les caches locaux inutiles.

Après le déploiement Vercel, récupérer l'URL frontend, par exemple :

```text
https://yeloo.vercel.app
```

Puis retourner dans Render et remplacer :

```env
FRONTEND_ORIGIN=https://yeloo.vercel.app
FRONTEND_ORIGINS=https://yeloo.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

Ensuite redéployer le backend.

---

## 5. Domaine et Cloudflare

Quand le domaine est prêt :

- `yeloo.ci` ou `yeloo.com` vers Vercel pour le frontend
- `api.yeloo.ci` vers Render pour le backend si tu veux un domaine API propre
- `media.yeloo.ci` vers Cloudflare R2 pour les fichiers publics

Exemple final :

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yeloo.ci
FRONTEND_ORIGIN=https://yeloo.ci
FRONTEND_ORIGINS=https://yeloo.ci,https://www.yeloo.ci,http://localhost:3000,http://127.0.0.1:3000
MINIO_PUBLIC_URL=https://media.yeloo.ci
```

---

## 6. Checklist mobile

Après le live, tester sur téléphone :

- Page home
- Login / inscription
- Voir tout
- Carte
- Favoris
- Détail logement
- Upload image propriétaire
- Chat `/messages`
- Admin `/admin`
- KYC propriétaire

Si quelque chose marche sur desktop mais pas mobile, vérifier d'abord :

- `NEXT_PUBLIC_API_BASE_URL`
- `FRONTEND_ORIGINS`
- CORS backend
- URL publique des images R2
- HTTPS partout

---

## 7. Prochaine étape après live

Une fois la version en ligne stable :

1. Ajouter polling/WebSocket pour rendre le chat plus live.
2. Ou intégrer Matrix proprement si on décide de passer à un vrai système de chat fédéré.
3. Ajouter monitoring et sauvegardes.
