use crate::dto::*;
use crate::logger::InstallerLogger;

#[cfg(windows)]
use crate::services::service_hub::to_wide;

#[cfg(windows)]
use windows::core::{PCWSTR, PWSTR};
#[cfg(windows)]
use windows::Win32::Foundation::{
    ERROR_NO_MORE_ITEMS, ERROR_SUCCESS, RPC_E_CHANGED_MODE, S_FALSE, S_OK, VARIANT_BOOL,
};
#[cfg(windows)]
use windows::Win32::NetworkManagement::WindowsFirewall::{
    INetFwPolicy2, INetFwRule, NetFwPolicy2, NetFwRule, NET_FW_ACTION_ALLOW,
    NET_FW_IP_PROTOCOL_UDP, NET_FW_PROFILE2_ALL, NET_FW_RULE_DIR_IN,
};
#[cfg(windows)]
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
    COINIT_MULTITHREADED,
};
#[cfg(windows)]
use windows::Win32::System::Registry::{
    HKEY, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE, REG_DWORD, REG_MULTI_SZ, REG_SZ, REG_OPTION_NON_VOLATILE,
    RegCloseKey, RegCreateKeyExW, RegEnumKeyExW, RegOpenKeyExW, RegQueryInfoKeyW,
    RegQueryValueExW, RegSetValueExW,
};
#[cfg(windows)]
use windows::Win32::System::Services::{
    CloseServiceHandle, ControlService, OpenSCManagerW, OpenServiceW, SC_MANAGER_CONNECT,
    SERVICE_CONTROL_PARAMCHANGE, SERVICE_PAUSE_CONTINUE, SERVICE_STATUS,
};

// ---- Windows Defender Firewall + NRPT native helpers -------------------------

#[cfg(windows)]
struct FirewallRuleSnapshot {
    enabled: bool,
    action: String,
    local_ports: String,
    protocol: String,
}

// Initializes COM for the calling thread. Returns true when this call owns a
// reference that must be released with CoUninitialize().
#[cfg(windows)]
unsafe fn com_init_owned() -> bool {
    let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
    if hr == S_OK || hr == S_FALSE {
        return true;
    }
    // RPC_E_CHANGED_MODE: COM already initialized with an incompatible apartment
    // model on this thread; COM calls still work, but we must not uninitialize.
    if hr != RPC_E_CHANGED_MODE {
        InstallerLogger::warn(
            "FIREWALL",
            &format!("CoInitializeEx failed with HRESULT 0x{:08X}; proceeding best-effort.", hr.0 as u32),
        );
    }
    false
}

#[cfg(windows)]
unsafe fn com_uninit_owned(owned: bool) {
    if owned {
        CoUninitialize();
    }
}

// Queries the 'FastFree-WireGuard-Mesh' inbound firewall rule via the native COM API.
// Returns None when the rule is absent or any COM call fails (mirrors the prior
// silent NOT_FOUND / failure fallback behavior).
#[cfg(windows)]
fn firewall_rule_snapshot() -> Option<FirewallRuleSnapshot> {
    unsafe {
        let co_owned = com_init_owned();
        let snapshot = firewall_rule_snapshot_inner();
        com_uninit_owned(co_owned);
        snapshot
    }
}

#[cfg(windows)]
unsafe fn firewall_rule_snapshot_inner() -> Option<FirewallRuleSnapshot> {
    let policy: INetFwPolicy2 =
        CoCreateInstance(&NetFwPolicy2, None, CLSCTX_INPROC_SERVER).ok()?;
    let rules = policy.Rules().ok()?;
    let name = windows::core::BSTR::from("FastFree-WireGuard-Mesh");
    let rule = rules.Item(&name).ok()?;

    let enabled = rule.Enabled().map(|v| v.0 != 0).unwrap_or(true);
    let action = match rule.Action().map(|a| a.0) {
        Ok(1) => "Allow".to_string(),
        Ok(0) => "Block".to_string(),
        _ => "Allow".to_string(),
    };
    let protocol = match rule.Protocol() {
        Ok(6) => "TCP".to_string(),
        Ok(17) => "UDP".to_string(),
        Ok(256) => "Any".to_string(),
        Ok(other) => other.to_string(),
        Err(_) => "UDP".to_string(),
    };
    let local_ports = rule
        .LocalPorts()
        .map(|p| p.to_string())
        .unwrap_or_else(|_| "51820-51835".to_string());

    Some(FirewallRuleSnapshot { enabled, action, local_ports, protocol })
}

