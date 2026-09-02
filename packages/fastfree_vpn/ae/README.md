# FastFree VPN

WireGuard VPN integration for FastFree Quasar apps — Android native support.

## Installation

```bash
quasar ext add @fastfree/vpn
```

## Usage

### Components

```vue
<template>
  <!-- VPN Status Card -->
  <vpn-status :config="vpnConfig" />

  <!-- VPN Connect Button -->
  <vpn-connect-button :config="vpnConfig" />
</template>

<script setup lang="ts">
import type { WgConfig } from 'quasar-app-extension-fastfree_vpn/src/runtime';

const vpnConfig: WgConfig = {
  privateKey: 'your-private-key',
  publicKey: 'your-public-key',
  address: '10.100.0.2/32',
  endpoint: 'fastfree.cloud:51820',
  dns: '1.1.1.1'
};
</script>
```

### Composable

```vue
<script setup lang="ts">
import { useVpn } from 'quasar-app-extension-fastfree_vpn/src/runtime';

const { connected, loading, status, connect, disconnect } = useVpn();

async function handleConnect() {
  await connect({
    privateKey: 'your-private-key',
    publicKey: 'your-public-key',
    address: '10.100.0.2/32',
    endpoint: 'fastfree.cloud:51820',
    dns: '1.1.1.1'
  });
}
</script>
```

### Service

```typescript
import { WireGuardService } from 'quasar-app-extension-fastfree_vpn/src/runtime';

// Generate keys
const keys = await WireGuardService.generateKeys();

// Connect
await WireGuardService.connect({
  privateKey: keys.privateKey,
  publicKey: keys.publicKey,
  address: '10.100.0.2/32',
  endpoint: 'fastfree.cloud:51820',
  dns: '1.1.1.1'
});

// Get status
const status = await WireGuardService.getStatus();

// Disconnect
await WireGuardService.disconnect();
```

## Configuration

### Prompts

When installing, you'll be asked for:

- **Endpoint**: VPN server address (e.g., `fastfree.cloud:51820`)
- **Address**: Your VPN IP (e.g., `10.100.0.2/32`)
- **DNS**: DNS server (e.g., `1.1.1.1`)

### Android Permissions

The extension automatically adds these permissions to `AndroidManifest.xml`:

- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_SPECIAL_USE`
- `android.permission.RECEIVE_BOOT_COMPLETED`

## Requirements

- Quasar CLI >= 3.5.0
- Android Studio (for building Android apps)
- Node.js >= 18

## License

MIT
