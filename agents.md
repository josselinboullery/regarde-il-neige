# Instructions agents - Regarde il neige

Dernier audit: 2026-06-18.

Ce dossier contient le site publie statique. Toute evolution de back-office doit respecter le site public existant, garder les pages rapides, et eviter les changements destructifs non valides.

## Contexte site actuel

- Racine publiee: `C:\Users\jboul\OneDrive\professionnel\freelance\RegardeIlNeige\11_Site_Statique`
- Structure: 16 pages HTML, `style.css`, `main.js`, assets images/PDF/fonts.
- Pas de depot Git detecte dans ce dossier au moment de l'audit.
- Navigation, hero images, menu mobile, carrousels et embeds YouTube sont geres par `main.js`.
- Plusieurs pages contiennent des scripts inline pour injecter images, partenaires, equipe et contenus specifiques.

## Audit code mort

Controle effectue:

- Inventaire fichiers et references locales.
- Verification liens internes HTML et ancres.
- Verification assets references depuis HTML/CSS/JS.
- Reperage classes CSS definies mais non utilisees dans les pages/scripts actuels.
- Reperage doublons CSS.

Resultats:

- Aucun lien interne casse detecte.
- Aucune reference locale manquante detectee, hors faux positif lie au template JS `${PAGE_HERO_IMAGE}`.
- `main.js` ne montre pas de fonction morte evidente: chaque bloc est garde par selecteurs DOM et reste utile selon les pages.
- Code mort ou quasi mort detecte surtout dans assets et CSS.

Assets non references dans le site publie:

- `assets/images/ateliers-et-stages-3.avif` - 113569 octets
- `assets/images/ateliers-et-stages2.avif` - 65603 octets
- `assets/images/aurore11.avif` - 7480 octets
- `assets/images/aurore12.avif` - 17698 octets
- `assets/images/eloise-scherrer-2.avif` - 8770 octets
- `assets/images/ateliers-et-stages-4.avif~` - backup, 65811 octets
- `assets/images/ateliers-et-stages1.avif~` - backup, 231135 octets

Action conseillee:

- Supprimer d'abord les deux fichiers `*.avif~` apres sauvegarde externe.
- Pour les 5 autres images, demander validation metier: elles peuvent etre des images candidates non encore publiees.

CSS inutilise ou suspect dans `style.css`:

- Doublon carrousel: deux blocs `.carousel*` existent. Le second bloc, plus bas dans le fichier, ecrase une partie du premier.
- Bloc agenda futur non utilise dans le balisage actuel: `.dates-grid`, `.date-card*`.
- Ancienne equipe sans photos non utilisee: `.equipe-grid`, `.equipe-card`, `.equipe-name`, `.equipe-role`, `.equipe-shows`.
- Ancien embed video non utilise: `.video-wrap`, `.yt-play-btn`.
- Variantes non utilisees actuellement: `.nav-dropdown-label`, `.intro-section`, `.section--dark`, `.contact-card--accent`, `.contact-card-title`, `.contact-card-text`, `.blog-kicker`, `.blog-title`, `.blog-gallery--single`, `.blog-gallery-caption`.
- Utilitaires `.text-*`, `.mb-*` non utilises actuellement, mais peuvent rester si conserves comme mini design system.

Regle suppression:

- Ne pas supprimer de CSS sans controle visuel des pages principales: accueil, spectacle, action, equipe, contact.
- Supprimer par petites passes: assets backup, puis CSS vraiment orphelin, puis doublons.
- Apres chaque passe, verifier navigation desktop/mobile, carrousels, embeds YouTube, page equipe, contact logos, PDFs.

## Objectif back-office

Ajouter un back-office securise et intuitif pour administrateurs du site.

Le back-office doit permettre de modifier le contenu sans casser le site statique publie:

