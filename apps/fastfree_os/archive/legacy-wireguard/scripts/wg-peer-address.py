#!/usr/bin/env python3
"""Pick a mesh address for an external WireGuard peer.

The address must be unique inside the controller's /56 subnet. This helper
derives it exactly the way the official Clan service derives the addresses of
its own peers (sha256 of the name, first 64 bits), so an external device and
a Clan peer look the same in `wg show` and in /etc/hosts.

Usage:
    python3 scripts/wg-peer-address.py client1_d_1
    python3 scripts/wg-peer-address.py --prefix fd28:387a:3f:4500 client1_d_1

The default prefix is the FastFree controller (client2) subnet, derived by
the official service from the instance name "wireguard".
"""

from __future__ import annotations

import hashlib
import sys

DEFAULT_PREFIX = "fd28:387a:3f:4500"


def peer_suffix(peer_name: str) -> str:
    """The 64-bit host suffix, exactly like clanServices/wireguard/ipv6_allocator.py."""
    digest = hashlib.sha256(peer_name.encode()).hexdigest()
    return ":".join(
        digest[i : i + 4] for i in range(0, 16, 4)
    )


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    prefix = DEFAULT_PREFIX
    for arg in sys.argv[1:]:
        if arg.startswith("--prefix="):
            prefix = arg.split("=", 1)[1]

    if len(args) != 1:
        print(__doc__)
        return 1

    name = args[0]
    suffix = peer_suffix(name)
    address = f"{prefix}:{suffix}"

    print(f"peer name   : {name}")
    print(f"suffix      : {suffix}")
    print(f"address     : {address}")
    print()
    print("Use it in machines/client2/configuration.nix:")
    print()
    print("  fastfree.wireguardPeers.peers." + name + " = {")
    print('    publicKey = "<public key of the device>";')
    print(f'    address = "{address}";')
    print("  };")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
