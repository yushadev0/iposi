# Deployment

Iposi is a static Vite build served by nginx under the `/iposi/` sub-path, plus
a Node API reverse-proxied at `/iposi/api/`. The examples below use the domain
`yusa.app` (the live instance) — substitute your own.

```
browser ──► nginx (:443)
              ├─ /iposi/            → static files   (/var/www/iposi)
              └─ /iposi/api/  ──►   127.0.0.1:3001   (Node API, systemd)
                                        └─► SQL Server   (database "iposi")
```

The API expects the `users`, `user_tokens` and `api_history` tables to already
exist in the target database.

---

## 1. Prerequisites

- **Node 20+** with a matching npm. Install it system-wide (systemd runs
  `/usr/bin/node`), e.g. via NodeSource:

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v
  ```

- **nginx** with the site's TLS server block already configured.
- **SQL Server** reachable from the host, with the three tables above.
- Enough disk for the client's dev toolchain during `npm ci` (~300 MB, build
  only).

---

## 2. Build

Clone the repo on the host (or build elsewhere and copy `client/dist` +
`server/dist` over):

```bash
git clone https://github.com/yushadev0/iposi.git
cd iposi

( cd server && npm ci && npm run build )   # → server/dist
( cd client && npm ci && npm run build )   # → client/dist   (base = /iposi/)
```

---

## 3. Deploy the web client

```bash
sudo mkdir -p /var/www/iposi
sudo rsync -a --delete client/dist/ /var/www/iposi/
sudo chown -R www-data:www-data /var/www/iposi
```

---

## 4. Deploy the API

```bash
sudo mkdir -p /opt/iposi-api
sudo rsync -a --delete server/dist/ /opt/iposi-api/dist/
sudo cp server/package.json server/package-lock.json /opt/iposi-api/
( cd /opt/iposi-api && sudo npm ci --omit=dev )
```

Create `/opt/iposi-api/.env` (not tracked in git). See
[`server/.env.example`](server/.env.example) for every key.

```bash
sudo tee /opt/iposi-api/.env >/dev/null <<'EOF'
PORT=3001
NODE_ENV=production

DB_SERVER=your-sql-host
DB_INSTANCE=SQLEXPRESS         # or leave blank and set DB_PORT
DB_PORT=
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=iposi
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

SESSION_SECRET=replace_with_a_long_random_string
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

CORS_ORIGIN=https://yusa.app

PROXY_TIMEOUT_MS=15000
PROXY_MAX_BYTES=10485760
EOF
sudo chmod 600 /opt/iposi-api/.env
sudo chown -R www-data:www-data /opt/iposi-api
```

- Generate `SESSION_SECRET`:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- A **named instance** (`DB_INSTANCE`) needs the SQL Browser service (UDP 1434)
  reachable from the host. Otherwise leave `DB_INSTANCE` blank and set
  `DB_PORT` to the instance's static TCP port.

### systemd service

```bash
sudo tee /etc/systemd/system/iposi-api.service >/dev/null <<'EOF'
[Unit]
Description=Iposi API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/iposi-api
EnvironmentFile=/opt/iposi-api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=3
User=www-data
Group=www-data
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/iposi-api
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now iposi-api
sudo systemctl status iposi-api --no-pager
```

Check it:

```bash
curl -s http://127.0.0.1:3001/api/health ; echo
```

- `{"status":"ok","db":"up"}` — ready.
- `{"status":"degraded","db":"down"}` — API is up but can't reach SQL Server;
  see `journalctl -u iposi-api -n 50` and the named-instance note above.
- empty / connection refused — not listening yet or crashed:
  `sudo ss -ltnp | grep 3001` and check the journal.

---

## 5. nginx

Add the following inside the site's `server { listen 443 ssl; server_name
yusa.app; … }` block.

> Use `root /var/www;`, **not** `alias`. `alias` inside a regex `location` (the
> asset-cache rule) resolves every request to the directory itself and returns
> `403`.

```nginx
# ---- Iposi web client ----
location /iposi/ {
    root /var/www;                     # /var/www + /iposi/...  ->  /var/www/iposi/...
    try_files $uri $uri/ /iposi/index.html;
}
location = /iposi { return 301 /iposi/; }