- Spectacles: titre, accroche, age, duree, equipe, texte, photos, video, PDF.
- Agenda: dates a venir, dates passees, lieux, villes, liens billetterie.
- Equipe: membres, roles, biographies, photos, ordre d'affichage.
- Actions culturelles: textes, images, sections.
- Partenaires/contact: logos, categories, coordonnees.
- Medias: upload images, PDF, alt text, remplacement controle.
- SEO: title, description, slug, image sociale si ajoutee.

## Architecture recommandee

Priorite: garder le site public statique, ajouter un outil admin separe.

Flux conseille:

1. Back-office authentifie.
2. Edition de contenu structure dans une base ou fichiers JSON/YAML.
3. Preview admin.
4. Publication controlee.
5. Generation/export du site statique dans `11_Site_Statique`.

Ne pas faire:

- Ne pas laisser le back-office modifier directement les fichiers HTML publies sans preview ni rollback.
- Ne pas mettre de secret, token, mot de passe ou cle API dans HTML/JS public.
- Ne pas exposer une route admin seulement cachee par URL.
- Ne pas accepter d'upload libre sans validation stricte.

## Securite obligatoire

Authentification:

- Connexion obligatoire pour toute page admin.
- Sessions en cookies `HttpOnly`, `Secure`, `SameSite=Lax` ou `Strict`.
- MFA recommande pour les comptes proprietaires.
- Rate limit login et reset password.
- Journaliser connexions, echecs, publications, suppressions, changements de roles.

Autorisations:

- Roles minimum: `owner`, `editor`, `viewer`.
- `owner`: comptes, publication, rollback, configuration.
- `editor`: contenu et medias.
- `viewer`: lecture seule.
- Verifier les droits cote serveur pour chaque action, jamais seulement cote interface.

Validation:

- Valider toutes les entrees cote serveur.
- Slugs uniques, propres, sans traversal.
- Texte riche: sanitizer HTML avec allowlist stricte.
- Echappement systematique au rendu public.
- CSRF obligatoire si authentification cookie.

Uploads:

- Limiter taille, type MIME, extension, dimensions.
- Convertir/normaliser images cote serveur.
- Interdire SVG upload ou sanitizer strict.
- Renommer fichiers avec slug + hash.
- Conserver alt text obligatoire pour images publiques.
- Scanner les PDFs si possible; limiter poids et type.

Uploads images - optimisation automatique:

Objectif:

- Permettre aux admins d'uploader des images JPEG ou PNG sans preparation manuelle.
- Convertir automatiquement les images en WebP optimise.
- Ne jamais garder l'original dans un dossier public.
- Conserver uniquement les fichiers optimises utilises par le site.
- Stocker les fichiers sources uniquement en zone temporaire privee le temps du traitement.
- Supprimer systematiquement le fichier source temporaire apres conversion, succes ou echec.

Regles obligatoires:

- Ne jamais copier le fichier original dans `11_Site_Statique` ni dans un dossier servi publiquement.
- Ne jamais exposer une URL vers le fichier original.
- Ne jamais utiliser le nom original comme nom de fichier final.
- Ne jamais faire confiance au type MIME envoye par le navigateur.
- Verifier le type reel du fichier cote serveur par signature/magic bytes.
- Refuser tout fichier qui n'est pas une image autorisee.
- Refuser par defaut les formats executables, SVG, HTML, PDF dans le flux image.
- Limiter la taille du fichier source, les dimensions maximales et le nombre de pixels total.
- Corriger l'orientation EXIF avant conversion.
- Supprimer les metadonnees inutiles, notamment EXIF/GPS.
- Generer les variantes finales dans un dossier public dedie aux images optimisees.
- Ecrire les fichiers dans un dossier temporaire de build, puis les deplacer atomiquement vers le dossier public.
- En cas d'erreur pendant la conversion, supprimer le fichier temporaire et ne rien publier.
- Journaliser l'erreur sans exposer le chemin local complet a l'admin.

Formats acceptes:

