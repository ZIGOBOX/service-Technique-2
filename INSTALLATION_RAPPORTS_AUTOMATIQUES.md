# Installation des rapports automatiques — V31

L'envoi automatique fonctionne côté serveur, même lorsque le téléphone et le PC sont éteints.

## 1. Déployer la fonction Supabase

Installez Supabase CLI, connectez-vous au projet, puis depuis le dossier V31 :

```bash
supabase functions deploy automatic-report --no-verify-jwt
```

La fonction se trouve dans :

```text
supabase/functions/automatic-report/index.ts
```

## 2. Configurer l'envoi e-mail

### Option A — Outlook professionnel / Microsoft 365

Cette option nécessite une application Microsoft Entra ID avec la permission **Application `Mail.Send`**, consentie par un administrateur Microsoft 365.

Ajoutez ensuite les secrets dans Supabase :

```bash
supabase secrets set MS_TENANT_ID="..."
supabase secrets set MS_CLIENT_ID="..."
supabase secrets set MS_CLIENT_SECRET="..."
supabase secrets set MS_SENDER_EMAIL="adresse-professionnelle@domaine.fr"
supabase secrets set CRON_SECRET="une-longue-valeur-secrete"
```

Ne placez jamais le secret Microsoft dans GitHub ni dans `supabase-config.js`.

### Option B — Resend

```bash
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set REPORT_FROM_EMAIL="Service technique <rapport@votre-domaine.fr>"
supabase secrets set CRON_SECRET="une-longue-valeur-secrete"
```

## 3. Planifier l'exécution

Dans Supabase, créez un Cron Job qui appelle la fonction toutes les heures. La fonction vérifie elle-même l'heure choisie dans l'application et évite les doublons.

URL :

```text
https://sbkshssohbdqximhmpnj.supabase.co/functions/v1/automatic-report
```

Méthode : `POST`

En-têtes :

```text
Content-Type: application/json
x-cron-secret: LA_MEME_VALEUR_QUE_CRON_SECRET
```

Corps :

```json
{"mode":"scheduled"}
```

Planification recommandée : chaque heure (`0 * * * *`).

## 4. Régler dans l'application

Dans **Paramètres > Rapports automatiques** :

- activez le rapport quotidien ;
- choisissez l'heure ;
- renseignez les destinataires dans la rubrique Courriels ;
- choisissez les rubriques ;
- utilisez **Envoyer un rapport test**.

## Important

Le ZIP contient le code complet, mais l'envoi ne peut pas fonctionner avant la configuration unique du fournisseur e-mail et du Cron côté Supabase/Microsoft.
