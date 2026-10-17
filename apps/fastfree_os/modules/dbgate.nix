{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.dbgate {

    # Native DbGate Web Interface running on 127.0.0.1:8082 (Zero Podman)
    # Manages MariaDB, Redis Cache, and Redis Queue in a modern UI
    systemd.services.dbgate = {
      description = "DbGate Database Management Web Interface";
      after = [
        "network.target"
        "mysql.service"
        "redis-fastfree-redis-cache.service"
        "redis-fastfree-redis-queue.service"
      ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        PORT = "8082";
        DATADIR = "/var/lib/dbgate";
        HOME = "/var/lib/dbgate";
        CONNECTIONS = "mariadb,redis_cache,redis_queue";

        # MariaDB connection (127.0.0.1 port 3306)
        LABEL_mariadb = "FastFree MariaDB";
        SERVER_mariadb = "127.0.0.1";
        PORT_mariadb = "3306";
        USER_mariadb = "root";
        ENGINE_mariadb = "mysql@dbgate-plugin-mysql";

        # Redis Cache connection (127.0.0.1 port 11000)
        LABEL_redis_cache = "FastFree Redis Cache";
        SERVER_redis_cache = "127.0.0.1";
        PORT_redis_cache = "11000";
        ENGINE_redis_cache = "redis@dbgate-plugin-redis";

        # Redis Queue connection (127.0.0.1 port 11001)
        LABEL_redis_queue = "FastFree Redis Queue";
        SERVER_redis_queue = "127.0.0.1";
        PORT_redis_queue = "11001";
        ENGINE_redis_queue = "redis@dbgate-plugin-redis";
      };
      path = [ pkgs.nodejs_22 pkgs.bash pkgs.coreutils pkgs.gnutar ];
      serviceConfig = {
        Type = "simple";
        DynamicUser = true;
        StateDirectory = "dbgate";
        WorkingDirectory = "/var/lib/dbgate";
        Restart = "on-failure";
        RestartSec = "5s";
        ExecStartPre = "+${pkgs.writeShellScript "dbgate-setup" ''
          mkdir -p /srv/dbgate
          if [ ! -f /srv/dbgate/node_modules/.bin/dbgate-serve ]; then
            cd /srv/dbgate
            ${pkgs.nodejs_22}/bin/npm install --omit=dev dbgate-serve
          fi
          chmod -R a+rX /srv/dbgate
        ''}";
        ExecStart = "${pkgs.nodejs_22}/bin/node /srv/dbgate/node_modules/.bin/dbgate-serve";
      };
    };
  };
}
