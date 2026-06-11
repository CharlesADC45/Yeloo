# Cahier des charges - Visites immersives, verification Yeloo+ et IA agentique

Date: 2026-06-09  
Projet: Yeloo+  
Statut: cadrage produit et technique pour MVP puis V2

## 1. Objectif du document

Ce document formalise les decisions et idees discutees autour de trois axes:

- la visite immersive des logements;
- la verification des biens par l'equipe Yeloo+ avec une possible utilisation future de Panoee;
- l'ajout progressif d'une IA agentique pour ameliorer les annonces, les recommandations et l'observation produit.

Le but est de garder un MVP simple aujourd'hui, tout en preparant une V2 plus professionnelle lorsque l'equipe et les moyens operationnels seront plus solides.

## 2. Vision produit

Yeloo+ doit permettre a un locataire de mieux comprendre un logement avant de contacter le proprietaire. L'experience doit rester simple pour le proprietaire: il ne doit pas etre oblige de maitriser des outils techniques comme Panoee, Kuula ou Matterport pour publier une annonce.

La vision cible est:

- le proprietaire ajoute ses photos, video et une image 360 si disponible;
- Yeloo+ affiche immediatement une experience propre dans l'application;
- l'equipe Yeloo+ peut verifier, ameliorer et traiter les medias si necessaire;
- une IA aide a controler la qualite de l'annonce et a proposer de meilleures recommandations aux locataires.

## 3. Decision MVP

Pour le MVP, la solution retenue est volontairement simple:

- conserver Photo Sphere Viewer pour les vraies images 360;
- accepter l'upload d'une image 360 ou d'une video 360;
- ne pas integrer Panoee directement dans le parcours proprietaire;
- ne pas demander au proprietaire de creer une visite sur une plateforme externe;
- ne pas afficher de champ "lien pro" dans les formulaires proprietaire;
- garder l'experience dans Yeloo+ autant que possible.

### Pourquoi ce choix

Cette approche reduit la complexite du produit et evite de bloquer le lancement sur une integration externe. Elle limite aussi la charge de formation des proprietaires.

### Limite connue

Une photo panoramique prise avec un telephone n'est pas toujours une vraie image 360 equirectangulaire. Dans ce cas, le rendu peut etre imparfait. Le MVP doit donc afficher clairement une visite 360 seulement quand le media est compatible.

## 4. Parcours MVP

### Cote proprietaire

1. Le proprietaire cree ou modifie une annonce.
2. Il ajoute les informations du logement.
3. Il upload des photos classiques.
4. Il peut ajouter une video.
5. Il peut ajouter une image ou video 360.
6. Il publie l'annonce.
7. L'annonce est visible selon le statut de verification Yeloo+.

### Cote locataire

1. Le locataire consulte la fiche logement.
2. Il voit les photos principales.
3. Il consulte la section "Visite 360" si un media 360 existe.
4. Il peut regarder la video si elle existe.
5. Il contacte le proprietaire ou demande une visite.

## 5. Verification des biens par l'equipe Yeloo+

La verification doit devenir un vrai module operationnel. Elle ne doit pas seulement valider l'identite du proprietaire, mais aussi la qualite de l'annonce.

### Statuts proposes

- `draft`: brouillon proprietaire;
- `submitted`: soumis a verification;
- `media_review`: medias en verification;
- `media_processing`: medias en traitement par l'equipe Yeloo+;
- `published`: publie;
- `needs_changes`: corrections demandees;
- `rejected`: refuse;
- `suspended`: suspendu.

### Verification minimale

L'equipe Yeloo+ doit pouvoir verifier:

- la coherence du prix;
- la localisation;
- la lisibilite des photos;
- la presence de photos suffisantes;
- la qualite de la description;
- la presence d'informations obligatoires;
- la validite des medias 360;
- les risques de fraude ou d'annonce douteuse.

## 6. Workflow futur avec Panoee

Panoee ne doit pas etre impose dans le MVP. Il peut devenir une option V2 geree par l'equipe Yeloo+.

### Idee de workflow V2

1. Le proprietaire upload ses photos et images panoramiques dans Yeloo+.
2. L'annonce passe en statut `media_processing`.
3. Cote locataire, l'annonce affiche "Verification en cours" ou "Visite en preparation".
4. L'equipe Yeloo+ recupere les medias.
5. L'equipe cree ou ameliore la visite dans Panoee.
6. L'equipe verifie le rendu final.
7. Le lien de visite final est ajoute dans Yeloo+.
8. L'annonce passe en `published` ou `verified`.