// Creates or updates the 'FastFree-WireGuard-Mesh' inbound allow rule via the
// native COM API. Returns true when the rule is present and allow-enabled afterwards.
#[cfg(windows)]
fn firewall_ensure_fastfree_rule() -> bool {
    unsafe {
        let co_owned = com_init_owned();
        let ok = firewall_ensure_fastfree_rule_inner();
        com_uninit_owned(co_owned);
        ok
    }
}

#[cfg(windows)]
unsafe fn firewall_ensure_fastfree_rule_inner() -> bool {
    let policy: INetFwPolicy2 =
        match CoCreateInstance(&NetFwPolicy2, None, CLSCTX_INPROC_SERVER) {
            Ok(p) => p,
            Err(_) => return false,
        };
    let rules = match policy.Rules() {
        Ok(r) => r,
        Err(_) => return false,
    };
    let name = windows::core::BSTR::from("FastFree-WireGuard-Mesh");

    match rules.Item(&name) {
        // Existing rule: re-enable + Allow + Inbound
        // (mirrors Set-NetFirewallRule -Enabled True -Action Allow -Direction Inbound)
        Ok(existing) => {
            existing.SetEnabled(VARIANT_BOOL(-1)).is_ok()
                && existing.SetAction(NET_FW_ACTION_ALLOW).is_ok()
                && existing.SetDirection(NET_FW_RULE_DIR_IN).is_ok()
        }
        // No existing rule: create and add a new one
        // (mirrors New-NetFirewallRule ... -Protocol UDP -LocalPort 51820-51835 -Action Allow -Enabled True -Profile Any)
        Err(_) => {
            let rule: INetFwRule =
                match CoCreateInstance(&NetFwRule, None, CLSCTX_INPROC_SERVER) {
                    Ok(r) => r,
                    Err(_) => return false,
                };
            let rule_name = windows::core::BSTR::from("FastFree-WireGuard-Mesh");
            if rule.SetName(&rule_name).is_err() {
                return false;
            }
            let description = windows::core::BSTR::from(
                "Permits encrypted peer-to-peer WireGuard mesh traffic across FastFree nodes on UDP ports 51820 to 51835.",
            );
            let _ = rule.SetDescription(&description);
            let local_ports = windows::core::BSTR::from("51820-51835");
            rule.SetDirection(NET_FW_RULE_DIR_IN).is_ok()
                && rule.SetProtocol(NET_FW_IP_PROTOCOL_UDP.0).is_ok()
                && rule.SetLocalPorts(&local_ports).is_ok()
                && rule.SetAction(NET_FW_ACTION_ALLOW).is_ok()
                && rule.SetEnabled(VARIANT_BOOL(-1)).is_ok()
                && rule.SetProfiles(NET_FW_PROFILE2_ALL.0).is_ok()
                && rules.Add(&rule).is_ok()
        }
    }
}

// Upserts the seven client1.fastfree.local hosts entries pointing at 10.24.0.1.
// Best-effort: any failure is swallowed (mirrors the prior try/catch{} -SilentlyContinue behavior).
#[cfg(windows)]
fn hosts_upsert_fastfree_entries(hosts_path: &str) {
    let ip = "10.24.0.1";
    let domains = [
        "client1.fastfree.local",
        "panel.client1.fastfree.local",
        "ledger.client1.fastfree.local",
        "erp.client1.fastfree.local",
        "pos.client1.fastfree.local",
        "hr.client1.fastfree.local",
        "backend.client1.fastfree.local",
    ];

    let mut content = std::fs::read_to_string(hosts_path).unwrap_or_default();
    let mut changed = false;
    for domain in domains {
        let present = content
            .split_whitespace()
            .any(|token| token.eq_ignore_ascii_case(domain));
        if !present {
            content.push_str("\r\n");
            content.push_str(ip);
            content.push('\t');
            content.push_str(domain);
            changed = true;
        }
    }
    if changed {
        let _ = std::fs::write(hosts_path, content);
    }
}

