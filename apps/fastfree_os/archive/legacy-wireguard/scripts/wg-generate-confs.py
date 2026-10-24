#!/usr/bin/env python3
"""Generate WireGuard .conf files for all 55 devices (11 clients x 5 devices each)."""

from __future__ import annotations
import argparse
import hashlib
import sys
from pathlib import Path

DEFAULT_PREFIX = "fd28:387a:3f:4500"
NUM_CLIENTS = 11
DEVICES_PER_CLIENT = 5
DEVICE_NETWORK_PORT = 51821
BACKBONE_PORT_START = 51831
BACKBONE_PORT_END = 51840
PERSISTENT_KEEPALIVE = 25
VPS_ENDPOINT = "fastfree.cloud"
PRIVATE_KEY_PLACEHOLDER = "<PASTE PRIVATE KEY HERE>"
VPS_PUBLIC_KEY_PLACEHOLDER = "<VPS_PUBLIC_KEY>"
BACKBONE_PUBLIC_KEY_PLACEHOLDER = "<BACKBONE_PUBLIC_KEY>"
DEFAULT_OUTPUT_DIR = "/etc/fastfree/wireguard-peers"

def peer_suffix(peer_name):
    digest = hashlib.sha256(peer_name.encode()).hexdigest()
    return ":".join(digest[i:i+4] for i in range(0, 16, 4))

def peer_ipv6_address(peer_name, prefix=DEFAULT_PREFIX):
    return f"{prefix}:{peer_suffix(peer_name)}"

def device_ipv4_address(client_num, device_num):
    return f"10.0.{client_num}.{device_num}"

def device_network_subnet(client_num):
    return f"10.0.{client_num}.0/24"

def gateway_ipv4_address(client_num):
    return f"10.0.{client_num}.254"

def backbone_subnet(client_num):
    if client_num < 2:
        raise ValueError(f"Backbone links only for client >= 2, got {client_num}")
    base = 4 * (client_num - 2)
    return f"10.0.0.{base}/30"

def backbone_vps_ip(client_num):
    if client_num < 2:
        raise ValueError(f"Backbone links only for client >= 2, got {client_num}")
    base = 4 * (client_num - 2)
    return f"10.0.0.{base + 1}"

def backbone_port(client_num):
    if client_num < 2 or client_num > 11:
        raise ValueError(f"Backbone ports only for client 2..11, got {client_num}")
    return BACKBONE_PORT_START + (client_num - 2)

def generate_device_config(client_num, device_num, vps_public_key=VPS_PUBLIC_KEY_PLACEHOLDER, backbone_public_key=BACKBONE_PUBLIC_KEY_PLACEHOLDER):
    peer_name = f"client{client_num}_d_{device_num}"
    ipv6_addr = peer_ipv6_address(peer_name)
    ipv4_addr = device_ipv4_address(client_num, device_num)
    subnet = device_network_subnet(client_num)
    gateway_ip = gateway_ipv4_address(client_num)

    lines = [
        "[Interface]",
        f"PrivateKey = {PRIVATE_KEY_PLACEHOLDER}",
        f"Address = {ipv4_addr}/24, {ipv6_addr}/128",
        f"ListenPort = {DEVICE_NETWORK_PORT}",
        "",
    ]

    lines.extend([
        "[Peer]",
        f"# Device network gateway for client{client_num}",
        f"PublicKey = {vps_public_key}",
        f"AllowedIPs = {subnet}, {gateway_ip}/32",
        f"Endpoint = {VPS_ENDPOINT}:{DEVICE_NETWORK_PORT}",
        f"PersistentKeepalive = {PERSISTENT_KEEPALIVE}",
        "",
    ])

    if client_num >= 2:
        bb_subnet = backbone_subnet(client_num)
        bb_port = backbone_port(client_num)
        lines.extend([
            "[Peer]",
            f"# Backbone link for client{client_num}",
            f"PublicKey = {backbone_public_key}",
            f"AllowedIPs = {subnet}, {bb_subnet}",
            f"Endpoint = {VPS_ENDPOINT}:{bb_port}",
            f"PersistentKeepalive = {PERSISTENT_KEEPALIVE}",
            "",
        ])

    return "\n".join(lines).rstrip() + "\n"

def main():
    parser = argparse.ArgumentParser(description="Generate WireGuard configs for 55 devices")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--vps-public-key", default=VPS_PUBLIC_KEY_PLACEHOLDER)
    parser.add_argument("--backbone-public-key", default=BACKBONE_PUBLIC_KEY_PLACEHOLDER)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--prefix", default=DEFAULT_PREFIX)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
        print(f"Writing configs to {output_dir}")

    total = 0
    for c in range(1, NUM_CLIENTS + 1):
        for d in range(1, DEVICES_PER_CLIENT + 1):
            config = generate_device_config(c, d, args.vps_public_key, args.backbone_public_key)
            fn = f"client{c}_d_{d}.conf"
            fp = output_dir / fn
            if args.dry_run:
                print(f"=== {fp} ===")
                print(config)
            else:
                fp.write_text(config)
                print(f"  Created {fp}")
            total += 1
    print(f"\nGenerated {total} config files.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
