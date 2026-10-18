{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.fastfree_website {

    # Ensure website root directory exists
    systemd.tmpfiles.rules = [
      "d /srv/fastfree-website 0755 root root -"
    ];

    # Native Systemd service running Next.js standalone server on port 9004 (Zero Podman)
    systemd.services.fastfree-website = {
      description = "FastFree Website (Next.js Standalone / Portal)";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        NODE_ENV = "production";
        PORT = "9004";
        HOSTNAME = "127.0.0.1";
        NODE_PATH = "/srv/fastfree-website/node_modules:/root/fastfree-source/apps/fastfree_website/node_modules";
      };
      serviceConfig = {
        DynamicUser = false;
        User = "root";
        Group = "root";
        WorkingDirectory = "/srv/fastfree-website";
        Restart = "always";
        RestartSec = "5s";
        ExecStartPre = pkgs.writeShellScript "fastfree-website-prestart" ''
          mkdir -p /srv/fastfree-website
          if [ ! -f /srv/fastfree-website/server.js ]; then
            cat > /srv/fastfree-website/server.js << 'EOF'
const http = require('http');

const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FastFree Cloud · السحابة الحرة السريعة</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .hero {
      text-align: center;
      max-width: 680px;
      margin-bottom: 2.5rem;
    }
    .logo {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: var(--muted);
      font-size: 1.1rem;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      width: 100%;
      max-width: 850px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .card:hover {
      border-color: var(--primary);
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.2);
    }
    .card-icon {
      font-size: 1.8rem;
      margin-bottom: 0.75rem;
    }
    .card-title {
      font-weight: 700;
      font-size: 1.15rem;
      margin-bottom: 0.25rem;
    }
    .card-desc {
      color: var(--muted);
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 2rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="logo">🌐</div>
    <h1>FastFree Cloud</h1>
    <p>منظومة السحابة وإدارة الأعمال المتكاملة المبنية على NixOS و Clan</p>
  </div>

  <div class="grid">
    <a href="https://panel.fastfree.cloud" class="card">
      <div class="card-icon">🛡️</div>
      <div class="card-title">Clan Control Panel</div>
      <div class="card-desc">لوحة تحكم الأسطول والأجهزة وإدارة الأنظمة والصور</div>
    </a>
    <a href="https://ledger.fastfree.cloud" class="card">
      <div class="card-icon">📊</div>
      <div class="card-title">FastFree Ledger</div>
      <div class="card-desc">إدارة الحسابات والمبيعات والمخزون والمشتريات</div>
    </a>
    <a href="https://erp.fastfree.cloud" class="card">
      <div class="card-icon">🏢</div>
      <div class="card-title">Enterprise ERP</div>
      <div class="card-desc">منظومة تخطيط الموارد وإدارة المنشأة الكاملة</div>
    </a>
    <a href="https://hr.fastfree.cloud" class="card">
      <div class="card-icon">👥</div>
      <div class="card-title">Human Resources</div>
      <div class="card-desc">إدارة شؤون الموظفين والمرتبات والإجازات</div>
    </a>
    <a href="https://pos.fastfree.cloud" class="card">
      <div class="card-icon">💳</div>
      <div class="card-title">Point of Sale</div>
      <div class="card-desc">نقاط البيع السريعة وإدارة الفواتير والمدفوعات</div>
    </a>
    <a href="https://backend.fastfree.cloud" class="card">
      <div class="card-icon">⚡</div>
      <div class="card-title">Backend API Engine</div>
      <div class="card-desc">محرك الخادم وواجهات برمجة التطبيقات وقاعدة البيانات</div>
    </a>
  </div>

  <div class="status-badge">
    <span class="dot"></span>
    خادم client2 (NixOS 26.05) يعمل بنجاح
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(9004, '127.0.0.1', () => {
  console.log('FastFree Website listening on http://127.0.0.1:9004');
});
EOF
          fi
        '';
        ExecStart = "${pkgs.nodejs_22}/bin/node /srv/fastfree-website/server.js";
      };
    };
  };
}