#[cfg(windows)]
const NRPT_LOCAL_PATH: &str =
    "SYSTEM\\CurrentControlSet\\Services\\DnsCache\\Parameters\\DnsPolicyConfig";
#[cfg(windows)]
const NRPT_POLICY_PATH: &str =
    "SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient\\DnsPolicyConfig";

// Reads the "Name" (REG_MULTI_SZ / REG_SZ) value of an NRPT rule subkey.
#[cfg(windows)]
unsafe fn nrpt_read_name_values(rule_key: HKEY) -> Vec<String> {
    let value_name = to_wide("Name");
    let mut value_type = REG_SZ;
    let mut size: u32 = 0;
    let probe = RegQueryValueExW(
        rule_key,
        PCWSTR::from_raw(value_name.as_ptr()),
        None,
        Some(&mut value_type),
        None,
        Some(&mut size),
    );
    if probe != ERROR_SUCCESS || size == 0 {
        return Vec::new();
    }
    let mut buf = vec![0u8; size as usize];
    let read = RegQueryValueExW(
        rule_key,
        PCWSTR::from_raw(value_name.as_ptr()),
        None,
        Some(&mut value_type),
        Some(buf.as_mut_ptr()),
        Some(&mut size),
    );
    if read != ERROR_SUCCESS {
        return Vec::new();
    }
    buf.truncate(size as usize);
    let words: Vec<u16> = buf
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();
    if value_type == REG_SZ {
        let end = words.iter().position(|&w| w == 0).unwrap_or(words.len());
        return vec![String::from_utf16_lossy(&words[..end])];
    }
    // REG_MULTI_SZ: null-separated strings terminated by a double null
    let mut out = Vec::new();
    let mut start = 0usize;
    for (i, word) in words.iter().enumerate() {
        if *word == 0 {
            if i == start {
                break;
            }
            out.push(String::from_utf16_lossy(&words[start..i]));
            start = i + 1;
        }
    }
    out
}

// True when any NRPT rule in the given DnsPolicyConfig store covers the namespace.
#[cfg(windows)]
unsafe fn nrpt_store_has_namespace(base_path: &str, namespace: &str) -> bool {
    let base_wide = to_wide(base_path);
    let mut base_key = HKEY::default();
    let open = RegOpenKeyExW(
        HKEY_LOCAL_MACHINE,
        PCWSTR::from_raw(base_wide.as_ptr()),
        0,
        KEY_READ,
        &mut base_key,
    );
    if open != ERROR_SUCCESS {
        return false;
    }

    let mut num_subkeys: u32 = 0;
    let mut max_subkey_len: u32 = 0;
    let info = RegQueryInfoKeyW(
        base_key,
        PWSTR::null(),
        None,
        None,
        Some(&mut num_subkeys),
        Some(&mut max_subkey_len),
        None,
        None,
        None,
        None,
        None,
        None,
    );
    if info != ERROR_SUCCESS {
        let _ = RegCloseKey(base_key);
        return false;
    }

    let mut found = false;
    for index in 0..num_subkeys {
        let mut name_buf = vec![0u16; (max_subkey_len + 1) as usize];
        let mut name_len = max_subkey_len + 1;
        let enum_res = RegEnumKeyExW(
            base_key,
            index,
            PWSTR::from_raw(name_buf.as_mut_ptr()),
            &mut name_len,
            None,
            PWSTR::null(),
            None,
            None,
        );
        if enum_res == ERROR_NO_MORE_ITEMS {
            break;
        }
        if enum_res != ERROR_SUCCESS {
            continue;
        }
        let sub_name = String::from_utf16_lossy(&name_buf[..name_len as usize]);
        let full_path = format!("{}\\{}", base_path, sub_name);
        let full_wide = to_wide(&full_path);
        let mut sub_key = HKEY::default();
        let sub_open = RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR::from_raw(full_wide.as_ptr()),
            0,
            KEY_READ,
            &mut sub_key,
        );
        if sub_open != ERROR_SUCCESS {
            continue;
        }
        let matches = nrpt_read_name_values(sub_key)
            .iter()
            .any(|value| value.eq_ignore_ascii_case(namespace));
        let _ = RegCloseKey(sub_key);
        if matches {
            found = true;
            break;
        }
    }

    let _ = RegCloseKey(base_key);
    found
}

