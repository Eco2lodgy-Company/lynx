#!/bin/bash
set -e

# Script de déploiement LYNX v12.0 (VPS Production)
# Ports: API→3021 | Web→3020
# Exécution: bash /var/www/lynx/deploy-vps.sh

echo "🚀 Déploiement LYNX v12.0..."

# 1. Sync du code
echo "📦 1. Récupération des dernières modifications..."
cd /var/www/lynx
git pull origin main

# 2. Arrêt ciblé de LYNX seulement
echo "🛑 2. Arrêt des services LYNX..."
pm2 delete lynx-api lynx-web || true
fuser -k 3020/tcp 3021/tcp || true

# 3. Installation des dépendances
echo "⚙️  3. Installation des dépendances..."
npm install --legacy-peer-deps

# 4. Génération Prisma
echo "🗄️  4. Génération du client Prisma..."
npm run generate -w @lynx/prisma

# 5. Build API indépendant
echo "🏗️  5. Build de l'API..."
cd /var/www/lynx/apps/api
npm install
npm run build

# 6. Build Web indépendant (with strict next.config)
echo "🏗️  6. Build du Web (Next.js)..."
cd /var/www/lynx/apps/web
npm install

# Injecter next.config.mjs stable
cat <<EOM > next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/lynx",
  trailingSlash: true,
  reactStrictMode: true,
};
export default nextConfig;
EOM

npm run build

# 7. Remettre dans le répertoire racine
cd /var/www/lynx

# 8. Mise à jour Nginx (config complète + routeur smart assets)
echo "🌐 7. Mise à jour Nginx..."
cat <<'NGINX' > /etc/nginx/sites-enabled/default
map $http_referer $next_port {
    default     3020;
    "~*/gesperf/"  4000;
    "~*/lynx/"     3020;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Routeur intelligent des assets Next.js
    location /_next/ {
        proxy_pass http://localhost:$next_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # GESPERF
    location /gesperf/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # LYNX API
    location /lynx/api/ {
        rewrite ^/lynx/api/(.*) /api/$1 break;
        proxy_pass http://localhost:3021;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # LYNX WEB
    location /lynx/ {
        proxy_pass http://localhost:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /lynx {
        return 301 $scheme://$http_host/lynx/;
    }

    location / {
        root /var/www/html;
        try_files $uri $uri/ =404;
    }
}

server { listen 8084; server_name alphatek.fr; root /root/data/drive/shop; location / { autoindex on; } }
server { listen 8086; server_name alphatek.fr; root /root/data/drive/products; location / { autoindex on; } }
server { listen 8087; server_name alphatek.fr; root /root/data/drive/pubs; location / { autoindex on; } }
NGINX

nginx -t && systemctl restart nginx

# 9. Lancement PM2
echo "🔄 8. Lancement des services PM2..."
pm2 start /var/www/lynx/ecosystem.config.js
pm2 save

echo ""
echo "✅ Déploiement LYNX v12.0 terminé !"
echo "🌐 Web → https://alphatek.fr/lynx/"
echo "🔌 API → https://alphatek.fr/lynx/api/health"
echo ""
pm2 status