### Avantages

- le proprietaire garde un parcours simple;
- Yeloo+ controle la qualite finale;
- l'experience locataire devient plus professionnelle;
- l'equipe peut standardiser les visites;
- la fonctionnalite peut devenir une option premium plus tard.

### Integration possible type "gateway"

A terme, Yeloo+ peut discuter avec Panoee pour voir s'il existe:

- une API officielle;
- un mode partenaire;
- un systeme d'upload automatisable;
- une gestion multi-compte ou workspace;
- une facturation agence/plateforme;
- une possibilite de publier et synchroniser les liens dans Yeloo+.

Si Panoee propose un modele proche d'une passerelle, comme Stripe ou un payment gateway, l'integration pourrait devenir beaucoup plus propre. Sans API officielle, il ne faut pas automatiser leur interface par robot navigateur, car ce serait fragile.

## 7. IA agentique - objectifs

L'IA ne doit pas remplacer l'equipe au debut. Elle doit aider, verifier, suggerer et signaler.

Les premiers cas d'usage doivent etre pragmatiques:

- ameliorer la qualite des annonces;
- detecter les problemes de medias;
- aider les locataires a trouver plus vite;
- observer les points de friction dans l'application.

## 8. IA agentique - assistant qualite annonce

### Role

L'assistant qualite annonce analyse une annonce avant publication et donne un diagnostic simple.

### Capacites attendues

- detecter les photos floues;
- detecter les photos trop sombres;
- detecter les doublons;
- reconnaitre les pieces principales;
- suggerer un ordre de galerie;
- identifier si une image semble etre une vraie image 360;
- signaler si l'image 360 est probablement incompatible;
- proposer une meilleure description;
- signaler les champs manquants;
- donner un score qualite.

### Sortie proposee

L'IA peut afficher un statut:

- `Pret a publier`;
- `A ameliorer`;
- `Incomplet`;
- `Verification humaine recommandee`.

### Exemple de retour IA

```text
Qualite annonce: A ameliorer
- La photo principale est sombre.
- La visite 360 semble etre une photo panoramique plate, pas une vraie 360.
- Ajoutez au moins une photo de la salle d'eau.
- Le prix semble coherent avec les annonces similaires de la zone.
```

## 9. IA agentique - recommandations dans Explorer

### Objectif

Ameliorer la recherche locataire avec des suggestions intelligentes.

### Suggestions possibles

- logements similaires;
- logements proches du budget;
- logements mieux verifies;
- logements avec meilleure surface/prix;
- logements proches d'un quartier consulte;
- logements consultes recemment;
- logements populaires dans une zone;
- recommandations selon favoris, clics, messages ou temps de consultation.

### Recherche naturelle

L'IA peut permettre des requetes comme:

```text
Je cherche un studio calme a Koumassi, moins de 200000 FCFA, avec avance max 2 mois.
```

Le systeme transforme cette requete en filtres:

- type: studio;
- ville/quartier: Koumassi;
- budget max: 200000;
- avance max: 2 mois;
- preference: calme.

## 10. IA agentique - observation produit

### Objectif

Comprendre les problemes reels dans l'application.

### Donnees utiles

- recherches sans resultat;
- annonces vues mais jamais contactees;
- pages abandonnees;
- erreurs d'upload;
- echecs de publication;
- temps passe sur les etapes d'ajout de bien;
- clics sur favoris;
- demandes de visite;
- erreurs API cote client.

### Regles de confidentialite

- ne pas analyser les messages prives sans consentement clair;
- anonymiser les donnees comportementales;
- separer analytics produit et contenu personnel;
- documenter l'usage des donnees;
- donner une option de controle a l'utilisateur si necessaire.

## 11. Architecture technique cible

### Backend

Prevoir a terme:

- un statut de verification annonce;
- un statut de traitement media;
- un score qualite IA;
- une liste de problemes detectes par l'IA;
- un historique de moderation;
- une table ou collection d'evenements anonymises;
- une file de jobs pour traitement media;
- un endpoint pour lancer l'analyse IA.

### Donnees a ajouter plus tard

Champs possibles sur une annonce:

```text
verification_status
media_processing_status
tour_processing_status
tour_provider
tour_external_url
ai_quality_score
ai_quality_flags
ai_last_reviewed_at
admin_reviewed_at
admin_reviewed_by
```

### Frontend

Prevoir:

