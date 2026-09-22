# ThinkerStreet Law subdomain deployment

This branch keeps the ThinkerStreet legal interface in the MikeOSS fork while
serving it from:

    https://law.thinkerstreet.com

## Flask layout

The main Flask process registers two blueprints:

- thinkerstreet_ai: the general ThinkerStreet site
- mikeoss_law: the MikeOSS-derived ThinkerStreet Law surface

The law blueprint owns:

- GET /law
- POST /api/law/chat

On the primary ThinkerStreet host, GET /law redirects to the canonical law
subdomain. On law.thinkerstreet.com, Nginx proxies / internally to /law while
preserving the Host header, so the browser shows the clean subdomain URL.

## Server environment

Use the same server-side environment as the main Flask process. At minimum:

    GROQ_API_KEY=...
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_SECRET_KEY=sb_secret_...
    IP_HASH_SECRET=...
    THINKERSTREET_LAW_URL=https://law.thinkerstreet.com
    LAW_CANONICAL_REDIRECT=1
    GROQ_ZDR_ENABLED=1

Optional model overrides:

    GROQ_FAST_MODEL=openai/gpt-oss-20b
    GROQ_SMART_MODEL=openai/gpt-oss-120b
    GROQ_DEEP_MODEL=qwen/qwen3.8-27b

Do not commit .env files or secrets.

## DNS

Create an A record for law.thinkerstreet.com pointing to the public IPv4
address of the Flask/Nginx server. Add an AAAA record only if IPv6 is configured.

## Nginx

Create /etc/nginx/sites-available/law.thinkerstreet.com:

    server {
        listen 80;
        listen [::]:80;
        server_name law.thinkerstreet.com;

        location = / {
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:8000/law;
        }

        location / {
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:8000;
        }
    }

Enable it:

    sudo ln -s /etc/nginx/sites-available/law.thinkerstreet.com /etc/nginx/sites-enabled/law.thinkerstreet.com
    sudo nginx -t
    sudo systemctl reload nginx

## TLS / SSL

After DNS resolves to the server and TCP port 80 is reachable:

    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d law.thinkerstreet.com

Certbot obtains a Let's Encrypt certificate, updates Nginx for HTTPS, and
installs automatic renewal. Verify renewal with:

    sudo certbot renew --dry-run

## Production WSGI

Do not use Flask's development server in production. Run behind Nginx with
Gunicorn or another WSGI server, for example:

    gunicorn -w 3 -b 127.0.0.1:8000 app:app

A systemd service is recommended.

## AGPL

MikeOSS is AGPL-3.0. Keep the visible MikeOSS attribution and prominent source
link in the law interface, and make the complete corresponding source for the
network-deployed version available as required by the license.
