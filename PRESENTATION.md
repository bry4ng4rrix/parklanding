# ParcAuto — présentation du projet

Système de gestion de parc roulant : véhicules routiers et engins de chantier,
leurs conducteurs, leurs missions, leurs coûts et les chantiers sur lesquels ils
travaillent.

Ce document présente ce que le système couvre, comment il est construit et où il
en est. Le `README.md` décrit l'installation ; `CLAUDE.md` décrit les règles de
travail sur le code.

---

## En un coup d'œil

| | |
|---|---|
| Nature | API REST, back-end d'une application de gestion de flotte |
| Périmètre | 286 points d'entrée, 99 tables, 64 migrations de schéma |
| Code | 1 050 classes Java, environ 57 000 lignes |
| Tests | 358 tests automatisés |
| Technologie | Java 25, Spring Boot 4.1.1, PostgreSQL 16 + PostGIS |
| Clients | Application web, application mobile conducteur, application mobile atelier |

---

## Ce que le système gère

### Le parc et son exploitation

Chaque véhicule porte sa fiche technique, ses compteurs, ses documents et ses
photos. Les engins de chantier se mesurent en **heures moteur** et les véhicules
routiers en kilomètres — une distinction qui traverse tout le système, du calcul
de consommation au coût d'usage.

Autour du véhicule : missions, affectations de conducteurs, pleins de carburant,
maintenances, incidents, documents à échéance, équipements de bord et échéancier
d'entretien.

### Les chantiers

Un chantier réunit des véhicules et des conducteurs sur une **période datée**.
Un même engin peut servir plusieurs chantiers à des dates disjointes, jamais un
chantier et une mission en même temps.

Le suivi de terrain s'appuie sur ce que le GPS sait déjà : la présence d'un
véhicule sur son chantier est **calculée chaque nuit** à partir des positions,
sans que personne ait à la saisir. L'écart entre le matériel prévu et le matériel
réellement présent devient visible de lui-même.

Les mouvements de matériel enregistrent l'état des lieux à la montée et à la
descente, photos comprises — ce qui permet d'imputer une dégradation au bon
chantier plutôt que de la découvrir au retour sans savoir d'où elle vient.

### Le pilotage

C'est la partie qui répond aux questions de direction, avec des chiffres plutôt
qu'avec des impressions :

- **Coût complet (TCO)** par véhicule et par type — amortissement, loyer,
  charges annuelles au prorata, carburant, entretien.
- **Taux d'utilisation** et véhicules sous-utilisés, avec des seuils réglés par
  type de véhicule : un camion-benne et une voiture de service n'ont pas la même
  définition d'un usage normal.
- **Fiabilité** — pannes, immobilisation, respect des échéances, contrôles
  qualité à la clôture des maintenances.
- **Score de conduite** mensuel par conducteur, à partir des événements remontés
  par les boîtiers GPS.
- **Budget carburant** réel comparé au prévisionnel, avec la cause probable de
  l'écart.
- **Renouvellement** : fin de vie, cessions, plan de remplacement chiffré.
- **Prévisions** de dépenses à douze mois.
- **Sinistres** : dossier assureur, responsabilité, reste à charge.

Dix-neuf types de rapports sont disponibles, exportables en PDF et en Excel, et
diffusables automatiquement par courriel sur abonnement.

### La conformité

Une mission ne démarre pas si le véhicule n'a pas ses documents valides ou si le
conducteur n'a pas la qualification correspondante — permis pour un véhicule
routier, CACES pour un engin de chantier. Le contrôle est **bloquant**, et la
liste des documents exigés se règle par type de véhicule sans jamais pouvoir
s'annuler : une liste vide retombe sur assurance et visite technique.

S'y ajoutent la surveillance de la fatigue au volant et un journal des
connexions.

### Les échanges

Une messagerie interne relie conversations privées, canaux d'équipe et fils
rattachés à un véhicule, une mission, un chantier ou une maintenance — pour que
les échanges restent attachés à l'objet dont ils parlent.

Les alertes remontent les anomalies et **montent d'un niveau** tant qu'elles ne
sont pas traitées. Les alertes critiques peuvent être poussées vers un système
tiers par webhook.

---

## Les applications clientes

| Application | Public | Particularité |
|---|---|---|
| Web | Bureau, direction, atelier | Interface complète |
| Mobile conducteur | Conducteurs | Son véhicule, ses missions, déclaration de plein et d'incident depuis le terrain |
| Mobile atelier | Mécaniciens | Maintenances, pièces, photos avant/pendant/après |

