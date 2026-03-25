# 🚧 ROADMAP — LYNX (NGS Platform)

Ce document trace l'avancement du développement de la plateforme LYNX.
Légende : ✅ Terminé | 🔄 En cours | ⬜ À venir

---

## Vue d'ensemble des Phases

| Phase | Description | Dates (Est.) | Statut |
| :--- | :--- | :--- | :--- |
| **1** | Architecture, Auth & Base de données | Semaine 1-3 | ✅ COMPLÉTÉE |
| **2** | Dashboard Admin & Gestion Utilisateurs | Semaine 4-5 | ✅ COMPLÉTÉE |
| **3** | Module Conducteur (Gestion de Projets) | Semaine 6-7 | ✅ COMPLÉTÉE |
| **4** | Module Chef d'Équipe (Suivi Chantier) | Semaine 8 | ✅ COMPLÉTÉE |
| **5** | Module Client (Suivi & Rapports) | Semaine 9 | ✅ COMPLÉTÉE |
| **6** | Module Ouvrier (Tâches & Planning) | Semaine 10 | ✅ COMPLÉTÉE |
| **7** | Polissage & Déploiement | Semaine 11-12 | 🔄 EN COURS |

---

### Phase 5 — Module Client (Semaine 9) ✅ COMPLÉTÉE

| Étape | Statut |
| ----- | ------ |
| Dashboard Client (KPIs, Vue globale) | ✅ `/client/dashboard` — KPIs dynamiques, projets récents, rapports, notifs |
| Consultation des projets (Timeline, Progression) | ✅ `/client/projects` — timeline phases, progression, incidents, photos |
| Galerie Photos (Filtrable, Géolocalisée) | ✅ `/client/gallery` — grille responsive, lightbox, filtres, GPS |
| Messagerie / Demandes (Feedbacks) | ✅ `/client/messages` — formulaire demandes + priorité, suivi statuts |
| Rapports publiés | ✅ `/client/reports` — filtres, aperçu modal, téléchargement PDF |

### Phase 6 — Module Ouvrier (Semaine 10) ✅ COMPLÉTÉE

| Étape | Statut |
| ----- | ------ |
| Dashboard Ouvrier complet | ✅ `/ouvrier/dashboard` — KPIs, tâches récentes, graphique complétion, pointage |
| Vue des tâches assignées | ✅ `/ouvrier/tasks` — filtres statut/priorité, barres progression, alertes retard |
| Consultation du planning personnel | ✅ `/ouvrier/planning` — timeline groupée par date, historique présences 7j |

### Phase 7 — Polissage & Déploiement (Semaine 11-12) 🔄 EN COURS

| Étape | Statut |
| ----- | ------ |
| Système de fichiers (Upload) | ✅ Implémenté (local) |
| Mode PWA (Manifest, Icons) | ✅ Implémenté |
| Migration SQLite → PostgreSQL | ⬜ À faire |
| Tests E2E | ⬜ À faire |
| Optimisation des performances | � En cours |
| Déploiement production | ⬜ À faire |
