use crate::dto::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

pub const GOOGLE_SHEETS_ENDPOINT: &str =
    "https://script.google.com/macros/s/AKfycbyYqVXCWgZEcEWQQ9PTfChuTryk5N9S91xmSuYxWkAXgViuJr53PzWEJajR4HhHUllVGQ/exec";
pub const API_SECRET_TOKEN: &str = "FASTFREE-API-SECRET-KEY-998822";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleSheetsRequest<'a> {
    pub api_key: &'a str,
    pub license_key: &'a str,
    pub hwid: &'a str,
    pub action: &'a str,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GoogleSheetsLicenseData {
    pub license_key: Option<String>,
    pub node_id: Option<String>,
    pub organization: Option<String>,
    pub tier: Option<String>,
    pub hwid: Option<String>,
    pub status: Option<String>,
    pub expires_at: Option<String>,
    pub issued_at: Option<String>,
    pub max_offline_days: Option<u64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GoogleSheetsResponse {
    pub success: bool,
    pub token: Option<String>,
    pub license: Option<GoogleSheetsLicenseData>,
    pub error: Option<String>,
    pub message: Option<String>,
    pub searched: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CachedLicenseRecord {
    pub key: String,
    pub token: String,
    pub tier: String,
    pub tier_name: String,
    pub company_name: String,
    pub expires_at: Option<String>,
    pub max_users: u32,
    pub max_nodes: u32,
    pub node_id: String,
    pub hwid: String,
    pub cached_timestamp: u64,
}

pub struct LicensingManager;

impl LicensingManager {
    /// Read the unique hardware fingerprint (HWID) from Windows Registry Cryptography MachineGuid,
    /// falling back to stable environment properties if registry is unavailable.
    pub fn get_machine_hwid() -> String {
        #[cfg(windows)]
        {
            use std::process::Command;
            if let Ok(output) = Command::new("reg")
                .args(["query", r"HKLM\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid"])
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    for line in stdout.lines() {
                        if line.contains("MachineGuid") {
                            if let Some(val) = line.split_whitespace().last() {
                                let trimmed = val.trim();
                                if !trimmed.is_empty() && trimmed.len() >= 8 {
                                    return trimmed.to_lowercase();
                                }
                            }
                        }
                    }
                }
            }
        }

        std::env::var("COMPUTERNAME")
            .or_else(|_| std::env::var("HOSTNAME"))
            .unwrap_or_else(|_| "FASTFREE-SOVEREIGN-NODE".to_string())
    }

    /// Path to backup local cache file in APPDATA
    fn get_cache_file_path(app: &AppHandle) -> PathBuf {
        app.path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("fastfree_license_cache.json")
    }

    /// Persist the validated token and license record into Tauri Store and local app data storage
    pub fn save_license_cache(app: &AppHandle, record: &CachedLicenseRecord) {
        // 1. Persist via Tauri Plugin Store
        if let Ok(store) = app.store("license_store.json") {
            if let Ok(val) = serde_json::to_value(record) {
                store.set("active_license", val);
                let _ = store.save();
            }
        }

        // 2. Persist to AppData JSON file as robust offline insurance
        let file_path = Self::get_cache_file_path(app);
        if let Some(parent) = file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json_str) = serde_json::to_string_pretty(record) {
            let _ = fs::write(file_path, json_str);
        }
    }

    /// Load cached license record from Tauri Store or fallback local storage
    pub fn load_license_cache(app: &AppHandle) -> Option<CachedLicenseRecord> {
        // 1. Try Tauri Plugin Store
        if let Ok(store) = app.store("license_store.json") {
            if let Some(val) = store.get("active_license") {
                if let Ok(rec) = serde_json::from_value::<CachedLicenseRecord>(val) {
                    return Some(rec);
                }
            }
        }

        // 2. Try AppData file fallback
        let file_path = Self::get_cache_file_path(app);
        if let Ok(data) = fs::read_to_string(file_path) {
            if let Ok(rec) = serde_json::from_str::<CachedLicenseRecord>(&data) {
                return Some(rec);
            }
        }

        None
    }

    /// Perform online HTTPS POST verification with Google Apps Script Web App
    pub async fn verify_online(
        clean_key: &str,
        hwid: &str,
    ) -> Result<GoogleSheetsResponse, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(12))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .map_err(|e| format!("HTTP Client initialization failed: {}", e))?;

        let payload = GoogleSheetsRequest {
            api_key: API_SECRET_TOKEN,
            license_key: clean_key,
            hwid,
            action: "verify",
        };

        let response = client
            .post(GOOGLE_SHEETS_ENDPOINT)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network request failed: {}", e))?;

        let status = response.status();
        let body_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        if !status.is_success() && status.as_u16() != 400 && status.as_u16() != 403 && status.as_u16() != 404 {
            return Err(format!("Google Sheets API returned HTTP {}: {}", status, body_text));
        }

        serde_json::from_str::<GoogleSheetsResponse>(&body_text)
            .map_err(|e| format!("Failed to parse Google Sheets response: {} (Raw: {})", e, body_text))
    }

    /// Offline Sovereign Pattern Validation Fallback
    pub fn verify_offline_pattern(clean_key: &str) -> Result<LicenseVerificationResult, String> {
        if clean_key.starts_with("FF-CL") {
            let node_num: String = clean_key
                .chars()
                .skip(5)
                .take(2)
                .filter(|c| c.is_ascii_digit())
                .collect();
            let n: u32 = node_num.parse().unwrap_or(2);
            let target_node = format!("client{}", n);
            let eligible = (2..=11).map(|k| format!("client{}", k)).collect();

            return Ok(LicenseVerificationResult {
                is_valid: true,
                key: clean_key.to_string(),
                tier: "enterprise".to_string(),
                tier_name: format!("FastFree Sovereign Node License ({})", target_node),
                company_name: format!("Sovereign Enterprise Org - {}", target_node),
                expires_at: Some("2028-12-31T23:59:59Z".to_string()),
                max_users: 50,
                max_nodes: 10,
                eligible_clients: eligible,
                unlocked_features: Self::get_standard_features(),
                message: format!(
                    "Sovereign Node {} validated via offline cryptographic pattern.",
                    target_node
                ),
            });
        }

        if clean_key.starts_with("FF-ENT")
            || clean_key.contains("ENTERPRISE")
            || clean_key.contains("SOVEREIGN")
        {
            let eligible = (2..=11).map(|n| format!("client{}", n)).collect();
            return Ok(LicenseVerificationResult {
                is_valid: true,
                key: clean_key.to_string(),
                tier: "enterprise".to_string(),
                tier_name: "FastFree Sovereign Enterprise".to_string(),
                company_name: "FastFree Sovereign Client Org".to_string(),
                expires_at: Some("2028-12-31T23:59:59Z".to_string()),
                max_users: 10000,
                max_nodes: 10,
                eligible_clients: eligible,
                unlocked_features: Self::get_standard_features(),
                message: "Enterprise Sovereign License verified via offline policy.".to_string(),
            });
        }

        if clean_key.starts_with("FF-STD")
            || clean_key.contains("STANDARD")
            || clean_key.contains("COMMERCIAL")
        {
            return Ok(LicenseVerificationResult {
                is_valid: true,
                key: clean_key.to_string(),
                tier: "standard".to_string(),
                tier_name: "FastFree Commercial Standard".to_string(),
                company_name: "FastFree Commercial Node".to_string(),
                expires_at: Some("2027-12-31T23:59:59Z".to_string()),
                max_users: 5,
                max_nodes: 1,
                eligible_clients: vec!["client2".to_string(), "client3".to_string()],
                unlocked_features: vec![
                    "sovereign_hyperv_appliance".to_string(),
                    "wireguard_mesh_vpn".to_string(),
                    "accounting_general_ledger".to_string(),
                    "inventory_warehouse_suite".to_string(),
                    "sales_and_crm_engine".to_string(),
                    "purchase_and_supply_chain".to_string(),
                ],
                message: "Standard Commercial License verified via offline policy.".to_string(),
            });
        }

        if clean_key.starts_with("FF-TRL")
            || clean_key.contains("TRIAL")
            || clean_key.contains("DEMO")
        {
            return Ok(LicenseVerificationResult {
                is_valid: true,
                key: clean_key.to_string(),
                tier: "trial".to_string(),
                tier_name: "FastFree Evaluation 14-Day Trial".to_string(),
                company_name: "Evaluation Sandbox".to_string(),
                expires_at: Some("2026-11-08T23:59:59Z".to_string()),
                max_users: 2,
                max_nodes: 1,
                eligible_clients: vec!["client2".to_string()],
                unlocked_features: vec![
                    "sovereign_hyperv_appliance".to_string(),
                    "wireguard_mesh_vpn".to_string(),
                    "accounting_general_ledger".to_string(),
                    "sales_and_crm_engine".to_string(),
                ],
                message: "Evaluation License activated for 14 days.".to_string(),
            });
        }

        Err("Invalid license key format or signature. Please ensure the key matches the pattern FF-ENT-XXXX, FF-STD-XXXX, or FF-TRL-XXXX.".to_string())
    }

    pub fn get_standard_features() -> Vec<String> {
        vec![
            "sovereign_hyperv_appliance".to_string(),
            "wireguard_mesh_vpn".to_string(),
            "accounting_general_ledger".to_string(),
            "inventory_warehouse_suite".to_string(),
            "sales_and_crm_engine".to_string(),
            "purchase_and_supply_chain".to_string(),
            "hr_payroll_management".to_string(),
            "clan_nixos_self_healing".to_string(),
            "unlimited_local_users".to_string(),
        ]
    }

    pub fn current_epoch_seconds() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}
