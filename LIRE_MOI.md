# Pilotage Service Technique — V147.170

## Édition nettoyée du 7 septembre 2026

Ce paquet conserve la version fonctionnelle 147.170. Le nettoyage ne crée pas une nouvelle version applicative et ne modifie pas le code métier, les données intégrées ou les matrices Excel.

### Bilan

- Avant : 187 fichiers dans le ZIP source.
- Après : 28 fichiers, dont ce mode d’emploi et l’historique consolidé.
- 160 anciens fichiers de changements, rapports et notes ont été regroupés dans `HISTORIQUE_VERSIONS.md`.
- L’ancienne copie `app_V147_78_dashboard_menage.js`, non chargée par l’application, a été retirée. Le fichier actif `app.js` est conservé.
- Le logo a été rangé dans `assets/`, à l’emplacement déjà attendu par les pages et les scripts. Aucun code applicatif n’a été modifié pour ce déplacement.
- Les modules actifs, les deux classeurs Excel, les trois scripts SQL et le code de la fonction de rapport automatique ont été conservés.

### Utilisation

Décompressez le ZIP dans un dossier neuf, puis ouvrez `OUVRIR_PILOTAGE_SERVICE_TECHNIQUE.bat` ou `index.html`. Gardez tous les fichiers ensemble et conservez le sous-dossier `assets`.

Utilisez le dossier neuf plutôt que de mélanger les fichiers avec ceux d’une ancienne version. Ne supprimez pas vos données, ne videz pas le stockage du navigateur et ne désinstallez pas vos autres versions avant d’avoir vérifié la nouvelle. Le nettoyage ne modifie ni la base Supabase ni les données déjà enregistrées dans le navigateur.

### Fonctions conservées

Les horaires réels du tableau de bord, le repli roulement/standard et l’agenda du jour restent ceux de la V147.167. L’import/export des horaires et ChronoTime restent inchangés. Les contrôles périodiques conservent la synchronisation complète de la V147.170 : la matrice exportée fait référence, les lignes absentes sont proposées à la suppression, et les changements sont présentés avant validation avec les protections prévues dans cette version.

### Fichiers utiles

- `index.html`, `app.js`, `styles.css` : interface principale.
- `periodic-import.js`, `schedule-import.js`, `report-import.js` : imports et exports.
- `contracts-tracker.js`, `contracts-tracker.css`, `room-cleaning.js`, `room-prep.js`, `weather-waste.js` : modules métier.
- `navigation.js`, `notification-center.js`, `login-bootstrap.js`, `supabase-config.js`, `jszip.min.js`, `logo-data.js` : composants et dépendances conservés.
- `Matrice_Horaires_Roulements_Agents.xlsx` : exemplaire de la matrice horaires.
- `suivi des contrats (2).xlsx` : classeur d’origine des contrats.
- `SETUP_SUPABASE.sql`, `SETUP_STORAGE_RAPPORTS.sql`, `SETUP_CRON_EXEMPLE.sql` : scripts de configuration à conserver ; ne les réexécutez pas simplement pour installer ce nettoyage.
- `index.ts`, `INSTALLATION_RAPPORTS_AUTOMATIQUES.md` : source et guide des rapports automatiques. Pour déployer cette fonction, placez le code dans `supabase/functions/automatic-report/index.ts` selon le guide. Aucun redéploiement n’est nécessaire pour le seul nettoyage.
- `HISTORIQUE_VERSIONS.md` : anciens changements et rapports regroupés.

### Vérification et limites

Les fichiers applicatifs et les classeurs conservés sont identiques, octet pour octet, au ZIP V147.170, à l’exception du déplacement du logo. Les références aux ressources locales ont été contrôlées, ainsi que la syntaxe des fichiers JavaScript. Un contrôle en navigateur local peut vérifier le chargement, mais ne remplace pas un essai connecté avec vos données : les services Supabase, Outlook et OneDrive ne sont pas modifiés ni testés en production par ce nettoyage.