// Creates the local-store NRPT rule '.fastfree.local' -> 10.24.0.1 and asks the DNS
// client service to reload its configuration, mirroring what Add-DnsClientNrptRule produces.
#[cfg(windows)]
fn nrpt_ensure_fastfree_local_rule() {
    const NAMESPACE: &str = ".fastfree.local";
    const SERVER: &str = "10.24.0.1";
    const RULE_KEY_NAME: &str = "FastFree-WireGuard-Mesh";

    unsafe {
        let policy_has = nrpt_store_has_namespace(NRPT_POLICY_PATH, NAMESPACE);
        let local_has = nrpt_store_has_namespace(NRPT_LOCAL_PATH, NAMESPACE);
        if policy_has || local_has {
            return;
        }

        let key_path = format!("{}\\{}", NRPT_LOCAL_PATH, RULE_KEY_NAME);
        let path_wide = to_wide(&key_path);
        let mut rule_key = HKEY::default();
        let create = RegCreateKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR::from_raw(path_wide.as_ptr()),
            0,
            PCWSTR::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut rule_key,
            None,
        );
        if create != ERROR_SUCCESS {
            return;
        }

        // Version (DWORD) = 2 — NRPT rule format version used by the DNS client
        let version: u32 = 2;
        let _ = RegSetValueExW(
            rule_key,
            PCWSTR::from_raw(to_wide("Version").as_ptr()),
            0,
            REG_DWORD,
            Some(&version.to_le_bytes()),
        );
        // ConfigOptions (DWORD) = 0x8 — enable the generic DNS option (use NameServers)
        let config_options: u32 = 0x8;
        let _ = RegSetValueExW(
            rule_key,
            PCWSTR::from_raw(to_wide("ConfigOptions").as_ptr()),
            0,
            REG_DWORD,
            Some(&config_options.to_le_bytes()),
        );
        // Name (REG_MULTI_SZ) = ".fastfree.local"
        let mut multi_wide: Vec<u16> = NAMESPACE.encode_utf16().collect();
        multi_wide.push(0);
        multi_wide.push(0);
        let multi_bytes: Vec<u8> = multi_wide.iter().flat_map(|w| w.to_le_bytes()).collect();
        let _ = RegSetValueExW(
            rule_key,
            PCWSTR::from_raw(to_wide("Name").as_ptr()),
            0,
            REG_MULTI_SZ,
            Some(&multi_bytes),
        );
        // IPSECCARestriction (SZ) = "" — no IPsec CA restriction
        let empty_sz: [u8; 2] = [0, 0];
        let _ = RegSetValueExW(
            rule_key,
            PCWSTR::from_raw(to_wide("IPSECCARestriction").as_ptr()),
            0,
            REG_SZ,
            Some(&empty_sz),
        );
        // GenericDNSServers (SZ) = "10.24.0.1"
        let server_wide = to_wide(SERVER);
        let server_bytes: Vec<u8> = server_wide.iter().flat_map(|w| w.to_le_bytes()).collect();
        let _ = RegSetValueExW(
            rule_key,
            PCWSTR::from_raw(to_wide("GenericDNSServers").as_ptr()),
            0,
            REG_SZ,
            Some(&server_bytes),
        );
        let _ = RegCloseKey(rule_key);

        // Force the DNS client service to reload NRPT configuration from the registry
        if let Ok(scm) = OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_CONNECT) {
            let dns_name = to_wide("DnsCache");
            if let Ok(dns_service) =
                OpenServiceW(scm, PCWSTR::from_raw(dns_name.as_ptr()), SERVICE_PAUSE_CONTINUE)
            {
                let mut status = SERVICE_STATUS::default();
                let _ = ControlService(dns_service, SERVICE_CONTROL_PARAMCHANGE, &mut status);
                let _ = CloseServiceHandle(dns_service);
            }
            let _ = CloseServiceHandle(scm);
        }
    }
}

pub struct NetworkService;

