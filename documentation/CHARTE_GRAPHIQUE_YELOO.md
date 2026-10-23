# Charte graphique YELOO+

Version 2.0 · 23 octobre 2026 · remplace la version 1 (juillet 2026)

À lire avec la [ligne éditoriale](LIGNE_EDITORIALE_YELOO.md), qui fixe le ton et les textes.

---

## 1. Idée de marque

YELOO+ exprime **la confiance, la simplicité et la proximité**. Le bleu porte la confiance (annonces et propriétaires vérifiés) ; le jaune soleil marque les moments forts (badge vérifié, prix, accent unique d'un visuel).

## 2. Logo

**Le logo est un logotype texte seul : « Yeloo » + un « + » bleu.** Aucun pictogramme de maison : il a été retiré volontairement et ne doit pas revenir.

| Règle | Valeur |
|---|---|
| Composition | « Yeloo » en Poppins ExtraBold, interlettrage serré (`-0.075em`), suivi d'un « + » |
| Couleur du texte | Encre `#111827` (fond clair) · blanc (fond sombre) |
| Couleur du « + » | **Bleu `#1D4ED8`**, jamais jaune ; blanc uniquement sur fond bleu |
| Casse | « Yeloo+ » dans l'app ; « YELOO+ » autorisé dans les documents |
| Zone de protection | la hauteur du « + » tout autour du logo |
| Taille minimale | 24 px de haut à l'écran |

Interdit : déformer, incliner, ajouter un symbole, mettre le « + » en jaune, poser le logo sur une photo sans fond uni.

Source dans le code : `frontend/components/YelooWordmark.tsx`.

> **À mettre à jour :** les fichiers `frontend/public/brand/yeloo-logo.svg`, `yeloo-logo-white.svg` et `yeloo-mark.svg` contiennent encore l'ancien symbole maison. Ils doivent être refaits en logotype texte avant tout usage externe (réseaux sociaux, documents, presse).

## 3. Couleurs

### Couleurs principales

| Rôle | Couleur | Usage |
|---|---|---|
| Bleu confiance | `#1D4ED8` | Boutons principaux, liens, navigation active, « + » du logo |
| Jaune soleil | `#FFC928` | Accent : badges, point actif du menu, un seul élément clé par visuel |
| Encre | `#111827` | Titres et textes |
| Texte secondaire | `#667085` | Sous-titres, aides, métadonnées |
| Bordures | `#E4E9F2` | Séparateurs, contours de cartes |
| Fond application | `#F6F8FC` | Fond des pages |
| Succès | `#0F9F6E` | Confirmation, disponible |
| Erreur | `#DC3545` | Erreurs, suppression |

Le jaune ne sert jamais pour du petit texte sur fond blanc : utiliser `#7A5A00` (jaune foncé) ou du texte encre sur fond jaune.

### Dégradé de marque (échelle tonale)

Tous les bleus et jaunes de l'application viennent de ces paliers. **Aucune autre teinte** (turquoise, cyan, indigo, vert vif…) ne doit être introduite.

| Palier | Bleu | Usage |
|---|---|---|
| 50 | `#EEF3FF` | Fonds doux, cartes d'information |
| 100–200 | `#DBE5FF` / `#B9CBFF` | Bordures actives, survols |
| 400–500 | `#5F84F0` / `#3B63E3` | Illustrations, fin de dégradé |
| **600** | **`#1D4ED8`** | **Couleur principale** |
| 700 | `#173EA5` | Survol des boutons |
| 800–900 | `#123B8C` / `#0B2E6D` | Titres sur fond clair, début de dégradé |
| 950 | `#071A3F` | Fonds sombres (visite 360°, mode sombre) |

Jaune : `#FFFBEA` (fond) · `#FFF3C4` · `#FFDD66` · **`#FFC928` (accent)** · `#E0A800` · `#7A5A00` (texte).

### Dégradés officiels

| Nom | Couleurs | Usage |
|---|---|---|
| Marque | `#0B2E6D` → `#1D4ED8` → `#3B63E3` (135°) | Bouton d'action du menu, bannières, visuels réseaux sociaux |
| Doux | `#EEF3FF` → blanc (vertical) | Fonds de section |
| Soleil | `#FFDD66` → `#FFC928` | Badges « Premium » et « Vérifié » uniquement |

## 4. Typographie

**Une seule famille : Poppins**, chargée par l'application (`next/font`). Aucune autre police dans l'app ni dans les visuels de marque.

| Élément | Graisse | Taille indicative |
|---|---|---|
| Logo | 800 (ExtraBold) | 32 px |
| Titre de page | 600–700 | 28–36 px |
| Titre de section | 600 | 20 px |
| Texte courant, formulaires | 400–500 | 15–16 px |
| Boutons | 600 | 14–16 px |
| Libellés courts (étiquettes) | 600, capitales, espacement `0.16em` | 11–12 px |

Le texte en français porte toujours ses accents, et les prix s'écrivent « 185 000 FCFA / mois » (voir la ligne éditoriale).

## 5. Formes et profondeur

| Élément | Valeur |
|---|---|
| Petit rayon (champs, puces) | 12 px |
| Cartes | 24 px |
| Grandes surfaces, panneaux | 32 px |
| Boutons principaux | capsule (rayon complet) |
| Bouton « Menu » et bouton d'action du menu | 14 px |
| Ombres | légères, toujours avec une bordure fine `#E4E9F2` |

## 6. Composants de référence

| Composant | Règle | Fichier |
|---|---|---|
| Bouton « Menu ☰ » | contour encre 1,5 px, texte + 3 traits, même style pour « Fermer ✕ » | `components/SiteMenu.tsx` |
| Menu | lignes séparées par un filet, groupes dépliables (▸), barre basse : sélecteur 🌐 FR / EN + bouton dégradé de marque | `components/SiteMenu.tsx` |
| Bouton principal | capsule bleue `#1D4ED8`, texte blanc 600, verbe d'action (« Réserver une visite — 3 000 FCFA ») | — |
| Badge vérifié / Premium | dégradé soleil, texte encre | — |
| Panneau « À savoir » | reste fixé sous la barre de titre pendant le défilement (écrans ≥ 1280 px) | `app/logements/[id]/LogementClient.tsx` |

## 7. Mode sombre

Fond `#080B12`, surfaces `#0F172A`, texte `#F8FAFC`. Le « + » du logo reste bleu ; les contours du bouton « Menu » passent en blanc à 70 %.

## 8. Source technique

- Variables : `frontend/app/globals.css` (`:root`) : `--yeloo-blue-50` à `--yeloo-blue-950`, `--yeloo-sun-*`, `--yeloo-gradient-brand`, `--yeloo-gradient-soft`, `--yeloo-gradient-sun`.
- Tailwind : `frontend/tailwind.config.ts` : couleurs `brand-50` … `brand-950` et `sun-*`, fonds `bg-yeloo-brand`, `bg-yeloo-soft`, `bg-yeloo-sun`, police `font-sans` = Poppins.
- Prix : `frontend/lib/format.ts` (`formatPrice`, `formatPriceLabel`).

Toute nouvelle interface réutilise ces variables ; aucune couleur en dur (`#2563eb`, `teal-600`…) ne doit être ajoutée.

## Historique

| Version | Date | Changements |
|---|---|---|
| 2.0 | 23 oct. 2026 | Logotype texte seul (maison retirée), échelle tonale et dégradés, Poppins réparée, composants menu et « À savoir », règles de prix |
| 1.0 | juillet 2026 | Première charte : couleurs, Poppins, rayons |
