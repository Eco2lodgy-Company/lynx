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

# 4.5 Injection de la configuration Next.js (Force le basePath)
echo "⚙️ Injection de la configuration Next.js..."
rm -f apps/web/next.config.ts apps/web/next.config.js
cat <<EOF > apps/web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/lynx",
  assetPrefix: "/lynx",
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};
export default nextConfig;
EOF

# 5. Compilation monorepo
echo "🏗️ Construction de l'application (Nettoyage profonde)..."
rm -rf apps/web/.next apps/api/dist
npm run build

# 6. Relance PROPRE des processus (Via Ecosystem Config)
echo "♻️ Nettoyage et redémarrage des services..."

# Libération forcée des ports 3000 et 3001
fuser -k 3000/tcp 3001/tcp || true

# Suppression totale pour éviter les doublons de noms
pm2 delete lynx-api lynx-web lynx next-app || true

# Lancement via le fichier ecosystem (plus robuste)
pm2 start ecosystem.config.js --update-env


# 7. Persistance PM2
pm2 save

echo "✅ Déploiement terminé ! Vérifie les logs avec : pm2 logs lynx"
echo "--------------------------------------------------"
echo "ℹ️ Rappel de configuration nécessaire :"
echo "1. Fichier .env : Doit contenir AUTH_SECRET, AUTH_URL et AUTH_TRUST_HOST=true"
echo "2. Nginx : Doit inclure X-Forwarded-Proto, X-Forwarded-Host et X-Forwarded-Prefix"
echo "--------------------------------------------------"
echo "👉 Accès : https://alphatek.fr/lynx/"