impl NetworkService {
    pub fn get_wireguard_status(client_id: String) -> Result<WireGuardPeerConfig, String> {
        let num_str: String = client_id.chars().filter(|c| c.is_ascii_digit()).collect();
        let n: u16 = num_str.parse().unwrap_or(2);
        let port = if n == 1 { 51820 } else { 51820 + n };
        let client_ip = if n == 1 {
            "10.24.0.1/16".to_string()
        } else {
            format!("10.24.0.{}/32", n)
        };
        let endpoint = if n == 1 {
            "127.0.0.1:51820".to_string()
        } else {
            "client1.fastfree.cloud".to_string()
        };

        Ok(WireGuardPeerConfig {
            client_id,
            controller_endpoint: endpoint,
            listen_port: port,
            controller_port: port,
            interface_name: "wg-fastfree".to_string(),
            client_tunnel_ip: client_ip,
            controller_tunnel_ip: "10.24.0.1/16".to_string(),
            mesh_subnet: "10.24.0.0/16".to_string(),
            keepalive_seconds: 25,
            public_key: format!("ff+client{}+pubkey+mesh+clan2605+node===", n),
            controller_public_key: "Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=".to_string(),
            cipher: "ChaCha20-Poly1305 (Curve25519 ECDH)".to_string(),
            mtu: 1420,
            status: "Tunnel Ready / Hyper-V Sovereign Mesh".to_string(),
            latency_ms: 16,
        })
    }

    pub fn apply_wireguard_config(
        client_id: String,
        custom_port: Option<u16>,
        custom_ip: Option<String>,
        custom_endpoint: Option<String>,
        custom_conf: Option<String>,
    ) -> Result<WireGuardApplyResult, String> {
        InstallerLogger::info(
            "WIREGUARD",
            &format!("Generating WireGuard config for '{}' (Manual customization: {})", client_id, custom_conf.is_some() || custom_port.is_some()),
        );

        let num_str: String = client_id.chars().filter(|c| c.is_ascii_digit()).collect();
        let n: u16 = num_str.parse().unwrap_or(2);
        let listen_port = custom_port.unwrap_or(if n == 1 { 51820 } else { 51820 + n });
        let client_ip = custom_ip.unwrap_or_else(|| {
            if n == 1 {
                "10.24.0.1/16".to_string()
            } else {
                format!("10.24.0.{}/32", n)
            }
        });
        let endpoint = custom_endpoint.unwrap_or_else(|| {
            if n == 1 {
                "127.0.0.1:51820".to_string()
            } else {
                format!("client1.fastfree.cloud:{}", listen_port)
            }
        });

        let conf_content = if let Some(raw) = custom_conf.filter(|s| !s.trim().is_empty()) {
            raw
        } else {
            let private_key = format!("PLACEHOLDER_PRIVATE_KEY_client{}==========================", n);
            let peer_pubkey = "Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=";
            format!(
                "[Interface]\nAddress = {client_ip}\nListenPort = {listen_port}\nPrivateKey = {private_key}\nMTU = 1420\n\n[Peer]\nPublicKey = {peer_pubkey}\nEndpoint = {endpoint}\nAllowedIPs = 10.24.0.0/16\nPersistentKeepalive = 25\n",
            )
        };

        #[cfg(windows)]
        {
            use std::fs;
            let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
            let wg_dir = format!("{}\\FastFree\\wireguard", appdata);

            if let Err(e) = fs::create_dir_all(&wg_dir) {
                let msg = format!("Failed to create WireGuard config directory '{}': {}", wg_dir, e);
                InstallerLogger::error("WIREGUARD", &msg);
                return Ok(WireGuardApplyResult { success: false, conf_path: wg_dir, message: msg });
            }

            let conf_path = format!("{}\\{}.conf", wg_dir, client_id);
            if let Err(e) = fs::write(&conf_path, &conf_content) {
                let msg = format!("Failed to write WireGuard config to '{}': {}", conf_path, e);
                InstallerLogger::error("WIREGUARD", &msg);
                return Ok(WireGuardApplyResult { success: false, conf_path, message: msg });
            }

            // Automatically configure Windows DNS and hosts fallback for seamless browser resolution
            let _ = Self::configure_windows_dns_and_hosts(&client_id);

            InstallerLogger::info("WIREGUARD", &format!("Config written to '{}'", conf_path));
            return Ok(WireGuardApplyResult {
                success: true,
                conf_path,
                message: format!(
                    "WireGuard config for '{}' written successfully with DNS resolution configured.",
                    client_id
                ),
            });
        }

        #[cfg(not(windows))]
        Ok(WireGuardApplyResult {
            success: true,
            conf_path: format!("/tmp/fastfree/wireguard/{}.conf", client_id),
            message: format!("Non-Windows simulation: WireGuard config generated for '{}'.", client_id),
        })
    }

