## V147.174 — 08/09/2026 — synchronisation complète Excel

Retour à une seule validation : toute fiche absente de la matrice est supprimée automatiquement, sans sélection ni confirmation supplémentaire. Contrôle des conflits réels, export V4 avec instantané complet, sauvegarde préalable, écriture conditionnelle Supabase et marqueurs anti-réapparition. Les modes de préservation et de sélection des suppressions de la V147.173 sont retirés. Aucune migration de catalogue n’est rejouée sur un registre existant.

# Historique des anciennes versions

Archive documentaire consolidée lors du nettoyage du 7 septembre 2026.
Ces notes sont conservées pour référence ; elles ne sont pas des instructions
d’installation et peuvent décrire des fonctions remplacées ou abandonnées.
Le code actif de référence est celui de la V147.170.

160 anciens fichiers texte ont été regroupés ci-dessous.
Chaque titre indique le nom du fichier d’origine.

---

## ACTIVER_ANALYSE_IA_SUPABASE.txt

```text
ACTIVER L'ANALYSE IA — V147.135

L'application contient maintenant l'appel à la fonction Supabase :
  analyze-document

Pourquoi cette architecture :
- la clé OpenAI ne doit jamais être placée dans app.js ou dans le navigateur ;
- la clé reste dans les secrets de l'Edge Function Supabase ;
- l'utilisateur connecté appelle la fonction via supabase.functions.invoke.

À FAIRE UNE SEULE FOIS DANS SUPABASE
1. Ouvrir votre projet Supabase.
2. Edge Functions > créer/déployer la fonction "analyze-document"
   en utilisant le fichier :
   supabase/functions/analyze-document/index.ts
3. Ajouter le secret :
   OPENAI_API_KEY = votre clé API OpenAI
4. Facultatif :
   OPENAI_DOCUMENT_MODEL = gpt-5-mini
5. Garder la vérification JWT activée (fonction réservée aux utilisateurs connectés).

APRÈS ACTIVATION
- Photo manuscrite : IA en priorité, OCR local en secours.
- PDF : moteur métier existant + analyse IA complémentaire.
- Chronotime : le parseur structuré reste prioritaire.
- L1/M1/D1 etc. restent ignorés comme codes métier.
- Les zones incertaines sont montrées à l'utilisateur avant validation.

SANS EDGE FUNCTION / SANS CLÉ
L'application continue de fonctionner :
- scanner : OCR local de secours ;
- PDF : analyse métier classique existante.
```

---

## README_SUPABASE_ACTIVITY_V134_1.txt

```text
Pilotage Service Technique V134.1 — Activité Supabase

Modification minimale de la V134 :
- ajout d'un bouton « Supabase » dans la barre supérieure ;
- le bouton effectue une vraie lecture de la table app_state, sans modifier les données ;
- vert : activité récente (< 4 jours) ;
- orange : 4 à moins de 6 jours ;
- rouge : 6 jours ou plus ;
- les lectures Supabase normales de Pilotage actualisent aussi la date de dernière activité ;
- aucune modification du modèle de données ni de la logique métier.

Important : ce mécanisme génère une activité réelle, mais ne constitue pas une garantie contractuelle contre la mise en pause d'un projet Free.
```

---

## VERSION_V134_1.txt

```text
PILOTAGE SERVICE TECHNIQUE — V134.1

Base : V134.
Ajout : bouton Activité Supabase.
La version V134.1 est affichée directement dans la barre supérieure de l'application.

Aucune modification des clés de stockage ou de la structure des données.
```

---

## VERSION_V134_2.txt

```text
PILOTAGE SERVICE TECHNIQUE — V134.2

Base : V134.1.
Correctifs uniquement :
- logo officiel forcé depuis assets/logo-service-technique.png ;
- dimensions du logo sécurisées sur mobile ;
- icône ☁ visible sur le bouton Supabase sur mobile ;
- aucune modification des données, de la synchronisation ou des modules métier.
```

---

## VERSION_V134_3.txt

```text
PILOTAGE SERVICE TECHNIQUE — V134.3

Base : V134.2.

Correction minimale :
- corrige l'indicateur « Envoi au serveur… » pouvant rester bloqué ;
- si une modification est réellement en attente, l'envoi est relancé ;
- s'il n'y a plus rien à envoyer, l'état repasse automatiquement à « Synchronisé à HH:MM » ;
- le bouton Supabase remet également l'état à Synchronisé après une lecture réussie si aucune sauvegarde n'est en attente.

Aucune modification du modèle de données ou des modules métier.
```

---

## CHANGEMENTS_V135.txt

```text
Pilotage Service Technique — V135

Corrections :
- Contrôle ménage : propositions de salles/locales rétablies à partir du référentiel central, y compris lorsque le nom d'étage diffère (RDC / Rez-de-chaussée).
- Bâtiment B : ajout du 3e étage en plus du RDC, 1er et 2e étage dans le référentiel ménage.
- Préparation salle & café : en mode modification, bouton « Supprimer cette préparation » disponible directement dans l'éditeur.
- Contrôles périodiques : après enregistrement, le contrôle reste visible, les filtres sont réinitialisés et un bouton dédié permet de rouvrir/modifier la fiche de façon fiable.
- Rendez-vous : enregistrement immédiat via le moteur Supabase/hors-ligne, puis rafraîchissement explicite de « Mon calendrier » et « Planning d'aujourd'hui ».
```

---

## CHANGEMENTS_V137.txt

```text
V137 — base V136 conservée.

- Bâtiment B : ajout du 4e étage.
- Le bâtiment B comporte maintenant RDC + 1er + 2e + 3e + 4e étage.
- Aucune autre modification.
```

---

## CHANGEMENTS_V138.txt

```text
Pilotage Service Technique V138

Corrections ciblées :
- Le bouton + du haut est remplacé par « ↻ Requête Supabase ».
- Les PDF des contrôles périodiques stockés dans Supabase s’ouvrent dans un lecteur PDF intégré (compatible WebView Android).
- Logos allégés et embarqués pour fiabiliser leur affichage dans Chrome et l’application Android.
- Aucun autre module fonctionnel modifié.
```

---

## CHANGEMENTS_V139.txt

```text
V139 — 15/08/2026

- Suppression des rendez-vous : suppression immédiate de l'écran puis sauvegarde immédiate vers Supabase.
- Hors ligne : la suppression reste en attente locale et se synchronise automatiquement au retour du réseau.
- Bouton Requête Supabase : ajout d'un pictogramme visible (éclair) devant le texte ; sur mobile, le pictogramme reste visible même si le texte est masqué pour gagner de la place.
- Aucun autre module modifié.
```

---

## CHANGEMENTS_V140.txt

```text
V140
- Contrôles périodiques : fiche entière accessible et bouton Ouvrir / modifier explicite.
- Rapports PDF : bouton Ouvrir directement sur chaque contrôle.
- Secours : recherche des pièces jointes dans les fiches métier si l’index global Supabase est incomplet.
- Conservation des corrections V139.
```

---

## CHANGEMENTS_V141.txt

```text
V141 — correctif de stabilité

- Base : V139 (fonctionnelle)
- Restauration complète de tous les rendus supprimés accidentellement en V140
- Contrôles périodiques : bouton Ouvrir / modifier le contrôle conservé
- Pièces jointes périodiques : secours ciblé si le PDF n'est plus indexé dans db.attachments
- Aucun autre module modifié
```

---

## CHANGEMENTS_V147_CORRIGE.txt

```text
V147 corrigée — 15/08/2026

- Suppression du message permanent « événements calendrier synchronisés » affiché en bas de l’écran.
- Aucun autre comportement fonctionnel modifié dans les fichiers fournis.
```

---

## CHANGEMENTS_V147_1.txt

```text
V147.1 — 15/08/2026

- Base : V147 corrigée.
- Suppression du bandeau permanent « événements calendrier synchronisés ».
- Correction de la version affichée dans le menu latéral (« sandwich »), l’écran de connexion et À propos : Version 147.1.
- APP_VERSION alignée sur 147.1.
- Aucun autre module fonctionnel modifié.
```

---

## CHANGEMENTS_V147_2.txt

```text
V147.2 — 15/08/2026

- Correctif ciblé Chronotime uniquement.
- Après « Valider l’injection », l’application attend maintenant la confirmation immédiate de Supabase.
- Le message de réussite n’apparaît qu’après confirmation Supabase.
- Hors ligne : l’import est conservé localement et sera synchronisé automatiquement au retour du réseau.
- En cas d’échec de confirmation, l’application l’indique clairement au lieu d’annoncer une injection terminée.
- Aucun changement OneDrive.
- Aucun autre module fonctionnel modifié.
```

---

## CHANGEMENTS_V147_3.txt

```text
V147.3 — Correctif Chronotime : sauvegarde immédiate, relecture Supabase, vérification de présence du nouvel import avant d'autoriser la synchronisation normale. Aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_4.txt

```text
V147.4 — 15/08/2026
Correctifs ciblés Chronotime :
- après confirmation Supabase, rafraîchissement forcé du Δ annuel Chronotime et de l'historique ;
- l'état de synchronisation repasse explicitement à « Synchronisé à HH:MM » après relecture confirmée ;
- évite que « Envoi au serveur… » reste affiché après une injection confirmée ;
- aucun changement OneDrive ni autre module.
```

---

## CHANGEMENTS_V147_5.txt

```text
V147.5 — 15/08/2026

Diagnostic Supabase / Chronotime :
- corrige le faux message « hors ligne » quand le Wi-Fi fonctionne ;
- persistNow attend maintenant qu'une autre synchronisation Supabase en cours se termine ;
- distingue : Internet absent, délai dépassé, droits/RLS, authentification, erreur réseau et Supabase occupé ;
- affiche le vrai message renvoyé par Supabase quand l'écriture échoue ;
- conserve l'import local tant que Supabase n'a pas confirmé ;
- aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_6.txt

```text
V147.6 — 15/08/2026
- Chronotime tente réellement Supabase sans bloquer sur navigator.onLine.
- Sauvegarde + relecture serveur pour confirmation.
- En cas d'échec, le diagnostic Supabase réel est conservé/affiché.
- Aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_7.txt

```text
V147.7 — 15/08/2026
- Chronotime utilise une écriture Supabase directe dédiée.
- Timeout explicite 15 s pour écriture et relecture.
- Relecture immédiate et contrôle de l'ID importé.
- Affichage de l'erreur Supabase réelle.
- Blocage d'un doublon rapproché du même import.
- Aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_8.txt

```text
V147.8 — 15/08/2026

Audit des importations :
- « ✅ Injection Chronotime terminée » après confirmation ;
- pastilles Chronotime RTT, congé annuel, maladie, repos, jour férié, etc. rafraîchies automatiquement après injection ;
- logique existante de l'état des agents dans le tableau de bord NON MODIFIÉE ;
- correction de l'identifiant de confirmation Chronotime ;
- import horaires/roulements : confirmation Supabase avant message de réussite ;
- restauration JSON : confirmation Supabase avant succès ;
- photos et pièces jointes : si un upload échoue, le formulaire n'est pas validé ;
- anciennes pièces jointes conservées tant que les nouvelles ne sont pas chargées ;
- scan/OCR : pas de faux enregistrement si l'original n'est pas synchronisé dans Supabase Storage ;
- ajout du type « Salle de classe » ;
- configuration des salles synchronisée avec Supabase pour mémoriser durablement un classement, par exemple 241 = Salle de classe.

Aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_9.txt

```text
V147.9 — 15/08/2026

Scanner un doc :
- ajout « 📷 Prendre une photo » : demande l'appareil photo arrière du téléphone/tablette ;
- ajout « 🖼️ Choisir une photo » : galerie ;
- ajout « 📄 Choisir un PDF » ;
- la photo/le fichier est transmis au scanner existant et suit ensuite le même aperçu/enregistrement ;
- conservation des sécurités V147.8 pour l'envoi des fichiers dans Supabase Storage ;
- aucune modification de la logique état des agents / tableau de bord ;
- aucune modification Chronotime autre que celles déjà présentes en V147.8.
```

---

## CHANGEMENTS_V147_10.txt

```text
V147.10 — 15/08/2026

Configuration des locaux intégrée depuis le fichier Excel corrigé fourni par l'utilisateur.

- 197 locaux actifs intégrés.
- Bâtiments : Bâtiment A, Bâtiment B, Bâtiment H, Bâtiment G, Bâtiment E, Bâtiment F, Algeco, Extension.
- Bâtiments, étages, secteurs, numéros/codes, noms et types repris tels qu'ils figurent dans le fichier Excel.
- Au premier chargement de V147.10, l'ancienne configuration des salles est remplacée une seule fois par cette configuration et synchronisée dans Supabase.
- Les modifications effectuées ensuite dans l'application restent conservées.
- Aucun changement de la logique état des agents / tableau de bord.
- Aucun changement Chronotime.
- Conservation du scanner appareil photo de V147.9.
```

---

## CHANGEMENTS_V147_11.txt

```text
V147.11 — 15/08/2026

Corrections ciblées :
1. Paramètres / configuration des salles
- un bâtiment ouvert (ex. Bâtiment B) reste ouvert même pendant un rafraîchissement Supabase ;
- correction du symptôme « s'ouvre puis se referme ».

2. Chronotime déjà injectés
- analyse des données chronotimeDaily déjà présentes dans la base ;
- reconstruction automatique des pastilles CA, RTT, RH/repos, RFE/jour férié, maladie, formation et autres types déjà mappés ;
- le roulement annuel reprend ces pastilles avec ses couleurs existantes ;
- aucune modification de la logique existante « état des agents » du tableau de bord ;
- les saisies manuelles différentes ne sont pas écrasées.

3. Scanner
- « Scanner un document » ouvre directement l'appareil photo (caméra arrière sur mobile via capture=environment) ;
- correction du HTML invalide qui contenait des boutons imbriqués ;
- après la photo, retour automatique dans l'OCR existant.

Aucun changement OneDrive.
```

---

## CHANGEMENTS_V147_12.txt

```text
V147.12 — 15/08/2026

Correction import / export horaires :
- le bouton « Valider les lignes correctes » met immédiatement à jour les horaires/roulements dans l'interface ;
- sauvegarde Supabase dédiée et directe, avec timeout de 15 s ;
- relecture immédiate de Supabase après écriture ;
- confirmation par identifiant unique de l'import dans scheduleImports ;
- affichage de l'erreur Supabase réelle en cas d'échec ;
- les modifications locales restent protégées si Supabase ne confirme pas ;
- correction de « undefined » sur les lignes « Jours agent » : affiche maintenant « Jours travaillés » ;
- message final : « ✅ Import horaires terminé et synchronisé ».

Aucune modification :
- état des agents du tableau de bord ;
- Chronotime ;
- configuration des salles ;
- scanner/appareil photo.
```

---

## CHANGEMENTS_V147_13.txt

```text
V147.13 — 15/08/2026

Chronotime / pastilles automatiques
- CA et variantes CA-1, CA-2... = Congé annuel ;
- RTT = RTT ;
- RH = Repos ;
- RFE = Jour férié ;
- les anciens Chronotime déjà injectés sont relus automatiquement au chargement ;
- agentDays est réparé automatiquement pour afficher les pastilles dans les roulements et calendriers ;
- chaque futur import Chronotime utilise automatiquement les mêmes correspondances ;
- couleurs : CA vert, RTT bleu, RH gris, RFE vert/turquoise ;
- les saisies manuelles différentes ne sont pas écrasées.

Plannings / barre grise horizontale
- barre horizontale locale sur Pilotage des horaires, Roulements annuels, Congés/RTT/absences et import horaires ;
- mémorisation automatique de la position pendant les rafraîchissements ;
- la barre ne doit plus revenir toute seule au début quand on la lâche.

La logique état des agents du tableau de bord reste inchangée.
```

---

## CHANGEMENTS_V147_14.txt

```text
V147.14 — 15/08/2026

Paramétrage complet des salles :
- modification des numéros de salle pendant la frappe (input), plus seulement à la sortie du champ ;
- modification fiable des noms, types, bâtiments, étages et secteurs ;
- sauvegarde locale immédiate ;
- synchronisation Supabase différée pendant la frappe puis forcée à la sortie du champ ;
- ajout d'un bouton « 💾 Enregistrer » sur chaque bâtiment ;
- le polling Supabase ne peut plus écraser un numéro/nom/type pendant qu'on le modifie ;
- détection visuelle d'un numéro en doublon dans un même secteur ;
- ajout/suppression étage, secteur et local conservés et synchronisés ;
- configuration des salles utilisée dans les menus métier mise à jour après modification.

Aucune modification Chronotime, tableau de bord ou scanner.
```

---

## CHANGEMENTS_V147_15.txt

```text
V147.15 — 15/08/2026

CORRECTION DES DEUX DÉFAUTS SIGNALÉS

1. Pastilles Chronotime automatiques
- CA, CA-1, CA-2... = Congé annuel ;
- RTT = RTT ;
- RH = Repos ;
- RFE = Jour férié ;
- ces 4 codes GFI ont désormais priorité sur une ancienne mauvaise configuration ;
- les chronotimeDaily déjà stockés sont réparés automatiquement ;
- les agentDays Chronotime déjà créés sont remis au bon type ;
- les futurs imports appliquent les mêmes règles automatiquement ;
- le roulement annuel sélectionne automatiquement la dernière année scolaire Chronotime disponible.
  Exemple : en août 2026, un PDF 2026-2027 ouvre 2026-2027 au lieu de rester sur 2025-2026.

2. Barres horizontales des plannings
- mémorisation par clé stable avant chaque rerendu de l'application ;
- restauration après chaque rerendu, même lorsque l'élément HTML a été entièrement recréé ;
- gestion du roulement annuel mois par mois, absences, pilotage horaires et aperçu import ;
- la barre ne doit plus revenir à gauche au relâchement / lors du polling Supabase.

