# Deploying Iposi to `https://yusa.app/iposi/`

Same shape as the `telemetria` deployment: a static Vite build served by nginx
under a sub-path, plus a small Node API reverse-proxied at `…/iposi/api/`.

```
browser ──► nginx (yusa.app, :443)
              ├─ /iposi/            → static files   (/var/www/iposi)
              └─ /iposi/api/  ──►   127.0.0.1:3001   (Node API, systemd)
                                        └─► MSSQL  <db-host>\<INSTANCE>  (db "iposi")
```

Nothing in the database changes — the Node API talks to the **existing**
`users`, `user_tokens` and `api_history` tables, and reuses the exact SHA-256
password hashing, so accounts created by the old Delphi app keep working.

This guide is the **build-on-the-server** flow that was actually used: the repo
is cloned to `~/iposi-react` on the VM and everything is done there — no
`rsync`-over-SSH from a laptop.

---

## 0. Server prerequisites (one time)

### 0a. Broken SSH client config (only if `git` / `rsync` over SSH fails)

Symptom: `/etc/ssh/ssh_config: line NN: Bad configuration option: permitrootlogin`.
`PermitRootLogin` is an **sshd** option that was pasted into the **client**
config. Comment it out:

```bash
sudo cp /etc/ssh/ssh_config /etc/ssh/ssh_config.bak
sudo sed -i 's/^[[:space:]]*[Pp]ermit[Rr]oot[Ll]ogin.*/# &  (belongs in sshd_config)/' /etc/ssh/ssh_config
ssh -G localhost >/dev/null && echo "ssh_config OK"
```

### 0b. IPv6 is advertised but unroutable (breaks `npm`, `curl`, `apt`)

Symptom: `ping registry.npmjs.org` resolves to a `2606:...` address with 100%
packet loss; `npm ci` dies with `ECONNRESET`. Make the whole system prefer IPv4:

```bash
echo 'precedence ::ffff:0:0/96  100' | sudo tee -a /etc/gai.conf
# verify
curl -sI https://registry.npmjs.org/ | head -1     # HTTP/2 200
```

### 0c. Node 22 LTS, system-wide

The default distro Node (18) is too old for some `mssql` sub-dependencies
(`@azure/*` want Node ≥ 20/22) and systemd needs `/usr/bin/node`, so install
NodeSource's system package rather than a per-user nvm:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v        # v22.x, npm 10.x
```

---

## 1. Get the code and build (on the server)

```bash
cd ~
git clone <your-repo-url> iposi-react      # or: git -C iposi-react pull
cd iposi-react

export NODE_OPTIONS=--dns-result-order=ipv4first   # belt-and-braces, see 0b

( cd server && npm ci --no-audit --no-fund && npm run build )   # → server/dist
( cd client && npm ci --no-audit --no-fund && npm run build )   # → client/dist  (base = /iposi/)
```

`client` pulls the heavy dev toolchain (vite, codemirror). If its `npm ci` keeps
resetting, retry 2–3 times or run `npm install --no-audit --no-fund`. `server`
has only ~6 prod deps and installs quickly.

---

## 2. Publish the static front-end

```bash
sudo mkdir -p /var/www/iposi
sudo rsync -a --delete ~/iposi-react/client/dist/ /var/www/iposi/
sudo chown -R www-data:www-data /var/www/iposi
```

---

## 3. Publish the API

```bash
sudo mkdir -p /opt/iposi-api
sudo rsync -a --delete ~/iposi-react/server/dist/ /opt/iposi-api/dist/
sudo cp ~/iposi-react/server/package.json ~/iposi-react/server/package-lock.json /opt/iposi-api/
( cd /opt/iposi-api && sudo npm ci --omit=dev --no-audit --no-fund )
```

Create `/opt/iposi-api/.env` (it is **not** in git):

```bash
sudo tee /opt/iposi-api/.env >/dev/null <<'EOF'
PORT=3001
NODE_ENV=production
DB_SERVER=__DB_HOST__
DB_INSTANCE=__INSTANCE__
DB_PORT=
DB_USER=__DB_USER__
DB_PASSWORD=__SET_ME__
DB_NAME=iposi
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true
SESSION_SECRET=__SET_ME__
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
CORS_ORIGIN=https://yusa.app
PROXY_TIMEOUT_MS=15000
PROXY_MAX_BYTES=10485760
EOF
sudo chmod 600 /opt/iposi-api/.env
sudo chown -R www-data:www-data /opt/iposi-api
```

* `SESSION_SECRET` — generate once:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
* **MSSQL named instance:** a named instance needs the SQL Browser service
  (UDP 1434) reachable from the VM. If it is not, set a static TCP port on the
  instance and use `DB_PORT=1433` with `DB_INSTANCE=` left empty.

---

## 4. systemd unit

Write it in **one** clean heredoc (paste the whole block at once):

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
sleep 3
sudo journalctl -u iposi-api -n 40 --no-pager
curl -s http://127.0.0.1:3001/api/health ; echo
```

