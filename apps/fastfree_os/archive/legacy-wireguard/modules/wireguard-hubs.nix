# FastFree OS — WireGuard Hub Instances (21 instances)
#
# ── Naming convention (OFFICIAL Clan) ──────────────────────────────────────
# Device networks (11):  client1-devices  …  client11-devices   (port 51821)
# Backbone links  (10):  client2-link     …  client11-link      (ports 51832-51841)
#
# ── Topology ────────────────────────────────────────────────────────────────
# client2 (VPS) is the controller for ALL 21 instances.
#   Public endpoint: fastfree.cloud (76.13.51.10)
#
# Device instances (clientN-devices):
#   - Subnet: 10.0.N.0/24  (N = 1..11)
#   - Controller: client2 (has public IP, listens on 51821)
#   - Peers: client1, client3..11 (dial controller, no endpoint needed)
#   - AllowedIPs for each peer: 10.0.N.0/24
#
# Backbone link instances (clientN-link, N=2..11):
#   - Subnet: 10.0.0.(4*(N-2))/30  (point-to-point /30)
#   - Controller: client2 (listens on port 51830+N)
#   - Peer: clientN (dials controller)
#   - AllowedIPs for peer: 10.0.N.0/24 (routes device subnet through backbone)
#
# ── Address allocation (backbone /30s) ──────────────────────────────────────
# client2-link : 10.0.0.0/30   (controller .1, peer .2)
# client3-link : 10.0.0.4/30   (controller .5, peer .6)
# client4-link : 10.0.0.8/30   (controller .9, peer .10)
# client5-link : 10.0.0.12/30  (controller .13, peer .14)
# client6-link : 10.0.0.16/30  (controller .17, peer .18)
# client7-link : 10.0.0.20/30  (controller .21, peer .22)
# client8-link : 10.0.0.24/30  (controller .25, peer .26)
# client9-link : 10.0.0.28/30  (controller .29, peer .30)
# client10-link: 10.0.0.32/30  (controller .33, peer .34)
# client11-link: 10.0.0.36/30  (controller .37, peer .38)
#
# ── Port allocation ─────────────────────────────────────────────────────────
# Device networks (all): 51821
# client2-link : 51832
# client3-link : 51833
# client4-link : 51834
# client5-link : 51835
# client6-link : 51836
# client7-link : 51837
# client8-link : 51838
# client9-link : 51839
# client10-link: 51840
# client11-link: 51841
{ config, lib, pkgs, ... }:
let
  # ── Shared constants ──────────────────────────────────────────────────────
  controllerClient = "client2";
  controllerEndpoint = "fastfree.cloud";
  devicePort = 51821;

  # ── Helper: build device network instance ────────────────────────────────
  # Each device network (clientN-devices) is a star: controller=client2,
  # peers=all other clients. The controller holds the listen port; peers dial out.
  mkDeviceInstance = clientNum: {
    name = "client${toString clientNum}-devices";
    subnet = "10.0.${toString clientNum}.0/24";
    controllerAddr = "10.0.${toString clientNum}.1";
    peerAddrBase = "10.0.${toString clientNum}.";
    # Device identifier for the new wireguard-device.nix module
    deviceId = "client${toString clientNum}";
  };

  # ── Helper: build backbone link instance ─────────────────────────────────
  # Each link (clientN-link) is a point-to-point /30 between controller (client2)
  # and clientN. Subnet: 10.0.0.(4*(N-2))/30
  mkLinkInstance = clientNum: let
    base = 4 * (clientNum - 2);
    controllerOctet = base + 1;
    peerOctet = base + 2;
    port = 51830 + clientNum;
  in {
    name = "client${toString clientNum}-link";
    subnet = "10.0.0.${toString base}/30";
    controllerAddr = "10.0.0.${toString controllerOctet}";
    peerAddr = "10.0.0.${toString peerOctet}";
    port = port;
    # The device subnet this link carries traffic for
    deviceSubnet = "10.0.${toString clientNum}.0/24";
  };

  # ── All device instances (1..11) ─────────────────────────────────────────
  deviceInstances = lib.genList (n: mkDeviceInstance (n + 1)) 11;

  # ── All link instances (2..11) ───────────────────────────────────────────
  linkInstances = lib.genList (n: mkLinkInstance (n + 2)) 10;

  # ── Combine all instances ────────────────────────────────────────────────
  allInstances = deviceInstances ++ linkInstances;

  # ── Generate the official wireguard service config per instance ──────────
  # We map each instance to a `services.official.wireguard.<instanceName>` config.
  # The controller (client2) gets listenPort + peers with allowedIPs.
  # Peers (client1, client3..11) get NO listenPort; they only have the controller as peer.
  mkServiceConfig = instance: let
    isDevice = lib.hasSuffix "-devices" instance.name;
    isLink = lib.hasSuffix "-link" instance.name;
    isController = config.clan.core.name == controllerClient;

    # Controller-side peer list (only on client2)
    controllerPeers = lib.optionalAttrs isController (if isDevice then
      # Device network: peers are all clients EXCEPT controller (client2)
      lib.map (c: {
        publicKey = config.clan.core.vars.generators."wireguard-keys-${instance.name}-${c}".files.publickey.value;
        allowedIPs = [ instance.subnet ];
        persistentKeepalive = 25;
      }) (lib.filter (c: c != controllerClient) (lib.map (n: "client${toString n}") (lib.range 1 12)))
    else
      # Link instance: single peer = the clientN this link connects to
      let
        clientNum = if isLink then
          builtins.substring 6 (builtins.stringLength instance.name - 10) instance.name
        else
          "1"; # fallback (should not happen for device)
        peerClient = "client${clientNum}";
      in [ {
        publicKey = config.clan.core.vars.generators."wireguard-keys-${instance.name}-${peerClient}".files.publickey.value;
        allowedIPs = [ instance.deviceSubnet ];
        persistentKeepalive = 25;
      } ]);

    # Peer-side config (on non-controller clients): only the controller as peer
    peerConfig = lib.optionalAttrs (!isController) {
      peers = [ {
        publicKey = config.clan.core.vars.generators."wireguard-keys-${instance.name}-${controllerClient}".files.publickey.value;
        endpoint = "${controllerEndpoint}:${toString instance.port}";
        allowedIPs = if isDevice then [ instance.subnet ] else [ instance.deviceSubnet ];
        persistentKeepalive = 25;
      } ];
    };

    # Interface address: controller gets .1 (device) or controllerAddr (link)
    # Peers get their assigned address from vars
    interfaceConfig = {
      # The official service generates keys and addresses via vars generators.
      # We reference the generated private key and address for this client.
      privateKey = config.clan.core.vars.generators."wireguard-keys-${instance.name}-${config.clan.core.name}".files.privatekey.value;
      listenPort = lib.optionalAttrs isController instance.port;
    };
  in {
    settings = {
      endpoint = lib.optionalString isController controllerEndpoint;
    }
    // interfaceConfig
    // peerConfig
    // { peers = controllerPeers; };
  };

  # ── Per-instance service configuration ────────────────────────────────────
  serviceConfigs = lib.listToAttrs (map (inst: {
    name = inst.name;
    value = mkServiceConfig inst;
  }) allInstances);

  # ── Generate device configurations for the new wireguard-device.nix module ─
  # This creates a list of device configs that can be passed to wireguard.devices option
  deviceConfigs = lib.mapAttrsToList (name: inst: {
    inherit name;
    deviceId = inst.deviceId;
    subnet = inst.subnet;
    controllerAddr = inst.controllerAddr;
    peerAddrBase = inst.peerAddrBase;
    port = inst.port;
    isController = config.clan.core.name == controllerClient;
  }) (lib.listToAttrs (map (inst: { name = inst.name; value = inst; }) deviceInstances));
