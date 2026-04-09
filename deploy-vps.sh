#!/bin/bash
set -e

# Script de déploiement pour LYNX sur VPS (Ubuntu/Debian)
# À exécuter depuis /var/www/lynx sur le serveur de production

echo "🚀 Démarrage du déploiement de LYNX..."

# 1. Récupération du code
echo "📦 1. Récupération des dernières modifications..."
git pull origin main

# 2. Installation des dépendances
echo "⚙️  2. Installation des dépendances (Monorepo)..."
npm install --legacy-peer-deps

# 3. Génération du client Prisma
echo "🗄️  3. Génération du client Prisma..."
npm run generate -w @lynx/prisma

# 4. Build du projet (Turborepo : packages → api → web)
echo "🏗️  4. Construction de l'API et de l'application Web..."
chmod +x node_modules/.bin/turbo node_modules/.bin/tsx 2>/dev/null || true
npx turbo run build --filter=api --filter=web

# 5. Redémarrage des services avec PM2
echo "🔄 5. Redémarrage des services PM2..."
pm2 restart lynx-api lynx-web || pm2 start ecosystem.config.js

# 6. Sauvegarde de la config PM2
pm2 save

echo ""
echo "✅ Déploiement terminé avec succès !"
echo "🌐 API  → https://alphatek.fr/lynx/api"
echo "🌐 Web  → https://alphatek.fr/lynx"
echo ""
echo "📊 Statut des processus :"
pm2 status