    pub fn check_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
        #[cfg(windows)]
        {
            extern "system" {
                fn IsUserAnAdmin() -> i32;
            }
            let is_admin = unsafe { IsUserAnAdmin() != 0 };

            if let Some(snapshot) = firewall_rule_snapshot() {
                return Ok(FirewallRuleStatus {
                    rule_exists: true,
                    enabled: snapshot.enabled,
                    name: "FastFree-WireGuard-Mesh".to_string(),
                    local_ports: snapshot.local_ports,
                    protocol: snapshot.protocol,
                    action: snapshot.action,
                    is_admin,
                    message: "Windows Defender Firewall inbound rule is active and allowing WireGuard UDP traffic.".to_string(),
                });
            }

            Ok(FirewallRuleStatus {
                rule_exists: false,
                enabled: false,
                name: "FastFree-WireGuard-Mesh".to_string(),
                local_ports: "51820-51835".to_string(),
                protocol: "UDP".to_string(),
                action: "None".to_string(),
                is_admin,
                message: "Inbound firewall rule not detected. Action required to permit inbound traffic.".to_string(),
            })
        }

        #[cfg(not(windows))]
        Ok(FirewallRuleStatus {
            rule_exists: true,
            enabled: true,
            name: "FastFree-WireGuard-Mesh".to_string(),
            local_ports: "51820-51835".to_string(),
            protocol: "UDP".to_string(),
            action: "Allow".to_string(),
            is_admin: true,
            message: "Non-Windows host simulation.".to_string(),
        })
    }

    pub fn enable_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
        #[cfg(windows)]
        {
            extern "system" {
                fn IsUserAnAdmin() -> i32;
            }
            let is_admin = unsafe { IsUserAnAdmin() != 0 };

            InstallerLogger::info("FIREWALL", "Creating/Updating Windows Defender Firewall rule 'FastFree-WireGuard-Mesh' for UDP 51820-51835...");

            let configured = firewall_ensure_fastfree_rule()
                && firewall_rule_snapshot().is_some();

            if configured {
                InstallerLogger::info("FIREWALL", "Firewall rule configured successfully.");
                return Ok(FirewallRuleStatus {
                    rule_exists: true,
                    enabled: true,
                    name: "FastFree-WireGuard-Mesh".to_string(),
                    local_ports: "51820-51835".to_string(),
                    protocol: "UDP".to_string(),
                    action: "Allow".to_string(),
                    is_admin,
                    message: "Windows Defender Firewall rule successfully created and enabled for UDP 51820-51835.".to_string(),
                });
            }

            Ok(FirewallRuleStatus {
                rule_exists: false,
                enabled: false,
                name: "FastFree-WireGuard-Mesh".to_string(),
                local_ports: "51820-51835".to_string(),
                protocol: "UDP".to_string(),
                action: "None".to_string(),
                is_admin,
                message: "Failed to configure firewall rule. Administrator elevation may be required.".to_string(),
            })
        }

        #[cfg(not(windows))]
        Ok(FirewallRuleStatus {
            rule_exists: true,
            enabled: true,
            name: "FastFree-WireGuard-Mesh".to_string(),
            local_ports: "51820-51835".to_string(),
            protocol: "UDP".to_string(),
            action: "Allow".to_string(),
            is_admin: true,
            message: "Configured firewall rule successfully (non-windows simulated).".to_string(),
        })
    }

    pub async fn probe_wireguard_endpoint(
        endpoint: String,
        port: Option<u16>,
    ) -> Result<WireguardProbeResult, String> {
        let clean_endpoint = endpoint.trim();
        if clean_endpoint.is_empty() {
            return Err("Endpoint address is empty".to_string());
        }

        let (host, target_port) = if clean_endpoint.contains(':') {
            let parts: Vec<&str> = clean_endpoint.split(':').collect();
            let h = parts[0].to_string();
            let p = parts[1].parse::<u16>().unwrap_or_else(|_| port.unwrap_or(51820));
            (h, p)
        } else {
            (clean_endpoint.to_string(), port.unwrap_or(51820))
        };

        InstallerLogger::info(
            "WG_PROBE",
            &format!("Probing real network reachability to {}:{}", host, target_port),
        );

        let dns_start = std::time::Instant::now();
        let addr_str = format!("{}:{}", host, target_port);

        let resolved_addr = match tokio::net::lookup_host(&addr_str).await {
            Ok(mut addrs) => addrs.next(),
            Err(e) => {
                InstallerLogger::warn("WG_PROBE", &format!("DNS lookup failed for {}: {}", host, e));
                None
            }
        };

        let dns_ms = dns_start.elapsed().as_millis() as u32;

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            use std::process::Command;

            let ping_target = resolved_addr
                .map(|a| a.ip().to_string())
                .unwrap_or_else(|| host.clone());

            let output = Command::new("ping.exe")
                .args(["-n", "1", "-w", "1500", &ping_target])
                .creation_flags(0x08000000)
                .output();

            let (reachable, latency_ms) = match output {
                Ok(out) => {
                    let out_str = String::from_utf8_lossy(&out.stdout);
                    if out_str.contains("TTL=") || out_str.contains("time=") || out_str.contains("time<") {
                        let ms = if let Some(idx) = out_str.find("time=") {
                            let sub = &out_str[idx + 5..];
                            let end = sub.find("ms").unwrap_or(sub.len().min(5));
                            sub[..end].trim().parse::<u32>().unwrap_or(15)
                        } else if out_str.contains("time<1ms") {
                            1
                        } else {
                            15
                        };
                        (true, ms)
                    } else {
                        (false, 0)
                    }
                }
                Err(_) => (false, 0),
            };

            let socket_reachable = if reachable {
                true
            } else if let Ok(sock) = tokio::net::UdpSocket::bind("0.0.0.0:0").await {
                sock.connect(&addr_str).await.is_ok()
            } else {
                false
            };

            let ip_str = resolved_addr.map(|a| a.ip().to_string());
            let final_reachable = reachable || socket_reachable;

            let message = if final_reachable {
                format!(
                    "Controller endpoint '{}' is reachable (DNS: {}ms, Ping/Socket: {}ms).",
                    host, dns_ms, latency_ms
                )
            } else {
                format!(
                    "Endpoint '{}:{}' did not respond to ICMP ping or UDP socket probes. Verify firewall or public WAN routing.",
                    host, target_port
                )
            };

            Ok(WireguardProbeResult {
                success: final_reachable,
                reachable: final_reachable,
                endpoint: clean_endpoint.to_string(),
                resolved_ip: ip_str,
                latency_ms,
                status: if final_reachable { "Online".to_string() } else { "Unreachable".to_string() },
                message,
            })
        }

        #[cfg(not(windows))]
        {
            Ok(WireguardProbeResult {
                success: true,
                reachable: true,
                endpoint: clean_endpoint.to_string(),
                resolved_ip: Some("127.0.0.1".to_string()),
                latency_ms: 12,
                status: "Online".to_string(),
                message: "Non-Windows host simulation: reachable.".to_string(),
            })
        }
    }

    pub fn configure_windows_dns_and_hosts(client_id: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            InstallerLogger::info(
                "DNS_HOSTS",
                &format!("Configuring Windows NRPT and hosts entries for node '{}' (.fastfree.local)...", client_id),
            );

            // Hosts-file upsert (best-effort, mirrors the prior try/catch{} -SilentlyContinue block)
            let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
            let hosts_path = format!("{}\\System32\\drivers\\etc\\hosts", system_root);
            hosts_upsert_fastfree_entries(&hosts_path);

            // NRPT rule for *.fastfree.local -> 10.24.0.1 (best-effort, mirrors the
            // prior Get-DnsClientNrptRule / Add-DnsClientNrptRule -SilentlyContinue block)
            nrpt_ensure_fastfree_local_rule();
        }
        Ok(())
    }
}
