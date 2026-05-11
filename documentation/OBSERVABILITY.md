# Observabilité Yeloo

Cette configuration sert à voir l'état de l'API pendant les tests et à préparer le passage production.

## Démarrage local

1. Lance le backend local sur `http://localhost:8000`.
2. Lance Grafana + Prometheus :

```bash
docker compose -f docker-compose.observability.yml up
```

3. Ouvre Grafana :

```text
http://localhost:3001
```

Identifiants par défaut en local :

```text
admin / admin
```

Prometheus est disponible ici :

```text
http://localhost:9090
```

## Ce qui est monitoré

- `yeloo_http_requests_total` : nombre de requêtes API par méthode, route et statut.
- `yeloo_http_request_duration_seconds_sum` : durée totale des requêtes.
- `yeloo_http_request_duration_seconds_count` : nombre de requêtes mesurées.

Le dashboard `Yeloo API` montre le trafic, la durée moyenne et les erreurs serveur.

## Test vs production

Pour les tests, Docker Compose local suffit largement.

Pour la production, garde le même principe mais évite d'exposer Grafana sans protection. Le plus propre sera :

- utiliser Grafana Cloud ou un Grafana hébergé avec mot de passe fort;
- protéger `/metrics` si l'API devient publique à grande échelle;
- ajouter des alertes sur les erreurs `5xx`, la latence et l'indisponibilité API;
- ajouter plus tard des métriques métier : brouillons offline, soumissions, uploads échoués, messages non lus.

Donc oui, tu peux garder Grafana/Prometheus pour passer à l'action. Mais en production, on changera surtout l'hébergement, la sécurité et les alertes, pas forcément toute la logique.