La logique « état des agents » du tableau de bord n'a pas été modifiée.
```

---

## CHANGEMENTS_V147_16.txt

```text
V147.16 — 15/08/2026

Année scolaire synchronisée :
- Roulements annuels utilise maintenant exactement l'année scolaire globale sélectionnée en haut du tableau de bord.
- L'année du dernier Chronotime n'impose plus son propre choix.
- Exemple : tableau de bord = 2026-2027 => Roulements annuels = 2026-2027.
- Si l'année scolaire globale change, le roulement annuel suit automatiquement.
- Conservation des correctifs V147.15 pour CA / RTT / RH / RFE automatiques et pour les barres horizontales.

Aucune modification de la logique « état des agents » du tableau de bord.
```

---

## CHANGEMENTS_V147_17.txt

```text
V147.17 — 15/08/2026

ANNÉE SCOLAIRE GLOBALE = SOURCE UNIQUE POUR TOUTE L'APPLICATION

La sélection d'année scolaire en haut du tableau de bord pilote désormais :
- Roulements annuels ;
- Pilotage des horaires ;
- Congés / RTT / absences ;
- Calendriers équipe et personnels ;
- Événements personnels ;
- Incidents ;
- Entretien / nettoyage ;
- Réunions ;
- rapports mensuels et bilans agents ;
- filtres de dates des rapports quotidiens / hebdomadaires ;
- vacances scolaires ;
- archives de pilotage ;
- année par défaut du rapport des contrôles périodiques ;
- impressions et pieds de page.

Les filtres mois/date hors de l'année sélectionnée sont automatiquement replacés au 1er septembre de l'année scolaire active.

Exemple :
Année scolaire en haut = 2026-2027
=> tous les modules concernés travaillent dans la période 01/09/2026 → 31/08/2027.

La sélection est enregistrée dans Supabase via l'état général et reste active à la reconnexion.

Conservation intégrale :
- pastilles Chronotime automatiques CA / RTT / RH / RFE ;
- scroll horizontal persistant ;
- paramétrage des salles ;
- scanner appareil photo ;
- logique état des agents du tableau de bord inchangée.
```

---

## CHANGEMENTS_V147_18.txt

```text
V147.18 — 15/08/2026

EXPORTS SYNCHRONISÉS AVEC L'ANNÉE SCOLAIRE GLOBALE

- Les exports Excel/CSV utilisent l'année scolaire sélectionnée en haut du tableau de bord.
- Les lignes datées hors de la période scolaire active sont exclues des exports concernés.
- Les exports de roulements, horaires, absences, interventions, incidents, nettoyage, demandes, travaux, réunions, documents et événements suivent la même année scolaire globale.
- Les rapports PDF / impressions reprennent l'année scolaire globale dans leur contexte.
- Les exports de sauvegarde/archives comportent également l'année scolaire active dans les métadonnées lorsque possible.
- L'année des contrôles périodiques exportés est alignée sur le début de l'année scolaire active.
- Conservation de toutes les corrections V147.17.

Exemple :
Année scolaire en haut = 2026-2027
=> exports concernés = données comprises entre 01/09/2026 et 31/08/2027.

Aucune modification de la logique état des agents du tableau de bord.
```

---

## CHANGEMENTS_V147_19.txt

```text
V147.19 — 15/08/2026

JOURS DE PERMANENCE / CHRONOTIME

Règle automatique :
- l'année scolaire globale reste la référence ;
- les vacances scolaires sont prises dans la zone scolaire configurée ;
- une ligne Chronotime avec une durée de présence pendant une journée de vacances devient automatiquement « Permanence » ;
- CA / RTT / RH / RFE restent prioritaires et conservent leurs pastilles ;
- une présence Chronotime hors vacances reste une présence normale.

Horaire de permanence :
- chaque agent peut avoir un seul horaire fixe de permanence : début, fin et pause ;
- cet horaire est réutilisé automatiquement pour toutes ses permanences ;
- exemple : agent configuré 06:00-12:00 => toutes ses permanences sont planifiées 06:00-12:00 ;
- la durée Chronotime sert à identifier que la journée est travaillée ; le planning utilise l'horaire de permanence configuré.

Affichage :
- nouveau type/pastille « Permanence » ;
- couleur dédiée orange ;
- synchronisation automatique des Chronotime déjà stockés et des futurs imports.

Conservation des correctifs précédents : année scolaire globale, exports, CA/RTT/RH/RFE, scroll, salles, scanner et Supabase.
```

---

## CHANGEMENTS_V147_20.txt

```text
V147.20 — 15/08/2026

Correction visibilité horaire de permanence :
- les champs sont maintenant intégrés DIRECTEMENT dans le vrai formulaire « Modifier l'agent » ;
- Début permanence ;
- Fin permanence ;
- Pause permanence (minutes) ;
- sauvegarde dans la fiche agent et Supabase via la sauvegarde générale ;
- recalcul immédiat des permanences Chronotime déjà importées après modification ;
- affichage de l'horaire de permanence sur la carte agent pour contrôle ;
- suppression de l'ancien mécanisme V147.19 qui tentait d'ajouter les champs après ouverture du formulaire et ne trouvait pas le formulaire réel.

La détection automatique Chronotime pendant les vacances scolaires reste active.
```

---

## CHANGEMENTS_V147_21.txt

```text
V147.21 — 15/08/2026
- Ajout du bouton « Permanence » directement sur chaque carte agent.
- Position : à côté de « Horaires annuels » et « Roulement ».
- Clic => fenêtre dédiée Début / Fin / Pause.
- Enregistrement sur l'agent.
- Recalcul immédiat des permanences Chronotime déjà importées.
- Les champs restent également disponibles dans Modifier l'agent.
```

---

## CHANGEMENTS_V147_22.txt

```text
V147.22 — 15/08/2026
- Horaire théorique partout : Permanence > Roulement > Standard.
- Clic tableau de bord / agent : horaires théoriques rechargés depuis les horaires enregistrés.
- Matrice Excel : colonnes Permanence début / fin / pause ajoutées à Agents.
- Export matrice préremplit la permanence ; réimport la réapplique à l'agent.
- Chronotime permanence recalculé après import.
```

---

## CHANGEMENTS_V147_23.txt

```text
V147.23 — 15/08/2026
Contrôles périodiques mis à jour depuis « suivi des contrats bis (1).xlsx » — rubrique CONTRÔLE.
13 contrôles intégrés/mis à jour avec périodicité, dernière prestation et prestataire connus.
Les contrôles restent entièrement modifiables et supprimables.
Champs modifiables : N°, intitulé, famille, bâtiment, périodicité mois, précision, dernier contrôle, prochaine échéance, heure, étage, secteur, local, statut, prestataire, registre, exigence, notes, pièces jointes.
La fusion avec une base Supabase existante conserve les pièces jointes et le statut existants.
```

---

## CHANGEMENTS_V147_24.txt

```text
V147.24 — OneDrive documentaire

- Le bouton + / Importer-Scanner reste le point d’entrée unique.
- Après analyse d’un PDF non-Chronotime, l’application propose un classement OneDrive.
- L’utilisateur peut ouvrir OneDrive, créer le dossier au fur et à mesure, enregistrer le PDF puis coller son lien.
- Supabase conserve le classement, la rubrique, l’année scolaire, le nom du fichier et le lien OneDrive.
- Pour un contrôle périodique, le lien est rattaché au contrôle choisi et apparaît directement sur sa carte.
- Pour un document général, le lien apparaît dans Documents.
- Si un lien OneDrive est fourni pour un document général, le PDF original n’est pas dupliqué dans Supabase Storage.
- Si aucun lien OneDrive n’est fourni, le fonctionnement Supabase existant reste disponible comme secours.
- Chronotime conserve son circuit actuel sans imposer OneDrive.

Cette version ne nécessite pas encore Microsoft Graph : aucun tenant/client secret à configurer. L’enregistrement du fichier dans OneDrive reste volontaire et manuel ; l’application mémorise ensuite son lien classé.
```

---

## CHANGEMENTS_V147_25.txt

```text
V147.25 — Enregistrement OneDrive guidé

Correction du bouton OneDrive après analyse d’un PDF :
- le bouton principal devient « Enregistrer le PDF dans OneDrive » ;
- au clic, l’application prépare/télécharge réellement le PDF sélectionné sur l’appareil ;
- OneDrive s’ouvre ensuite ;
- l’écran explique de choisir le dossier voulu dans OneDrive puis Ajouter/Charger → Fichiers et de sélectionner le PDF téléchargé ;
- après l’envoi, l’utilisateur copie le lien OneDrive et le colle dans l’application pour le classer dans la bonne fiche.

Important : un navigateur ne peut pas déposer automatiquement un fichier dans un dossier OneDrive choisi sans authentification Microsoft Graph. Cette version évite donc de faire croire que « Ouvrir OneDrive » enregistre le PDF : elle prépare le fichier et guide explicitement l’enregistrement.
Chronotime conserve son circuit spécifique.
```

---

## CHANGEMENTS_V147_26.txt

```text
V147.26 — Dossier racine OneDrive

- Le bouton OneDrive ouvre désormais directement le dossier : Documents / Pilotage Service Technique.
- Le bouton « Enregistrer le PDF dans OneDrive » prépare le PDF puis ouvre directement ce même dossier racine.
- Le bouton secondaire devient « Ouvrir Pilotage Service Technique ».
- Les sous-dossiers restent créés au fur et à mesure selon les besoins.
- Le classement du lien dans l’application reste inchangé.
```

---

## CHANGEMENTS_V147_27.txt

```text
V147.27 — 16/08/2026

Circuit OneDrive manuel sécurisé, sans autorisation Microsoft Graph :
- après analyse, bouton « Préparer le PDF + ouvrir OneDrive » ;
- OneDrive s’ouvre directement dans « Pilotage Service Technique » ;
- après chargement du PDF, l’utilisateur fait Partager → Copier le lien ;
- retour dans l’application : bouton « 📋 Coller le lien copié » ;
- bouton « ✅ J’ai enregistré dans OneDrive » valide et classe immédiatement le lien ;
- validation du lien OneDrive/SharePoint ;
- refus du lien du dossier racine : il faut bien le lien du fichier ;
- pour un contrôle périodique, le contrôle concerné est obligatoire ;
- le lien est enregistré dans Supabase via l’état de l’application et rattaché à la bonne fiche ;
- le bouton Continuer réutilise le lien déjà classé et évite les doublons.

Chronotime conserve son circuit spécifique.
```

---

## CHANGEMENTS_V147_28.txt

```text
V147.28 — 16/08/2026

ONEDRIVE — LIEN OBLIGATOIRE AVANT VALIDATION

- Pour tous les documents hors Chronotime, impossible de poursuivre sans lien OneDrive.
- Le bouton « J’ai enregistré dans OneDrive » reste désactivé tant que le lien n’est pas valide.
- Pour un contrôle périodique, il faut également choisir le contrôle concerné.
- Après validation et classement du lien, le bouton « Continuer vers la validation » est déverrouillé.
- Un contrôle de sécurité supplémentaire empêche la validation si le lien n’a pas réellement été enregistré dans l’index de l’application.
- Chronotime conserve son circuit spécifique actuel et n’est pas bloqué par cette obligation OneDrive.
```

---

## CHANGEMENTS_V147_29.txt

```text
V147.29 — 16/08/2026

CORRECTION HORAIRE STANDARD THÉORIQUE PAR FICHE AGENT

- Ajout dans « Modifier l’agent » d’un bloc « Horaire standard théorique » :
  * Début standard
  * Fin standard
  * Pause standard
  * Mission standard

- Ces données sont enregistrées sur la fiche agent et dans Supabase.
- Elles créent / mettent à jour automatiquement le profil Standard de l’année scolaire active dans Pilotage des horaires.
- Si l’agent n’a pas de roulement, le tableau de bord reprend automatiquement cet horaire Standard.
- Si un roulement existe, le roulement reste prioritaire.
- Si le jour est une Permanence, la Permanence reste prioritaire sur tout le reste.
- Priorité conservée : Permanence > Roulement > Standard.
- Les anciennes lignes Chronotime « Présence » ne masquent plus l’horaire théorique Standard.
- Les nouveaux agents ne reçoivent plus automatiquement un faux roulement : le roulement doit être créé explicitement.
- La carte agent affiche le Standard lorsque l’agent n’a pas de roulement actif.
```

---

## CHANGEMENTS_V147_30.txt

```text
V147.30 — 16/08/2026

TRACABILITÉ RÉELLE DES HORAIRES STANDARD

- Chaque modification d'horaire Standard demande une Date d'effet.
- Une nouvelle période Standard est créée au lieu d'écraser l'ancienne.
- La période précédente est automatiquement clôturée la veille de la nouvelle date d'effet.
- Les périodes futures existantes restent conservées.
- Le tableau de bord, les calculs et les affichages passés retrouvent l'horaire applicable à la date consultée.
- Dans Modifier l'agent : ajout d'un historique des périodes Standard.
- Priorité métier inchangée : Permanence > Roulement > Standard.
- La fiche agent conserve un raccourci vers l'horaire Standard courant, mais weeklyPlans devient l'historique de référence.
- Aucun horaire précis de Mme Tarrio n'a été inventé : ses valeurs doivent être saisies avec la date d'effet souhaitée.
```

---

## CHANGEMENTS_V147_31.txt

```text
V147.31 — 16/08/2026

CORRECTION GLOBALE DES HORAIRES THÉORIQUES — TOUS LES AGENTS

Ordre appliqué partout :
1. Permanence
2. Roulement actif à la date consultée
3. Standard historique actif à la date consultée
4. Repos / aucun horaire

- Recherche du Standard dans la période exacte qui contient la date consultée.
- Les anciennes lignes Chronotime « Présence » ne masquent plus l'horaire théorique.
- Si le jour est non travaillé dans une période Standard, affichage « Repos / non travaillé ».
- La fenêtre de saisie planning affiche désormais la vraie source de l'horaire théorique.
- Correction appliquée à Mme Tarrio et à tous les autres agents.
- La traçabilité V147.30 par date d'effet est conservée.
```

---

## CHANGEMENTS_V147_32.txt

```text
V147.32 — 16/08/2026

CORRECTION ENREGISTREMENT / APPLICATION DES HORAIRES THÉORIQUES

- « Nouveaux horaires théoriques » applique désormais immédiatement les horaires enregistrés.
- Mise à jour immédiate du tableau de bord, du calendrier des agents et du Pilotage des horaires.
- Les horaires historiques fournis avec l'application sont reconnus comme STANDARD et non comme faux profil Matin.
- Migration des anciens roulements automatiques fictifs créés par les premières versions.
- Les vrais roulements saisis par l'utilisateur sont conservés.
- Les nouveaux agents ne reçoivent pas de roulement automatique.
- Priorité inchangée : Permanence > vrai Roulement > Standard > Repos.
- Les nouvelles périodes Standard restent historisées par date d'effet.
```

---

## CHANGEMENTS_V147_33.txt

```text
V147.33 — 16/08/2026

SUPPRESSION DES PÉRIODES D'HORAIRES STANDARD

- Dans la fenêtre « saisie planning » d'un agent, chaque période Standard affiche maintenant :
  « 🗑️ Supprimer cette période ».
- La suppression concerne uniquement la période sélectionnée.
- Les autres périodes historiques restent intactes.
- L'historique est automatiquement recollé autour de la période supprimée.
- Le tableau de bord, le calendrier et le Pilotage des horaires sont recalculés immédiatement.
- Le raccourci Standard de la fiche agent est recalculé après suppression.
- Une confirmation indique l'agent et les dates avant suppression.
- Les roulements réels et les horaires de permanence ne sont pas supprimés par ce bouton.
```

---

## CHANGEMENTS_V147_34.txt

```text
V147.34 — 16/08/2026

TABLEAU DE BORD — HORAIRES THÉORIQUES SUR LE CALENDRIER DES AGENTS

- Chaque carte agent du calendrier hebdomadaire affiche maintenant explicitement « Théorique : HH:MM–HH:MM ».
- La source est indiquée : Permanence, Roulement/Matin/Soir, Standard ou Repos.
- L'horaire est recalculé pour la date exacte de chaque colonne du calendrier.
- L'ordre métier reste : Permanence > Roulement > Standard > Repos.
- Les absences/RTT/congés gardent leur pastille, tout en conservant la référence de l'horaire théorique de la journée.
- Les périodes historiques Standard sont donc visibles sur les semaines correspondantes du tableau de bord.
```

---

## CHANGEMENTS_V147_35.txt

```text
V147.35 — Burger mobile / fluidité

- Suppression des doubles gestionnaires du bouton burger.
- navigation.js devient l'unique gestionnaire du menu mobile.
- Ouverture au pointerdown pour une réaction immédiate sur Android.
- Animation du panneau via transform GPU, courte et légère.
- Backdrop simplifié.
- Le menu ne relance plus inutilement l'initialisation du tableau de bord.
- Fonctions horaires V147.34 conservées.
```

---

## CHANGEMENTS_V147_36.txt

```text
V147.36 — 16/08/2026

AUDIT ET OPTIMISATION DE FLUIDITÉ GLOBALE

Points corrigés :
- une sauvegarde ne redessine plus tous les écrans cachés de l'application ;
- seul l'écran actif + les composants communs sont recalculés ;
- cache temporaire des horaires théoriques agent/date pendant les rendus ;
- calendrier du tableau de bord : suppression de plusieurs calculs en double par agent et par jour ;
- le compteur de présents réutilise le calcul déjà fait pour la carte ;
- Roulements annuels ne reconstruit plus tous les Chronotime à chaque simple affichage ;
- vérification Supabase espacée de 3 s à 8 s pour réduire les requêtes et réveils JavaScript ;
- longues cartes compatibles avec content-visibility pour réduire le coût d'affichage mobile ;
- les vues cachées sont explicitement retirées du rendu visuel.

