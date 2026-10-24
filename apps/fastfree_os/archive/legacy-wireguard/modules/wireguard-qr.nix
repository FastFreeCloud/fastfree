# FastFree OS — WireGuard QR Code Generator
#
# Generates QR codes (PNG + SVG) and WireGuard .conf files for device configs
# at activation time using qrencode. The QR codes contain a valid WireGuard
# config WITHOUT the device private key (placeholder instead), so users can
# scan the code, paste their private key, and import into WireGuard apps.
#
# Controller public key and device addresses are read from Clan vars generators.
# Device addresses are derived via SHA256 of the device name (matching the
# official ipv6_allocator.py logic), so external and Clan peers look identical.
{ config, lib, pkgs, ... }:
let
  cfg = config.fastfree.wireguard.qr;
  instance = cfg.instance;
  domain = cfg.domain;

  # Vars generator names (must match clan.nix)
  networkGenerator = "wireguard-network-${instance}";
  keysGenerator = "wireguard-keys-${instance}";

  # Only generate on the controller (which has the network prefix)
  isController =
    cfg.enable
    && builtins.hasAttr networkGenerator config.clan.core.vars.generators
    && (
      config.clan.core.vars.generators.${networkGenerator}.files ? prefix
    );

  # Controller'"'"'s public values from official service vars
  controllerPrefix =
    config.clan.core.vars.generators.${networkGenerator}.files.prefix.value;
  controllerPublicKey =
    config.clan.core.vars.generators.${keysGenerator}.files.publickey.value;

  # Defaults matching wireguard-hubs.nix and wireguard-peers.nix
  devicePort = 51821;
  vpsEndpoint = "fastfree.cloud";
  persistentKeepalive = 25;

  # Device address derivation (SHA256 of name, first 64 bits)
  # Matches scripts/wg-peer-address.py and clanServices/wireguard/ipv6_allocator.py
  deviceIpv6Address = name: let
    digest = (builtins.hashString "sha256" name).substring 0 16;
    # Convert first 16 hex chars to 4 groups of 4: XXXX:XXXX:XXXX:XXXX
    suffix = "${digest.substring 0 4}:${digest.substring 4 4}:${digest.substring 8 4}:${digest.substring 12 4}";
  in "${controllerPrefix}:${suffix}";

  # IPv4 address: 10.0.<clientNum>.<deviceNum>
  # Device name format: client{N}_d_{M}
  deviceIpv4Address = name: let
    parts = lib.splitString "_" name;
    clientNum = (parts.!1).substring 6; # "clientN" -> "N"
    deviceNum = parts.!3;               # "d" -> device num
  in "10.0.${clientNum}.${deviceNum}";

  # Device subnet: 10.0.<clientNum>.0/24
  deviceSubnet = name: let
    parts = lib.splitString "_" name;
    clientNum = (parts.!1).substring 6;
  in "10.0.${clientNum}.0/24";

  # Gateway IP: 10.0.<clientNum>.254
  gatewayIpv4Address = name: let
    parts = lib.splitString "_" name;
    clientNum = (parts.!1).substring 6;
  in "10.0.${clientNum}.254";

  # Parse client number from name (clientN_d_M)
  clientNumFromName = name: let
    parts = lib.splitString "_" name;
  in (parts.!1).substring 6;

  # Backbone values (for clients >= 2)
  backbonePort = name: let
    clientNum = builtins.parseInt (clientNumFromName name) 10;
  in toString (51830 + clientNum - 2);

  backboneSubnet = name: let
    clientNum = builtins.parseInt (clientNumFromName name) 10;
    base = 4 * (clientNum - 2);
  in "10.0.0.${toString base}/30";

  backboneVpsIp = name: let
    clientNum = builtins.parseInt (clientNumFromName name) 10;
    base = 4 * (clientNum - 2);
  in "10.0.0.${toString (base + 1)}";

  # Build WireGuard config string for a device (NO private key)
  buildWireGuardConfig = name: clientPublicKey: let
    ipv6 = deviceIpv6Address name;
    ipv4 = deviceIpv4Address name;
    subnet = deviceSubnet name;
    gateway = gatewayIpv4Address name;
    clientNum = builtins.parseInt (clientNumFromName name) 10;
    hasBackbone = clientNum >= 2;
    bbPort = backbonePort name;
    bbSubnet = backboneSubnet name;
    bbVpsIp = backboneVpsIp name;
  in ''
    [Interface]
    PrivateKey = <PASTE PRIVATE KEY HERE>
    Address = ${ipv6}/128, ${ipv4}/24
    ListenPort = ${toString devicePort}

    [Peer]
    # Device network gateway (controller)
    PublicKey = ${controllerPublicKey}
    AllowedIPs = ${subnet}, ${gateway}/32
    Endpoint = ${vpsEndpoint}:${toString devicePort}
    PersistentKeepalive = ${toString persistentKeepalive}
    ${lib.optionalString hasBackbone ''
    [Peer]
    # Backbone link
    PublicKey = ${cfg.backbonePublicKey}
    AllowedIPs = ${subnet}, ${bbSubnet}
    Endpoint = ${vpsEndpoint}:${bbPort}
    PersistentKeepalive = ${toString persistentKeepalive}
    ''}
  '';

  # Device list from options
  devices = lib.mapAttrsToList (
    name: device: {
      inherit name;
      inherit (device) clientPublicKey type;
    }
  ) cfg.devices;

  # Generate QR codes and configs at activation time
  # We use a systemd service that runs at boot (via systemd.tmpfiles + activation)
  # to generate PNG, SVG, and .conf files in the output directory.
  qrGenerateScript = pkgs.writeScriptBin "fastfree-wireguard-qr-generate" ''
    #!/usr/bin/env ${pkgs.bash}
    set -euo pipefail

    OUTPUT_DIR="${1}"
    CONTROLLER_PUBKEY="${2}"
    VPS_ENDPOINT="${3}"
    DEVICE_PORT="${4}"
    PERSISTENT_KEEPALIVE="${5}"
    BACKBONE_PUBKEY="${6}"
    CONTROLLER_PREFIX="${7}"
    shift 7

    # Remaining args: device configs as JSON
    DEVICES_JSON="${1}"

    mkdir -p "${OUTPUT_DIR}"
    chmod 755 "${OUTPUT_DIR}"

    # Parse devices JSON and generate for each
    echo "${DEVICES_JSON}" | ${pkgs.jq} -c ".[]" | while read -r device; do
      name=$(echo "${device}" | ${pkgs.jq} -r ".name")
      clientPubKey=$(echo "${device}" | ${pkgs.jq} -r ".clientPublicKey")
      type=$(echo "${device}" | ${pkgs.jq} -r ".type // \"device\"")

      # Derive addresses - SHA256 of name, first 64 bits (16 hex chars = 4 groups of 4)
      hex=$(${pkgs.openssl} dgst -sha256 <<<"${name}" | ${pkgs.cut} -d" " -f2)
      suffix=$(echo "${hex}" | ${pkgs.sed} -E "s/^(.{4})(.{4})(.{4})(.{4}).*$/\1:\2:\3:\4/")

      # IPv6 address
      ipv6="${CONTROLLER_PREFIX}:${suffix}"

      # Parse client number from name (clientN_d_M)
      clientNum=$(echo "${name}" | ${pkgs.sed} -E "s/client([0-9]+)_d_[0-9]+/\1/")
      deviceNum=$(echo "${name}" | ${pkgs.sed} -E "s/client[0-9]+_d_([0-9]+)/\1/")

      ipv4="10.0.${clientNum}.${deviceNum}"
      subnet="10.0.${clientNum}.0/24"
      gateway="10.0.${clientNum}.254"

      # Build WireGuard config
      WG_CONF="[Interface]