Expected log: `[iposi] API listening on :3001 (prod)` then `[db] connected …`.
Health should return `{"status":"ok","db":"up"}`.

* `{"status":"degraded","db":"down"}` → API is up but can't reach MSSQL; check
  the journal and the named-instance note in step 3.
* empty response → you queried before boot finished, or it isn't listening:
  `sudo ss -ltnp | grep 3001`.

---

## 5. nginx

Find the `yusa.app` server block (telemetria lives there too):

```bash
sudo grep -rl 'server_name .*yusa\.app' /etc/nginx/
```

Inside its `server { listen 443 ssl; server_name yusa.app; … }` block add the
following. **Use `root /var/www;`, not `alias`** — an `alias` inside a regex
`location` (the assets cache rule) maps every file to the directory itself and
returns `403`.

```nginx
# ---- Iposi static front-end ----
location /iposi/ {
    root /var/www;                     # /var/www + /iposi/...  →  /var/www/iposi/...
    try_files $uri $uri/ /iposi/index.html;
}
location = /iposi { return 301 /iposi/; }

# long cache for the content-hashed assets (root + regex location works fine)
location ~* ^/iposi/assets/.+\.(js|css|woff2?|png|svg|ico)$ {
    root /var/www;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# ---- Iposi API ----
# The trailing "/api/" on proxy_pass strips the "/iposi" prefix, so the Node app
# still sees "/api/auth/...", "/api/request", etc.
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

### Verify

```bash
curl -s  https://yusa.app/iposi/api/health                       # {"status":"ok","db":"up"}
curl -sI https://yusa.app/iposi/                                 # 200, text/html
curl -sI https://yusa.app/iposi/assets/index-*.css               # 200, text/css
```

Open `https://yusa.app/iposi/` — you should get the login screen. Existing Iposi
accounts (created by the Delphi app) log in unchanged.

---

## 6. Local Agent (localhost testing)

Unchanged. Users keep running `IposiAgent.exe` (System Tray, port `19090`,
`Access-Control-Allow-Origin: *`). The web app auto-detects `localhost` /
`127.0.0.1` URLs and `fetch()`es them straight through the agent from the
browser — loopback HTTP is allowed from an HTTPS page in Chrome/Firefox, so
there is no mixed-content problem. If the agent is not running the response pane
shows `AGENT ERROR` with the "please ensure IposiAgent is running" message,
exactly like the original.

Optionally repoint the agent's tray "Open Iposi" link and its README URL from
`https://hasup.net/iposi` to `https://yusa.app/iposi`.

---

## 7. Updating later

On the server:

```bash
cd ~/iposi-react && git pull
( cd server && npm ci --no-audit --no-fund && npm run build )
( cd client && npm ci --no-audit --no-fund && npm run build )

sudo rsync -a --delete ~/iposi-react/client/dist/ /var/www/iposi/
sudo chown -R www-data:www-data /var/www/iposi

sudo rsync -a --delete ~/iposi-react/server/dist/ /opt/iposi-api/dist/
sudo cp ~/iposi-react/server/package.json ~/iposi-react/server/package-lock.json /opt/iposi-api/
( cd /opt/iposi-api && sudo npm ci --omit=dev --no-audit --no-fund )
sudo systemctl restart iposi-api
curl -s http://127.0.0.1:3001/api/health ; echo
```

(If `package.json` dependencies did not change you can skip the `server`
`npm ci` and just refresh `dist/` + restart.)
