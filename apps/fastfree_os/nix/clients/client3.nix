{
  hostName = "client3";
  domain   = "client3.fastfree.cloud";
  wireguardAddress = "10.100.0.7";

  deployType = "hostinger";
  deployHost = "fastfree.cloud";
  deployPassword = "fastfree@2026";

  passwords = {
    root        = "fastfree@2026";
    admin       = "fastfree@2026";
    mariadbRoot = "fastfree@2026";
    mariadbUser = "fastfree@2026";
  };

  apps = {
    base        = true;
    mariadb     = true;
    caddy       = true;
    phpmyadmin  = true;
    fastfree_backend = true;
    fastfree_ledger  = true;
    fastfree_erp     = true;
    fastfree_hr      = true;
    fastfree_pos     = true;
    wireguard   = true;
    avahi       = true;
  };

  subdomains = {
    db    = "db";
  };

  githubAccount = "FastFreeCloud";
  githubToken   = "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";

  networking = {
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
  };

  gitOrigin = "https://github.com/FastFreeCloud/fastfree_os.git";

  extra = {
    timezone  = "Africa/Cairo";
  };

  wireguard = {
    enable    = true;
    address   = "10.100.0.7";
    listenPort = 51820;
    privateKey = "TBD_RUN_WG_KEYS_SCRIPT";
    peers = {
      dev = {
        publicKey = "fyQoOuejO7n+KKtWHFmqIQSGpfrYIJXwuRXNfdQjPyo=";
        address   = "10.100.0.1";
        endpoint  = "fastfree.cloud:51820";
        persistentKeepalive = true;
        allowedIPs = [ "10.100.0.1/32" "10.100.0.0/24" ];
      };
      client1 = {
        publicKey = "5981vGv8/IMPeWRTH9Tz9hMJBgWVbwRQNq1s3F4+Dng=";
        address   = "10.100.0.2";
        allowedIPs = [ "10.100.0.2/32" "10.100.1.0/24" ];
      };
      client2 = {
        publicKey = "rzLuQnTyzlpVl9o7nTVbgSHKERFvwwzDSAKUYiQQC1I=";
        address   = "10.100.0.6";
        allowedIPs = [ "10.100.0.6/32" "10.100.4.0/24" ];
      };
      server = {
        publicKey = "Acwhg0zWucRQgZiYLE+3poasjCmESLwTQ4HURH0cLGo=";
        address   = "10.100.0.3";
        endpoint  = "fastfree.cloud:51820";
        allowedIPs = [ "10.100.0.3/32" "10.100.2.0/24" ];
      };
      windows = {
        publicKey = "4xnEWzRg4oRA0Q76BB8LbSvXfAjw8KY28NW69Cp/qyo=";
        address   = "10.100.0.4";
        allowedIPs = [ "10.100.0.4/32" "10.100.0.0/24" ];
      };
      mobile = {
        publicKey = "SgWJb3+AmVYPpgvszjddowJOwJfq+zHid+88dgnEoVc=";
        address   = "10.100.0.5";
        allowedIPs = [ "10.100.0.5/32" "10.100.0.0/24" ];
      };
      c3-device1 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.3.1";
        allowedIPs = [ "10.100.3.1/32" ];
      };
      c3-device2 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.3.2";
        allowedIPs = [ "10.100.3.2/32" ];
      };
      c3-device3 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.3.3";
        allowedIPs = [ "10.100.3.3/32" ];
      };
      c3-device4 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.3.4";
        allowedIPs = [ "10.100.3.4/32" ];
      };
      c3-device5 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.3.5";
        allowedIPs = [ "10.100.3.5/32" ];
      };
    };
  };

  avahi = {
    enable     = true;
    reflector  = false;
    interfaces = [ "ens18" "wg0" ];
  };
}