- un panneau "Qualite de l'annonce" cote proprietaire;
- un etat "Visite en preparation";
- un etat "Verification en cours";
- des recommandations intelligentes dans Explorer;
- un module admin pour les medias a traiter;
- un module admin pour les alertes IA.

## 12. Roadmap proposee

### Phase 1 - MVP actuel

- Upload photos;
- upload video;
- upload image/video 360;
- affichage avec Photo Sphere Viewer;
- verification manuelle simple;
- pas d'integration Panoee.

### Phase 2 - Assistant qualite annonce

- score qualite;
- detection des medias faibles;
- suggestions de description;
- verification des champs manquants;
- alertes avant publication.

### Phase 3 - Recommandations Explorer

- suggestions similaires;
- recherche naturelle;
- ranking plus intelligent;
- suivi des recherches sans resultat.

### Phase 4 - Workflow equipe Yeloo+ / Panoee

- statut "visite en preparation";
- back-office de traitement media;
- ajout manuel du lien Panoee par l'equipe;
- controle qualite avant publication;
- option premium possible.

### Phase 5 - Integration partenaire Panoee

- discussion avec l'equipe Panoee;
- verification API/partenariat;
- automatisation officielle si disponible;
- synchronisation des liens;
- eventuelle facturation ou offre premium.

## 13. Exigences fonctionnelles V2

- Un proprietaire doit pouvoir soumettre une annonce meme sans visite 360.
- Une annonce avec media 360 doit afficher une visite immersive.
- L'equipe Yeloo+ doit pouvoir voir les annonces qui demandent verification.
- L'equipe Yeloo+ doit pouvoir marquer une visite comme en preparation.
- Le locataire doit comprendre clairement si une visite est disponible ou en preparation.
- L'IA doit pouvoir signaler les problemes sans publier automatiquement de decision critique.
- L'admin doit pouvoir corriger ou ignorer une suggestion IA.

## 14. Exigences non fonctionnelles

- L'application doit rester rapide sur mobile.
- Les images doivent etre optimisees.
- Les traitements IA doivent etre faits en arriere-plan.
- Les donnees utilisateur doivent etre protegees.
- Les erreurs d'upload doivent etre comprehensibles.
- La publication ne doit pas dependre d'un service externe non critique.
- Les integrations externes doivent avoir un fallback.

## 15. Indicateurs de succes

### Cote locataire

- augmentation du taux de contact;
- augmentation des favoris;
- baisse des recherches sans resultat;
- plus de demandes de visite;
- temps de decision plus court.

### Cote proprietaire

- moins d'abandons pendant l'ajout de bien;
- plus d'annonces completes;
- moins d'erreurs d'upload;
- meilleur taux de publication apres verification.

### Cote equipe Yeloo+

- temps de verification reduit;
- moins d'annonces frauduleuses;
- meilleure qualite des medias;
- processus de traitement media plus clair.

## 16. Risques

- Les photos de telephone ne sont pas toujours compatibles avec une vraie visite 360.
- Une integration Panoee sans API officielle peut etre fragile.
- L'IA peut se tromper sur la qualite ou la piece detectee.
- Les recommandations peuvent devenir intrusives si elles utilisent trop de donnees.
- Le traitement media peut creer une charge operationnelle pour l'equipe.

## 17. Decisions a prendre plus tard

- Est-ce que la visite Panoee sera gratuite, premium ou reservee aux annonces verifiees?
- Est-ce que l'equipe Yeloo+ traite toutes les visites ou seulement les annonces importantes?
- Est-ce que le proprietaire peut demander une "amelioration media"?
- Est-ce que Yeloo+ contacte Panoee pour un partenariat?
- Quel niveau de consentement demander pour les recommandations personnalisees?
- Quel fournisseur IA utiliser pour l'analyse image et texte?

## 18. Conclusion

La meilleure direction est de garder un MVP simple et robuste aujourd'hui:

- upload direct dans Yeloo+;
- affichage 360 via Photo Sphere Viewer;
- verification humaine basique;
- pas d'obligation Panoee pour le proprietaire.

La V2 doit introduire progressivement:

- un assistant IA de qualite annonce;
- des recommandations intelligentes dans Explorer;
- un workflow de verification media par l'equipe Yeloo+;
- une integration Panoee seulement quand l'equipe et le partenariat sont prets.

Cette strategie permet de lancer plus vite, de garder le produit simple pour les utilisateurs, et de construire une qualite professionnelle progressivement.
