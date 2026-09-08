# Rapport de vérification — V147.175

Date : 8 septembre 2026. Tests locaux, sans connexion à la base réelle.

## Résultats réussis

- 17 tests du moteur : calcul civil des échéances, dates invalides, Fait/En retard/À planifier/À vérifier, statuts inactifs, doublons, priorité Excel, suppression de fiches ajoutées depuis l’export et restauration d’un identifiant connu.
- 9 tests de persistance sur serveur simulé : remplacement complet, conservation des historiques/pièces et autres modules, suppression avec marqueurs persistants, matrice vide, restauration, révision concurrente avec nouvelle lecture, sauvegarde impossible et numéros en double.
- Test de chargement et de migration : registre existant ou vide conservé, aucune réinjection automatique de catalogue.
- 6 tests d’intégration : export V2, matrice corrigée réelle, export V4, transmission intégrale du plan et absence de sélection/confirmation supplémentaire.

La matrice corrigée du 7 septembre a été testée contre une copie simulée de son export d’origine : 73 lignes, 66 copies répétées à supprimer, 1 création. Ces nombres ne préjugent pas du registre actuel du serveur, que l’application relit au moment de la validation.

## Limites

Le test du parcours graphique dans Chromium n’a pas pu se terminer dans cet environnement. Aucune validation sur la véritable base Supabase n’a été effectuée. La sauvegarde est déclenchée avant l’écriture, mais la réception du téléchargement par l’utilisateur dépend du navigateur. Les fréquences et dates du registre doivent être vérifiées avec les rapports, contrats et prestataires compétents ; les tests logiciels ne constituent pas une vérification réglementaire.
