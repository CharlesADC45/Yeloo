# Deploiement YELOO - Netlify + Render

Le frontend part sur Netlify. Le backend reste sur Render.

Avant le premier deploy public, terminer la rotation des secrets qui etaient dans l'ancien dashboard frontend.

## Frontend Netlify

Le fichier `netlify.toml` a la racine configure le monorepo :

```toml
[build]
base = "frontend"
command = "npm run build"
publish = ".next"
```

Variables deja definies dans `netlify.toml` :

```env
NEXT_PUBLIC_API_BASE_URL=https://yeloo-api.onrender.com
NETLIFY_NEXT_SKEW_PROTECTION=true
```

Dans Netlify :

1. Importer le repo GitHub.
2. Garder la config detectee depuis `netlify.toml`.
3. Lancer le deploy.
4. Copier l'URL Netlify finale.

## Backend Render

Le backend peut rester sur Render, mais les origines frontend doivent etre renseignees manuellement et limitees aux domaines reellement utilises.

Pour un test local :

```env
FRONTEND_ORIGIN=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Apres le deploy Netlify, remplacer `ton-site.netlify.app` par l'URL reelle :

```env
FRONTEND_ORIGIN=https://ton-site.netlify.app
FRONTEND_ORIGINS=https://ton-site.netlify.app,http://localhost:3000,http://127.0.0.1:3000
```

Pour un futur domaine valide :

```env
FRONTEND_ORIGIN=https://yeloo.ci
FRONTEND_ORIGINS=https://yeloo.ci,https://www.yeloo.ci,http://localhost:3000,http://127.0.0.1:3000
```

## Rotation urgente

1. Regenerer toutes les variables et secrets qui ont ete stockes dans l'ancien dashboard frontend.
2. Regenerer les tokens GitHub lies a une integration de deploiement.
3. Regenerer les cles API externes utilisees par l'app: base de donnees, stockage, paiement, email, cartes, monitoring.
4. Verifier les logs de build et supprimer toute ancienne sortie contenant des secrets.
5. Reconnecter une plateforme frontend seulement apres rotation et verification.