Fonctions conservées :
- burger rapide V147.35 ;
- horaires théoriques sur le calendrier ;
- priorité Permanence > Roulement > Standard > Repos ;
- traçabilité des horaires ;
- Supabase, Chronotime, OneDrive, imports, contrôles et autres modules.

Aucune donnée métier supprimée.
```

---

## CHANGEMENTS_V147_37.txt

```text
V147.37 — 16/08/2026

SÉCURISATION DE L'ENREGISTREMENT DES FORMULAIRES

- Ajout d'une persistance vérifiée : écriture Supabase + relecture de contrôle.
- Le formulaire ne doit plus se fermer silencieusement si Supabase ne confirme pas.
- Hors ligne : conservation locale avec synchronisation ultérieure.
- Rafraîchissement de l'écran actif après confirmation.
- Intervention / maintenance et les principaux formulaires métier passent par cette vérification.
- Audit interne disponible via PSTFormAudit.run().

Formulaires ciblés :
maintenance, demandes, chantiers/GPA, réunions, notes, sécurité/qualité,
contrôles périodiques, ménage, vacances, agenda personnel, documents,
agents, roulements et exceptions.

Les imports spécialisés gardent leurs circuits dédiés.

Compléments de vérification :
- horaires théoriques ;
- planning / jour agent ;
- horaire de permanence ;
- locaux / salles ;
- contrôle périodique ;
- sécurité / qualité ;
- agenda personnel ;
- documents ;
- agents ;
- roulements et exceptions.

Tous ces formulaires attendent maintenant la confirmation de persistance avant fermeture.
```

---

## CHANGEMENTS_V147_38.txt

```text
V147.38 — 16/08/2026

CORRECTION GLOBALE FORMULAIRES → TABLEAUX

Cause principale trouvée :
- depuis l'optimisation de fluidité, le menu mobile pouvait changer l'écran visible sans mettre à jour la variable currentView de l'application ;
- après Enregistrer, Supabase pouvait donc confirmer correctement la modification, mais l'application rafraîchissait un autre écran (souvent le tableau de bord) au lieu du tableau affiché.

Corrections :
- navigation.js délègue maintenant les changements de page à setView() de l'application ;
- safeRenderAll() utilise d'abord la vraie page visible dans le DOM ;
- synchronisation de secours par événement pst:view-changed ;
- tous les formulaires métier principaux ont été audités : ils possèdent une persistance vérifiée avant fermeture ;
- le tableau Maintenance affiche réellement « Tous les statuts » lorsque ce filtre est sélectionné ;
- une intervention passée en Terminée / Clôturée reste donc visible dans le tableau avec son nouveau statut au lieu de disparaître comme si elle n'avait pas été enregistrée ;
- suppression d'un rafraîchissement en double après confirmation Supabase.

Formulaires audités :
Agent, permanence, roulement, exception de roulement, planning agent,
agenda, sécurité/qualité, contrôles périodiques, ménage, maintenance,
demandes direction, chantiers/GPA, réunions, notes, vacances,
documents, locaux et horaires théoriques.

Les imports spécialisés conservent leur persistance dédiée.
```

---

## CHANGEMENTS_V147_39.txt

```text
V147.39 — 16/08/2026

FILTRES MANUELS SUR TOUTES LES COLONNES DE L'APPLICATION

- Ajout automatique d'une ligne de filtre sous les titres de colonnes de tous les tableaux.
- Le filtre est manuel et indépendant pour chaque colonne.
- Recherche partielle insensible aux majuscules/minuscules et aux accents.
- Plusieurs filtres de colonnes peuvent être combinés.
- Un compteur affiche le nombre de lignes visibles quand un filtre est actif.
- Bouton « Effacer filtres colonnes » ajouté sur les écrans contenant un tableau.
- Les filtres restent mémorisés pendant la session quand le tableau est rafraîchi.
- Les colonnes d'action vides ne reçoivent pas de filtre inutile.
- Fonction générique : Maintenance, Demandes, Chantiers, Réunions, Agents si tableau,
  Roulements, Planning, Absences, Vacances, Sécurité, Contrôles périodiques,
  Ménage, Archives et tout autre tableau utilisant la structure standard de l'application.
- Aucun enregistrement métier n'est modifié par le filtrage.
```

---

## CHANGEMENTS_V147_40.txt

```text
V147.40 — 16/08/2026

CORRECTION RÉELLE DES MODIFICATIONS DE FORMULAIRES

Problème traité :
- une fiche existante pouvait être modifiée à l'écran mais la vérification Supabase contrôlait seulement que son ID existait ;
- elle ne contrôlait pas que le nouveau statut / contenu avait réellement remplacé l'ancienne valeur.

Nouvelle règle pour tous les principaux formulaires :
1. les valeurs du formulaire remplacent explicitement l'enregistrement correspondant dans la collection DB par son ID ;
2. l'état complet modifié est envoyé à Supabase ;
3. Supabase est relu ;
4. l'application compare les champs relus aux champs qui viennent d'être enregistrés ;
5. le formulaire ne se ferme que si les nouvelles valeurs correspondent réellement ;
6. le tableau concerné est rafraîchi explicitement après confirmation.

Maintenance :
- passage À faire → Terminée / Clôturée vérifié sur la valeur STATUS elle-même ;
- après confirmation, le tableau Maintenance est redessiné immédiatement ;
- le message confirme le statut réellement enregistré.

Même contrôle appliqué à :
Demandes, Chantiers/GPA, Réunions, Notes, Sécurité/qualité,
Contrôles périodiques, Ménage, Vacances, Agenda personnel, Documents,
Agents, Permanence, Roulements, Exceptions, Horaires théoriques,
Planning agent et Locaux.

Les pièces jointes sont exclues uniquement de la comparaison JSON lourde,
mais leur mécanisme Supabase Storage reste inchangé.
```

---

## CHANGEMENTS_V147_41.txt

```text
V147.41 — 16/08/2026

CORRECTION FERMETURE DES FORMULAIRES
- La vérification Supabase n'est plus basée sur une égalité JSON trop stricte.
- La relecture compare maintenant uniquement les champs réellement enregistrés.
- Les champs supplémentaires ajoutés par migration ou normalisation n'empêchent plus la validation.
- Si Supabase confirme les nouvelles valeurs, le formulaire se ferme normalement.
- Si Supabase ne confirme pas, le formulaire reste ouvert et affiche l'erreur.

AUDIT
- Vérification de 18 formulaires métier : tous possèdent une persistance vérifiée et une fermeture après succès.

NETTOYAGE DU ZIP
- Suppression des anciens fichiers CHANGEMENTS_*.txt devenus inutiles.
- Conservation uniquement de ce fichier de version.
- Aucun fichier de données, Excel, JavaScript ou configuration métier n'a été supprimé.
```

---

## CHANGEMENTS_V147_44.txt

```text
V147.44 — Compteur interventions actives

- Le grand compteur « Interventions » du tableau de bord exclut désormais toutes les interventions considérées fermées par l'application.
- Les statuts Terminée et Clôturée ne sont donc plus comptés.
- Les autres statuts de fermeture déjà reconnus par la fonction métier isClosedStatus (ex. Archivée / Annulée selon configuration) restent également exclus.
- Le sous-compteur affiche uniquement le nombre « À faire ».
- Les interventions terminées/clôturées restent enregistrées dans la base et consultables dans Maintenance ; elles sont seulement retirées du compteur du tableau de bord.
- La largeur automatique des colonnes sur toutes les impressions de V147.43 est conservée.
```

---

## CHANGEMENTS_V147_45.txt

```text
V147.45 — Rapports de contrôle intégrés en lecture

- 7 rapports PDF fournis intégrés directement au ZIP dans /reports.
- Ils apparaissent automatiquement dans la bibliothèque « Rapports de contrôle ».
- Bouton « 📖 Lire le PDF » : ouverture directe du document intégré, sans rattachement OneDrive/Supabase nécessaire.
- Classement par famille : Électricité, Gaz, Équipements sportifs, Autres contrôles (ancrages/EPI), VMC/Ventilation, Cuisine/Cuisson.
- Métadonnées conservées : organisme, date, référence du rapport, sous-type, résumé et nombre d'observations lorsqu'il est déterminable.
- Aucun plan d'action / intervention n'est créé automatiquement à partir de ces rapports préchargés : ils sont intégrés en lecture et restent disponibles pour analyse manuelle/import ultérieur.
- Déduplication sûre : suppression uniquement des doublons certains ayant la même empreinte SHA-256 ; les deux rapports électriques APAVE du 07/07/2025 restent distincts car l'un est le RVRE ERP et l'autre la vérification périodique des installations électriques.
- Les archives associées sont également dédupliquées par empreinte.

Rapports intégrés :
1. APAVE — RVRE installations électriques et éclairages — 07/07/2025 — réf. 135054046-001-1 — 0 non-conformité.
2. APAVE — Vérification périodique installations électriques — 07/07/2025 — réf. 135054046-001-1 — 23 observations.
3. APAVE — Installations thermiques / gaz — 05/09/2025 — réf. 135046511-001-1 — 1 observation.
4. APAVE — Équipements sportifs — 05/12/2025 — réf. A513283837-004-1 — 26 observations.
5. APAVE — Dispositifs d'ancrage pour EPI — 02/02/2026 — réf. A513283836-004-1 — 5 observations.
6. Bureau Veritas — CTA et VMC sanitaires — 20/03/2026 — réf. 28016576/155.1.1.RAP.
7. Bureau Veritas — Hottes de cuisines — 20/03/2026 — réf. 28016576/152.1.1.RAP.
```

---

## CHANGEMENTS_V147_47.txt

```text
V147.47 — 300 phrases de motivation

- 300 phrases de motivation différentes sont intégrées directement dans l'application.
- Une phrase est affichée par jour dans le bandeau du tableau de bord.
- La phrase change automatiquement selon la date locale.
- Les 300 formulations sont embarquées dans l'application : aucune connexion Internet nécessaire.
- Les fonctions de la V147.46 sont conservées.
```

---

## CHANGEMENTS_V147_48.txt

```text
V147.48 — Nouveau bandeau du tableau de bord
- Encadré bleu entièrement modernisé.
- Titre « Pilotage Service Technique » conservé en entier.
- Logo mis en valeur dans un médaillon blanc.
- Sélecteur d’année scolaire modernisé.
- Citation du jour intégrée au bandeau.
- Dégradé bleu, relief, formes décoratives et meilleure hiérarchie visuelle.
- Responsive téléphone / tablette / ordinateur.
- Aucune modification du fonctionnement des données du tableau de bord.
```

---

## CHANGEMENTS_V147_49.txt

```text
V147.49 — Bandeau bleu mobile plus compact

- Réduction nette de la hauteur de l'encadré bleu sur téléphone.
- Titre « Pilotage Service Technique » conservé entièrement, mais plus compact.
- Logo réduit sur mobile.
- Sélecteur d'année scolaire réduit et rapproché du titre.
- Citation plus compacte pour éviter un grand espace vertical.
- Affichage tablette et ordinateur conservé.
- Toutes les fonctions de la V147.48 sont conservées.
```

---

## CHANGEMENTS_V147_50.txt

```text
V147.50 — correction réelle de la taille du bandeau mobile

- Encadré bleu nettement moins haut sur téléphone.
- Titre, logo, sélecteur d’année et citation compactés.
- Ajout d’un réglage spécifique pour les écrans <= 390 px.
- Aucun module métier modifié.
- Base V147.49 conservée.
```

---

## CHANGEMENTS_V147_51.txt

```text
Pilotage Service Technique V147.51

- Mobile : sélecteur Année scolaire centré sous le titre.
- Logo placé en face de « Pilotage Service Technique ».
- Encadré bleu conservé compact et responsive.
- Aucun autre module fonctionnel modifié.
```

---

## CHANGEMENTS_V147_52.txt

```text
V147.52 — bandeau mobile rééquilibré

- Logo réellement aligné en face du titre.
- Sélecteur « Année scolaire » centré et symétrique.
- Citation mieux alignée et plus légère.
- Bandeau bleu plus compact et mieux proportionné.
- Barre de défilement grise des actions rapides masquée sur mobile.
- Aucun module fonctionnel modifié.
```

---

## CHANGEMENTS_V147_53.txt

```text
V147.53 — correction mémorisation des cases de locaux
- Les cases cochées/décochées conservent leur état.
- Tout sélectionner / Tout décocher conservent la sélection.
- Version affichée mise à jour en V147.53.
```

---

## CHANGEMENTS_V147_54.txt

```text
V147.54 — clarification Contrôle ménage / Historique

- La zone supérieure est maintenant clairement intitulée « Historique des contrôles ménage par local ».
- La sélection Bâtiment / Étage / Secteur / Salle(s) sert à consulter les anciens contrôles.
- Ajout d’un bouton « + Nouveau contrôle » directement dans l’en-tête de l’historique.
- Ce bouton ouvre le formulaire de contrôle ménage existant, sans modifier son fonctionnement.
- La zone de saisie générale est renommée « Nouveau contrôle ménage & suivi général ».
- La mémorisation des cases cochées/décochées de la V147.53 est conservée.
- Version affichée : V147.54.
```

---

## CHANGEMENTS_V147_55.txt

```text
Pilotage Service Technique — V147.55 — 19/08/2026

CORRECTIONS
- Bouton Enregistrer des formulaires : retour visuel "Enregistrement…" pendant la sauvegarde.
- Si Supabase tarde ou répond mal, la saisie est conservée localement et mise en attente de synchronisation au lieu de donner l'impression que le bouton ne fonctionne pas.
- Contrôle ménage : après enregistrement du formulaire principal, le contrôle est également ajouté à l'historique par local.
- Historique ménage par local : stockage relié à cleaningRoomChecks dans l'état principal/Supabase, avec reprise de l'ancien historique local.
- Historique des salles : séparation par bâtiment / étage / secteur pour éviter de mélanger, par exemple, les sanitaires de plusieurs étages.
- Cases de sélection des salles : conservation du comportement mémorisé de la V147.53/V147.54.
- Version affichée : V147.55.

VERIFICATIONS TECHNIQUES
- Syntaxe JavaScript vérifiée sur tous les fichiers JS présents dans ce ZIP.
- Contrôle statique des boutons et formulaires du noyau app.js + room-cleaning.js.
- Le ZIP d'origine référence aussi supabase-config.js, notification-center.js, weather-waste.js et room-prep.js sans les embarquer. Ces fichiers doivent rester présents dans le dépôt GitHub existant comme dans les versions précédentes.
```

---

## CHANGEMENTS_V147_56.txt

```text
Pilotage Service Technique — V147.56 — 19/08/2026

CORRECTION HISTORIQUE CONTRÔLE MÉNAGE
- Les contrôles saisis via « Nouveau contrôle ménage » sont maintenant reconstruits directement depuis la collection principale `cleaning` si nécessaire.
- L'historique par salle ne dépend plus uniquement du miroir `cleaningRoomChecks`.
- Un contrôle déjà existant est rafraîchi sans doublon.
- Cache des fichiers JS forcé en V147.56 pour éviter qu'un ancien room-cleaning.js reste chargé sur Android/Chrome.
- Numéro de version affiché harmonisé en V147.56.
```

---

## CHANGEMENTS_V147_57.txt

```text
V147.57 — Historique ménage exhaustif

- Une salle précise (ex. Bâtiment A > RDC > 106) retrouve tous ses contrôles enregistrés.
- Les anciens contrôles principaux sont reconstruits automatiquement, même si leur ancien miroir historique était incomplet.
- Un contrôle « Secteur entier » est rattaché à toutes les salles/localisations du secteur.
- Un contrôle « Zone entière » est rattaché à tous les locaux du secteur choisi (ou de l’étage si aucun secteur n’est précisé).
- Le formulaire Nouveau contrôle ménage possède maintenant un champ Secteur.
- Depuis la page Historique, le bouton Nouveau contrôle transmet bâtiment, étage, secteur et sélection de locaux au formulaire.
- Les contrôles multiples sont visibles dans l’historique de chaque local concerné.
```

---

## CHANGEMENTS_V147_60.txt

```text
V147.60 — Vérification du bouton Enregistrer du formulaire Contrôle ménage

- Vérification du câblage du bouton Enregistrer : formulaire modal -> modalHandler -> commitFormRecordVerified.
- Vérification de présence du contrôle dans db.cleaning avant fermeture du formulaire.
- Relance de la reconstruction de l'historique après enregistrement.
- Le formulaire ne se ferme pas si le contrôle principal n'est pas retrouvé après sauvegarde.
- Version et paramètres de cache des scripts passés en 147.60 pour empêcher Android/Chrome de réutiliser app.js ou room-cleaning.js de la V147.63.
- Syntaxe JavaScript vérifiée.
```

---

## CHANGEMENTS_V147_61.txt

```text
V147.61 — Historique ménage exhaustif / Extension

- Corrige le rattachement des contrôles du bâtiment Extension.
- Le formulaire principal utilise Rez-de-chaussée / 1er étage alors que le référentiel historique Extension était regroupé sous Locaux : ces libellés sont désormais compatibles.
- Un contrôle ne disparaît plus de l’historique à cause d’une différence de libellé d’étage ou de secteur.
- Les contrôles « Zone entière / Secteur entier » sont rattachés à tous les locaux concernés.
- Les contrôles sur un local précis sont recherchés par numéro, nom et type.
- En dernier recours, un contrôle reste rattaché au bâtiment plutôt que d’être perdu de l’historique.
- Les contrôles existants sont reconstruits à la lecture : les anciens contrôles Extension peuvent donc réapparaître sans ressaisie.
```

---

## CHANGEMENTS_V147_62.txt

```text
V147.63 — Vérification historique ménage tous bâtiments