in
{
  options.fastfree.wireguardHubs = {
    enable = lib.mkEnableOption "FastFree WireGuard hub instances (21 instances)";

    # New option: list of device networks to configure via wireguard-device.nix
    # Each device entry will include the wireguard-device.nix module
    devices = lib.mkOption {
      type = lib.types.listOf (lib.types.submodule ({ name, ... }: {
        options = {
          name = lib.mkOption {
            type = lib.types.str;
            description = "Instance name (e.g., client1-devices)";
          };
          deviceId = lib.mkOption {
            type = lib.types.str;
            description = "Device identifier (e.g., client1)";
          };
          subnet = lib.mkOption {
            type = lib.types.str;
            description = "Subnet for this device network (e.g., 10.0.1.0/24)";
          };
          controllerAddr = lib.mkOption {
            type = lib.types.str;
            description = "Controller address in this subnet";
          };
          peerAddrBase = lib.mkOption {
            type = lib.types.str;
            description = "Base for peer addresses";
          };
          port = lib.mkOption {
            type = lib.types.port;
            default = 51821;
            description = "UDP port for this device network";
          };
          isController = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Whether this machine is the controller for this device network";
          };
        };
      }));
      default = [];
      description = ''
        List of WireGuard device networks to configure. Each device network
        will include the wireguard-device.nix module for declarative configuration.
      '';
    };

    # Backbone link instances (kept as-is for backward compatibility)
    links = lib.mkOption {
      type = lib.types.listOf (lib.types.submodule ({ name, ... }: {
        options = {
          name = lib.mkOption {
            type = lib.types.str;
            description = "Instance name (e.g., client2-link)";
          };
          subnet = lib.mkOption {
            type = lib.types.str;
            description = "Subnet for this link (e.g., 10.0.0.0/30)";
          };
          controllerAddr = lib.mkOption {
            type = lib.types.str;
            description = "Controller address in this subnet";
          };
          peerAddr = lib.mkOption {
            type = lib.types.str;
            description = "Peer address in this subnet";
          };
          port = lib.mkOption {
            type = lib.types.port;
            description = "UDP port for this link";
          };
          deviceSubnet = lib.mkOption {
            type = lib.types.str;
            description = "Device subnet this link carries traffic for";
          };
        };
      }));
      default = [];
      description = ''
        List of WireGuard backbone links to configure. These are point-to-point
        links between the controller (client2) and each client.
      '';
    };
  };

  config = lib.mkIf config.fastfree.wireguardHubs.enable {
    # Include the new wireguard-device.nix module for each device
    # This uses NixOS module system'"'"'s ability to include modules per list item
    imports = lib.optional (config.fastfree.wireguardHubs.devices != [ ]) (
      # We use a dynamic import pattern: for each device, include wireguard-device.nix
      # with the device-specific configuration passed via options
      let
        # For each device in the list, create a module that includes wireguard-device.nix
        deviceModules = lib.map (device: {
          imports = [ ./wireguard-device.nix ];
          # Pass device-specific config via options
          wireguard.device = {
            name = device.name;
            deviceId = device.deviceId;
            subnet = device.subnet;
            controllerAddr = device.controllerAddr;
            peerAddrBase = device.peerAddrBase;
            port = device.port;
            isController = device.isController;
          };
        }) config.fastfree.wireguardHubs.devices;
      in deviceModules
    );

    # Enable the official wireguard service for each instance
    services.official.wireguard = serviceConfigs;

    # Ensure the vars generators exist for each instance/client combination
    # This is typically done in clan.nix via vars.generators, but we assert here
    # that the expected generators are present for the controller.
    assertions = lib.mkIf (config.clan.core.name == controllerClient) [
      {
        assertion = lib.all (inst:
          lib.all (c:
            builtins.hasAttr "wireguard-keys-${inst.name}-${c}" config.clan.core.vars.generators
          ) (if lib.hasSuffix "-devices" inst.name then
            lib.filter (c: c != controllerClient) (lib.map (n: "client${toString n}") (lib.range 1 12))
          else
            [ "client${builtins.substring 6 (builtins.stringLength inst.name - 10) inst.name}" ]
          )
        ) allInstances;
        message = "Missing wireguard-keys generators for one or more hub instances. Ensure clan.nix defines vars.generators for each instance/client pair.";
      }
    ];

    # Extra hosts for hostname resolution within the mesh
    networking.extraHosts = concatStringsSep "\n" (
      # Controller addresses for each instance
      lib.flatten (map (inst: [
        "${inst.controllerAddr} ${controllerClient}-${inst.name}"
      ] ++ (if lib.hasSuffix "-devices" inst.name then
        # Device network: all peer clients
        lib.map (c: "${inst.peerAddrBase}${toString (builtins.substring 6 (builtins.stringLength c - 7) c)} ${c}-${inst.name}")
          (lib.filter (c: c != controllerClient) (lib.map (n: "client${toString n}") (lib.range 1 12)))
      else
        # Link instance: single peer
        [ "${inst.peerAddr} ${builtins.substring 0 (builtins.stringLength inst.name - 5) inst.name}-${inst.name}" ]
      )) allInstances)
    );
  };
}
