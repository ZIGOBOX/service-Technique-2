# V147.192 — synchronisation locale

Avant installation : exporter les données de chaque appareil, ne pas effacer le stockage du navigateur. Utiliser le même compte Supabase et la même adresse GitHub Pages. Remplacer les fichiers du site par ceux de cette archive, sans modifier la configuration Supabase ni les tables.

- Ouverture : une synchronisation métier, puis aucune interrogation périodique de la base.
- Enregistrements ordinaires : IndexedDB et ancien stockage local de secours. Bouton d'accueil pour envoyer et recevoir. En cas de modifications simultanées, choisir la version pour chaque conflit ou annuler l'envoi.
- Après une panne : synchroniser les deux appareils, puis le premier une seconde fois.
- Le bandeau affiche le quota si le message serveur l'identifie, sinon l'indisponibilité. Pas de lecture du compteur de facturation.
- Les pièces jointes, l'IA, l'authentification et le remplacement complet du registre Excel des contrôles périodiques restent des opérations réseau spécifiques. La première ouverture sur un nouvel appareil et une session expirée peuvent nécessiter un serveur disponible. Ne pas utiliser de données RH sur un équipement non autorisé.
- Le protocole conserve le JSON app_state existant. En cas de changement distant, téléchargement du JSON complet ; en cas d'envoi, écriture conditionnelle du JSON fusionné. Pas de changement de schéma.
- Les tests de syntaxe et de fusion sont locaux ; aucun accès au compte Supabase réel. Tester sur une copie avant déploiement.