- Accepter en entree: `.jpg`, `.jpeg`, `.png`, eventuellement `.webp` si besoin de reoptimisation.
- Sortie publique par defaut: `.webp`.
- Pour les logos et pictogrammes, preferer SVG gere separement par un flux valide ou upload owner uniquement.
- Pour les images avec transparence, conserver l'alpha en WebP.
- Ne pas generer de fallback JPEG/PNG sauf contrainte projet explicite, car la regle est de conserver uniquement les fichiers optimises.

Variantes a generer:

- Miniature admin: largeur max 300 ou 400 px.
- Image contenu: largeur max 800 px.
- Image large: largeur max 1600 px.
- Hero/image pleine largeur: largeur max 2400 px seulement si necessaire.
- Ne pas agrandir une image source plus petite que la variante demandee.
- Supprimer ou ne pas creer les variantes inutiles selon le type de contenu.

Qualite recommandee:

- Photos: WebP qualite 80 a 85.
- Images detaillees ou hero: WebP qualite 82 a 88.
- Images avec aplats/illustrations: tester WebP lossless ou qualite elevee.
- Toujours comparer poids final et rendu visuel sur quelques images representatives avant de figer les valeurs.

Nommage fichiers:

- Nom final: slug propre + hash court + largeur + extension.
- Exemple: `spectacle-neige-a1b2c3-800.webp`.
- Le hash doit venir du contenu optimise ou d'un identifiant stable.
- Interdire caracteres speciaux, espaces, accents et traversal dans les noms finaux.
- Garder le nom original seulement comme metadata privee, jamais comme chemin public.

Metadata a enregistrer:

- Identifiant media.
- Nom original, uniquement informatif.
- Alt text obligatoire pour toute image publique.
- Credit photo si necessaire.
- Largeur/hauteur de chaque variante.
- Poids de chaque variante.
- Chemins publics des fichiers optimises.
- Date d'upload.
- Auteur/admin ayant importe l'image.
- Type d'usage: spectacle, equipe, action culturelle, partenaire, hero, galerie.
- Etat: brouillon, pret, publie, archive.

Workflow serveur:

1. Recevoir l'upload dans un dossier temporaire prive, non servi publiquement.
2. Verifier authentification et autorisation serveur.
3. Verifier extension, taille, MIME declare et signature reelle du fichier.
4. Lire les dimensions sans charger inutilement toute l'image en memoire.
5. Refuser les fichiers trop grands ou suspects.
6. Normaliser l'image: orientation, profil couleur, suppression metadonnees.
7. Generer les variantes WebP necessaires.
8. Ecrire d'abord les fichiers optimises dans un dossier temporaire de sortie.
9. Verifier que chaque fichier optimise existe, se lit correctement, et respecte les limites de poids/dimensions.
10. Deplacer atomiquement les variantes vers le dossier public des medias optimises.
11. Enregistrer les metadata.
12. Supprimer le fichier source temporaire.
13. Retourner a l'admin l'apercu, le poids et les dimensions des variantes generees.

Workflow suppression/remplacement:

- Lorsqu'une image est remplacee, ne pas supprimer immediatement les anciennes variantes si elles sont encore referencees par une version publiee.
- Marquer les anciens fichiers comme orphelins ou archives.
- Supprimer les fichiers orphelins seulement apres validation, sauvegarde et verification qu'aucune page publiee ne les reference.
- Toujours garder un rollback de contenu capable de retrouver les fichiers optimises necessaires a la version precedente.
- Ne jamais restaurer un original source, puisqu'il ne doit pas etre conserve publiquement.

Implementation recommandee:

