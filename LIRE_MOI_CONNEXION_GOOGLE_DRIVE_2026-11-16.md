# Google Drive — connexion prête à configurer

Cette version de **Pilotage Service Technique** conserve tous les modules précédents. Elle ajoute un stockage Google Drive **optionnel** pour les pièces jointes des fiches, sans remplacer l'ancien stockage Supabase.

## Ce qui est déjà inclus

- Dans **Paramètres → Google Drive** : champ « ID client OAuth », adresse Google facultative (indice de choix du compte), bouton **Connecter mon compte Google** et **Déconnecter**.
- Dans les formulaires utilisant des pièces jointes (notamment Maintenance, Chantiers & GPA, Documentation, Réunions, Notes et Vacances) : nouvel emplacement **Ajouter au Google Drive connecté**.
- Dans **Documentation** : inventaire des fichiers Drive reliés à des fiches et accès direct au fichier dans Google Drive.
- Les fichiers sont rangés dans `Pilotage Service Technique / Maintenance`, `Chantiers et GPA`, `Documentation`, etc., créés automatiquement dans le compte Google autorisé.
- Dans les fiches, seule la **référence** au fichier est conservée dans les données synchronisées par Supabase. Aucun mot de passe ni jeton d'accès n'est enregistré dans le navigateur, le ZIP ou Supabase.
- « Détacher » un fichier retire uniquement son lien avec la fiche : le fichier reste sur Google Drive.

## Ce qu'il faut faire une fois : configurer Google Cloud

1. Ouvrir https://console.cloud.google.com/ et créer un **projet Google Cloud**, ou sélectionner un projet autorisé pour cet usage.
2. Dans **API et services → Bibliothèque**, rechercher **Google Drive API** et l'**activer**.
3. Dans **Google Auth Platform** (ou l'écran de consentement OAuth), configurer le nom de l'application et la catégorie **Externe** si c'est un compte Google standard. En mode **Test**, ajouter l'adresse Google utilisée dans **Utilisateurs tests**. Pour un Google Workspace d'établissement, un administrateur peut imposer des restrictions spécifiques.
4. Dans les autorisations/scopes, déclarer **`https://www.googleapis.com/auth/drive.file`** (accès limité aux fichiers créés/ouverts par l'application). Éviter le scope complet `drive`.
5. Créer un **client OAuth de type « Application Web »**. Dans **Origines JavaScript autorisées**, ajouter l'**origine exacte** de votre site, par exemple `https://votre-identifiant.github.io` (sans le nom du dépôt, sans chemin) ou l'origine de votre domaine personnel HTTPS. Ne pas ajouter une URL locale pour un vrai déploiement GitHub.
6. Copier l'**ID client** se terminant par `.apps.googleusercontent.com`. **Ne jamais coller de secret client** : cette application statique utilise l'identifiant public uniquement.
7. Publier les fichiers de ce ZIP sur votre site GitHub Pages. En **HTTPS**, ouvrir **Paramètres → Google Drive**, coller l'ID client, saisir éventuellement l'adresse du compte, puis appuyer sur **Connecter mon compte Google**. Suivre la fenêtre officielle Google et accepter l'autorisation.
8. Ouvrir une fiche de **Maintenance**, de **Chantiers & GPA** ou un **Document** ; choisir un fichier dans « Ajouter au Google Drive connecté » et enregistrer la fiche. Consulter ensuite le dossier Drive ou la section Documentation pour vérifier.

**IMPORTANT : l'adresse e-mail seule ne connecte pas le compte.** Google exige une autorisation OAuth explicite ; Google peut proposer le compte correspondant à l'adresse indiquée. Aucun mot de passe Google ne doit être tapé dans Pilotage Service Technique.

## Limites et précautions

- **Compte Google et quotas** : le stockage disponible dépend du compte (15 Go gratuits pour un compte personnel standard, partagés avec Gmail et Google Photos). Aucune extension de stockage n'est fournie par le logiciel.
- **Connexion** : le jeton Google est conservé **en mémoire de la page seulement**. Il peut expirer ou disparaître quand on ferme l'application. Il faudra alors recliquer sur « Connecter mon compte Google ». Un mécanisme de reconnexion complètement automatique, durable, nécessiterait un backend OAuth sécurisé et une gestion chiffrée des jetons de rafraîchissement (non inclus ici).
- **Appareils** : l'ID client et l'adresse indicative sont enregistrés localement dans chaque navigateur, pas centralisés dans Supabase. Si vous utilisez le logiciel sur PC et téléphone, recopiez l'ID client sur chaque appareil.
- **Documents privés** : les fichiers sont créés **sans partage public**. Il faut être connecté au bon compte Google pour les ouvrir dans Drive. Aucun lien public n'est généré.
- **Données existantes** : les pièces jointes déjà dans Supabase ne sont pas transférées, effacées ou modifiées automatiquement. L'ancien bouton de fichiers continue de fonctionner.
- **Sauvegarde de la base** : cette intégration **n'effectue pas de sauvegarde de vos agents, horaires, interventions ou données Supabase** ; elle concerne uniquement les nouveaux fichiers que vous choisissez d'envoyer dans Google Drive.
- **Autorisation professionnelle** : avant d'utiliser un Drive personnel pour des photos, noms, documents techniques et informations d'un lycée, vérifier la politique de la Région/de l'établissement, en particulier pour les données personnelles et les documents sensibles.
- **Tests** : syntaxe JavaScript et logique de connexion/envoi testées avec une simulation. Impossible de valider une connexion Google réelle sans votre projet OAuth et votre approbation ; le premier transfert réel devra être vérifié après déploiement.

### Dépannage rapide

- *Erreur `origin_mismatch`* : l'origine exacte du site n'est pas autorisée dans le client OAuth Google ; vérifier `https://...github.io`, sans sous-répertoire.
- *Accès bloqué / application non validée* : vérifier la configuration du consentement OAuth et la présence du compte dans **Utilisateurs tests**, ou contacter l'administrateur Workspace.
- *Session expirée* : reconnecter Google avant de joindre un fichier.
- *Fenêtre bloquée* : autoriser les pop-ups et appuyer de nouveau sur « Connecter mon compte Google ».
- *Erreur Google API* : vérifier que **Google Drive API** est activée dans le projet et que les autorisations accordées correspondent à `drive.file`.
- *Impossible d'ouvrir un fichier* : sélectionner dans Google Drive le même compte Google que celui utilisé pendant l'envoi.

Sources techniques Google :
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/oauth2/web/reference/js-reference
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
