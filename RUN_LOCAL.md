## Lancer le backend en local (Git Bash / Windows)

Dans `c:\Users\oluac\Desktop\ImoCI\backend` :

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Pourquoi `uvicorn` n'était pas trouvé ?

Si tu n'actives pas l'environnement virtuel (ou si `pip` installe en "user site"), la commande `uvicorn` peut ne pas être dans ton `PATH`.
`python -m uvicorn ...` fonctionne même quand l'exécutable `uvicorn` n'est pas directement accessible.

### Si `pip install` échoue (DNS / pas d'accès internet)

Tu peux lancer l'API **sans venv** en utilisant les dépendances déjà installées sur ta machine :

```bash
cd c:\Users\oluac\Desktop\ImoCI\backend
python -m uvicorn app.main:app --reload --port 8000
```

## Commandes utilisees (recap)

### Installation + demarrage
```bash
cd c:\Users\oluac\Desktop\ImoCI\backend
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Configuration environnement
```bash
copy .env.example .env
```

Exemple de contenu de `backend\.env`:
```
DATABASE_URL=postgresql+psycopg2://immouser:immopass@127.0.0.1:5432/immoconnect
FRONTEND_ORIGIN=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SECRET_KEY=change_me
```

### Postgres local (si besoin)
```sql
CREATE USER immouser WITH PASSWORD 'immopass';
CREATE DATABASE immoconnect OWNER immouser;
```

### Verification
```
http://127.0.0.1:8000/health
http://127.0.0.1:8000/api/properties
```

### Seed demo data
```bash
cd c:\Users\oluac\Desktop\ImoCI\backend
.\.venv\Scripts\Activate.ps1
python -m app.db.seed_demo
```

Ce seed recrée maintenant **30 biens de démonstration** (maisons, villas, studios, appartements/résidences) pour le propriétaire démo `owner@immoci.local`, avec plusieurs localisations en Côte d’Ivoire et des photos de démonstration.

### Mino0
PS C:\Users\oluac\Desktop\ImoCI> .\tools\minio\minio.exe server .\minio-data --console-address ":9001"

$  source /c/Users/oluac/Desktop/ImoCI/.venv/Scripts/activate
