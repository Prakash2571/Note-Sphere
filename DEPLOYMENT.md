# Deploy NoteSphere to a VPS

This repository is a Next.js 16 app. The tracked deployment files use PM2 for the app and Nginx for the domain `notesphere.fun`. Run these steps on the VPS as the normal app user. The deployment script does not create secrets or install system packages.

## One-time setup

1. Point the DNS A record for `notesphere.fun` to the VPS IP. Open ports 80 and 443 in the VPS firewall.
2. Install Node.js 20.9 or newer, npm, Nginx, curl, Git, and PM2 (`npm install -g pm2`). Give the app user `sudo` access to validate and reload Nginx.
3. Clone `https://github.com/Prakash2571/Note-Sphere.git` and check out `main`.
4. In the repository, copy `.env.example` to `.env.production.local` and fill in real values. Set `AUTH_URL=https://notesphere.fun` and keep `AUTH_SECRET` stable. Do not commit this file. Set R2 CORS origins to `https://notesphere.fun` as described in the README. For Google sign-in, add `https://notesphere.fun/api/auth/callback/google` as an authorized redirect URI.
5. Run `./start.sh`. It requires a clean `main` checkout, pulls with fast-forward only, runs `npm ci` and `npm run build`, starts or reloads PM2, installs the HTTP Nginx site if missing, validates Nginx, and checks the local app and proxy.
6. After DNS reaches the VPS, install a TLS certificate with `sudo certbot --nginx -d notesphere.fun`. Certbot may edit the installed Nginx site in `/etc/nginx/sites-available`; later runs of `start.sh` preserve that copy. Check `https://notesphere.fun`.
7. Run `pm2 startup`, follow the command it prints, then run `pm2 save` so the app returns after a reboot.

## Later deployments

From a clean `main` checkout, run `./start.sh` again. If it stops, inspect `pm2 logs notesphere --lines 100` and `sudo nginx -t`. The script does not overwrite an existing Nginx site, including Certbot's HTTPS changes.

The landing page and Nginx response checks confirm that the server is reachable. They do not validate MongoDB, R2, Google sign-in, or PDF uploads; test those after filling in production credentials.
