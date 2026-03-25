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

# 3. Installation des dépendances (si nécessaire)
echo "📦 Installation des dépendances..."
npm install
# Correction des permissions d'exécution (tsc, turbo, etc.) sur les VPS Linux en root
chmod +x node_modules/typescript/bin/tsc 2>/dev/null || true
chmod +x node_modules/.bin/* 2>/dev/null || true
find packages apps infra -type d -name ".bin" -exec chmod +x {}/* \; 2>/dev/null || true

# Diagnostic si erreur de corruption tsc
echo "🔍 Vérification de l'espace disque..."
df -h | grep '^/dev/'
echo "🔍 Vérification de l'intégrité de tsc.js à la ligne 2410..."
sed -n '2410p' node_modules/typescript/lib/tsc.js || echo "Fichier tsc.js inaccessible"

# 4. Synchronisation Prisma (Base de données)
echo "🗄️ Synchronisation du schéma de base de données..."
npx prisma db push

# 5. Compilation Next.js
echo "🏗️ Construction de l'application (npm run build)..."
npm run build

# 6. Relance du processus
echo "♻️ Redémarrage de LYNX avec mise à jour de l'environnement..."
pm2 restart lynx --update-env || pm2 start npm --name "lynx" -- start

# 7. Persistance PM2
pm2 save

echo "✅ Déploiement terminé avec succès !"
echo "--------------------------------------------------"
echo "ℹ️ Rappel de configuration nécessaire :"
echo "1. Fichier .env : Doit contenir AUTH_SECRET, AUTH_URL et AUTH_TRUST_HOST=true"
echo "2. Nginx : Doit inclure X-Forwarded-Proto, X-Forwarded-Host et X-Forwarded-Prefix"
echo "--------------------------------------------------"
echo "👉 Accès : https://alphatek.fr/lynx/"
