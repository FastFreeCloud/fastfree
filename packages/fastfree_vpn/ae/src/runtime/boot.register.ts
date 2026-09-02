import { defineBoot } from '#q-app';
import VpnStatus from './VpnStatus.vue';
import VpnConnectButton from './VpnConnectButton.vue';

export default defineBoot(async ({ app }) => {
  app.component('vpn-status', VpnStatus);
  app.component('vpn-connect-button', VpnConnectButton);
});
