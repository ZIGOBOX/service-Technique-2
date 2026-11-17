# Import sécurisé des 31 fiches GPA — Lycée Jean Puy

## Deux téléchargements séparés

1. **Pilotage_Service_Technique_GITHUB_COMPLET_31_GPA_2026-11-17.zip** : contient le logiciel modifié (sans documents du lycée).
2. **IMPORT_PRIVE_GPA_31_FICHES_2026-11-17.json** : contient le contenu des 31 fiches GPA ; ne pas mettre ce fichier sur GitHub.

## Installation (une seule fois)

1. Installer sur GitHub Pages **uniquement** les fichiers du ZIP du logiciel, en conservant l’arborescence des fichiers et du dossier `assets`.
2. Garder le fichier JSON **sur son ordinateur / téléphone** et ne jamais le téléverser dans les fichiers du site.
3. Se connecter au logiciel avec son compte habituel Supabase.
4. Aller dans **Maintenance & travaux → Chantiers & GPA**.
5. Cliquer sur **Choisir le fichier privé GPA (.json)** et sélectionner le JSON local.
6. Une liste de contrôle affiche les fiches nouvelles et celles déjà enregistrées, puis demande confirmation.
7. En confirmant, le logiciel télécharge automatiquement une sauvegarde JSON de l’état actuel puis ajoute les fiches manquantes.
8. Attendre le message **« confirmées dans Supabase »** avant de fermer la page. En cas de réseau indisponible, ne pas effacer les données locales et vérifier la synchronisation.
9. Rechercher les numéros `GPA-09`, `GPA-18`, ... dans « Chantiers & GPA » et compléter les statuts, priorités et échéances à partir des informations de suivi réelles.

## Fidélité des fiches d’origine

- Les dates utilisées sont les **dates d’envoi** du champ « Date d’envoi », pas des dates supposées de création.
- Les descriptions reprennent le champ « Nature de la malfaçon/désordre/dysfonctionnement et/ou observation », texte intégral.
- Localisations, dates de signature disponibles et numéro intérieur sont conservés dans chaque dossier.
- Les « observations complémentaires » vides restent vides. « Entreprise : XX » est un modèle, pas une société attribuée ; aucune entreprise n’est attribuée à tort.
- Les statuts, priorités, échéances, dates de levée de réserve et fin de GPA non indiqués restent **non renseignés / à qualifier**.
- Les copies des fichiers `.xls` d’origine ne sont PAS publiées. Conserver les originaux localement ou dans un stockage professionnel privé autorisé. Les fichiers Excel ne sont pas joints automatiquement à Supabase ni à Google Drive.

## Anomalie non corrigée arbitrairement

- Le fichier **GPA 38 (salle 245)** porte le numéro **35 à l’intérieur de la fiche** ; on importe `GPA-38` d’après le nom fourni, avec conservation du numéro intérieur `35` et avertissement lors de la consultation.

## Doublons

- 36 fichiers pour 31 numéros. Les doublons 51, 55, 56, 57 et 58 sont strictement identiques.
- L’import ne supprime ni ne remplace de dossier existant ; il ignore automatiquement les fiches reconnues au même numéro ou ayant les mêmes champs source.

## Confidentialité

- Le JSON est réservé au responsable autorisé. Ne pas le publier sur GitHub Pages, ni l’envoyer à un service de stockage non approuvé par l’établissement.
- Les fiches privées sont chargées localement dans le navigateur lors de la sélection, puis enregistrées dans le compte Supabase connecté après confirmation.
- Les données du JSON ne sont pas incorporées au code public du logiciel.
