{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.phpmyadmin {

    # Native phpMyAdmin service running on 127.0.0.1:8082 (Zero Podman)
    systemd.services.phpmyadmin = {
      description = "phpMyAdmin Web Interface";
      after = [ "network.target" "mysql.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        DynamicUser = true;
        StateDirectory = "phpmyadmin";
        Restart = "on-failure";
        RestartSec = "5s";
        ExecStartPre = pkgs.writeShellScript "phpmyadmin-setup" ''
          mkdir -p /var/lib/phpmyadmin
          if [ ! -f /var/lib/phpmyadmin/config.inc.php ]; then
            cat > /var/lib/phpmyadmin/config.inc.php << 'EOF'
<?php
$cfg['blowfish_secret'] = 'fastfree_secret_passphrase_32_chars_long!';
$i = 1;
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['host'] = '127.0.0.1';
$cfg['Servers'][$i]['port'] = '3306';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';
EOF
          fi
        '';
        ExecStart = "${pkgs.php.withExtensions ({ enabled, all }: enabled ++ [ all.mysqli all.mbstring all.session ])}/bin/php -d config_file_path=/var/lib/phpmyadmin -S 127.0.0.1:8082 -t ${pkgs.phpmyadmin}";
      };
    };
  };
}
