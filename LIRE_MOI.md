# Pilotage Service Technique — V147.172

## Planning entretien & loge — 7 septembre 2026

Cette édition reprend la V147.170 nettoyée et ajoute le planning des missions des agents d'entretien et d'accueil. Elle ne remplace pas le logiciel ni sa base de données.

### Source et périmètre

Seule la feuille **Tario Ascension** du classeur `Planning_Agents_Entretien_Direction(1).xlsx` a été exploitée. Son nom d'affichage est corrigé en **Tarrio Ascension**. Les autres feuilles n'ont pas été utilisées pour l'importation.

Empreinte SHA-256 du classeur source : `a4227823a95a04c99d924ae3a7f33fabf0d62ecf4b4ce77c23bc11e855bdea8d`.

Le récapitulatif contient 83 cellules de missions renseignées, réparties entre quatre agents : Tarrio Ascension, De Oliveira Anthony, Delorme Béatrice et Berthoux Corinne. Les deux corrections de nom sont respectées. Chaque créneau conserve la référence de sa cellule source et son texte d'origine. Les cellules vides n'ont pas été transformées en missions.

Précision de lecture : pour De Oliveira Anthony, le mercredi, la première cellule indique « Loge dès 7h15 » et la dernière « Fin 12h15 ». Ces bornes explicites sont retenues : 07:15–12:15, sans prolongation jusqu'à 13:00. Tarrio est en repos le mercredi, Delorme reste en lingerie jusqu'à 12:15 le mercredi et Berthoux assure l'entretien indiqué de 06:00 à 08:00 du lundi au vendredi.

### Utilisation

Décompressez le ZIP dans un **dossier neuf**, en conservant tous les fichiers et le dossier `assets`. Ouvrez `OUVRIR_PILOTAGE_SERVICE_TECHNIQUE.bat` ou `index.html`, puis connectez-vous comme d'habitude. Ne videz pas le stockage du navigateur et ne réinitialisez pas la base.

Le nouveau menu **Bâtiments & interventions → Planning entretien & loge** présente la semaine complète. Vous pouvez filtrer par agent, jour ou type de mission, modifier ou ajouter un créneau, le supprimer, exporter la liste en Excel et imprimer en PDF. Un raccourci est également présent dans Contrôle ménage.

À la première ouverture d'une base qui ne possède pas encore ce planning, les 83 créneaux sont intégrés une seule fois. Les agents sont rapprochés des fiches existantes ; une fiche absente est créée sans inventer d'horaire de travail. En cas d'homonyme ambigu, les missions restent à associer manuellement au lieu de créer un doublon.

### Données et sécurité

- Les missions sont stockées dans une collection distincte `cleaningDutyPlans`, avec un identifiant stable par cellule source et jour.
- Les horaires réels, roulements, horaires standards, pointages, absences, historiques ChronoTime et contrôles ménage réalisés ne sont pas remplacés par ces missions.
- Les créneaux de repas et de repos restent identifiés comme tels ; ils ne sont pas comptabilisés comme du nettoyage réalisé.
- L'import initial est idempotent : une réouverture ne recrée pas les lignes. Les modifications et suppressions sont conservées, y compris après migration d'une sauvegarde.
- Les enregistrements utilisent la sauvegarde principale Supabase. Hors connexion, les changements sont conservés localement en attente de synchronisation, avec les protections de suppression existantes.
- La synchronisation complète Excel des contrôles périodiques de la V147.170 est conservée sans changement.

### Fichiers et vérifications

Le paquet contient **29 fichiers**, donc moins de 100. Le nouveau module est `entretien-planning.js`. Son jeu de données de référence est intégré au code ; aucun classeur source supplémentaire n'est requis pour le lancement. Les 160 anciens rapports et notes restent regroupés dans `HISTORIQUE_VERSIONS.md`.

Les scripts JavaScript ont passé le contrôle de syntaxe. Des tests isolés ont vérifié le contenu et les identifiants des 83 créneaux, l'absence de doublon, la migration d'une ancienne base, la conservation d'une modification, la non-réapparition d'une suppression, la sauvegarde simulée côté serveur ainsi que l'ouverture et l'enregistrement d'un formulaire. Les horaires de travail existants ont été conservés dans ces tests. Le navigateur de test bloque l'ouverture locale dans cet environnement ; aucune connexion à votre base Supabase réelle ni aucun essai en production n'a été effectué.

Les fichiers SQL, les autres modules, les deux matrices Excel existantes et les composants conservés de la V147.170 n'ont pas besoin d'être réinstallés ou réexécutés pour utiliser ce nouveau planning.


## Correctif V147.172 — validation de la matrice périodique

Le bouton « Valider les modifications » est désormais toujours visible dans Contrôles périodiques → Import / export. Il est désactivé tant qu’aucun fichier valide comportant des changements n’a été chargé. Un message indique clairement si le fichier est en cours de lecture, inchangé, invalide ou prêt à être appliqué, et détaille les erreurs bloquantes. Une nouvelle sélection de fichier annule l’ancien aperçu pour éviter de valider par erreur le fichier précédent.

Après un import avec changements, vérifiez le tableau puis cliquez sur le bouton. Les suppressions restent soumises à confirmation, avec une confirmation spéciale pour vider le registre. Une sauvegarde est téléchargée avant l’application. En cas de refus d’une ancienne matrice, exportez une nouvelle matrice depuis cette version et reportez-y vos corrections. Ne supprimez pas la feuille technique masquée ni les identifiants.

Le correctif ne modifie ni les données intégrées, ni les horaires, ni ChronoTime, ni les autres modules. Il ne lance aucune réimportation automatique.


## Correction affichage de version V147.172

Le numéro affiché sur la page de connexion, dans le menu, dans À propos et dans le titre du navigateur est maintenant 147.172. La version précédente du paquet contenait déjà le correctif de validation, mais affichait encore 147.171. Aucun changement de données ni de logique métier n’est apporté par cette correction.
