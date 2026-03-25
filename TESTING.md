# 🧪 Guide de Test — LYNX Platform

Ce document détaille les scénarios de test pour valider les nouvelles fonctionnalités de la Phase 7.

## 1. Vérification Technique

- [ ] Le build `npm run build` doit passer sans erreur. (En cours de vérification par l'assistant)
- [ ] Le serveur de développement `npm run dev` tourne sans erreur.

## 2. Compte & Profil (`/profile`)

**Objectif :** Valider la gestion autonome du compte utilisateur.

1. **Accès** :
    - Connectez-vous (Admin, Conducteur ou Ouvrier).
    - Cliquez sur votre avatar/nom en bas de la barre latérale gauche.
    - Vérifiez que vous arrivez sur `/profile`.
2. **Avatar** :
    - Cliquez sur l'icône appareil photo sur l'avatar.
    - Sélectionnez une image (JPG/PNG).
    - Vérifiez que l'image se met à jour immédiatement et persiste au rechargement.
3. **Mot de passe** :
    - Tentez de changer le mot de passe avec l'ancien mot de passe incorrect (Doit afficher une erreur).
    - Changez le mot de passe correctement.
    - Déconnectez-vous et reconnectez-vous avec le nouveau mot de passe.

## 3. Rapports & Fichiers (`/admin/reports`)

**Objectif :** Valider la création de rapports avec pièces jointes.

1. **Création** :
    - Allez dans `Admin > Rapports`.
    - Cliquez sur "Nouveau rapport".
    - Remplissez le titre et le projet.
    - **Upload** : Ajoutez un fichier PDF dans le champ "PDF joint".
    - Validez la création.
2. **Consultation** :
    - Ouvrez l'aperçu du rapport créé (clic sur l'œil ou le titre).
    - Vérifiez la présence du bloc "PIÈCE JOINTE" en bas.
    - Cliquez sur "Document PDF" pour vérifier que le fichier s'ouvre bien dans un nouvel onglet.

## 4. Navigation & UX

- Vérifiez que le lien "Paramètres" (`/admin/settings`) fonctionne.
- Testez le mode responsive (réduisez la fenêtre) : la Sidebar doit devenir un menu mobile fonctionnel.
- Vérifiez que l'icône de l'application apparaît bien (favicon).

## 5. PWA (Mobile)

- Si vous testez sur Chrome/Edge :
  - Vérifiez si une icône "Installer LYNX" apparaît dans la barre d'adresse.
  - Vérifiez que le `manifest.json` est bien chargé (Inspecter > Application > Manifest).
