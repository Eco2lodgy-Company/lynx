#!/bin/bash

# Script de déploiement pour LYNX sur VPS (Ubuntu/Debian)
# À placer et exécuter à la racine du projet sur le serveur de production (/var/www/lynx ou similaire)

echo "🚀 Démarrage du déploiement de LYNX..."

# 1. Récupération du code
echo "📦 1. Récupération des dernières modifications..."
git pull origin main

# 2. Installation des dépendances
echo "⚙️  2. Installation des dépendances (Monorepo)..."
npm install

# 3. Synchronisation de la base de données (si Prisma est utilisé)
# Facultatif : décommentez si vous utilisez Prisma
# echo "🗄️  Génération et push du schéma Prisma..."
# npx prisma db push
# npx prisma generate

# 4. Build du projet (Turborepo gèrera l'ordre des builds : packages -> api -> web)
echo "🏗️  3. Construction de l'application Web et de l'API..."
npm run build

# 5. Redémarrage des services avec PM2
echo "🔄 4. Redémarrage des services..."
# Assurez-vous que les noms correspondent à votre configuration PM2 (ecosystem.config.js)
pm2 restart lynx-api lynx-web || pm2 restart all

echo "✅ Déploiement terminé avec succès !"
echo "🌐 L'application Web et l'API sont à jour."
