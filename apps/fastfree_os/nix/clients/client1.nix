{
  hostName = "fastfree";
  domain   = "fastfree.local";
  wireguardAddress = "10.100.0.1";
  deployType = "wsl";
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

  wsl = {
    defaultUser = "fastfree";
    useWindowsDriver = true;
    startMenuLaunchers = true;
    dockerDesktop = false;
    wrapBinSh = true;
    interop = {
      includePath = true;
      register = false;
    };
    wslConf = {
      boot.systemd = true;
      automount = {
        root = "/mnt";
        options = "metadata,uid=1000,gid=100";
      };
      network = {
        generateResolvConf = true;
      };
    };
    sshAgent = false;
    usbip = false;
  };

  wireguard = {
    enable    = true;
    address   = "10.100.0.1";
    listenPort = 51820;
    privateKey = "gDmh+nvubbBZSZraWBOga7ctp2Lki8nFb95P9ndGymg=";
    peers = {
      client2 = {
        publicKey = "rzLuQnTyzlpVl9o7nTVbgSHKERFvwwzDSAKUYiQQC1I=";
        address   = "10.100.0.6";
        allowedIPs = [ "10.100.0.6/32" "10.100.4.0/24" ];
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
    };
  };

  avahi = {
    enable     = true;
    reflector  = true;
    interfaces = [ "eth0" "wg0" ];
  };
}
