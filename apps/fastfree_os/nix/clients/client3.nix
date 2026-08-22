{
  hostName = "client3";
  domain   = "client3.fastfree.cloud";
  wireguardAddress = "10.100.0.7";

  deployType = "hostinger";
  deployHost = "fastfree.cloud";
  deployPassword = "Fastfree@2026";

  passwords = {
    root        = "Fastfree@2026";
    admin       = "Fastfree@2026";
    mariadbRoot = "Fastfree@2026";
    mariadbUser = "Fastfree@2026";
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
    fastfree_website = true;
    wireguard   = true;
    avahi       = true;
  };

  subdomains = {
    db    = "db";
  };

  githubAccount = "FastFreeCloud";

  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILA5GRXOSiMnQEib+pXSH9CU10ujSc4qX8/GjblJKgM7 client3-deploy"
  ];

  networking = {
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
  };

  gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";

  extra = {
    timezone  = "Africa/Cairo";
  };

  wireguard = {
    enable    = true;
    address   = "10.100.0.7";
    listenPort = 51820;
    privateKey = "QHQ7138SsIV9VxSN3RNOQqr2VOqJ6N934AAdbJbL9Vo=";
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
        publicKey = "rbrbWmSZvggjRdmKu0ach3Q0doyjp8y2RDx9M45WenA=";
        address   = "10.100.3.1";
        allowedIPs = [ "10.100.3.1/32" ];
      };
      c3-device2 = {
        publicKey = "laAp+UUU/E/w2b0ybTibCvDsVu2dh4USRYz5NnvlGVo=";
        address   = "10.100.3.2";
        allowedIPs = [ "10.100.3.2/32" ];
      };
      c3-device3 = {
        publicKey = "cDQa13iYqdL1Cnf5JS18sL599CFX2ADhQVouJsM7Yy4=";
        address   = "10.100.3.3";
        allowedIPs = [ "10.100.3.3/32" ];
      };
      c3-device4 = {
        publicKey = "A3IiosJh6cVXOQWjbXEDAwvpXhejrPn4o9SS7IN8SDM=";
        address   = "10.100.3.4";
        allowedIPs = [ "10.100.3.4/32" ];
      };
      c3-device5 = {
        publicKey = "MRqjg01M7CvK3XT8awMCX+90H5abJ+s2cSn4JcREdHQ=";
        address   = "10.100.3.5";
        allowedIPs = [ "10.100.3.5/32" ];
      };
    };
  };

  avahi = {
    enable     = true;
    reflector  = false;
    interfaces = [ "eth0" "wg0" ];
  };
}
