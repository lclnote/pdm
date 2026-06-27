#!/bin/bash
# SSL証明書の初期取得スクリプト
# 初回のみ実行: sudo ./init-ssl.sh
# 更新は自動: certbot renew

DOMAIN=${1:-p.mng666.com}
EMAIL=${2:-admin@mng666.com}

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive" certbot

# 証明書を nginx/ssl にコピー
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

echo "SSL certificates installed for $DOMAIN"
