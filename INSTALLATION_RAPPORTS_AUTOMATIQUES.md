# Envoi automatique des rapports — V147.170

## Ce qui est déjà réglé dans l'application

- Adresse qui reçoit les rapports automatiques : **adelin.vignal.running@outlook.fr**
- Fuseau horaire par défaut : **Europe/Paris**
- Rapport quotidien : activé par défaut à **07:00**, du lundi au vendredi
- L'adresse privée ci-dessus est le **destinataire**, pas l'expéditeur technique.

Dans **Paramètres > Envoi automatique des rapports**, tout est séparé en 5 étapes :
1. destinataire ;
2. rapports à envoyer ;
3. heure et jours ;
4. contenu ;
5. état du serveur et test.

Le bouton **Vérifier le serveur** indique si un moteur d'envoi est configuré. Le bouton **Envoyer un mail test** permet de vérifier l'envoi réel.

## Pourquoi un moteur d'envoi est nécessaire

Une page web ne peut pas envoyer seule un e-mail en arrière-plan lorsque le PC ou le téléphone est éteint. L'application utilise donc une fonction serveur Supabase :

`supabase/functions/automatic-report/index.ts`

Cette fonction peut envoyer via :
- **Microsoft 365 / Microsoft Graph** ; ou
- **Resend**.

Aucun mot de passe Outlook n'est stocké dans l'application.

## Option A — Microsoft 365 / Outlook professionnel

Cette option utilise un compte Microsoft 365 professionnel autorisé à envoyer. Une application Microsoft Entra ID doit posséder la permission d'application **Mail.Send**, avec consentement administrateur.

Configurer les secrets Supabase :

```bash
supabase secrets set MS_TENANT_ID="VOTRE_TENANT_ID"
supabase secrets set MS_CLIENT_ID="VOTRE_CLIENT_ID"
supabase secrets set MS_CLIENT_SECRET="VOTRE_SECRET_CLIENT"
supabase secrets set MS_SENDER_EMAIL="adresse-professionnelle-autorisee@domaine.fr"
supabase secrets set CRON_SECRET="UNE_LONGUE_CLE_SECRETE"
supabase functions deploy automatic-report --no-verify-jwt
```

**Important :** `adelin.vignal.running@outlook.fr` reste le destinataire. Ne la mettez pas dans `MS_SENDER_EMAIL` sauf si vous avez volontairement mis en place un mécanisme Microsoft compatible avec ce compte ; le mode prévu ici est l'envoi serveur Microsoft 365 professionnel.

## Option B — Resend

Configurer :

```bash
supabase secrets set RESEND_API_KEY="VOTRE_CLE_RESEND"
supabase secrets set REPORT_FROM_EMAIL="Pilotage Service Technique <adresse-verifiee@votre-domaine.fr>"
supabase secrets set CRON_SECRET="UNE_LONGUE_CLE_SECRETE"
supabase functions deploy automatic-report --no-verify-jwt
```

Resend exige normalement une adresse ou un domaine expéditeur validé pour un usage réel.

## Planification automatique

Le ZIP contient `SETUP_CRON_EXEMPLE.sql`. Le cron appelle la fonction toutes les heures. La fonction vérifie ensuite elle-même l'heure choisie dans l'application, les jours autorisés et évite les doublons.

Dans Supabase SQL Editor :
1. activer `pg_cron` et `pg_net` si nécessaire ;
2. ouvrir `SETUP_CRON_EXEMPLE.sql` ;
3. remplacer `VOTRE_CRON_SECRET` par exactement la même valeur que le secret `CRON_SECRET` ;
4. exécuter le script.

## Vérification dans l'application

Dans **Paramètres > Envoi automatique des rapports** :
- vérifier que **adelin.vignal.running@outlook.fr** apparaît comme destination ;
- cliquer sur **Vérifier le serveur** ;
- le moteur doit afficher Microsoft 365 / Outlook ou Resend ;
- la clé de planification serveur doit apparaître comme configurée ;
- cliquer sur **Envoyer un mail test** ;
- vérifier la boîte de réception et les indésirables.

Le bouton de vérification confirme la présence du moteur et de la clé serveur. Il ne peut pas certifier à lui seul que le job `pg_cron` a bien été créé : le mail test valide l'expédition, et le premier envoi planifié valide le cron.
