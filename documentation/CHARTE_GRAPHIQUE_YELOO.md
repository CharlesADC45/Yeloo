# Charte graphique YELOO+

## Idee de marque

YELOO+ exprime la confiance, la simplicite et la proximite. Le symbole associe une maison a une porte jaune : le logement est immediatement reconnaissable, tandis que l ouverture coloree represente l acces securise a une visite.

## Logo

- Logo horizontal : `frontend/public/brand/yeloo-logo.svg`
- Version pour fond sombre : `frontend/public/brand/yeloo-logo-white.svg`
- Symbole seul : `frontend/public/brand/yeloo-mark.svg`
- Zone de protection minimale : la moitie de la largeur du symbole autour du logo.
- Ne pas deformer, incliner, recolorer ou separer les elements du logo.

## Couleurs

- Bleu confiance : `#1D4ED8` - actions principales et navigation active.
- Jaune solaire : `#FFC928` - accent de marque et porte du symbole.
- Encre : `#111827` - titres et textes a fort contraste.
- Fond application : `#F6F8FC`.
- Bordures : `#E4E9F2`.
- Texte secondaire : `#667085`.
- Succes : `#0F9F6E`.
- Erreur : `#DC3545`.

Le jaune ne doit pas servir pour du petit texte sur fond blanc. Utiliser du texte encre sur fond jaune.

### Dégradé de marque (échelle tonale)

Tous les bleus et jaunes de l'application viennent de ces paliers. Aucune autre teinte (turquoise, cyan, indigo…) ne doit être introduite.

| Palier | Bleu | Usage |
|---|---|---|
| 50 | `#EEF3FF` | Fonds doux, cartes d'information |
| 100–200 | `#DBE5FF` / `#B9CBFF` | Bordures actives, survols |
| 400–500 | `#5F84F0` / `#3B63E3` | Illustrations, fin de dégradé |
| **600** | **`#1D4ED8`** | **Couleur principale** : boutons, liens, navigation active |
| 700 | `#173EA5` | Survol des boutons |
| 800–900 | `#123B8C` / `#0B2E6D` | Titres sur fond clair, début de dégradé |
| 950 | `#071A3F` | Fonds sombres (visite 360°, mode sombre) |

Jaune : `#FFFBEA` (fond) · `#FFDD66` · **`#FFC928` (accent)** · `#E0A800` · `#7A5A00` (texte jaune lisible sur blanc).

Dégradés officiels :
- **Marque :** `#0B2E6D` → `#1D4ED8` → `#3B63E3` (135°), pour les boutons d'action forts et les bannières.
- **Doux :** `#EEF3FF` → blanc (vertical), pour les fonds de section.
- **Soleil :** `#FFDD66` → `#FFC928`, réservé aux badges (vérifié, premium).

Dans le code, utiliser `var(--yeloo-blue-600)`, la classe Tailwind `brand-600` ou `bg-yeloo-brand`.

## Typographie

La famille principale est Poppins, deja integree dans l application.

- Titres principaux : Poppins 700 ou 800.
- Titres de section : Poppins 700.
- Corps et formulaires : Poppins 400 ou 500.
- Boutons : Poppins 700.
- Libelles courts : Poppins 700, capitales, espacement `0.16em`.

## Formes et profondeur

- Petit rayon : 12 px.
- Cartes : 24 px.
- Grandes surfaces : 32 px.
- Boutons principaux : forme capsule.
- Les ombres restent legeres et accompagnees d une bordure fine.

## Source technique

Les valeurs centrales sont declarees dans `frontend/app/globals.css` sous `:root` et reliees a Tailwind dans `frontend/tailwind.config.ts`. Toute nouvelle interface doit reutiliser ces variables ou les couleurs semantiques Tailwind.
