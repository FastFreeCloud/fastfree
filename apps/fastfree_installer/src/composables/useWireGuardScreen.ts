import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import {
  currentStep,
  selectedClientId,
  licenseState,
  wireGuardConfig,
  fetchWireGuardConfig,
  applyWireGuardConfig,
  firewallStatus,
  fetchFirewallStatus,
  enableFirewallRule,
  probeWireguardEndpoint,
} from './useDiscovery';
import { useI18n } from './useI18n';

// Module-level shared singleton reactive state
const isLoadingConfig = ref(true);
const isTestingPing = ref(false);
const isApplyingConfig = ref(false);

const isAdvancedUnlocked = ref(false);
const showPasswordModal = ref(false);
const showAdvancedModal = ref(false);
const adminPasswordInput = ref('');
const showPasswordText = ref(false);
const passwordError = ref('');
const isVerifyingPassword = ref(false);
const passwordInputRef = ref<HTMLInputElement | null>(null);

const manualPort = ref<number>(51822);
const manualTunnelIp = ref<string>('10.24.0.2/32');
const manualEndpoint = ref<string>('client1.fastfree.cloud:51822');
const manualConf = ref<string>('');
const confCopied = ref(false);

export function useWireGuardScreen() {
  const { t, isRtl } = useI18n();

  const allNodes = computed(() => {
    if (licenseState.value && licenseState.value.eligible_clients && licenseState.value.eligible_clients.length > 0) {
      return licenseState.value.eligible_clients;
    }
    const boundNode = licenseState.value?.node_id || selectedClientId.value;
    return boundNode ? [boundNode] : ['client2'];
  });

  function openAdvancedFlow() {
    if (isAdvancedUnlocked.value) {
      showAdvancedModal.value = true;
    } else {
      adminPasswordInput.value = '';
      passwordError.value = '';
      showPasswordModal.value = true;
      setTimeout(() => {
        passwordInputRef.value?.focus();
      }, 100);
    }
  }

  async function handleUnlockAdvanced() {
    const pwd = adminPasswordInput.value.trim();
    if (!pwd) return;

    isVerifyingPassword.value = true;
    passwordError.value = '';

    try {
      await invoke('verify_admin_password', { password: pwd });
      isAdvancedUnlocked.value = true;
      showPasswordModal.value = false;
      showAdvancedModal.value = true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      passwordError.value = String(e?.message || err);
    } finally {
      isVerifyingPassword.value = false;
    }
  }

  function lockAgain() {
    isAdvancedUnlocked.value = false;
    showAdvancedModal.value = false;
    adminPasswordInput.value = '';
  }

  function saveAndCloseAdvanced() {
    if (wireGuardConfig.value) {
      wireGuardConfig.value.listen_port = manualPort.value;
      wireGuardConfig.value.client_tunnel_ip = manualTunnelIp.value;
      wireGuardConfig.value.controller_endpoint = manualEndpoint.value;
    }
    showAdvancedModal.value = false;
  }

  async function selectTargetNode(nodeId: string) {
    selectedClientId.value = nodeId;
    await loadConfigForNode(nodeId);
  }

  function syncManualConf() {
    const numStr = selectedClientId.value.replace('client', '');
    const n = parseInt(numStr, 10) || 2;
    manualConf.value = `[Interface]
Address = ${manualTunnelIp.value}
ListenPort = ${manualPort.value}
PrivateKey = PLACEHOLDER_PRIVATE_KEY_client${n}==========================
MTU = 1420

[Peer]
PublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=
Endpoint = ${manualEndpoint.value}
AllowedIPs = 10.24.0.0/16
PersistentKeepalive = 25
`;
  }

  async function loadConfigForNode(nodeId: string) {
    isLoadingConfig.value = true;
    try {
      const config = await fetchWireGuardConfig(nodeId);
      manualPort.value = config.listen_port;
      manualTunnelIp.value = config.client_tunnel_ip;
      manualEndpoint.value = config.controller_endpoint.includes(':')
        ? config.controller_endpoint
        : `${config.controller_endpoint}:${config.listen_port}`;
      syncManualConf();
    } catch (err) {
      console.error('Failed to load wireguard config:', err);
    } finally {
      isLoadingConfig.value = false;
    }
  }

  function resetToDefaults() {
    const numStr = selectedClientId.value.replace('client', '');
    const n = parseInt(numStr, 10) || 1;
    manualPort.value = n === 1 ? 51820 : 51820 + n;
    manualTunnelIp.value = n === 1 ? '10.24.0.1/16' : `10.24.0.${n}/32`;
    manualEndpoint.value = n === 1 ? '127.0.0.1:51820' : `client1.fastfree.cloud:${manualPort.value}`;
    syncManualConf();
  }

  async function copyConf() {
    try {
      await navigator.clipboard.writeText(manualConf.value);
      confCopied.value = true;
      setTimeout(() => {
        confCopied.value = false;
      }, 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }

  async function handleDeploy() {
    isApplyingConfig.value = true;
    try {
      if (isAdvancedUnlocked.value) {
        await applyWireGuardConfig(selectedClientId.value, {
          customPort: manualPort.value,
          customIp: manualTunnelIp.value,
          customEndpoint: manualEndpoint.value,
          customConf: manualConf.value,
        });
      } else {
        await applyWireGuardConfig(selectedClientId.value);
      }
    } catch (err) {
      console.warn('WireGuard config apply warning:', err);
    } finally {
      isApplyingConfig.value = false;
      currentStep.value = 5;
    }
  }

  async function testHandshake() {
    if (!wireGuardConfig.value) return;
    isTestingPing.value = true;
    try {
      const ep = isAdvancedUnlocked.value ? manualEndpoint.value : wireGuardConfig.value.controller_endpoint;
      const port = isAdvancedUnlocked.value ? manualPort.value : wireGuardConfig.value.listen_port;
      const probe = await probeWireguardEndpoint(ep, port);
      if (probe.reachable) {
        wireGuardConfig.value.latency_ms = probe.latency_ms ?? 0;
        wireGuardConfig.value.status = 'Connected & Active';
      } else {
        wireGuardConfig.value.latency_ms = 0;
        wireGuardConfig.value.status = 'Endpoint Offline';
      }
    } catch (err) {
      console.warn('Real handshake probe error:', err);
    } finally {
      isTestingPing.value = false;
    }
  }

  async function initWireGuardScreen() {
    await loadConfigForNode(selectedClientId.value);

    try {
      const status = await fetchFirewallStatus();
      if (!status?.rule_exists || !status?.enabled) {
        await enableFirewallRule();
      }
    } catch (e) {
      console.warn('Auto firewall check/enable warning:', e);
    }

    if (wireGuardConfig.value) {
      await testHandshake();
    }
  }

  return {
    t,
    isRtl,
    currentStep,
    selectedClientId,
    allNodes,
    isLoadingConfig,
    isTestingPing,
    isApplyingConfig,
    wireGuardConfig,
    firewallStatus,
    isAdvancedUnlocked,
    showPasswordModal,
    showAdvancedModal,
    adminPasswordInput,
    showPasswordText,
    passwordError,
    isVerifyingPassword,
    passwordInputRef,
    manualPort,
    manualTunnelIp,
    manualEndpoint,
    manualConf,
    confCopied,
    openAdvancedFlow,
    handleUnlockAdvanced,
    lockAgain,
    saveAndCloseAdvanced,
    selectTargetNode,
    resetToDefaults,
    copyConf,
    handleDeploy,
    testHandshake,
    initWireGuardScreen,
    syncManualConf,
  };
}
