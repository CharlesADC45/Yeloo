# CONTEXTE DU PROJET — ImmoConnect CI

## Résumé
ImmoConnect CI est une application web progressive (PWA) de recherche immobilière en Côte d’Ivoire. Elle connecte directement propriétaires et locataires, sans intermédiaires, pour réduire les arnaques et améliorer la fiabilité des annonces. L’expérience cible est moderne et mobile-first (visites 360°, carte du quartier, usage offline).

## Objectifs produit
- Réduire les arnaques immobilières grâce à la vérification et aux signalements.
- Permettre un contact direct propriétaire ↔ locataire.
- Offrir une recherche rapide, mobile et fiable, même en connexion instable.

## Public cible
- Marché principal : Côte d’Ivoire (Abidjan en priorité).
- Extension prévue : Afrique francophone.
- Usages dominants : mobile, PWA installable sans app store.

## Priorités MVP (ordre)
1. Upload offline des médias (photos/360°) avec synchronisation.
2. Fiche de logement complète (médias, carte, détails, contact direct).
3. Système anti-arnaques (vérification + signalements + badges).
4. Recherche avancée avec filtres.

## Fonctionnalités clés
### Upload offline (priorité haute)
- Sélection des photos en mode hors connexion.
- Stockage local via IndexedDB.
- Service Worker (Workbox) surveille la reconnexion.
- Background Sync envoie les fichiers vers l’API.
- UI : statut “En attente” → “Publié”.

### Fiche de logement complète
- Galerie photo + viewer 360°.
- Carte interactive (Mapbox) + street view du quartier.
- Infos détaillées (surface, pièces, équipements).
- Badges de confiance du propriétaire.
- Contact direct (sans agent).
- Avis et notations.

### Système anti-arnaques
- Vérification obligatoire avant publication.
- Badges : identité, téléphone, propriété.
- 3 signalements sur une annonce → suspension automatique (statut = “suspendu”).

### Recherche avancée
Filtres : ville, quartier, type de bien, prix min/max, surface, meublé, disponibilité, badges uniquement.

## Règles métier
- Tous les IDs sont en UUID.
- Routes sensibles protégées par JWT.
- Upload : validation du type MIME (images uniquement pour photos).
- Suppression d’annonce = suppression des fichiers associés dans MinIO.
- Messages d’erreur API en français.

## Modèles de données (résumé)
### User
- id, email (unique), phone, full_name
- role (proprietaire, locataire, admin)
- is_verified, is_phone_verified
- identity_doc_url, property_proof_url
- trust_badge (none, phone, identity, full)
- report_count, is_suspended, created_at

### Property
- id, owner_id
- title, description, property_type
- price, price_period, surface_m2
- rooms, bathrooms
- address, city, neighborhood
- latitude, longitude
- is_furnished, status
- is_verified_listing, views_count
- boost_until, created_at

### PropertyMedia
- id, property_id, media_type (photo, photo_360, video)
- url, is_primary, upload_status
- created_at

### Review
- id, reviewer_id, reviewed_id, property_id
- rating (1–5), comment, created_at

### Report
- id, reporter_id, reported_property_id, reported_user_id
- reason, description, status, created_at

## Rôles et permissions (Casbin)
- Propriétaire : gérer ses annonces, uploader médias, voir demandes, stats, générer bail.
- Locataire : rechercher, consulter, contacter, laisser un avis, signaler, gérer favoris.
- Admin : tout faire, vérifier identités, traiter signalements, suspendre comptes/annonces.

## Stack technique cible
### Backend
- FastAPI, SQLAlchemy, PostgreSQL, Alembic, Pydantic
- Casbin (RBAC), MinIO S3

### Frontend
- Next.js 14 (App Router), TypeScript
- Zustand, Axios
- Next PWA + Workbox
- Pannellum ou Photo Sphere Viewer
- Mapbox GL JS
- Tailwind CSS

### Infra & DevOps
- Docker / Docker Compose, Portainer
- Grafana, Cloudflare
- Hetzner VPS (CX21)

### Outils
- Figma, GitHub, Cursor

## Architecture cible (dossiers)
```
immoconnect/
├── backend/
├── frontend/
├── docker-compose.yml
└── .env.example
```

## Docker Compose (base)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/immoconnect
      - MINIO_ENDPOINT=minio:9000
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - minio

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: immoconnect
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  portainer:
    image: portainer/portainer-ce
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  postgres_data:
  minio_data:
  portainer_data:
```

## Livrables initiaux (première étape)
1. Générer la structure complète des dossiers.
2. Créer `docker-compose.yml` complet et fonctionnel.
3. Créer le backend FastAPI (modèles, schémas, migrations, auth JWT, Casbin, MinIO).
4. Créer le frontend Next.js (PWA, Workbox, stores Zustand, OfflineUploader, UI de base).
5. Créer `.env.example`.

## Contraintes techniques
- Frontend en TypeScript.
- Backend avec commentaires en français.
- UI en français.
- Erreurs API en français.

## NOTE PERSO

Oui, bonne idée de revisiter le flow. J’ai regardé rapidement le code actuel: le parcours existe déjà, mais il manque encore quelques “ponts” entre intérêt, visite, dossier et décision finale.

**Flow Actuel**
Locataire:
1. Il consulte les annonces.
2. Il ajoute aux favoris.
3. Il contacte le propriétaire depuis l’annonce.
4. Il discute dans la messagerie.
5. Le bail existe côté code, mais le contrat numérique est actuellement en pause.

Propriétaire:
1. Il crée son profil propriétaire.
2. Il attend validation/KYC.
3. Il publie ou modifie ses biens.
4. Il reçoit les messages liés aux annonces.
5. Il peut voir des dossiers de bail, mais le process bail reste surtout un suivi manuel/physique.

Admin/SU admin:
1. Il vérifie les propriétaires.
2. Il valide/modère les annonces.
3. Il voit les utilisateurs, publications, baux, notifications publiques, promos, modules.

**Ce Qui Manque Le Plus**
Le gros manque, selon moi, c’est entre “je suis intéressé” et “on signe physiquement”. Aujourd’hui, le locataire peut écrire au propriétaire, mais il n’y a pas encore un vrai chemin clair après le message.

Je proposerais ces modules, dans cet ordre:

1. **Demande de visite**
   Le locataire choisit une date/heure, ajoute un message, puis le propriétaire accepte, refuse ou propose une autre heure.  
   C’est le meilleur prochain module parce que c’est naturel avant le bail.

2. **Statut de parcours**
   Sur chaque annonce/contact:  
   `Intéressé -> Message envoyé -> Visite demandée -> Visite acceptée -> Dossier envoyé -> Bail validé physiquement`.

3. **Dossier locataire simple**
   Nom, téléphone, profession, pièce facultative, note au propriétaire.  
   Pas trop lourd au début, juste assez pour rassurer le propriétaire.

4. **Statut du bien**
   Le propriétaire peut marquer: `Disponible`, `Réservé`, `Loué`.  
   Et côté locataire, on affiche clairement le statut sur le listing.

5. **Notifications ciblées**
   Déjà commencé avec les alertes. On peut ajouter:
   `Nouvelle demande de visite`, `Visite acceptée`, `Nouveau dossier locataire`, `Demande refusée`, `Bien réservé`.

Mon avis: le prochain vrai module à construire, c’est **Demande de visite**. C’est simple, utile, et ça rend le flow locataire/propriétaire beaucoup plus sérieux sans toucher directement aux paiements ou au bail numérique.