- Creer un service unique `mediaOptimizer` ou equivalent.
- Toute route d'upload image doit passer par ce service.
- Interdire les conversions dispersees dans plusieurs controleurs.
- Centraliser les parametres: poids max, dimensions max, qualite WebP, variantes, dossier temporaire, dossier public.
- Ajouter des tests sur:
  - JPEG valide.
  - PNG valide avec transparence.
  - fichier renomme en `.jpg` mais non image.
  - image trop lourde.
  - image trop grande.
  - suppression du fichier temporaire apres succes.
  - suppression du fichier temporaire apres echec.
  - absence d'original dans le dossier public.
  - generation correcte des variantes.
  - metadata alt text obligatoire.



Definition of done specifique:

- Un admin peut uploader une image JPEG/PNG depuis le back-office.
- L'original n'apparait jamais dans un dossier public.
- Seules les variantes WebP optimisees sont referencees par le site.
- Les metadata affichent dimensions et poids final.
- Le front utilise `srcset` ou un equivalent pour charger la bonne taille.
- Une image invalide est refusee avec un message comprehensible.
- Les fichiers temporaires sont supprimes dans tous les cas.
- Un test automatique prouve qu'aucun original `.jpg`, `.jpeg` ou `.png` issu d'un upload admin n'est conserve dans le dossier public.

Secrets:

- Tout secret dans variables d'environnement.
- Pas de cle admin/service role dans bundle navigateur.
- Rotation possible des secrets.

Publication:

- Preview obligatoire avant publication.
- Historique versions + rollback.
- Publication atomique: ne jamais laisser un site a moitie genere.
- Sauvegarde avant suppression d'asset.

## UX admin

L'admin doit etre simple pour une petite compagnie:

- Tableau de bord: derniers contenus modifies, brouillons, prochain agenda, medias lourds.
- Barre laterale: Spectacles, Agenda, Equipe, Actions, Medias, Contact, Parametres.
- Edition par formulaires courts, onglets par section.
- Preview en un clic desktop/mobile.
- Etat clair: brouillon, pret, publie.
- Boutons visibles: enregistrer, previsualiser, publier, annuler.
- Messages d'erreur lisibles et actionnables.
- Confirmation pour suppression, remplacement PDF/image, publication.
- Recherche medias et contenus.
- Champs image avec apercu, alt text, poids, dimensions.

## Standards implementation

Avant de coder:

- Lire `index.html`, `style.css`, `main.js`, une page spectacle, `equipe.html`, `contact.html`.
- Refaire l'audit liens/assets pour obtenir une baseline.
- Definir le modele de donnees avant l'UI.
- Decider si le contenu source sera DB, JSON ou CMS headless.

Unite de travail ideale:

- Une unite = une fonctionnalite verifiable en moins de 15 minutes.
- Toujours inclure tests ou controle manuel clair.
- Eviter refonte visuelle du site public pendant le chantier admin.

Definition of done:

- Admin protege par authentification et autorisation serveur.
- CRUD contenu principal operationnel.
- Upload medias valide et securise.
- Preview avant publication.
- Publication statique reproductible.
- Rollback documente et teste.
- Aucun secret dans le code public.
- Liens internes et assets verifies apres generation.
- Pages publiques controlees sur mobile et desktop.

## Plan de chantier conseille

1. Nettoyage faible risque: retirer backups `*.avif~`, documenter images non publiees.
2. Extraire contenu repetitif vers donnees structurees: navigation, spectacles, equipe, partenaires.
3. Ajouter generateur statique ou couche de rendu depuis donnees.
4. Ajouter back-office separe avec auth.
5. Ajouter preview.
6. Ajouter publication + rollback.
7. Ajouter audit automatique liens/assets avant chaque publication.

## Garde-fous agents

- Ne jamais supprimer contenu metier sans validation explicite.
- Ne jamais ecraser une page publiee sans sauvegarde.
- Ne jamais stocker mot de passe en clair.
- Ne jamais desactiver validation ou auth pour aller plus vite.
- Toujours signaler les assets non references plutot que les supprimer silencieusement.
- Toujours verifier au moins accueil, page spectacle, equipe et contact apres modification.
