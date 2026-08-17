# Plan produit et technique — Pixelia

## 1. Vision du produit

Faire évoluer l'application Streamlit actuelle vers une webapp de pixel art ludique, responsive et installable, qui permet de :

1. transformer une image importée en modèle de pixel art ;
2. générer un modèle depuis une description textuelle lorsque le service d'IA est configuré ;
3. démarrer immédiatement depuis une bibliothèque de modèles prêts à colorier ;
4. colorier le modèle directement dans le navigateur, sur ordinateur, tablette ou mobile ;
5. sauvegarder, reprendre et exporter sa création.

Le parcours principal doit fonctionner sans compte et sans service externe. La génération par texte est un enrichissement optionnel : si aucune clé de fournisseur d'images n'est configurée, l'interface propose automatiquement les modèles intégrés.

## 2. Choix technologique recommandé

### Frontend

- **Next.js (App Router) + TypeScript** pour une application moderne, rapide, SEO-friendly et déployable facilement.
- **React** pour l'éditeur interactif et ses états complexes.
- **Tailwind CSS** et des composants accessibles inspirés de **shadcn/ui** pour une identité visuelle brillante sans sacrifier la maintenabilité.
- **Canvas HTML5** pour une grille fluide même avec plusieurs milliers de cases ; le DOM reste réservé aux contrôles et à l'accessibilité.
- **Zustand** pour l'historique, les outils, la palette et la persistance locale de l'éditeur.
- **PWA** pour l'installation sur mobile et un usage hors-ligne des modèles déjà chargés.

### Backend et données

- **Route Handlers Next.js** pour valider les fichiers, appeler un fournisseur d'IA et masquer les secrets côté serveur.
- **Sharp** pour redimensionner, recadrer et quantifier les images importées.
- **IndexedDB** côté navigateur pour les projets anonymes et la reprise hors-ligne.
- **Supabase** en phase ultérieure uniquement si les comptes et la synchronisation multi-appareils deviennent prioritaires.
- **Vercel** pour le premier déploiement ; l'architecture reste portable vers un hébergement Node compatible.

### Génération depuis un texte

Oui, c'est possible. Le serveur peut envoyer la description à une API de génération d'images, puis passer le résultat dans le même pipeline de pixellisation que les images importées. Ce mode doit être :

- désactivé proprement quand aucune clé API n'est présente ;
- protégé par validation, modération, limite de débit et quota ;
- explicite sur le délai et l'éventuel coût ;
- indépendant du fournisseur grâce à une interface `ImageGenerator` ;
- accompagné d'un repli vers les modèles prêts à l'emploi en cas d'erreur.

## 3. Expérience utilisateur cible

### Accueil

- Hero clair avec la promesse « Transforme, crée, colorie ».
- Trois grandes cartes d'entrée : **Importer une image**, **Décrire une idée**, **Choisir un modèle**.
- Aperçus de créations, bénéfices, explication en trois étapes et appel à l'action.
- Navigation compacte, thème clair/sombre et interface en français en priorité.

### Atelier de préparation

- Aperçu avant/après en direct.
- Choix de grille (par exemple 16, 24, 32, 48), nombre de couleurs, cadrage et contraste.
- Quantification en palette cohérente, avec fusion des couleurs trop proches.
- Possibilité de remplacer une couleur avant d'ouvrir l'éditeur.
- Validation des formats JPEG, PNG et WebP, de la taille et des dimensions.

### Éditeur de coloriage

- Outils crayon, gomme, pot de peinture, pipette, déplacement et zoom.
- Palette numérotée avec progression par couleur et progression totale.
- Appui/glissement sur tactile et clic/glissement à la souris.
- Annuler/rétablir, effacer, afficher/masquer les numéros et le modèle fantôme.
- Sauvegarde automatique locale, écran de victoire et confettis discrets.
- Export PNG (avec ou sans grille) et PDF imprimable dans une phase suivante.

### Bibliothèque

- Modèles locaux classés par difficulté et thème.
- Recherche, filtres et favoris locaux.
- Fiches avec dimensions, palette, difficulté et durée estimée.

## 4. Architecture fonctionnelle

```text
app/
  page.tsx                       # accueil
  studio/page.tsx                # choix de la source et préparation
  editor/[projectId]/page.tsx    # coloriage interactif
  gallery/page.tsx               # modèles
  api/generate/route.ts          # génération textuelle optionnelle
components/
  editor/                        # canvas, outils, palette, progression
  studio/                        # import, prompt, réglages et aperçu
  ui/                            # composants génériques accessibles
lib/
  pixel/                         # recadrage, quantification, palette
  generators/                    # abstraction des fournisseurs d'images
  storage/                       # IndexedDB et sérialisation
  validation/                    # schémas des entrées et fichiers
public/templates/                # modèles intégrés et manifest JSON
tests/                           # tests unitaires et parcours Playwright
```

