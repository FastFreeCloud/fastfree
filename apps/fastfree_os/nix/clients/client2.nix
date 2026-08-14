{
  hostName = "client2";
  domain   = "client2.fastfree.local";
  wireguardAddress = "10.100.0.6";
  deployType = "hyperv";
  build = true;

  passwords = {
    root        = "fastfree@2026";
    admin       = "fastfree@2026";
    mariadbRoot = "fastfree@2026";
    mariadbUser = "fastfree@2026";
  };

  apps = {
    base       = true;
    mariadb    = true;
    fastfree_backend = true;
    fastfree_ledger  = true;
    fastfree_erp     = true;
    fastfree_hr      = true;
    fastfree_pos     = true;
    fastfree_website = true;
    phpmyadmin = true;
    caddy      = true;
    wireguard  = true;
    avahi      = true;
  };

  subdomains = {
    db = "db";
  };

  githubAccount = "FastFreeCloud";
  githubToken   = "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";

  gitOrigin = "https://github.com/FastFreeCloud/fastfree_os.git";

  extra = {
    timezone  = "Africa/Cairo";
  };

  wireguard = {
    enable    = true;
    address   = "10.100.0.6";
    listenPort = 51820;
    privateKey = "KLgTYt+RQZQzb2e9fsFafhMbXiL6gprltGW1tsvPFGw=";
    peers = {
      dev = {
        publicKey = "fyQoOuejO7n+KKtWHFmqIQSGpfrYIJXwuRXNfdQjPyo=";
        address   = "10.100.0.1";
        endpoint  = "dev.local:51820";
        persistentKeepalive = true;
        allowedIPs = [ "10.100.0.1/32" "10.100.0.0/24" ];
      };
      client1 = {
        publicKey = "5981vGv8/IMPeWRTH9Tz9hMJBgWVbwRQNq1s3F4+Dng=";
        address   = "10.100.0.2";
        allowedIPs = [ "10.100.0.2/32" "10.100.1.0/24" ];
      };
      client3 = {
        publicKey = "TBD_RUN_WG_KEYS_SCRIPT";
        address   = "10.100.0.7";
        allowedIPs = [ "10.100.0.7/32" "10.100.3.0/24" ];
      };
      server = {
        publicKey = "Acwhg0zWucRQgZiYLE+3poasjCmESLwTQ4HURH0cLGo=";
        address   = "10.100.0.3";
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
      c2-device1 = {
        publicKey = "KgUjBwtbF7m6mZLoSW995OT8yZvylAMWS3INPmBOC3w=";
        address   = "10.100.4.1";
        allowedIPs = [ "10.100.4.1/32" ];
      };
      c2-device2 = {
        publicKey = "GBLg5v0eu3SF+p+0L/UL4d+kqsVWitqDH3r9uvdndHY=";
        address   = "10.100.4.2";
        allowedIPs = [ "10.100.4.2/32" ];
      };
      c2-device3 = {
        publicKey = "QF9nJQf38yugpTdbx8b4462FMKJeT+lbCvFYCOSHrRU=";
        address   = "10.100.4.3";
        allowedIPs = [ "10.100.4.3/32" ];
      };
      c2-device4 = {
        publicKey = "ml/Z+87Aa9/RrY1H0MUW+sf7LkowWh1O3AgTWchnkSg=";
        address   = "10.100.4.4";
        allowedIPs = [ "10.100.4.4/32" ];
      };
      c2-device5 = {
        publicKey = "mAmKqGwE50in2cRdG07uFxxrUYxoh3CCrM3kERrMnxA=";
        address   = "10.100.4.5";
        allowedIPs = [ "10.100.4.5/32" ];
      };
    };
  };

  avahi = {
    enable     = true;
    reflector  = false;
    interfaces = [ "eth0" "wg0" ];
  };
}
