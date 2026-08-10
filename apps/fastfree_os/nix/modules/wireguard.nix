# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  WireGuard — Built-in NixOS module (no Portal, no Docker)                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

{ config, lib, pkgs, ... }:

let
  wg = config.fastfree.wireguard;
in {
  options.fastfree.wireguard = {
    enable = lib.mkEnableOption "WireGuard VPN interface (wg0)";

    address = lib.mkOption {
      type = lib.types.str;
      default = "10.100.0.1";
      description = "WireGuard interface IPv4 address (without CIDR).";
    };

    listenPort = lib.mkOption {
      type = lib.types.int;
      default = 51820;
      description = "WireGuard UDP listen port.";
    };

    privateKey = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "WireGuard private key (base64). Baked into the image at build time.";
    };

    peers = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          publicKey = lib.mkOption {
            type = lib.types.str;
            description = "WireGuard public key (base64).";
          };
          address = lib.mkOption {
            type = lib.types.str;
            description = "Peer IPv4 address (e.g. 10.100.0.2).";
          };
          endpoint = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = "Peer endpoint host:port (empty = not set).";
          };
          allowedIPs = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = "List of CIDR allowed IPs (e.g. [\"10.100.0.2/32\"]).";
          };
          persistentKeepalive = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Send keepalive every 25s (for NAT traversal).";
          };
        };
      });
      default = {};
      description = "WireGuard peers.";
    };
  };

  config = lib.mkIf wg.enable {
    # Write private key file at build time (baked into the image)
    environment.etc."wireguard/${config.fastfree.identity.name}.key".text = wg.privateKey;

    networking.wireguard = {
      enable = true;
      interfaces.wg0 = {
        ips = [ "${wg.address}/24" ];
        listenPort = wg.listenPort;
        generatePrivateKeyFile = false;
        privateKeyFile = "/etc/wireguard/${config.fastfree.identity.name}.key";

        peers = lib.mapAttrsToList (peerName: peer: {
          publicKey = peer.publicKey;
          allowedIPs = peer.allowedIPs;
          endpoint = if peer.endpoint != "" then peer.endpoint else null;
          persistentKeepalive = if peer.persistentKeepalive then 25 else null;
        }) wg.peers;
      };
    };

    networking.firewall = {
      allowedUDPPorts = [ wg.listenPort ];
      trustedInterfaces = [ "wg0" ];
    };

    environment.systemPackages = with pkgs; [
      wireguard-tools
    ];

    boot.kernelModules = [ "wireguard" ];

    # Required for WireGuard policy routing
    boot.kernel.sysctl = {
      "net.ipv4.conf.all.src_valid_mark" = 1;
    };
  };
}
