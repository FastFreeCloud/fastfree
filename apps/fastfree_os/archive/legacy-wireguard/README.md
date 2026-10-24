# Legacy Custom WireGuard Modules & Scripts (Archived)

These files were experimental modules developed for manual WireGuard hub/peer topology and QR code generation:
- `modules/fastfree-panel-wg.nix`
- `modules/wireguard-device.nix`
- `modules/wireguard-hubs.nix`
- `modules/wireguard-peers.nix`
- `modules/wireguard-qr.nix`
- `scripts/wg-generate-confs.py`
- `scripts/wg-peer-address.py`

## Superseded By
These have been superseded by Clan 26.05 native WireGuard service configured dynamically in `apps/fastfree_os/clan.nix` (`wireguardNetworks` mapping `client2` through `client11` to `client1` controller) and stored in `vars/per-machine/`.