Le format de projet doit rester simple et versionné : largeur, hauteur, palette, indices de couleurs du modèle, indices peints, métadonnées et version du schéma. Les images complètes ne doivent pas être conservées inutilement.

## 5. Feuille de route d'implémentation

### Phase 0 — Socle (1 à 2 jours)

- Initialiser Next.js, TypeScript, Tailwind, linting et tests.
- Définir les tokens visuels : couleurs, typographie, rayons, ombres et animations.
- Mettre en place le layout responsive, les métadonnées et les composants de base.
- Ajouter CI, contrôle de types et déploiement de prévisualisation.

**Critère de sortie :** accueil responsive et accessible, déployé avec tous les contrôles automatisés au vert.

### Phase 1 — MVP jouable sans IA (4 à 6 jours)

- Construire l'import d'image et son pipeline de pixellisation.
- Ajouter 8 à 12 modèles embarqués avec licences et attributions vérifiées.
- Créer l'éditeur Canvas avec crayon, gomme, pot, palette et zoom.
- Implémenter annuler/rétablir, progression, sauvegarde IndexedDB et export PNG.
- Ajouter les états vides, erreurs, chargements et confirmations.

**Critère de sortie :** un utilisateur peut importer une image ou choisir un modèle, le colorier entièrement, quitter, reprendre puis exporter son résultat.

### Phase 2 — Génération par texte (2 à 4 jours)

- Créer l'interface fournisseur et une implémentation d'API de génération d'images.
- Ajouter l'endpoint serveur, validation, modération, timeout et limitation de débit.
- Transformer automatiquement le résultat en modèle à palette réduite.
- Prévoir le repli vers la galerie et des messages d'erreur actionnables.
- Mesurer les appels, latences et erreurs sans journaliser les images privées.

**Critère de sortie :** avec une clé configurée, un prompt valide produit un modèle éditable ; sans clé ou en cas d'échec, tout le reste de l'application demeure opérationnel.

### Phase 3 — Finition et lancement (3 à 5 jours)

- Ajouter PWA, mode hors-ligne, raccourcis clavier et onboarding contextuel.
- Optimiser le poids des bundles, le rendu Canvas et les images.
- Réaliser les audits accessibilité, responsive, sécurité et Core Web Vitals.
- Ajouter export imprimable, partage de projet et politique de confidentialité.
- Préparer analytics respectueuses de la vie privée et suivi des erreurs.

**Critère de sortie :** expérience fiable sur mobile et desktop, installable, documentée et observable en production.

## 6. Qualité, sécurité et accessibilité

- Tests unitaires du redimensionnement, de la quantification, du remplissage et de la sérialisation.
- Tests composants des outils et de la palette.
- Tests Playwright des trois parcours d'entrée jusqu'à l'export.
- Contraste WCAG AA, focus visible, libellés explicites et commandes clavier.
- Alternative accessible au Canvas : description de la grille, progression annoncée et commandes utilisables sans glisser-déposer.
- Limites strictes sur type, taille et dimensions des imports ; métadonnées supprimées côté serveur.
- Secrets uniquement côté serveur, en-têtes de sécurité, rate limiting et aucun prompt sensible dans les logs.
- Traitement local privilégié pour les images importées ; consentement explicite avant tout envoi à un tiers.

## 7. Indicateurs de réussite

- Temps jusqu'au premier pixel colorié inférieur à 60 secondes.
- Taux d'utilisateurs atteignant l'éditeur après avoir choisi une source.
- Taux de coloriages commencés, terminés, repris et exportés.
- Latence de pixellisation perçue inférieure à 500 ms pour un import standard.
- Interaction fluide à 60 images/seconde sur une grille 48 × 48 sur mobile courant.
- Taux d'échec de génération textuelle et taux de repli réussi vers les modèles.

## 8. Hors périmètre du premier MVP

- Réseau social, commentaires et galerie publique communautaire.
- Collaboration temps réel.
- Marketplace payante et abonnements.
- Génération d'animations ou de spritesheets.
- Application mobile native : la PWA responsive doit d'abord valider l'usage.

## 9. Décisions à valider avant le développement

1. **Public prioritaire :** enfants/familles, enseignants ou amateurs adultes ? Cela influence fortement le ton et la complexité des grilles.
2. **Fournisseur IA et budget :** génération activée dès le lancement, limitée à une démo, ou repoussée après le MVP sans IA ?
3. **Données :** expérience 100 % anonyme et locale au lancement, ou comptes requis pour synchroniser les projets ?
4. **Modèle économique :** gratuit, freemium par quota de génération, ou application pédagogique financée autrement ?

La recommandation est de lancer d'abord le MVP anonyme et local de la phase 1. Il valide l'expérience centrale sans coût variable ni dépendance externe, tout en préparant proprement l'ajout de la génération textuelle.
