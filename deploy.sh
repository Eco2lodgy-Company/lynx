#!/bin/bash

# Script de déploiement automatisé pour LYNX
# Usage: bash deploy.sh

echo "🚀 Démarrage du déploiement de LYNX..."

# 1. Arrêt temporaire pour libérer des ressources
echo "⏱️ Arrêt du processus PM2..."
pm2 stop lynx || true

# 2. Synchronisation forcée avec GitHub
echo "🔄 Synchronisation avec la branche main..."
git fetch origin
git reset --hard origin/main

# 3. Installation des dépendances (Nettoyage AGRESSIF pour corriger les erreurs runtime)
echo "📦 Nettoyage et installation des dépendances..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 4. Synchronisation Prisma (Base de données)
echo "🗄️ Synchronisation du schéma de base de données..."
npx prisma db push

# 5. Compilation monorepo
echo "🏗️ Construction de l'application (turbo build)..."
npm run build

# 6. Relance PROPRE des processus (Séparation API et Web)
echo "♻️ Nettoyage et redémarrage des services..."

# Arrêt et suppression pour éviter les conflits de ports
pm2 delete lynx next-app || true

# Lancement de l'API Express sur le port 3001 (config attendue par Nginx)
echo "🚀 Lancement de l'API (Port 3001)..."
PORT=3001 pm2 start "npm run start:api" --name "lynx" --update-env

# Lancement du Web Frontend sur le port 3000
echo "🚀 Lancement du Web Frontend (Port 3000)..."
PORT=3000 pm2 start "npm run start:web" --name "next-app" --update-env

# 7. Persistance PM2
pm2 save

echo "✅ Déploiement terminé ! Vérifie les logs avec : pm2 logs lynx"
echo "--------------------------------------------------"
echo "ℹ️ Rappel de configuration nécessaire :"
echo "1. Fichier .env : Doit contenir AUTH_SECRET, AUTH_URL et AUTH_TRUST_HOST=true"
echo "2. Nginx : Doit inclure X-Forwarded-Proto, X-Forwarded-Host et X-Forwarded-Prefix"
echo "--------------------------------------------------"
echo "👉 Accès : https://alphatek.fr/lynx/"