- Vérification du référentiel complet des bâtiments utilisés par le formulaire principal.
- Ajout dans le référentiel historique : Demi-pension, Gymnase et Cour (ils manquaient).
- Conservation automatique des bâtiments/salles personnalisés déjà enregistrés : aucun reset de configuration.
- Migration douce : les bâtiments manquants sont ajoutés aux configurations existantes.
- Correction de la comparaison des noms de bâtiments pour éviter les faux rapprochements avec les lettres seules (ex. E / Extension).
- Extension, Algeco, bâtiments A/B/H/G/E/F, Demi-pension, Gymnase et Cour sont désormais couverts par l’historique.
- Les contrôles principaux sont toujours reconstruits à chaque lecture pour ne pas perdre les anciens contrôles.
```

---

## CHANGEMENTS_V147_64.txt

```text
V147.64 — 20/08/2026

- Correction suppression contrôles ménage : une suppression est écrite directement dans Supabase pour éviter la réapparition par fusion avec une ancienne copie serveur.
- Extension : ajout du référentiel complet dans les contrôles ménage et les locaux de toute l’application : Gymnase, Salle de musculation, Sanitaires, Circulation, Vestiaires, Salle des professeurs, Rangement, Atelier, Chaufferie.
- Demi-pension : ajout du référentiel complet : Self, Cuisine, Côté technique eau chaude, Sanitaires filles, Sanitaires garçons, Hall du self, Laverie, Circulation cuisine, Espace détente, Vestiaire agents filles, Vestiaire agents garçons, Bureau, Lingerie.
- Migration non destructive : les locaux existants sont conservés et les locaux manquants sont ajoutés automatiquement.
- Historique : les contrôles existants restent conservés et les nouveaux référentiels sont utilisés pour retrouver les contrôles par bâtiment/local.
- Version/cache forcés en 147.64.
```

---

## CHANGEMENTS_V147_65.txt

```text
V147.65 — CORRECTION RESPONSIVE DES COLONNES

- Les tableaux ne compressent plus toutes les informations dans des colonnes trop étroites.
- Largeur automatique des colonnes avec défilement horizontal sur téléphone.
- Les grands tableaux (maintenance, demandes, travaux, contrôles, planning, absences, etc.) gardent une largeur lisible.
- Les textes longs reviennent proprement à la ligne sans écraser les autres colonnes.
- Les filtres et formulaires se réorganisent sur mobile.
- Les impressions utilisent toute la largeur disponible et redistribuent les colonnes.
- Version/cache forcés en 147.65.
```

---

## CHANGEMENTS_V147_68.txt

```text
V147.69 — RESTAURATION AFFICHAGE PC/ANDROID + SUPPRESSION CONTROLES

- Retour réel à l’affichage V147.64, avant le CSS global V147.65 qui modifiait toutes les colonnes.
- Aucun correctif global de mise en page ajouté.
- Référentiel Extension / Demi-pension conservé.
- Suppression contrôle ménage sécurisée par marqueur persistant afin d’éviter la réapparition après synchronisation.
- Cache forcé en 147.69.
```

---

## CHANGEMENTS_V147_69.txt

```text
V147.69 — REBUILD ANTI-CACHE

- Reconstruction depuis V147.68.
- Version visible 147.69 partout.
- Paramètre anti-cache unique sur CSS/JS.
- Meta no-cache/no-store ajoutées dans index.html.
- Aucun changement fonctionnel supplémentaire.
```

---

## CHANGEMENTS_V147_70.txt

```text
V147.70 — 20/08/2026

- Affichage PC du tableau de bord optimisé uniquement à partir de 1100 px :
  * calendriers côte à côte ;
  * planning du jour et aperçus répartis sur la largeur ;
  * scroll interne dans les blocs longs au lieu d'allonger toute la page ;
  * Android et tablette non modifiés par cette règle.
- Ajout d'un lien « 📊 Dashboard » vers https://zigobox.github.io/Faciale-/ dans les actions rapides.
- Suppression des contrôles ménage renforcée :
  * suppression par identifiant ET empreinte du contrôle ;
  * mémorisation persistante des contrôles supprimés ;
  * empêche la reconstruction d'un ancien contrôle après synchronisation ;
  * écriture Supabase directe sans fusion pendant la suppression ;
  * support des anciens contrôles qui n'avaient pas de sourceMainId.
- Anti-cache et version mis à jour en 147.70.
```

---

## CHANGEMENTS_V147_71.txt

```text
V147.71 — BASE V147.69 STABLE

- Repart strictement de V147.69 pour l’affichage PC et Android.
- AUCUNE règle CSS compacte / grille PC de V147.70 ajoutée.
- Ajout du bouton Dashboard vers https://zigobox.github.io/Faciale-/
- Suppression contrôle ménage renforcée : tombstones sur tous les alias d’identifiant + retrait de cleaning et cleaningRoomChecks avant sauvegarde Supabase.
- Version/cache forcés en 147.71.
```

---

## CHANGEMENTS_V147_72.txt

```text
V147.72 — AFFICHAGE PC UNIQUEMENT

Base : V147.71.

- Aucun changement d'affichage Android/mobile.
- Optimisation appliquée uniquement à partir de 1280 px.
- Tableau de bord PC en 2 colonnes pour les calendriers.
- 6 KPI sur une ligne sur PC.
- Blocs du bas en 3 colonnes sur PC.
- Planning du jour et listes longues : défilement interne pour éviter une page très longue.
- Aucun CSS global des autres onglets n'a été modifié.
- Correction de suppression des contrôles ménage de V147.71 conservée.
- Lien Dashboard conservé.
```

---

## CHANGEMENTS_V147_73.txt

```text
V147.73 — AFFICHAGE PC COMPACT SANS CASSER LA GRILLE

Base : V147.71 stable.
- Android/tablette : aucun changement de mise en page.
- PC >= 1280 px : aucune modification du nombre de colonnes ni de la largeur des cartes.
- Calendriers agents/personnel : hauteur limitée avec défilement interne.
- Planning du jour et listes du tableau de bord : hauteur limitée avec défilement interne.
- Espacements verticaux légèrement réduits, sans réduire les textes ni boutons.
- Conservation des corrections V147.71 : suppression contrôles ménage renforcée + lien Dashboard.
```

---

## CHANGEMENTS_V147_74.txt

```text
V147.74 — AFFICHAGE PC SELON MAQUETTE VALIDÉE

- Base : V147.71 stable.
- Android / mobile / tablette inchangés.
- PC >= 1440 px : KPI sur 1 ligne, Planning du jour large à gauche, 6 cartes opérationnelles en grille 2 colonnes à droite.
- Scroll interne dans Planning et cartes longues : la page ne s’allonge plus inutilement.
- Largeur minimale des cartes protégée et retour à la ligne forcé : aucun texte ne doit se superposer.
- Calendriers conservés et placés côte à côte sous la zone principale.
- Correction suppression contrôles ménage et bouton Dashboard conservés depuis V147.71.
```

---

## CHANGEMENTS_V147_75.txt

```text
V147.75 — PC : BURGER EN HAUT + PLEINE LARGEUR

- Base : V147.74 fournie par l’utilisateur.
- PC >= 1280 px uniquement : menu latéral transformé en tiroir.
- Bouton burger visible en haut à gauche sur PC.
- Le contenu principal récupère toute la largeur de l’écran.
- Le menu s’ouvre par-dessus la page et se ferme par la croix, le fond ou après navigation.
- Android et tablette : aucune modification de disposition.
- Les corrections fonctionnelles existantes sont conservées.
```

---

## CHANGEMENTS_V147_76.txt

```text
V147.76 — PC pleine largeur réelle
- Supprime la colonne fantôme réservée au menu sur PC.
- Le menu reste en tiroir via le burger en haut.
- Le contenu principal occupe 100% de la largeur du viewport.
- Android/tablette inchangés (règles actives uniquement à partir de 1280 px).
```

---

## CHANGEMENTS_V147_77.txt

```text
V147.77 — 20/08/2026

- Base : V147.76 fournie par l’utilisateur.
- PC uniquement (>=1280 px) : le bandeau bleu « Pilotage Service Technique » remplace visuellement le titre « Tableau de bord » et sa date.
- Le bandeau conserve : statut temps réel, titre, année scolaire avec flèches, phrase du jour et logo.
- Le bandeau utilise toute la largeur utile de l’écran.
- Barre haute conservée avec burger à gauche et Auto / notifications / Imprimer / Requête Supabase à droite.
- Android et tablette : aucun changement de mise en page.
```

---

## CHANGEMENTS_V147_78.txt

```text
Pilotage Service Technique — V147.78 — 21/08/2026

DASHBOARD CONTRÔLES MÉNAGE — LYCÉE JEAN PUY
- Ajout d'un dashboard complet directement dans l'onglet Contrôle ménage, en complément de l'existant.
- Aucun remplacement du formulaire ni de l'historique actuel.
- Le dashboard utilise directement les contrôles enregistrés dans db.cleaning.
- Les filtres existants (mois, bâtiment, type de local, statut) pilotent aussi le dashboard.
- Indicateurs : note moyenne /5, score %, nombre de contrôles, conformes, à reprendre, non conformes et points faibles.
- Graphique qualité moyenne par bâtiment.
- Répartition visuelle conformes / à reprendre / non conformes / autres.
- Courbe d'évolution du score moyen sur les derniers mois disponibles.
- Top des critères les plus souvent à reprendre.
- Liste automatique des contrôles prioritaires les moins bien notés.
- Détection des récidives par local (au moins deux contrôles à reprendre).
- Indicateurs de pilotage par rapport à un objectif qualité de 85 % / 4,25 sur 5.
- Mise en page responsive PC / tablette / mobile.
- Version affichée portée à V147.78.
- Syntaxe JavaScript vérifiée avec node --check.
```

---

## LIRE_MOI_V147_78.txt

```text
Pilotage Service Technique — V147.78 — 21/08/2026

Base complète : V147.77 HERO EN-TETE PC.
Évolution V147.78 : ajout du dashboard complet dans l'onglet Contrôle ménage.

Fichiers versionnés en 147.78 :
- app.js
- index.html
- room-cleaning.js (cache/config)
- CHANGEMENTS_V147_78.txt

Le ZIP conserve tous les autres fichiers présents dans le paquet V147.77.
Les fichiers déjà hébergés sur le dépôt GitHub mais historiquement non inclus dans les ZIP (supabase-config.js, notification-center.js, weather-waste.js, room-prep.js, styles.css selon le dépôt) ne doivent pas être supprimés du dépôt.
```

---

## CHANGEMENTS_V147_79.txt

```text
Pilotage Service Technique — V147.79 — 21/08/2026

RÉGLAGE AUTOMATIQUE À L’OUVERTURE
- À chaque ouverture de l’application, l’année scolaire active est recalculée automatiquement à partir de la date du jour.
- Règle : du 1er septembre au 31 août = une année scolaire.
- Les vues journalières s’ouvrent sur la date du jour.
- Les vues mensuelles s’ouvrent sur le mois courant.
- Les calendriers hebdomadaires reviennent sur la semaine courante.
- Les filtres liés à l’année scolaire sont resynchronisés avec l’année scolaire du jour.
- Une année scolaire peut toujours être consultée manuellement pendant la session, mais l’ouverture suivante revient automatiquement sur l’année scolaire du jour.
- Aucune donnée historique n’est supprimée, déplacée ou réécrite par ce réglage.

BASE
- Reprise intégrale de la V147.78 avec dashboard Contrôle ménage.
- Version/cache passés en V147.79.
```

---

## LIRE_MOI_V147_79.txt

```text
Pilotage Service Technique — V147.79 — 21/08/2026

Base : V147.78 complète avec dashboard Contrôle ménage.

NOUVEAU
À chaque ouverture, l’application se recale automatiquement sur la date du jour et sur l’année scolaire correspondant à cette date.
Règle utilisée : 1er septembre → 31 août.
Les données historiques sont conservées.

Installation GitHub : remplacer les fichiers présents par ceux de ce ZIP, en conservant également les fichiers externes déjà présents dans le dépôt et non contenus dans cette base.
```

---

## CHANGEMENTS_V147_80.txt

```text
Pilotage Service Technique — V147.80 — 21/08/2026

ANNÉE SCOLAIRE PILOTÉE PAR LE TABLEAU DE BORD
- Le sélecteur « Année scolaire » du tableau de bord devient la référence unique de l’application.
- À l’ouverture, l’application se positionne automatiquement sur l’année scolaire correspondant à la date du jour (1er septembre → 31 août).
- Si l’utilisateur change l’année scolaire depuis le tableau de bord, tous les filtres temporels et vues de l’application sont resynchronisés sur cette année.
- Le changement déclenche le rafraîchissement global des modules et rapports.
- Le champ « Année scolaire » des paramètres devient informatif/lecture seule afin d’éviter deux réglages contradictoires.
- La valeur active reste inscrite dans les réglages internes pour compatibilité avec les exports, archives, imports et synchronisation Supabase.
- Aucune donnée des autres années scolaires n’est supprimée.

BASE
- Reprend intégralement la V147.79 et son dashboard Contrôle ménage.
- Version/cache : 147.80.
```

---

## LIRE_MOI_V147_80.txt

```text
PILOTAGE SERVICE TECHNIQUE — V147.80

Le sélecteur « Année scolaire » présent sur le tableau de bord est désormais le sélecteur principal de toute l’application.

Au démarrage : année scolaire de la date du jour.
Après sélection dans le dashboard : cette année devient immédiatement le contexte actif pour les vues, filtres, rapports, historiques et nouveaux enregistrements qui utilisent l’année scolaire active.

Le champ Année scolaire des Paramètres est volontairement en lecture seule pour éviter un réglage différent de celui du tableau de bord.
```

---

## CHANGEMENTS_V147_81.txt

```text
Pilotage Service Technique — V147.81 — audit global 21/08/2026

CORRECTIONS PRIORITAIRES
- Congé / RTT / Maladie / absences : une période hors de l'année scolaire active n'est plus acceptée silencieusement. L'application demande d'abord de basculer l'année scolaire du tableau de bord, afin d'éviter qu'une saisie apparaisse puis disparaisse des vues.
- Les journées saisies manuellement sont marquées comme source manuelle et rattachées à leur année scolaire réelle.
- Les horaires annuels ne proposent plus 2026-2027 en dur : leurs dates par défaut reprennent l'année scolaire active.
- L'import/export des horaires ne génère plus 2026-2027 en dur : il reprend l'année scolaire active.

AUDIT TECHNIQUE
- Syntaxe vérifiée sur tous les fichiers JavaScript présents dans le ZIP.
- Contrôle des identifiants HTML : aucun ID dupliqué.
- Contrôle des références locales du HTML effectué.

POINT IMPORTANT SUR LE DEPOT GITHUB
- Le paquet historique appelle toujours styles.css, supabase-config.js, notification-center.js, weather-waste.js, room-prep.js et assets/logo-service-technique.png.
- Ces fichiers ne sont pas tous présents dans les ZIP hérités. Ils doivent être conservés dans le dépôt GitHub pour que toutes les fonctions correspondantes restent disponibles.
```

---

## CHANGEMENTS_V147_82.txt

```text
Pilotage Service Technique — V147.82 — AUDIT COMPLET — 21/08/2026

CORRECTIONS PRIORITAIRES
- Congés / RTT / Maladie : priorité explicite aux saisies manuelles sur les imports Chronotime en cas d'ancien doublon.
- Les saisies Refusées / Annulées ne masquent plus le planning théorique dans les calendriers.
- Une saisie agent reçoit un horodatage de modification et son année scolaire réelle.
- Si Supabase ou Internet est momentanément indisponible, la saisie sensible est conservée localement et mise en attente de synchronisation au lieu d'être perdue.
- Le formulaire indique clairement quand l'enregistrement est local/en attente de synchronisation.

ANNEE SCOLAIRE = CONTEXTE MAITRE
- Au démarrage : date du jour + année scolaire correspondant au jour.
- Le sélecteur du dashboard reste libre ensuite.
- L'année choisie pilote aussi les listes Maintenance, Demandes direction, Chantiers/GPA, Notes, Documents, Vacances, Roulements et horaires annuels.
- Les vues mensuelles/journalières existantes restent navigables comme avant.
- Le dashboard filtre les indicateurs métier sur l'année scolaire choisie.
- Si une année historique est sélectionnée, le KPI de présence n'affiche pas faussement « présents aujourd'hui ».

COHERENCE DES FICHIERS
- Ajout du chemin assets/logo-service-technique.png réellement attendu par index.html et app.js.
- Cache des scripts/styles forcé en V147.82.
- Valeur initiale de l'année scolaire rendue dynamique au lieu d'être codée en dur sur 2026-2027.

AUDIT STATIQUE EFFECTUE
- Syntaxe de tous les fichiers JavaScript.
- Absence d'ID HTML dupliqué.
- Présence des fichiers locaux appelés par index.html.
- Contrôle des principaux formulaires CRUD et de leur câblage.
- Contrôle du flux saisie agent -> mémoire -> Supabase/local -> relecture -> rendu.
- Contrôle des filtres année/mois et des modules principaux.

LIMITATION DU TEST
- L'audit peut valider le code, les dépendances locales et les parcours programmatiques, mais ne peut pas simuler ici une authentification Supabase réelle ni garantir le comportement réseau du compte GitHub/Supabase sans exécution avec les identifiants de l'utilisateur.

CORRECTIONS SUPPLEMENTAIRES TROUVEES AU SECOND AUDIT
- Archives : correction du filtre qui comparait parfois une année scolaire (ex. 2025-2026) à une année civile (ex. 2025).
- Dashboard : urgences et retards filtrés sur l'année scolaire active.
- Les anciennes archives restent accessibles sans modification de leur contenu.
```

---

## LIRE_MOI_GITHUB_V147_82.txt

```text
V147.82 — PAQUET GITHUB ALLEGE

