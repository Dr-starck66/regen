FROM caddy:2-alpine
COPY saudi-adviser-site/Caddyfile /etc/caddy/Caddyfile
COPY saudi-adviser-site/ /usr/share/caddy