# content-hashed assets: long cache
location ~* ^/iposi/assets/.+\.(js|css|woff2?|png|svg|ico)$ {
    root /var/www;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# ---- Iposi API ----
# The trailing "/api/" on proxy_pass strips the "/iposi" prefix, so the Node
# app still sees "/api/auth/...", "/api/request", etc.
location /iposi/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;            # outbound proxy requests can be slow
    client_max_body_size 6m;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Verify

```bash
curl -s  https://yusa.app/iposi/api/health          # {"status":"ok","db":"up"}
curl -sI https://yusa.app/iposi/                    # 200, text/html
curl -sI https://yusa.app/iposi/assets/index-*.css  # 200, text/css
```

Then open `https://yusa.app/iposi/` — the login screen should load, and
existing accounts sign in unchanged.

---

## 7. Updating

Once the first deploy is done, use the bundled script for every subsequent
release — it pulls, rebuilds, republishes both halves, restarts the service and
waits for the health check:

```bash
cd iposi
./scripts/deploy.sh
```

Flags: `--no-pull` (deploy the working tree), `--no-build` (reuse existing
`dist/`). Paths are overridable via `IPOSI_WEB_ROOT`, `IPOSI_API_DIR`,
`IPOSI_SERVICE`, `IPOSI_HEALTH_URL`.

<details>
<summary>Equivalent manual steps</summary>

```bash
cd iposi && git pull
( cd server && npm ci && npm run build )
( cd client && npm ci && npm run build )

sudo rsync -a --delete client/dist/ /var/www/iposi/
sudo chown -R www-data:www-data /var/www/iposi

sudo rsync -a --delete server/dist/ /opt/iposi-api/dist/
sudo cp server/package.json server/package-lock.json /opt/iposi-api/
( cd /opt/iposi-api && sudo npm ci --omit=dev )
sudo systemctl restart iposi-api
curl -s http://127.0.0.1:3001/api/health ; echo
```

</details>

---

## 8. Local Agent (localhost testing)

Requests to `localhost` / `127.0.0.1` are sent from the browser straight to the
**IposiAgent** companion app (system tray, port `19090`, sends
`Access-Control-Allow-Origin: *`). Loopback HTTP is treated as a secure context
by Chrome and Firefox, so there is no mixed-content issue from the HTTPS page.
When the agent is not running, the response pane shows `AGENT ERROR`. No
server-side configuration is required for this path.

---

## 9. Troubleshooting

**`npm ci` fails with `ECONNRESET` and `ping registry.npmjs.org` shows an IPv6
address with 100 % loss.** The host advertises unroutable IPv6. Prefer IPv4
system-wide:

```bash
echo 'precedence ::ffff:0:0/96  100' | sudo tee -a /etc/gai.conf
```

**`git` / `rsync` over SSH aborts with `Bad configuration option:
permitrootlogin`.** `PermitRootLogin` is an `sshd` directive that ended up in
the SSH *client* config. Comment it out in `/etc/ssh/ssh_config` (it belongs in
`sshd_config`, if anywhere).

**`npm` warns `EBADENGINE … required: node >=20`.** The `mssql` driver pulls
`@azure/*` packages that want Node ≥ 20. Upgrade Node (see Prerequisites).

**Assets return `403` while `index.html` is `200`.** The nginx block is using
`alias` instead of `root` — see the note in section 5.

**Health is `db:"down"`.** The API process is fine; it cannot open a SQL Server
connection. Check host/instance/port/credentials in `/opt/iposi-api/.env` and
that the DB host is reachable (`nc -vz <host> 1433`).
