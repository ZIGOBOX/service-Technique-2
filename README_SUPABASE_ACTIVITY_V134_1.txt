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