Ce dossier contient uniquement les fichiers nécessaires à la version V147.82 et les documents de contrôle utiles.
Il est volontairement inférieur à 100 fichiers pour permettre l'envoi depuis l'interface web GitHub.

IMPORTANT :
- Décompresser ce ZIP avant l'envoi sur GitHub.
- Envoyer le CONTENU du dossier, pas le ZIP lui-même.
- Conserver le dossier assets avec logo-service-technique.png à l'intérieur.
- Les anciens fichiers CHANGEMENTS déjà présents sur GitHub peuvent rester : ils n'empêchent pas l'application de fonctionner.
```

---

## RAPPORT_AUDIT_COMPLET_V147_82.txt

```text
RAPPORT D'AUDIT COMPLET — PILOTAGE SERVICE TECHNIQUE V147.82
Date : 21/08/2026
Base auditée : ZIP complet téléchargé depuis le dépôt GitHub service-Technique-2-main.

1. INTEGRITE DU DEPOT
- 109 fichiers dans le dépôt source ; 111 fichiers dans la version corrigée (ajout du chemin logo attendu + rapport d'audit).
- Tous les fichiers JavaScript présents passent le contrôle de syntaxe Node.js.
- Aucun identifiant HTML (id) dupliqué dans index.html.
- Toutes les ressources locales statiques appelées par index.html existent dans la version corrigée.
- Le chemin assets/logo-service-technique.png attendu par index.html et app.js existe maintenant réellement.

2. SAUVEGARDE / SUPABASE
- Vérification du flux principal : état en mémoire -> écriture Supabase -> relecture -> vérification -> remplacement de l'état local.
- Les formulaires sensibles utilisent une relecture de contrôle après écriture.
- Correction : en l'absence d'Internet/Supabase, une saisie sensible est conservée localement et mise en attente de synchronisation au lieu d'être considérée comme perdue.
- Les erreurs réseau restent visibles dans l'état de synchronisation.

3. PLANNING AGENTS / CONGES / RTT / MALADIE
- Vérification du formulaire de saisie planning, période Du/Au, type de journée, statut et remplacement.
- Vérification du stockage par jour ouvré pour une période d'absence.
- Correction : priorité aux saisies manuelles sur Chronotime quand un ancien doublon existe.
- Correction : une saisie Refusée ou Annulée ne masque plus le planning effectif.
- Ajout d'un updatedAt aux saisies manuelles.
- Vérification que l'année scolaire de chaque journée est calculée depuis sa date.
- En cas de sauvegarde hors ligne, le formulaire indique que la synchronisation est en attente.

4. ANNEE SCOLAIRE / DATES
- Au démarrage : année scolaire calculée automatiquement depuis la date du jour.
- La valeur initiale n'est plus figée sur 2026-2027.
- Le sélecteur du dashboard reste la source maître après ouverture.
- Navigation semaine/mois/jour conservée.
- Synchronisation des filtres mensuels et journaliers avec l'année sélectionnée lorsque la date courante est hors plage.
- Contrôle des roulements et horaires annuels sur l'année scolaire active.

5. VISUALISATION PILOTEE PAR L'ANNEE SCOLAIRE
- Maintenance : filtrée sur l'année active.
- Demandes direction : filtrées sur l'année active.
- Chantiers/GPA : filtrés sur l'année active.
- Notes : filtrées sur l'année active.
- Documents : filtrés sur l'année active.
- Vacances : périodes qui chevauchent l'année active.
- Roulements : périodes qui chevauchent l'année active.
- Horaires annuels : périodes qui chevauchent l'année active.
- Dashboard ménage : conserve ses filtres mensuels synchronisés avec l'année active.
- Dashboard principal : maintenance, ménage, notes, réunions, urgences et retards contextualisés sur l'année active.
- Archives : correction du mélange année civile / année scolaire.

6. MODULES CONTROLES
- Contrôle ménage : formulaire, historique par local, dashboard qualité et filtres toujours présents.
- Contrôles périodiques : catalogue et cartes conservés ; ce module reste volontairement transversal car un contrôle périodique peut avoir une échéance qui traverse plusieurs années scolaires.
- Imports PDF / Chronotime : modules présents et syntaxiquement valides.
- Room cleaning / room prep / notifications / météo-déchets / imports horaires : fichiers présents et syntaxiquement valides.

7. NAVIGATION / HTML / RESPONSIVE
- Navigation principale et navigation mobile présentes.
- Contrôle des boutons directs câblés depuis app.js vers index.html : les références absentes relevées correspondent aux champs créés dynamiquement dans les modales, pas à des boutons manquants du document principal.
- Aucun doublon d'id HTML détecté.

8. IMPRESSION / EXPORT
- Fonctions d'impression, rapports et exports toujours présentes.
- Les impressions utilisent l'année scolaire active dans les plannings.
- Les ressources logo utilisées par l'impression sont désormais disponibles par le chemin attendu.

9. LIMITES DE CE QUI PEUT ETRE CERTIFIE ICI
Cet audit est un audit complet du code livré, de ses dépendances locales, de ses liaisons statiques, de ses fonctions JavaScript et des parcours programmatiques identifiables. Il ne peut pas reproduire une vraie session utilisateur connectée au compte Supabase, ni provoquer les conditions réseau réelles d'un téléphone Android. La validation finale d'une écriture Supabase réelle nécessite donc un test dans l'application connectée. Le code a toutefois été modifié pour préserver les saisies localement en cas d'échec réseau.

RESULTAT
Version consolidée : V147.82 — AUDIT COMPLET.
Objectif : utiliser cette version comme nouvelle base de test, au lieu d'empiler de petites versions sur des ZIP incomplets.
```

---

## CHANGEMENTS_V147_83.txt

```text
Pilotage Service Technique — V147.83

- Ajout d’un encadré Informations / Motif dans la saisie d’une journée agent.
- Motif obligatoire pour RTT/congé/maladie/autre type, ajout/retrait d’heures ou horaire réel saisi.
- Icône ⓘ dans le planning pour relire le motif d’une modification manuelle.
- Nouvel import Chronotime : comparaison avec les données actuelles de l’application.
- Chaque journée différente exige une décision : Garder actuel ou Appliquer Chronotime.
- Boutons Tout garder / Tout appliquer disponibles, mais chaque conflit doit être décidé avant validation.
- Les motifs manuels sont affichés dans l’écran de comparaison Chronotime.
- Une saisie manuelle conservée n’est jamais écrasée silencieusement.
- Si Chronotime est appliqué, la journée devient la nouvelle référence Chronotime.
```

---

## CHANGEMENTS_V147_85.txt

```text
V147.85 — Motif visible dans Personnel > Mon calendrier

- Lorsqu'un horaire réel diffère de l'horaire théorique, il apparaît dans Mon calendrier.
- Si la journée contient un motif / une information, celui-ci est affiché avec ⓘ sous l'horaire réel.
- Les jours sans changement d'horaire ne sont pas modifiés.
- Le motif reste conservé pour la comparaison Chronotime.
```

---

## CHANGEMENTS_V147_86.txt

```text
V147.86 — Nom de l'agent dans Personnel > Mon calendrier

- Lorsqu'un horaire réel diffère du théorique, le nom de l'agent est affiché avec l'horaire réel.
- Le motif / information affiche également le nom de l'agent avec l'icône ⓘ.
- Aucun changement visuel pour les journées sans modification d'horaire.
```

---

## CHANGEMENTS_V147_87.txt

```text
V147.87 — Correction bouton Enregistrer

- Correction du blocage du bouton Enregistrer dans la saisie planning agent.
- Le champ « Informations / Motif » reste disponible et enregistré.
- Le motif n'est plus obligatoire : un champ vide ne bloque plus Congé, RTT, Maladie, Présence ou changement d'horaire.
- Les motifs renseignés restent visibles dans Personnel > Mon calendrier et dans les comparaisons Chronotime.
- Vérification de syntaxe de tous les fichiers JavaScript incluse.
```

---

## CHANGEMENTS_V147_88.txt

```text
V147.88 — Correction des modifications manuelles agents

- Une saisie manuelle n'est plus écrasée par Chronotime après sauvegarde.
- La protection inclut Présence + horaire réel, heures ajoutées/retirées, RTT, congés, maladie.
- Chronotime ne remplace une correction manuelle qu'après validation explicite dans l'écran des différences.
- Après enregistrement, les vues Planning, Absences, Personnel > Mon calendrier et Agents sont rafraîchies.
```

---

## RAPPORT_AUDIT_V147_89.txt

```text
AUDIT V147.89 — Cohérence formulaire agent / affichages / impressions

Vérifié et corrigé :
- Saisie manuelle agent : type, dates, statut, théorique, réel, pause, heures +/-, remplacement, motif.
- Priorité des saisies manuelles sur la reconstruction Chronotime.
- Planning principal : utilise l'horaire réel uniquement lorsqu'il diffère du théorique.
- Personnel > Mon calendrier : horaire réel différent + nom agent + motif.
- Rapport journalier : horaire applicable + motif.
- Rapport hebdomadaire : horaire applicable + motif.
- Planning collectif imprimable : utilise désormais planningDisplayFor, donc l'horaire réel différent.
- Planning individuel imprimable : affiche Réel + Théorique lorsqu'ils diffèrent, et Observation/motif.
- Rapport absences : motif/note déjà présent.
- Export Excel agentDays : prévu, réel, pause, heures +/-, statut et note déjà présents.
- Rapport équipe : les calculs Réalisé/Écart utilisent dayHours(dayInfo), donc le réel est pris en compte.

Contrôles techniques :
- Syntaxe de tous les fichiers JavaScript.
- Cohérence des fonctions de rendu et des générateurs d'impression liés au personnel.

Limite :
- La connexion Supabase réelle et l'impression physique depuis le navigateur/téléphone ne peuvent pas être reproduites dans cet environnement ; le code de sauvegarde/relecture et les générateurs d'impression ont été contrôlés statiquement.
```

---

## CHANGEMENTS_V147_90.txt

```text
V147.90 — Sécurisation bouton Enregistrer du planning agent

- Le bouton Enregistrer ne dépend plus de la réponse Supabase.
- La saisie est écrite localement immédiatement, puis affichée dans l'application.
- Le formulaire se ferme immédiatement après validation locale.
- Supabase est synchronisé ensuite en tâche différée.
- En cas de problème réseau/Supabase, la modification reste conservée localement.
- Les vues Planning, Absences, Personnel > Mon calendrier et Agents sont rafraîchies immédiatement.
- Les corrections Chronotime de V147.88/V147.89 restent conservées.
```

---

## CHANGEMENTS_V147_91.txt

```text
V147.91 — Réinitialisation de l'horaire réel

- Ajout d'un bouton « Réinitialiser l'horaire réel » dans le formulaire agent.
- Le bouton efface uniquement l'arrivée réelle, le départ réel et remet les heures +/- à 0.
- Après Enregistrer, le planning revient automatiquement à l'horaire théorique pour cette date.
- Les autres informations de la journée (type, statut, remplacement, etc.) restent conservées.
- La sauvegarde locale immédiate de la V147.90 est conservée.
```

---

## CHANGEMENTS_V147_92.txt

```text
V147.92 — Récapitulatif des modifications dans Archives

- Ajout dans Archives d'un bloc « Récapitulatif de mes modifications ».
- Affiche date/heure de modification, date concernée, saisie/agent, champ, ancienne valeur, nouvelle valeur et utilisateur.
- Filtre par année scolaire et recherche libre.
- L'année scolaire active est sélectionnée par défaut.
- L'historique des modifications reste conservé localement et marqué à synchroniser.
- Les fonctions de V147.91 (réinitialisation horaire réel, retour théorique, sauvegarde immédiate) sont conservées.
```

---

## CHANGEMENTS_V147_93.txt

```text
V147.93 — Historique allégé
- Les suppressions ne sont pas affichées dans Archives > Récapitulatif de mes modifications.
- Lorsqu'une saisie planning agent est supprimée, les traces de modification liées à cette saisie/date sont retirées du récapitulatif.
- Aucune ligne « Suppression » n'est ajoutée.
- Les modifications encore existantes restent consultables normalement.
```

---

## CHANGEMENTS_V147_94.txt

```text
V147.94 — Nom de l'agent dans l'historique Archives

- Le récapitulatif des modifications affiche maintenant clairement le nom de l'agent.
- Les nouvelles modifications enregistrent agentId + nom de l'agent dans l'historique.
- Les anciennes modifications sont également relues autant que possible à partir de l'identifiant ou du titre existant.
- Les suppressions restent exclues du récapitulatif.
```

---

## CHANGEMENTS_V147_95.txt

```text
V147.95 — Historique global des modifications

Archives > Récapitulatif de mes modifications :
- 8 colonnes : Date/heure modification, Type, Date concernée, Élément concerné, Champ modifié, Avant, Après, Utilisateur.
- Types suivis : Agents, Interventions, Contrôles ménage, Demandes.
- Filtre Type + année scolaire + recherche libre.
- Les nouvelles modifications stockent explicitement leur type et l'élément concerné.
- Les anciennes lignes restent relues avec compatibilité autant que possible.
- Les suppressions restent exclues.
- Les créations ne sont pas ajoutées à l'historique pour éviter de l'alourdir ; seules les modifications/corrections sont suivies.
```

---

## CHANGEMENTS_V147_96.txt

```text
V147.96 — Correction définitive du nom des agents dans l'historique

- Correction de agentById : comparaison des identifiants en texte pour retrouver l'agent même si l'ID vient d'un formulaire HTML.
- Archives > Récapitulatif : pour Type = Agent, le nom complet est désormais prioritaire dans « Élément concerné ».
- Les anciennes lignes d'historique peuvent également récupérer le nom à partir de agentId.
- Aucun changement aux règles sur les suppressions.
```

---

## CHANGEMENTS_V147_97.txt

```text
V147.97 — Libellé concret dans l'historique
- « Modification d’une donnée passée » n'est plus utilisé comme élément concerné.
- Agent : nom complet.
- Intervention : numéro + titre.
- Demande : numéro + objet.
- Contrôle ménage : numéro + lieu/local.
- Compatibilité avec les anciennes lignes quand une information concrète est récupérable.
```

---

## CHANGEMENTS_V147_98.txt

```text
V147.98 — Impression filtrée de l'historique

- Ajout d'un bouton Imprimer dans Archives > Récapitulatif de mes modifications.
- L'impression reprend exactement les filtres actifs :
  * année scolaire,
  * type,
  * recherche.
- Impression en paysage avec les 8 colonnes du tableau.
- Les suppressions restent exclues.
- L'écran et l'impression utilisent désormais la même fonction de filtrage.
```

---

## RAPPORT_CORRECTION_HISTORIQUE_V147_99.txt

```text
V147.99 — Reconstruction réelle du tableau d'historique

CORRECTION DE FOND
- Les anciennes lignes « Modification d’une donnée passée » avaient perdu le contexte de la fiche à la fermeture du formulaire.
- Le tableau tente maintenant de reconstruire ces anciennes lignes en croisant :
  date concernée + champs modifiés + nouvelle valeur
  avec les journées agents, interventions, demandes et contrôles ménage existants.

NOUVELLES MODIFICATIONS
- Chaque nouvelle entrée d'historique stocke directement :
  type, recordId, numéro, titre, lieu, agentId et nom de l'agent.
- Le tableau n'a plus besoin de deviner l'élément concerné pour les nouvelles modifications.

AFFICHAGE
- Agent : nom complet.
- Intervention : numéro + titre.
- Demande : numéro + objet.
- Contrôle ménage : numéro + bâtiment/étage/local.
- Si une ancienne ligne ne peut réellement pas être identifiée sans ambiguïté, elle affiche « Élément à identifier » plutôt qu'un faux nom.

FILTRES / IMPRESSION
- Les filtres et l'impression continuent d'utiliser exactement les mêmes données du tableau.
```

---

## CHANGEMENTS_V147_100.txt

```text
V147.100 — Historique lisible cellule par cellule

RÈGLE
Chaque cellule du tableau doit apporter une information métier compréhensible.

AMÉLIORATIONS
- Les champs techniques sont traduits en libellés humains.
- Les valeurs vides affichent « Non renseigné » au lieu d'un tiret incompréhensible.
- Les dates sont affichées au format français.
- Les pauses sont affichées en minutes.
- Les écarts d'heures sont affichés avec unité et signe (+1 h / -0,5 h).
- Les identifiants agents sont remplacés par les noms quand ils sont retrouvables.
- Pour les agents, début + fin d'horaire sont regroupés en une seule ligne :
  « Horaire réel : 06:00–14:45 → 07:00–16:00 »
  au lieu de deux lignes techniques séparées.
- Les lignes sans changement réel sont ignorées.
- Le tableau écran et l'impression utilisent exactement la même transformation.
- Les 8 colonnes restent : date/heure, type, date concernée, élément concerné,
  champ modifié, avant, après, utilisateur.
```

---

## CHANGEMENTS_V147_101.txt

```text
V147.101 — Correction déclenchement historique des horaires

CAUSE TROUVÉE
- La synchronisation Supabase du planning pouvait démarrer avant l'ajout de la ligne
  dans changeHistory.
- La relecture Supabase pouvait alors remplacer l'état local et faire disparaître
  l'historique qui venait d'être créé.

CORRECTION
- Enregistrer d'abord la journée.
- Ajouter immédiatement la modification à l'historique.
- Écrire le miroir local / file de synchronisation.
- Synchroniser Supabase seulement après.
- Si Archives est affiché, le tableau est rafraîchi immédiatement.

RÉSULTAT ATTENDU
- Toute modification réelle d'un horaire existant apparaît dès Enregistrer dans
  Archives > Récapitulatif de mes modifications.
```

---

## CHANGEMENTS_V147_102.txt

```text
V147.102 — Historique agent fiable

CORRECTIONS
- Une modification de journée agent est inscrite directement dans changeHistory
  avant fermeture du formulaire et avant toute synchronisation Supabase.
- Le nom complet de l'agent est stocké directement, pas déduit après coup.
- Les anciennes valeurs « Agent concerné » / « Élément à identifier » sont désormais
  considérées comme des placeholders et peuvent être reconstruites depuis les données existantes.
- Pour un nouvel horaire réel, la colonne Avant utilise l'horaire théorique comme référence.
- Réinitialiser l'horaire réel n'ajoute pas de trace de suppression et retire l'ancienne trace horaire.
- L'audit générique est désactivé pour le formulaire journée agent afin d'éviter les doublons.

RÉSULTAT ATTENDU
Agent | 10/08/2026 | Mme Tarrio | Horaire réel | 06:00–14:45 | 07:00–16:00
```

---

## CHANGEMENTS_V147_103.txt

```text
V147.103 — Nettoyage définitif de l'historique

- Les lignes anciennes impossibles à identifier (Agent concerné, Élément à identifier,
  Information, Autre) ne sont plus affichées.
- Les années scolaires du filtre sont calculées uniquement à partir de lignes exploitables.
- Les nouvelles modifications sont marquées historyVersion 2 et doivent contenir
  un élément concret.
- Ajout d'un bouton « Nettoyer les anciennes lignes » qui supprime définitivement
  uniquement les anciennes traces illisibles.
- Les interventions/demandes/contrôles anciens déjà identifiables sont conservés.
- Les nouvelles modifications d'agent restent enregistrées directement avec le nom complet.
```

---

## CHANGEMENTS_V147_104.txt

```text
V147.104 — Historique protégé contre la synchronisation Supabase

PROBLÈME
Une modification apparaissait dans Archives puis pouvait disparaître après la relecture serveur.

CORRECTION
- changeHistory est maintenant fusionné par identifiant à chaque relecture Supabase.
- Une ligne locale récente ne peut plus être supprimée par un état serveur plus ancien.
- persistStateDirect conserve un instantané de l'historique avant écriture et le restaure après relecture.
- Si Supabase renvoie un état sans une ligne locale, l'application répare immédiatement l'état serveur.
- cloudSaveNow fusionne explicitement les historiques local et distant.
- Le polling Supabase préserve également l'historique local lors d'une actualisation distante.

RÉSULTAT
Une ligne qui apparaît dans Archives après Enregistrer doit y rester après synchronisation.
```

---

## CHANGEMENTS_V147_105.txt

```text
V147.105 — Bouton Enregistrer sécurisé

- La sauvegarde du formulaire agent est désormais prioritaire sur l'historique.
- Une erreur dans l'historique ne peut plus bloquer le bouton Enregistrer.
- La journée est écrite localement d'abord.
- L'historique est ajouté ensuite dans un bloc isolé.
- Le miroir local est réécrit après l'historique afin de conserver les deux.
- La synchronisation Supabase reste différée.
- La préparation de l'audit générique est également protégée contre les erreurs.
```

---

## CHANGEMENTS_V147_106.txt

```text
V147.106 — Formulaire agent : bouton Enregistrer direct et réactivé à chaque ouverture.
```

---

## CHANGEMENTS_V147_107.txt

```text
V147.107 — Sauvegarde complète fiche agent
- Un seul circuit submit pour Enregistrer.
- Contrôle après écriture du type de journée, motif et horaires réels.
- Le formulaire ne confirme plus une sauvegarde incomplète.
```

---

## CHANGEMENTS_V147_108.txt

```text
V147.108 — Correctif bouton Enregistrer formulaire agent
- Retour sur la base V147.106 où le bouton fonctionnait.
- Aucun changement de la logique métier de sauvegarde.
- Suppression du conflit entre clic direct et soumission du formulaire.
- Le bouton est toujours réactivé après succès ou erreur.
- Les drapeaux d'enregistrement sont remis à zéro à chaque ouverture/fermeture.
```

---

## CHANGEMENTS_V147_109.txt

```text
V147.109 — Correction 0 jour enregistré.
Une date unique est toujours sauvegardée, y compris samedi/dimanche.
```

---

## RAPPORT_AUDIT_FORMULAIRE_AGENT_V147_110.txt

```text
V147.110 — Parcours complet formulaire agent corrigé

CAUSES TROUVÉES
1. Le quadrillage hebdomadaire affichait toujours le théorique.
2. Après agentDays, le quadrillage hebdomadaire n'était pas rafraîchi.

RÈGLES DÉSORMAIS APPLIQUÉES
- Congé / RTT / maladie / formation / repos : le type de journée est visible dans le quadrillage.
- Horaire réel différent : le quadrillage affiche « Réel » en premier et conserve le théorique dessous.
- Pas d'horaire réel ou horaire réel réinitialisé : retour immédiat à l'horaire théorique.
- Informations / Motif : visible avec ⓘ dans le quadrillage si saisie manuelle.
- Planning des horaires : distingue théorique et réel.
- Absences : relues depuis la même journée agent.
- Mon calendrier : continue d'utiliser l'horaire réel lorsqu'il est différent.
- Archives : l'historique direct du formulaire agent est conservé.
- Après Enregistrer : Planning + Absences + Quadrillage agents + Mon calendrier + Agents sont rafraîchis.
- Contrôle d'intégrité avant message de réussite : type de journée, horaire réel, motif et statut doivent être relus depuis agentDays.

RÉINITIALISATION HORAIRE RÉEL
- actualStart et actualEnd sont vidés.
- la journée manuelle est conservée.
- le quadrillage revient sur le théorique.
- aucune fausse trace de suppression n'est ajoutée.
```

---

## CHANGEMENTS_V147_111.txt

```text
V147.111 — Priorité absolue aux saisies manuelles agents

- Une saisie manuelle gagne toujours sur Chronotime pour le même agent et la même date.
- Entre deux saisies manuelles, la plus récente gagne.
- La relecture Supabase, le polling, la sauvegarde cloud et le hors-ligne fusionnent désormais agentDays au lieu d'écraser la saisie locale.
- Chronotime ne crée/reprend plus une journée si une saisie manuelle existe déjà.
- Présence, Congé, RTT, horaires réels et réinitialisation des horaires réels restent donc stables après synchronisation.
```

---

## RAPPORT_STABILISATION_V147_112.txt

```text
V147.112 STABLE — Verrouillage du comportement pour tous les agents

- La logique déjà validée est appliquée de manière générique à chaque agent via son identifiant.
- Pour un même agent + une même date : un seul état effectif.
- Saisie manuelle > Chronotime.
- Entre deux saisies manuelles : la plus récente gagne.
- Présence / Congé / RTT / Maladie / Formation / Repos : la dernière saisie enregistrée reste affichée.
- Horaire réel différent : il reste affiché après relecture/synchronisation.
- Réinitialisation horaire réel : le réel reste vide et l'affichage revient au théorique.
- Stabilisation après formulaire, migration/relecture, Chronotime et polling Supabase.
- Les données et noms d'agents existants ne sont pas modifiés.
```

---

## RAPPORT_STABILISATION_INTERVENTIONS_V147_113.txt

```text
V147.113 STABLE — Création et modification des interventions

RÈGLE
- Une intervention créée ou modifiée dans le formulaire devient immédiatement la version de référence.
- La version locale la plus récente gagne en cas de conflit avec une ancienne version Supabase.
- Une relecture serveur, le polling automatique, un retour réseau ou un redémarrage ne doit pas restaurer une ancienne intervention.

CRÉATION
- id conservé,
- createdAt créé une seule fois,
- updatedAt actualisé,
- affichage immédiat dans le tableau,
- sauvegarde locale,
- synchronisation Supabase,
- relecture et vérification de tous les champs.

MODIFICATION
- updatedAt actualisé à chaque Enregistrer,
- la dernière modification gagne,
- affichage immédiatement rafraîchi,
- vérification après relecture Supabase.

ARCHIVES
- Les modifications d'intervention continuent d'alimenter le récapitulatif Avant / Après.
- Les créations ne sont pas ajoutées à l'historique, conformément à la règle déjà validée pour garder Archives lisible.

PROTECTION APPLIQUÉE À
- persistStateDirect,
- cloudSaveNow,
- polling Supabase,
- reprise hors-ligne,
- migration/rechargement.
```

---

## RAPPORT_STABILISATION_GLOBALE_V147_114.txt

```text
V147.114 STABLE — Tous les formulaires métier

La règle de stabilité est généralisée à :
- Demandes
- Chantiers
- Réunions
- Notes
- Sécurité / incidents
- Contrôles périodiques
- Contrôles ménage
- Vacances / fermetures
- Agenda / événements personnels
- Documents
- Agents
- Roulements
- Plannings hebdomadaires
- Locaux / espaces

Principe commun :
1. Enregistrer localement immédiatement.
2. Afficher la modification immédiatement.
3. Horodater createdAt / updatedAt.
4. La dernière version locale gagne en cas de conflit avec une ancienne version distante.
5. Synchroniser Supabase.
6. Relire et vérifier la fiche.
7. Polling / reconnexion / redémarrage ne doivent pas restaurer une ancienne valeur.

Les règles spécifiques déjà stabilisées restent intactes :
- agentDays : saisie manuelle > Chronotime ;
- interventions : dernière modification locale > ancienne version serveur.

Archives :
- les modifications déjà auditées continuent à être tracées ;
- les créations restent hors historique pour ne pas l'alourdir.
```

---

## CHANGEMENTS_V147_115.txt

```text
V147.115 — État de synchronisation fiable

- Les sauvegardes de fond save(false) n'affichent plus « Envoi au serveur… ».
- Seules les synchronisations visibles lancées au premier plan affichent l'état loading.
- Après succès : affichage forcé « Synchronisé à HH:MM ».
- Si une synchronisation reste bloquée plus de 18 secondes :
  * données encore en attente -> « Synchronisation en attente »
  * aucune donnée en attente -> « Synchronisé à HH:MM »
- Le polling, Chronotime et les sauvegardes de fond ne peuvent plus écraser l'état vert avec un faux « Envoi au serveur… ».
```

---

## RAPPORT_SUPPRESSIONS_V147_116.txt

```text
V147.116 — Suppressions persistantes

PROBLÈME CORRIGÉ
- Une suppression (notamment contrôle périodique) disparaissait à l'écran puis pouvait revenir
  après fusion/relecture Supabase, car l'absence locale n'était pas mémorisée comme suppression.

NOUVELLE RÈGLE
- Toute suppression crée un tombstone persistant : collection + id + date de suppression.
- Les fusions Supabase/polling/hors-ligne filtrent les enregistrements marqués supprimés.
- Une ancienne copie distante ne peut plus recréer un élément supprimé.

APPLIQUÉ À
- contrôles périodiques,
- ménage,
- demandes,
- chantiers,
- réunions,
- notes,
- sécurité,
- vacances,
- agenda,
- documents,
- agents,
- roulements,
- plannings hebdomadaires,
- locaux/espaces.

La suppression n'est toujours pas ajoutée dans le tableau d'historique Archives, conformément à la règle validée.
```

---

## RAPPORT_CORRECTION_SUPPRESSION_V147_117.txt

```text
V147.117 — Suppression contrôles périodiques + faux mode local corrigés

CAUSES TROUVÉES
1. persistNow interprétait cloudBusy comme un échec et renvoyait offline=true, même avec le Wi‑Fi.
2. Une sauvegarde Supabase déjà démarrée avant la suppression pouvait finir après elle et réinjecter l'ancienne liste.

CORRECTIONS
- Wi‑Fi présent + synchro déjà en cours = attente, jamais « hors ligne ».
- Le contrôle est supprimé et l'écran périodique est rafraîchi AVANT le serveur.
- Une marque de suppression est conservée localement.
- Toutes les fins de sauvegarde/rerelecture réappliquent les marques de suppression actuelles.
- La suppression attend la fin d'une ancienne synchro puis utilise persistStateDirect.
- Vérification serveur : l'ID doit être absent ET présent dans deletedRecords.
- Le polling ne peut plus réinjecter un contrôle supprimé.

RÉSULTAT ATTENDU
- Cliquer Supprimer : le contrôle disparaît immédiatement.
- Avec Internet : « contrôle supprimé et synchronisé ».
- Si le serveur est momentanément occupé : il reste supprimé et affiche seulement « synchronisation en attente ».
```

---

## RAPPORT_SYNC_SEMI_AUTO_V147_119.txt

```text
V147.123 — Mode offline-first + synchronisation semi-automatique

OBJECTIF
Utilisation dans les bâtiments sans réseau, puis synchronisation lisible et vérifiable dès le retour d'Internet.

TABLEAU DE BORD
- LED ROUGE : pas de réseau ou Supabase non confirmé.
- LED ORANGE : données locales en attente ou synchronisation en cours.
- LED VERTE : Supabase est joignable et aucune donnée locale n'attend de synchronisation.
- Heure de dernière confirmation Supabase affichée.
- Bouton « Synchroniser maintenant ».

FONCTIONNEMENT
- Sans réseau : toutes les saisies restent locales et l'application continue de fonctionner.
- Retour du réseau : la synchronisation automatique existante est conservée.
- Le bouton permet de forcer l'envoi et la vérification à tout moment.
- La LED ne passe au vert qu'après confirmation réelle de Supabase et absence de données locales en attente.
- Le simple fait d'avoir du Wi-Fi ne suffit pas à afficher vert : Supabase doit réellement répondre.

SUPPRESSIONS / MODIFICATIONS / CRÉATIONS
- Restent offline-first : local d'abord, synchronisation ensuite.
- Les protections déjà ajoutées contre les retours arrière Supabase sont conservées.
```

---

## RAPPORT_SYNC_AUTO_V147_120.txt

```text
V147.123 — Synchronisation automatique Wi‑Fi / 4G / 5G

- Hors réseau : fonctionnement local, LED rouge.
- Dès qu'Internet revient en Wi‑Fi, 4G ou 5G : tentative de synchronisation automatique.
- Pendant l'envoi : LED orange.
- Après confirmation Supabase et zéro donnée en attente : LED verte.
- Bouton « Synchroniser maintenant » conservé en secours.
- Déclenchement aussi au retour de l'application au premier plan et à l'ouverture si Internet est déjà présent.
```

---

## RAPPORT_DIAGNOSTIC_SUPABASE_V147_121.txt

```text
V147.123 — Correction de la boucle réelle de synchronisation Supabase

CAUSE IDENTIFIÉE DANS LE CODE
Après chaque synchronisation réussie, l'application déclenchait l'événement pst:data-loaded.
Ce gestionnaire reconstruisait les pastilles Chronotime puis exécutait save(false) si n>0.
Or save(false) remet systématiquement localDirty=true.
Résultat possible :
  Supabase OK -> localDirty=false -> pst:data-loaded -> save(false) -> localDirty=true
Donc l'application pouvait rester orange / en attente et ne jamais tenir au vert.

CORRECTION
- pst:data-loaded ne déclenche plus de nouvelle sauvegarde cloud.
- Les pastilles reconstruites sont seulement conservées dans le miroir local.
- Une lecture Supabase réussie compte maintenant comme confirmation réelle.
- Une réponse Supabase valide sans ligne app_state n'est plus traitée comme une panne réseau.
- En cas de vraie erreur Supabase, le tableau de bord affiche désormais le message d'erreur exact.

RÈGLE LED
Rouge : hors connexion ou vraie erreur Supabase.
Orange : données locales réellement en attente / envoi en cours.
Vert : Supabase a répondu et localDirty + file offline sont vides.
```

---

## RAPPORT_LED_SUPABASE_V147_122.txt

```text
V147.123 — Voyant Supabase : orange persistant corrigé

- Le voyant distingue maintenant exactement :
  * localDirty = vraie modification locale non confirmée ;
  * offline pending = file hors-ligne encore présente ;
  * cloudBusy = synchronisation réellement en cours.
- Une file hors-ligne plus ancienne qu'une confirmation Supabase réussie est automatiquement considérée comme obsolète et nettoyée.
- Après une confirmation Supabase réussie, le voyant est recalculé après libération des états busy.
- Si le voyant reste orange, le texte sous la LED indique maintenant la cause exacte :
  « modification locale non confirmée » ou « file hors-ligne encore présente ».
- Vert = Supabase confirmé + aucune vraie donnée locale en attente.
```

---

## RAPPORT_LED_ORANGE_V147_123.txt

```text
V147.123 — Correction cause réelle du voyant orange permanent

CAUSE TROUVÉE
Le formulaire était d'abord synchronisé avec Supabase.
Ensuite seulement, le gestionnaire générique ajoutait la modification dans Archives via pushModificationHistory().
pushModificationHistory() mettait localDirty=true et écrivait une nouvelle file hors-ligne.
Cette nouvelle écriture arrivait APRÈS la synchronisation réussie et pouvait donc maintenir la LED orange.

CORRECTION
- Après création de l'historique d'une modification de formulaire, une deuxième confirmation Supabase est effectuée automatiquement.
- Les historiques créés hors formulaire déclenchent aussi une synchronisation automatique si Internet est présent.
- Après persistNow réussi : localDirty=false, file offline supprimée, confirmation Supabase horodatée.
- Si le voyant reste orange, l'heure exacte de la file locale est affichée pour diagnostic.

RÉSULTAT ATTENDU
Formulaire modifié -> fiche Supabase -> historique Archives -> historique Supabase -> aucune file locale -> LED VERTE.
```

---

## CHANGEMENTS_V147_125_ONEDRIVE_PERIODIQUE.txt

```text
V147.125 — Correctif ciblé OneDrive / Contrôles périodiques

PÉRIMÈTRE STRICT :
- aucun changement de synchronisation ;
- aucun changement agents / planning ;
- aucun changement ménage ;
- aucun changement interventions ;
- aucun autre formulaire modifié.

UNIQUEMENT :
1. Ajout du champ « Lien OneDrive » dans le formulaire Contrôle périodique.
2. Le lien existant importé est repris automatiquement dans ce champ.
3. Enregistrer un nouveau lien crée l'association OneDrive avec le contrôle.
4. Modifier le lien remplace l'URL de l'association existante.
5. La carte du contrôle périodique affiche le ou les boutons ☁️ OneDrive.
6. Un lien stocké directement dans la fiche reste affichable même si l'index OneDrive associé manque.
```

---

## CHANGEMENTS_V147_126_ZERO_HEURE.txt

```text
V147.126 — Correctif ciblé écart 0 h

SEULE RÈGLE MODIFIÉE
- Si les heures comptabilisées d'une journée sont à 0 h, l'écart affiché est 0 h.
- Le théorique reste visible mais n'est plus déduit.
- Le total mensuel des écarts utilise la même règle.

EXEMPLES
- Congé avec 5 h théoriques et 0 h comptabilisées : écart 0 h (au lieu de -5 h).
- RTT avec 5 h théoriques et 0 h comptabilisées : écart 0 h.
- Présence avec 6 h réalisées pour 5 h théoriques : écart +1 h.
- Présence avec 4 h réalisées pour 5 h théoriques : écart -1 h.

AUCUN AUTRE MODULE MODIFIÉ.
```

---

## CHANGEMENTS_V147_127_HORAIRES_THEORIQUES.txt

```text
V147.127 — Horaires théoriques sans doublons + suppression réparée

PÉRIMÈTRE STRICT
Uniquement gestion des horaires théoriques. Le reste de la V147.126 est conservé.

RÈGLES
1. Pour un agent donné, une date ne peut appartenir qu'à UN SEUL horaire théorique.
2. Si une nouvelle période chevauche une période existante :
   - l'application affiche les périodes concernées ;
   - elle demande l'autorisation de remplacer ;
   - Refuser = aucune modification ;
   - Accepter = seule la partie chevauchée est remplacée.
3. Si une nouvelle période se trouve au milieu d'une ancienne :
   - l'ancienne est automatiquement découpée en partie avant + partie après ;
   - aucune date ne contient deux horaires.
4. Même contrôle lorsque l'horaire standard est modifié depuis la fiche Agent.
5. Suppression :
   - bouton Supprimer réparé dans le formulaire Horaire théorique ;
   - bouton Supprimer ajouté dans l'historique Standard de la fiche Agent ;
   - suppression locale immédiate ;
   - raccourci standard de l'agent recalculé ;
   - synchronisation/confirmation Supabase.
6. Après enregistrement, contrôle supplémentaire qu'aucun chevauchement ne subsiste.

CONSERVÉ
- OneDrive contrôles périodiques ;
- règle 0 h = aucune déduction ;
- synchronisation existante ;
- tous les autres modules.
```

---

## CHANGEMENTS_V147_128_NETTOYAGE_THEORIQUES.txt

```text
V147.128 — Nettoyage définitif des doublons d'horaires théoriques

- Le bouton Supprimer reste relié à une vraie suppression du planning théorique.
- Les anciens horaires théoriques déjà en doublon/chevauchement sont nettoyés.
- Pour un même agent, une date ne peut rester couverte que par un seul planning théorique.
- En cas de chevauchement existant, la période la plus récente/prioritaire est conservée.
- Les anciennes périodes sont découpées avant/après si nécessaire au lieu de supprimer des dates non concernées.
- Après suppression et après création/modification, un contrôle anti-chevauchement est relancé.
- Le nettoyage est synchronisé automatiquement avec Supabase lorsqu'Internet est disponible.
- Aucun autre module n'est modifié.
```

---

## CHANGEMENTS_V147_129_REALISE.txt

```text
V147.129 — Affichage Réalisé dans Pilotage des horaires

MODIFICATION UNIQUE
La colonne « Réalisé » affiche désormais TOUJOURS le nombre d'heures comptabilisées pour la journée.

- aucune information particulière : Réalisé = Théorique ;
- horaire réel saisi : Réalisé = durée réellement saisie ;
- Congé / RTT à 0 h : Réalisé = 0 h ;
- Maladie : Réalisé = 7 h ;
- l'Écart reste calculé séparément ;
- les horaires réels différents restent affichés avec leur plage horaire.

AUCUNE AUTRE LOGIQUE MODIFIÉE.
Les règles de calcul existantes, Supabase, doublons théoriques, OneDrive et tous les autres modules sont conservés.
```

---

## CHANGEMENTS_V147_130_MALADIE_ZERO_ECART.txt

```text
V147.130 — Maladie = 7 h réalisées, 0 h d'écart

MODIFICATION UNIQUE
- Une journée « Maladie » compte 7 h dans la colonne Réalisé.
- Une journée « Maladie » génère toujours 0 h d'écart.
- Les 7 h ne sont jamais ajoutées à l'horaire théorique : elles représentent le total de la journée.

EXEMPLE
Théorique 5 h + Maladie :
Prévu = 5 h
Réalisé = 7 h
Écart = 0 h

CONSERVÉ
- Congé/RTT à 0 h : écart 0 h.
- Présence sans modification : Réalisé = Théorique.
- Horaire réel différent : écart normal.
- Tableau Réalisé de V147.129.
- OneDrive contrôles périodiques.
- Nettoyage doublons horaires théoriques.
- Aucun calcul entre deux dates ajouté.
```

---

## CHANGEMENTS_V147_131_FORMULAIRES_AGENTS.txt

```text
V147.131 — FORMULAIRES AGENTS STABILISÉS

PROBLÈME RACINE CORRIGÉ
Une synchronisation cloud ancienne pouvait être encore en cours lorsqu'un formulaire Agent
était enregistré. Sa réponse pouvait ensuite remplacer l'état local par une copie plus ancienne,
d'où : la saisie apparaît → disparaît → revient / ou revient à l'ancien statut.

CORRECTIONS
- Toutes les écritures directes sont maintenant sérialisées avec le même verrou cloud.
- Un formulaire Agent attend la fin d'une synchro précédente avant d'écrire.
- Une réponse Supabase ancienne ne peut plus écraser une saisie locale faite pendant la requête.
- Avant tout remplacement de db, les agentDays locaux les plus récents sont fusionnés.
- Si une deuxième saisie est faite pendant un envoi, elle reste locale et repart automatiquement après.
- La vérification d'un jour Agent se fait par agent + date + contenu manuel, pas uniquement par ID généré.
- La suppression d'une saisie/période Agent utilise désormais le même chemin vérifié Supabase.

FORMULAIRES / CAS CONTRÔLÉS
- Présence
- Congé / Congé annuel
- RTT
- Maladie
- Formation / Repos
- Horaire réel arrivée/départ
- Réinitialisation de l'horaire réel
- Heures ajoutées / retirées
- Motif / informations
- Périodes Du / Au
- Suppression d'une saisie/période
- Priorité saisie manuelle sur Chronotime
- Permanence et horaires Agent via le moteur de sauvegarde direct

INCHANGÉ
- Maladie = 7 h Réalisé, 0 h Écart.
- Journée à 0 h = pas de déduction.
- OneDrive contrôles périodiques.
- Tous les autres calculs métier.
```

---

## CHANGEMENTS_V147_132_FORMULAIRES_AGENTS.txt

```text
V147.132 — FORMULAIRES AGENTS : ENREGISTREMENT IMMÉDIAT + SYNCHRO NON BLOQUANTE

BASE
Repart de V147.130, car son bouton Enregistrer fonctionnait.

MODIFICATION CIBLÉE
- Le formulaire Agent enregistre d'abord localement.
- Le calendrier est mis à jour immédiatement.
- Le formulaire se ferme immédiatement après validation.
- Supabase est synchronisé ensuite en arrière-plan.
- La relecture Supabase sert uniquement à vérifier.
- La relecture Supabase ne remplace JAMAIS db et ne peut donc plus faire clignoter/revenir l'ancien état.
- La vérification se fait par agent + date + contenu manuel, pas seulement par ID.
- Suppression d'une saisie/période : même logique local-first puis confirmation serveur.

CONSERVÉ
- Présence / Congé / RTT / Maladie / Formation / Repos.
- Horaire réel et réinitialisation.
- Maladie = 7 h Réalisé, 0 h Écart.
- 0 h = aucune déduction.
- Priorité saisie manuelle sur Chronotime.
- OneDrive contrôles périodiques.
- Tous les autres modules inchangés.
```

---

## CHANGEMENTS_V147_133.txt

```text
V147.133 — Import Chronotime
Les repères calendaires L1..L31, M1..M31, J1..J31, V1..V31, S1..S31 et D1..D31 sont ignorés comme codes métier.
Ils restent uniquement utilisés pour repérer les dates.
CA, RTT, RH, RFE et les durées (9h50, 9h20, 7h00, etc.) restent lus normalement.
Double protection : analyse du nouveau PDF + données Chronotime déjà stockées.
Le reste de V147.132 est conservé.
```

---

## CHANGEMENTS_V147_134_CURSEURS_STABLES.txt

```text
V147.134 — CURSEURS / BARRES DE DÉFILEMENT STABLES

MODIFICATION UNIQUE
- Tous les défilements internes de la vue active mémorisent scrollLeft ET scrollTop.
- Calendrier des agents : position horizontale et verticale conservée.
- Calendrier personnel : position conservée.
- Tableaux, listes, mois, roulements, absences et aperçus : position conservée.
- La position de la page elle-même est également mémorisée.
- Fonctionne après sauvegarde locale, rafraîchissement d'un formulaire et synchronisation Supabase.
- Fonctionne aussi quand un composant reconstruit directement son HTML.

AUCUNE LOGIQUE MÉTIER MODIFIÉE
- correction Chronotime V147.133 conservée ;
- formulaires agents V147.132 conservés ;
- maladie 7 h / écart 0 h conservée.
```

---

## CHANGEMENTS_V147_135.txt

```text
V147.135 — HORAIRES MAMESSIER/THELLY + ANALYSE IA + CONTRÔLE FORMULAIRES AGENTS

HORAIRES 2026-2027
Agents ciblés par nom : Mamessier et Thelly.
Deux profils, sans doublon :
- Matin
  Lundi à jeudi : 07:00–16:00, pause 10 min (12:00–12:10)
  Vendredi : 07:00–13:00, pause 0
- Soir
  Lundi, mardi, jeudi : 08:30–18:00, pause 10 min (12:00–12:10)
  Mercredi : 07:00–16:00, pause 10 min
  Vendredi : 13:00–18:00, pause 0
Période : 01/09/2026 au 31/08/2027.

FORMULAIRES AGENTS VÉRIFIÉS / RENFORCÉS
- Présence, Congé, RTT, Maladie.
- Horaire réel arrivée + départ.
- Réinitialisation horaire réel.
- Pause.
- Heures ajoutées / retirées.
- Remplacement.
- Motif / Informations.
- Période Du / Au.
- Source manuelle + priorité manuelle.
- Enregistrement local immédiat.
- Synchronisation Supabase en arrière-plan sans remplacement de db.
- Contrôle local étendu avant fermeture.
- Horaires réels et heures +/- : une seule journée, pour éviter une application silencieuse uniquement au premier jour.

ANALYSE IA PHOTO / PDF
- Photo manuscrite : IA en priorité.
- PDF : parseur métier existant + IA complémentaire.
- Zones incertaines signalées, jamais inventées volontairement.
- Validation humaine obligatoire avant enregistrement.
- OCR local conservé comme secours.
- Chronotime structuré reste prioritaire.
- L1/M1/D1 etc. restent ignorés comme codes métier.
- Clé OpenAI uniquement dans une Edge Function Supabase.

AUCUN AUTRE MODULE MÉTIER MODIFIÉ.
```

---

## CHANGEMENTS_V147_136_REFONTE_SYNC_SUPABASE.txt

```text
V147.136 — REFONTE GLOBALE SYNCHRONISATION SUPABASE

- Une file locale persistante reçoit les modifications.
- Chaque enregistrement reçoit une version et un horodatage.
- La dernière saisie locale reste prioritaire.
- Une réponse Supabase tardive ne peut plus écraser une valeur locale plus récente.
- Supabase confirme les modifications au lieu de réinjecter son état dans l'écran.
- Reprise automatique à la reconnexion + nouvelle tentative toutes les 12 secondes si nécessaire.
- Présence, congé, RTT, maladie, horaires réels, remise à zéro et suppressions utilisent le moteur central.
- Les formulaires génériques utilisent également ce moteur.
- Diagnostic séparé : session, lecture base, écriture base, Edge Function IA, mutations en attente.
- L'IA reste indépendante des formulaires métier.
- Horaires Mamessier/Thelly, Chronotime, curseurs et règles maladie conservés.
```

---

## CHANGEMENTS_V147_137_CONNEXIONS_TEMPS_REEL.txt

```text
V147.137 — CONNEXIONS EN TEMPS RÉEL

Le tableau de bord affiche maintenant 7 états séparés :
1. Internet
2. Session Supabase
3. Lecture Supabase
4. Écriture / synchronisation
5. File locale de modifications
6. Edge Function IA
7. OpenAI

Couleurs :
- vert = confirmé ;
- orange = en cours / en attente ;
- rouge = panne ou non joignable ;
- gris = pas encore contrôlé.

Fréquences :
- état local Internet/session/file : toutes les 2 secondes ;
- lecture Supabase + Edge Function : toutes les 10 secondes lorsque le tableau de bord est ouvert ;
- test réel OpenAI : au maximum une fois par minute pour éviter des appels inutiles ;
- bouton « Tester maintenant » : force tous les tests immédiatement.

IMPORTANT
Pour que Edge Function et OpenAI deviennent verts, redéployer la fonction
supabase/functions/analyze-document/index.ts de cette version.
Elle répond désormais au ping de diagnostic et peut tester réellement OpenAI.
```

---

## CHANGEMENTS_V147_138_REPARATION_EDGE_SYNC.txt

```text
V147.138 — RÉPARATION EDGE FUNCTION IA + SYNCHRO ORANGE

EDGE FUNCTION / IA
- L'appel IA essaie d'abord le SDK Supabase.
- Si le SDK échoue, l'application essaie automatiquement un appel HTTP direct authentifié.
- Les erreurs sont maintenant explicites :
  * fonction non déployée (404),
  * session expirée / refusée (401/403),
  * délai dépassé,
  * erreur serveur.
- Le diagnostic temps réel utilise le même mécanisme robuste.
- Le scanner est désormais IA OBLIGATOIRE : aucun OCR de secours.

ÉCRITURE / SYNCHRONISATION
- Le voyant ne reste plus orange simplement parce qu'un ancien flag "busy" est resté bloqué.
- Si la file locale est vide, le voyant peut repasser au vert.
- Les flags dashboardSyncBusy/cloudBusy bloqués sont réinitialisés après délai lorsqu'il n'y a aucune mutation à envoyer.
- La file locale V147.136 reste la référence des modifications réellement en attente.

IMPORTANT POUR L'IA
Si le voyant indique maintenant « Edge Function analyze-document non déployée dans Supabase »,
il faut déployer le fichier :
supabase/functions/analyze-document/index.ts
La V147.138 permet justement de distinguer ce cas d'une vraie panne Internet/Supabase.
```

---

## CHANGEMENTS_V147_139_ENDPOINT_EDGE.txt

```text
V147.139 — CORRECTION ENDPOINT EDGE FUNCTION

- L'application appelle désormais le véritable slug Supabase : swift-function.
- Le nom affiché dans Supabase peut rester analyze-document : Supabase conserve le slug/endpoint d'origine swift-function après renommage.
- Les trois appels applicatifs concernés ont été corrigés : diagnostic temps réel, test Edge Function et analyse IA des documents.
- Aucun autre comportement métier n'a été modifié.
```

---

## CHANGEMENTS_V147_140_SYNC_INDICATEUR.txt

```text
V147.140 — CORRECTION ÉCRITURE / SYNCHRO

- La file centrale de mutations est désormais l'unique référence pour savoir s'il reste quelque chose à envoyer.
- Si la file locale est vide, localDirty et l'ancienne file offline résiduelle sont nettoyés.
- Le voyant Écriture / synchro passe au vert quand aucune mutation n'est en attente.
- Le voyant orange n'apparaît plus pour une "modification fantôme".
- Lecture Supabase reste indépendante : si elle est lente ou en erreur, cela ne fabrique plus artificiellement une écriture en attente.
- Endpoint IA swift-function conservé.
- Aucune règle métier modifiée.
```

---

## CHANGEMENTS_V147_141_RH_CONNEXIONS_HEURES.txt

```text
V147.141 — BASE V147.140

1. PROTOCOLE RH — AVERTISSEMENTS UNIQUEMENT
- Contrôles inspirés de la matrice entreprise : demi-journée 3h–5h59, journée >=6h, travail effectif >10h, amplitude >12h, pause méridienne 30 min si couverture intégrale 11h30–14h.
- Aucun contrôle RH ne bloque l'enregistrement.
- Les avertissements sont visibles dans la saisie des horaires et dans l'import Excel.

2. MATRICE IMPORT / EXPORT HORAIRES
- Export enrichi avec : plages 1/2, interruption non comptabilisée, type RH, temps effectif, amplitude, avertissement RH.
- Les contrôles Excel sont des WARNING et restent modifiables.
- Réimport des plages 1/2 et conservation des segments.
- Les doublons de fichier sont signalés ; Pilotage ne crée pas de doublon d'horaire.
- Code établissement non utilisé.

3. ONGLET CONNEXIONS
- Tous les panneaux/LED Internet, Supabase, synchro, Edge Function et IA ont été retirés du tableau de bord et regroupés dans un onglet Connexions.

4. HEURES ENTRE DEUX DATES
- Ajout dans Pilotage des horaires d'un calcul par agent entre deux dates.
- Affiche Réalisé, Prévu, Écart et nombre de jours comptabilisés.
- Utilise exactement dayInfo/dayHours, donc les règles déjà validées : horaire théorique par défaut, horaire réel, congés, maladie 7h/écart 0, Chronotime, heures +/-.

AUCUN AUTRE MODULE MÉTIER MODIFIÉ.
```

---

## CHANGEMENTS_V147_142_EXPORT_RH_DYNAMIQUE.txt

```text
V147.142 — EXPORT EXCEL : NON-CONFORMITÉS RH DYNAMIQUES

Base stricte : V147.141.

L'onglet "Horaires annuels" recalcule désormais automatiquement après toute modification :
Heure début/fin, Type RH, Temps effectif, Amplitude, Avertissement RH et Contrôle.

Les warnings RH affichent notamment :
- plages incomplètes ;
- ordre chronologique incorrect ;
- amplitude > 12 h ;
- temps effectif > 10 h ;
- durée < 3 h ;
- pause méridienne 30 min si l'horaire couvre 11h30–14h00 ;
- régime de pause pour une plage >= 6 h ;
- pause >= amplitude ;
- doublon agent / période / profil / jour ;
- horaire à compléter.

Toutes les non-conformités d'une même ligne peuvent apparaître ensemble.
WARNING uniquement : aucune restriction, aucun blocage.
Aucune autre logique du logiciel n'a été modifiée.
```

---

## CHANGEMENTS_V147_143_AFFICHAGE_HEURES_HHMM.txt

```text
V147.143 — AFFICHAGE DES HEURES EN HEURES / MINUTES

Base stricte : V147.142.

Objectif :
Les calculs internes restent en heures décimales pour ne modifier aucune règle métier,
mais toutes les durées affichées à l'utilisateur utilisent désormais le format heures/minutes.

Exemples :
- 9,08 h -> 9 h 05
- 6,25 h -> 6 h 15
- 185,67 h -> 185 h 40
- +1,33 h -> +1 h 20
- -0,58 h -> -0 h 35

Correction appliquée notamment à :
- Pilotage des horaires : Prévu, Réalisé, Écart, heures ajoutées ;
- calcul d'heures entre deux dates ;
- calendrier équipe et écarts ;
- cartes agents : temps hebdomadaire et heures supplémentaires ;
- historique des modifications ;
- messages / warnings RH ;
- comparaison des durées Chronotime.

Aucune donnée n'est convertie ou modifiée en base.
Aucune règle de calcul, congé, maladie, Chronotime, planning ou synchronisation n'a été changée.
```

---

## CHANGEMENTS_V147_144_AIDE_ANNEE_SCROLL.txt

```text
V147.144 — FAQ / ANNÉE SCOLAIRE GLOBALE / SCROLL PC

Base stricte : V147.143.

1. CENTRE D'AIDE / FAQ
- Nouvel onglet « FAQ / Aide ».
- Recherche en langage naturel sans API payante.
- Questions couvrant horaires, agents, absences, Chronotime, ménage, maintenance,
  contrôles périodiques, import/export, connexions, archivage et navigation.
- Chaque diagnostic présente : explication, points à vérifier et règle utilisée.
- Boutons de questions rapides et FAQ par thème.

2. ANNÉE SCOLAIRE
- Le sélecteur d'année scolaire quitte le seul tableau de bord.
- Il se trouve maintenant dans la barre du haut, au même niveau que « Requête Supabase ».
- Il reste visible dans tous les écrans.
- Les boutons année précédente / suivante sont conservés.
- La logique existante de filtrage par année n'est pas modifiée.

3. CURSEURS / BARRES DE DÉFILEMENT PC
- Suppression du window.scrollTo(0) forcé lors de la navigation.
- La position de page est mémorisée séparément pour chaque écran.
- Les positions des tableaux et zones défilables restent mémorisées pendant les rendus.
- Suppression du MutationObserver qui pouvait réimposer une ancienne position pendant le défilement.
- Restauration uniquement lors d'un rendu explicite.
- overflow-anchor désactivé sur PC dans les grandes zones dynamiques pour éviter les remontées automatiques.

Aucune règle métier de calcul, planning, congé, maladie, Chronotime, RH ou synchronisation n'a été changée.
```

---

## CHANGEMENTS_V147_145_ACTIVITE_AGENTS.txt

```text
V147.145 — JOURNAL D'ACTIVITÉ DES AGENTS

Base stricte : V147.144.

Nouveau module « Activité des agents »
- Trace le travail réellement effectué, qu'il soit prévu ou imprévu.
- Champs : agent, date, heure début/fin, type, travail réalisé, lieu, détail, résultat, commentaire.
- Exemples de tâches spontanées : débouchage, manutention, petite réparation, entretien courant.
- Une activité peut être liée à une intervention Maintenance ou à une Demande direction.
- Quand le travail lié est terminé, l'option de clôture met automatiquement :
  * l'intervention Maintenance en « Clôturée » ;
  * la Demande direction en « Clôturé ».
- La réalisation est ajoutée dans le champ Action / Réponse de l'élément lié, avec date, heure et agent.
- Une intervention affiche le nombre d'activités agents qui lui sont rattachées.

Traçabilité et consultation
- Filtres Journée / Semaine / Mois.
- Filtre par agent et type d'activité.
- Total du nombre d'activités et du temps tracé.
- Distinction entre activités liées et activités spontanées.
- Impression / PDF du journal filtré.
- Les rapports quotidien, hebdomadaire et mensuel général intègrent maintenant l'activité réelle des agents.
- Export Excel/CSV disponible pour « Activité des agents ».

Accès rapide
- Bouton « + Activité agent » sur le tableau de bord.
- « Ajout activité agent » dans le menu d'ajout rapide.

La nouvelle collection agentActivities utilise le même fonctionnement local-first / Supabase que les autres formulaires stables.
Aucune règle d'horaires, maladie, congé, Chronotime, RH, année scolaire ou synchronisation existante n'a été modifiée.
```

---

## CHANGEMENTS_V147_145_CONTINUITE_ELEMENTS_OUVERTS.txt

```text
V147.145 — CONTINUITÉ DES ÉLÉMENTS OPÉRATIONNELS ENTRE ANNÉES

Base stricte : V147.144.

Les éléments encore ouverts restent affichés à leur emplacement quand l'année scolaire change :
- Interventions Maintenance
- Urgences / problématiques Sécurité & qualité
- Demandes direction
- Chantiers / GPA

Règle :
- Tant qu'un élément n'est pas clôturé, il reste visible quelle que soit l'année scolaire sélectionnée.
- Une fois terminé / clôturé / annulé / archivé / réalisé / non applicable, il redevient historique et suit son année d'origine.
- Le tableau de bord conserve aussi les urgences, interventions ouvertes et retards opérationnels des années précédentes.
- Les historiques clôturés ne sont pas mélangés entre années.

Aucune autre règle métier n'a été modifiée.
```

---

## CHANGEMENTS_V147_146_LEGIONELLE_VACANCES.txt

```text
V147.146 — PRÉVENTION LÉGIONELLE DANS VACANCES & FERMETURES

Base stricte : V147.145.

Ajouts dans « Vacances & fermetures » :
- Bloc permanent « Prévention du risque légionelle — fermeture estivale ».
- Rappel des installations / points à risque.
- Actions avant fermeture : entretien, détartrage, désinfection, dépose et séchage.
- Consignes pendant l'inoccupation : équipements démontés et secs, coordination exploitant.
- Actions avant rentrée : remise en place, soutirage ECS + eau froide associée, 3 minutes après obtention
  de la température ECS, contrôle du fonctionnement et analyses nécessaires.
- Bouton « Ajouter à la checklist été » pour injecter les actions dans la période estivale active.
- Les périodes Été chargées depuis le calendrier officiel reçoivent automatiquement ces actions.
- FAQ enrichie avec la procédure légionelle.

Source intégrée : contenu du courrier Région Auvergne-Rhône-Alpes transmis par l'utilisateur,
daté du 25 août 2026.

Aucune autre règle métier n'a été modifiée.
```

---

## CHANGEMENTS_V147_146_RELEVE_COMPTEURS.txt

```text
V147.146 — RELEVÉ MENSUEL DES COMPTEURS

Base stricte : V147.145.

- Aucun rappel externe : la fonction est intégrée uniquement dans Pilotage Service Technique.
- Nouvelle section « Compteurs à relever » dans Agenda personnel.
- Tâche récurrente : « Relevé des compteurs ».
- Date automatique : dernier jour ouvré de chaque mois.
- Les samedis, dimanches et jours fériés français connus par l'application sont évités.
- La tâche apparaît :
  * dans le tableau et les cartes de l'Agenda personnel du mois ;
  * dans le calendrier hebdomadaire de l'Agenda personnel ;
  * dans l'agenda du jour / tableau de bord quand l'échéance tombe ce jour-là ;
  * dans la section dédiée « Compteurs à relever » pour l'année scolaire active.
- Aucun texte supplémentaire sur photos ou e-mail : intitulé volontairement simple « Relevé des compteurs ».

Aucune règle métier existante n'a été modifiée.
```

---

## CHANGEMENTS_V147_147_IMPRESSION_CHECKLISTS_FERMETURE.txt

```text
V147.147 — IMPRESSION INDIVIDUELLE DES CHECKLISTS DE FERMETURE

Base stricte : V147.146.

Dans Vacances & fermetures :
- Chaque période possède maintenant le bouton « Imprimer la checklist ».
- L'impression concerne uniquement la période choisie.
- Toutes les actions de la checklist sont imprimées, même si la carte n'en affiche qu'un aperçu.
- Les actions terminées sont imprimées avec ☑ / FAIT.
- Les actions restantes sont imprimées avec ☐ / À FAIRE.
- La feuille A4 comporte le nom de la période, les dates, la zone, le statut,
  le niveau d'avancement et les notes éventuelles.
- Deux zones de contrôle / visa sont ajoutées : fermeture et réouverture.
- Les checklists estivales incluent naturellement les actions légionelle de V147.146.

Aucune donnée n'est modifiée par l'impression.
Aucune autre règle métier n'a été changée.
```

---

## CHANGEMENTS_V147_147_MENU_BURGER_DOMAINES.txt

```text
V147.147 — MENU BURGER PAR DOMAINES

Base stricte : V147.146.

Le menu principal est maintenant classé en 5 domaines :

1. Pilotage & équipe
- Tableau de bord
- Agenda personnel
- Agents & recrutements
- Activité des agents
- Réunions & rendez-vous
- Bloc-notes

2. Horaires & absences
- Roulements annuels
- Pilotage des horaires
- Import / export horaires
- Chronotime
- Congés, RTT & absences
- Vacances & fermetures

3. Bâtiments & interventions
- Sécurité & qualité
- Contrôles périodiques
- Contrôle ménage
- Préparation salle & café
- Maintenance
- Demandes direction
- Chantiers & GPA
- Poubelles

4. Documents & services
- Documentation
- Outlook professionnel
- Archivage
- Météo

5. Rapports & système
- Rapports & impressions
- Connexions
- FAQ / Aide
- Paramètres

Sur téléphone :
- les domaines sont repliables ;
- le domaine de l'écran actuel s'ouvre automatiquement ;
- ouvrir un domaine replie les autres pour réduire la longueur du burger.

Sur PC :
- les domaines restent ouverts mais clairement séparés visuellement.

Aucun écran ni règle métier n'a été supprimé ou modifié.
```

---

## CHANGEMENTS_V147_148_ACTIVITE_MULTI_AGENTS_DUREE.txt

```text
V147.148 — RAPPORT / JOURNAL D'ACTIVITÉ : MULTI-AGENTS ET DURÉE SIMPLIFIÉE

Base stricte : V147.147.

- Une même activité peut concerner plusieurs agents.
- Sélection par cases à cocher dans le formulaire.
- Filtre du rapport par plusieurs agents simultanément.
- Trois durées possibles :
  * Heures précises
  * Journée complète
  * Demi-journée
- Les heures début/fin ne sont demandées que pour « Heures précises ».
- Les anciennes activités à un seul agent restent compatibles.
- Le tableau affiche tous les agents concernés.
- Résumé des durées : ex. « 2 j · 3 demi-j · 4 h 30 ».
- Rapports quotidien, hebdomadaire et mensuel adaptés.
- Export Excel/CSV adapté.
- Les interventions/demandes liées conservent tous les noms des agents dans la trace.

Aucune autre règle métier n'a été modifiée.
```

---

## CHANGEMENTS_V147_167_HORAIRES_REELS_DASHBOARD.txt

```text
V147.167 — 04/09/2026 — Horaires réels dans le tableau de bord

- Équipe du jour : un horaire réel complet (arrivée + départ) est désormais prioritaire à l'affichage.
- En l'absence d'horaire réel, le fonctionnement existant est conservé : roulement puis horaire standard selon la résolution théorique actuelle.
- Ma journée / Agenda du tableau de bord : tout horaire réel complet est désormais ajouté, même s'il est identique au théorique.
- Vue semaine / détail des agents : les horaires réels sont également affichés lorsqu'ils existent, avec total basé sur le réel pour ces journées.
- Un clic sur un horaire réel dans l'agenda ouvre directement la journée de l'agent.
- Mise en évidence visuelle légère des horaires réels dans le tableau de bord.
```

---

## CHANGEMENTS_V147_169_IMPORT_EXPORT_CONTROLES_PERIODIQUES.txt

```text
V147.169 — 04/09/2026

IMPORT / EXPORT DES CONTRÔLES PÉRIODIQUES
- Suppression de l'ajout V147.168 fait par erreur dans ChronoTime : cette version repart de V147.167.
- Ajout dans « Contrôles périodiques » du même principe que « Import / export horaires ».
- Export d'une matrice Excel préremplie avec tous les contrôles périodiques actuellement enregistrés.
- La matrice permet de corriger : nom, famille, lieu, périodicité, dates, heure, statut, prestataire, registre, exigences, OneDrive et notes.
- Réimport du fichier corrigé avec comparaison avant validation.
- Aperçu : lignes à modifier, nouvelles, identiques, avertissements et erreurs.
- Aucune modification n'est appliquée avant le bouton de validation.
- Une ligne absente du fichier Excel ne supprime jamais un contrôle existant.
- L'identifiant exporté permet de mettre à jour exactement le bon contrôle ; identifiant vide = ajout d'un nouveau contrôle.
- Une modification du « Dernier contrôle » conserve l'ancienne date dans l'historique et ajoute la nouvelle.
- Feuille « Historique - lecture » ajoutée à la matrice pour contrôle visuel, sans suppression automatique de l'historique.
- Synchronisation des contrôles modifiés/créés avec le mécanisme de synchronisation existant.
```

---

## CHANGEMENTS_V147_170_SYNCHRONISATION_CONTROLES.txt

```text
V147.170 — 07/09/2026

SYNCHRONISATION COMPLÈTE DES CONTRÔLES PÉRIODIQUES
- Reprise de V147.169 : aucun ajout au module ChronoTime.
- La matrice exportée devient le registre de référence : lignes ajoutées = créations, lignes corrigées = modifications, lignes supprimées = suppressions.
- Aperçu nominatif et chiffré des suppressions avant validation ; confirmation spéciale pour vider entièrement le registre.
- Export complet sans filtrage, avec photographie technique masquée permettant de détecter les fichiers incomplets ou obsolètes.
- Contrôle des identifiants, colonnes obligatoires, doublons et erreurs ; aucun import partiel si une ligne est invalide.
- Anciennes matrices sans photographie complète : nouvel export requis pour autoriser les suppressions.
- Sauvegarde JSON complète téléchargée avant application.
- Utilisation des tombstones et de la sauvegarde directe vérifiée existants pour que les suppressions ne réapparaissent pas lors de la fusion cloud.
- Les rapports et archives indépendants, les autres modules et les pièces jointes conservées en stockage ne sont pas purgés.
- En cas de synchronisation non confirmée, les modifications sont conservées localement et le statut en attente est affiché.
- La logique précédente de priorité des horaires réels reste inchangée.
```


## V147.171 — 7 septembre 2026 — Planning entretien & loge

Ajout du module `entretien-planning.js` et d’un écran dédié aux missions hebdomadaires. Source unique : feuille Tario Ascension, affichée Tarrio Ascension, avec correction du nom Berthoux Corinne. Import initial de 83 créneaux et conservation des références de cellules. La loge d’Anthony le mercredi est bornée à 07:15–12:15. Collection indépendante `cleaningDutyPlans`, initialisation idempotente, migration des bases existantes, sauvegarde et suppression sécurisées, filtres, édition, export Excel et impression. Aucun remplacement des horaires réels, roulements ou contrôles effectués. Version nettoyée maintenue sous 100 fichiers.


## V147.172 — 7 septembre 2026 — Validation matrice périodique

Correction de l’interface d’import : bouton de validation toujours visible, désactivé sans changements valides, état de lecture et motifs de blocage explicites, réinitialisation de l’aperçu lors d’un nouveau choix de fichier. Les confirmations de suppression, la sauvegarde préalable et la logique de synchronisation complète sont conservées. Aucune modification des autres modules ou du jeu de données initial.


## V147.173 — 08/09/2026 — reprise des matrices périodiques

Le moteur de matrice accepte les anciens instantanés V2, exporte désormais un instantané métier V3 et propose une reprise à trois voies sans suppression par défaut. Les champs concurrents sont conservés et signalés. Le mode complet exige un instantané à jour et la sélection individuelle des suppressions. Les anciennes migrations de catalogue sont désactivées sur les registres déjà présents. Une écriture Supabase conditionnelle protège contre les changements de révision. Les autres modules sont conservés. Aucun changement automatique n'est appliqué aux données existantes.
