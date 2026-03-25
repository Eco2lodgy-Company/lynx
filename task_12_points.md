# Comprehensive 12-Point Action Plan - LYNX Mobile Audit

## 1. Messagerie — Performance & Fiabilité
- [x] Optimisation de l'affichage (hitSlop, keyboardShouldPersistTaps).
- [x] Fix des imports et crash au lancement.
- [ ] Refactor ScrollView -> FlatList pour les longs historiques.

## 2. Affichage des photos & Galerie
- [x] Fix des hauteurs d'images dans la galerie.
- [x] Fix des URLs d'images globales (`ASSET_BASE_URL`).
- [x] Redimensionnement correct des photos de profil.

## 3. Rapport de chantier — Création
- [x] Ajout du bouton flottant (FAB) réactif.
- [x] Fix de la sélection de projet dans la création.

## 4. Rapport de chantier — Validation / Rejet
- [x] Intégration complète des boutons Valider/Rejeter pour les admins.
- [x] Centrage des fenêtres de confirmation (Modals).

## 5. Module Logistique — CRUD
- [x] Fix des liens de navigation.
- [x] Implémentation complète Créer / Réceptionner / Modifier / Supprimer.

## 6. Gestion des Tâches — Création
- [x] Réparation du formulaire de création de tâches.
- [x] Correction des types TypeScript pour les alertes.

## 7. Signalement d'incident
- [x] Module de signalement entièrement fonctionnel avec photos.
- [x] Liaison des incidents dans la messagerie.

## 8. Gestion des Projets — Display
- [x] Affichage du **Nom du Chantier** au lieu de l'ID (Stats + Dashboard).
- [x] Optimisation des performances serveur pour le calcul des statistiques.

## 9. Profil & Paramètres
- [x] Mise à jour des photos de profil (PUT API).
- [x] Traduction et nettoyage des labels ("Informations légales").

## 10. Bouton de Pointage — Synchronisation
- [x] Fix de la synchronisation Mobile/Web (Standardisation Midnight Local vs UTC).
- [x] Correction des permissions géolocalisation sur Android.

## 11. Interface Utilisateur (UI/UX)
- [x] Centrage de toutes les fenêtres Popup.
- [x] Augmentation des zones de clic (hitSlop) sur tous les boutons critiques.

## 12. Filtrage des Rôles
- [x] Masquage des onglets sensibles pour les OUVRIER (Reports/Messages).
- [x] Filtrage correct des listes d'ouvriers pour les chefs d'équipe.