Les deux applications mobiles ont leur propre authentification, avec des jetons
qui tournent à chaque usage : seule l'empreinte du jeton est stockée, et
présenter un jeton déjà remplacé révoque toute la série — ce rejeu signalant un
vol.

Leurs actions acceptent une clé d'idempotence, parce qu'un réseau instable
pousse à renvoyer une requête sans savoir si la première est passée. Sans cela,
un renvoi créerait une seconde maintenance ou doublerait les pièces consommées.

Les API mobiles sont documentées dans [API-APPLI-CONDUCTEUR.md](API-APPLI-CONDUCTEUR.md)
et [API-APPLI-MAINTENANCE.md](API-APPLI-MAINTENANCE.md), avec une collection
Postman prête à importer.

---

## Qui voit quoi

Neuf rôles, des droits définis à un seul endroit dans le code :

| Rôle | Portée |
|---|---|
| DG | Tout |
| Responsable de parc | Tout le métier |
| Assistant de parc | Prépare, ne valide pas |
| Chef de maintenance | Toute l'activité maintenance |
| Assistant de maintenance | Planifie, validation du chef |
| Chef de chantier | Ses chantiers : demandes de matériel, journal |
| Conducteur | Son véhicule, ses missions, ses saisies |
| Comptable | Lecture, export comptable |
| Administrateur | Informatique : comptes, paramètres ; lecture seule sur le métier |

---

## Comment c'est construit

**Organisation par domaine**, pas par couche technique. Chaque domaine métier —
engin, mission, chantier, carburant — est un paquet autonome contenant son
entité, son dépôt, son service, son contrôleur et ses DTO. Un module évolue sans
toucher aux autres.

**Le schéma est piloté par les migrations.** Soixante-quatre migrations Flyway
décrivent l'histoire de la base ; Hibernate se contente de valider que le schéma
correspond aux entités au démarrage. Une migration appliquée ne se modifie
jamais.

**Temps réel généralisé.** Un écouteur au niveau de la couche de persistance voit
chaque création, modification et suppression, sans qu'aucun service ait à penser
à la signaler. Les changements sont diffusés après validation de la transaction,
et filtrés selon les droits du destinataire — un écran temps réel ne montre
jamais plus que l'API correspondante.

**Cartographie** : imagerie satellite relayée par le serveur, étiquettes de lieux
en couche séparée côté écran, pour qu'on puisse les masquer quand elles gênent la
lecture d'un tracé de zone.

---

## Comment la qualité est tenue

Le code est écrit par un agent qui ne l'exécute jamais, et validé par un second
qui le compile, le teste et le lance. Rien n'est livré sans cette passe, conduite
par un script unique (`scripts/verifier.ps1`) en cinq étapes :

1. **Différences** — repère notamment les fichiers qui perdent plus de lignes
   qu'ils n'en gagnent, signe fréquent d'une réécriture qui efface un correctif.
2. **Compilation** — avertissements affichés, pas seulement comptés.
3. **Tests** — 358 tests, dont des tests d'intégration sur une vraie base.
4. **Démarrage** — c'est là que se révèlent les doublons de migration et les
   types de colonnes incompatibles, qu'aucun test ne voit.
5. **Appels réels aux exports** — un PDF peut compiler, passer les tests et
   renvoyer une erreur à l'usage.

Chaque étape attrape ce que la précédente laisse passer. Les défauts qui ont
réellement bloqué le projet au moins une fois sont consignés dans `CLAUDE.md`
avec leur cause, ce qui les a fait disparaître des itérations suivantes.

---

## Où en est le projet

Le noyau et les modules de pilotage sont en place et vérifiés. L'application
démarre, sert ses 286 points d'entrée et produit ses exports.

Quelques points à connaître, plutôt que de les découvrir plus tard :

**Licence de l'imagerie satellite.** Le service Esri utilisé est en principe
réservé aux détenteurs d'un compte ArcGIS. Le risque est faible pour un usage
interne modeste, mais si le trafic grandit ou si l'usage devient commercial
externe, il faudra basculer vers une alternative — Bing ou Azure Maps Aerial,
aux conditions claires.

**Le schéma comptable reste à valider** avec un comptable. Les valeurs par
défaut suivent le PCG 2005 et sont modifiables sans livraison.

**Le circuit de validation** entre assistants et responsables est prévu mais pas
encore livré.

**Les applications clientes ne sont pas couvertes** par la chaîne de
vérification du back-end : elles vivent dans des dépôts séparés et se vérifient
séparément.