PrivateKey = <PASTE PRIVATE KEY HERE>
Address = ${ipv6}/128, ${ipv4}/24
ListenPort = ${DEVICE_PORT}

[Peer]
# Device network gateway (controller)
PublicKey = ${CONTROLLER_PUBKEY}
AllowedIPs = ${subnet}, ${gateway}/32
Endpoint = ${VPS_ENDPOINT}:${DEVICE_PORT}
PersistentKeepalive = ${PERSISTENT_KEEPALIVE}"

      if [ "${clientNum}" -ge 2 ]; then
        bbPort=$((51830 + clientNum - 2))
        base=$((4 * (clientNum - 2)))
        bbSubnet="10.0.0.${base}/30"
        WG_CONF="${WG_CONF}

[Peer]
# Backbone link
PublicKey = ${BACKBONE_PUBKEY}
AllowedIPs = ${subnet}, ${bbSubnet}
Endpoint = ${VPS_ENDPOINT}:${bbPort}
PersistentKeepalive = ${PERSISTENT_KEEPALIVE}"
      fi

      # Generate QR code PNG
      echo "${WG_CONF}" | ${pkgs.qrencode} -t PNG -o "${OUTPUT_DIR}/${name}.png" -s 4 -l M
      # Generate QR code SVG
      echo "${WG_CONF}" | ${pkgs.qrencode} -t SVG -o "${OUTPUT_DIR}/${name}.svg" -l M
      # Write .conf file
      echo "${WG_CONF}" > "${OUTPUT_DIR}/${name}.conf"

      # World-readable
      chmod 644 "${OUTPUT_DIR}/${name}.png" "${OUTPUT_DIR}/${name}.svg" "${OUTPUT_DIR}/${name}.conf"

      echo "Generated QR codes and config for ${name}"
    done
  '';

  # Prepare devices JSON for the script
  devicesJson = lib.toJSON devices;

  # Output directory creation via systemd-tmpfiles
  tmpfilesConfig = ''
    d ${cfg.outputDir} 0755 root root -
  '';

