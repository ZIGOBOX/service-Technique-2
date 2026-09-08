# Rapport de tests — V147.174

Date : 08/09/2026. Tous les essais sont locaux ou simulés. Aucune connexion à la base réelle de l’utilisateur.

- 18 tests du moteur : suppression automatique, matrice vide, 66 copies, conflits, trois voies, numéros, dates vides, anciens instantanés et rapprochement.
- 3 scénarios de migration : registre présent, registre vide et anciennes migrations sans réinjection.
- 10 tests de persistance : sauvegarde, écriture conditionnelle, refus de sous-ensemble de suppressions, refus de conflit, conservation des autres modules, historique et pièces, tombstones, registre vide et génération de numéro.
- 6 tests d'intégration de lecture/export/interface, dont la matrice réelle V2 et la matrice corrigée de 73 lignes. Le test local utilise les valeurs extraites des fichiers réels par artifact_tool. Le paquet distribué utilise des données synthétiques équivalentes. Le moteur Excel et les interactions sont simulés dans ces tests ; il ne s'agit pas d'un essai de production.
- Contrôle de syntaxe de tous les scripts JavaScript du paquet.

La sauvegarde est déclenchée avant l’écriture. Le logiciel ne peut pas garantir que le navigateur ait effectivement enregistré le fichier si le téléchargement est bloqué. Les rapports/archives et les fichiers externes doivent être sauvegardés selon les procédures habituelles.

Le correctif n'a pas été testé sur le serveur Supabase réel, ni avec une session authentifiée de l'utilisateur. Il ne garantit donc pas l'absence de tout problème lié à l'hébergement, aux versions en cache ou à la concurrence d'anciennes versions du logiciel.
