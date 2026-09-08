# Pilotage Service Technique — V147.175

## Excel prioritaire et suivi des contrôles — 8 septembre 2026

Cette version applique la règle demandée : **le registre des contrôles périodiques est remplacé par la liste complète de la matrice Excel lors de la validation**. Les corrections Excel priment sur les changements métier intervenus depuis l'export. Les fiches absentes sont supprimées automatiquement, sans cases à cocher ni confirmation supplémentaire.

### Installation

Décompressez le ZIP complet dans un dossier neuf, sans mélanger les fichiers de plusieurs versions. Publiez son contenu sur votre hébergement habituel et vérifiez la version **147.175**. Rechargez la page sans cache si l'ancienne version apparaît. Ne réinitialisez ni Supabase ni les données du navigateur. Aucun script SQL supplémentaire n'est requis.

### Import et modifications dans l'aperçu

La matrice Excel complète contient les identifiants des fiches existantes. Conservez ces identifiants et laissez-les vides pour les créations. Ne supprimez pas la feuille technique masquée. Les anciens exports V2/V3 sont acceptés. Les cellules dates et informations inconnues peuvent rester vides.

Après sélection du fichier, l'aperçu permet de modifier les champs de chaque ligne, d'ajouter une fiche, de retirer une ligne et de télécharger une nouvelle matrice contenant les corrections. Les modifications de l'aperçu ne sont pas enregistrées sur le serveur tant que vous n'avez pas cliqué sur **Valider les modifications**. Les erreurs de saisie (date invalide, identifiant inconnu, numéro ou fiche en double, etc.) doivent être corrigées, mais les changements métier du serveur ne sont pas présentés comme des conflits à résoudre.

La validation applique l'ensemble du fichier : valeurs corrigées, créations et suppressions. Une matrice vide vide le registre. Les fiches conservées gardent leurs identifiants, historiques, pièces jointes et métadonnées non modifiables. Une fiche supprimée depuis l'export mais toujours présente dans Excel peut être restaurée avec son identifiant d'origine. Les marqueurs de suppression empêchent les anciennes migrations et synchronisations de faire réapparaître les fiches retirées.

### Statut et périodicité

Le statut est calculé à la lecture et pendant l'édition à partir du dernier passage et de la périodicité : **Fait** tant que la période de validité n'est pas dépassée, **En retard** après l'échéance, **À planifier** sans passage connu, et **À vérifier** lorsque la validité ne peut pas être établie. Une date de passage future n'est pas considérée comme réalisée. Les statuts explicites Clôturé et Non applicable sont conservés.

L'échéance est calculée en mois calendaires, avec gestion des fins de mois. Une échéance explicite plus courte est respectée ; une date plus tardive ne prolonge pas silencieusement la périodicité renseignée. Lorsqu'un dernier passage ou une périodicité est corrigé sans modifier volontairement la date suivante, celle-ci est recalculée. Les anciennes dates de passage sont conservées dans l'historique. Les listes, le tableau de bord, les formulaires et les nouveaux exports Excel utilisent le statut calculé. L'affichage est actualisé au changement de date, sans inventer de passage ni prétendre attester la conformité réglementaire.

### Sauvegarde et écriture serveur

Avant chaque tentative d'écriture, le logiciel relit l'état serveur et déclenche le téléchargement d'une sauvegarde JSON complète. Il reconstruit le registre souhaité à partir de l'Excel, puis utilise une écriture conditionnelle sur la révision Supabase. Si une autre écriture intervient entre lecture et enregistrement, le logiciel relit le serveur et réapplique le même Excel, avec un nombre limité de tentatives. Il n'écrase pas les autres modules avec une ancienne sauvegarde Excel. Une indisponibilité du serveur, une sauvegarde impossible, une synchronisation locale encore en attente ou des erreurs de saisie empêchent la validation.

**Aucun import n'a été effectué sur votre base Supabase réelle.** La sauvegarde JSON n'inclut pas les octets des fichiers stockés à l'extérieur ; elle conserve leurs références et l'état des fiches. Les rapports et archives indépendants ne sont pas supprimés par le nettoyage du registre.

### Vérifications

Les tests automatisés couvrent les dates, l'état Fait, les doublons, la matrice de 73 lignes/66 suppressions, les créations, les suppressions, le registre vide, l'historique, les pièces jointes, la restauration d'un identifiant, les révisions concurrentes et l'écriture conditionnelle. Le test d'interface dans Chromium n'a pas pu se terminer dans cet environnement ; le parcours complet reste donc à vérifier sur votre installation. Voir `RAPPORT_TESTS_V147.175.md`.

---

## Historique des versions précédentes

Les instructions d'import antérieures ci-dessous sont conservées uniquement à titre historique. La synchronisation complète V147.174 les remplace.

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