in {
  options.fastfree.wireguard.qr = {
    enable = lib.mkEnableOption "Generate WireGuard QR codes for device configs at activation time";

    instance = lib.mkOption {
      type = lib.types.str;
      default = "wireguard";
      description = ''
        Name of the Clan wireguard service instance. Must match the instance
        in clan.nix: it is the WireGuard interface name and the vars prefix.
      '';
    };

    domain = lib.mkOption {
      type = lib.types.str;
      default = "wireguard";
      description = "Hostname suffix for the devices.";
    };

    outputDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/wireguard-qr";
      description = "Directory where QR codes (PNG/SVG) and .conf files are generated.";
    };

    backbonePublicKey = lib.mkOption {
      type = lib.types.str;
      default = "<BACKBONE_PUBLIC_KEY>";
      description = "Public key for the backbone link (client2-link, client3-link, etc.).";
    };

    devices = lib.mkOption {
      type = lib.types.attrsOf (
        lib.types.submodule (
          { name, ... }:
          {
            options = {
              clientPublicKey = lib.mkOption {
                type = lib.types.str;
                description = ''
                  WireGuard public key of the device. Generate the keypair ON
                  THE DEVICE (wg genkey | wg pubkey) and copy only the public
                  key here — the private key never leaves the device.
                '';
              };

              type = lib.mkOption {
                type = lib.types.enum [ "device" "phone" "laptop" "tablet" "router" ];
                default = "device";
                description = "Device type for documentation purposes.";
              };
            };
          }
        )
      );
      default = { };
      description = ''
        Devices to generate QR codes for, keyed by name (e.g. client1_d_1).

        Example:

          fastfree.wireguard.qr.devices.client1_d_1 = {
            clientPublicKey = "h4Zo…=";
            type = "phone";
          };
      '';
    };
  };

  config = lib.mkIf isController {
    # Create output directory via systemd-tmpfiles
    systemd.tmpfiles.rules = [ tmpfilesConfig ];

    # Activation script that runs at boot to generate QR codes
    systemd.services.fastfree-wireguard-qr-generate = {
      description = "Generate WireGuard QR codes for device configs";
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = ''
          ${qrGenerateScript} \
            "${cfg.outputDir}" \
            "${controllerPublicKey}" \
            "${vpsEndpoint}" \
            "${toString devicePort}" \
            "${toString persistentKeepalive}" \
            "${cfg.backbonePublicKey}" \
            "${controllerPrefix}" \
            "${devicesJson}"
        '';
        RemainAfterExit = true;
      };
    };

    # Also generate via activation script for nixos-rebuild switch
    system.activationScripts.fastfree-wireguard-qr-generate = {
      text = ''
        ${qrGenerateScript} \
          "${cfg.outputDir}" \
          "${controllerPublicKey}" \
          "${vpsEndpoint}" \
          "${toString devicePort}" \
          "${toString persistentKeepalive}" \
          "${cfg.backbonePublicKey}" \
          "${controllerPrefix}" \
          "${devicesJson}"
      '';
      deps = [ ];
    };

    # Make the generated files available in /etc for easy access
    environment.etc = lib.mapAttrs' (
      name: device:
      let
        wgConfig = buildWireGuardConfig name device.clientPublicKey;
      in
      lib.nameValuePair "fastfree/wireguard-qr/${name}.conf" {
        text = wgConfig;
        mode = "0644";
      }
    ) (lib.mapAttrs (name: device: device // { inherit name; }) cfg.devices);
  };
}
