use crate::logger::InstallerLogger;
use crate::services::process::hidden_powershell;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter};

pub struct StorageService;

impl StorageService {
    pub async fn ensure_appliance_vhdx(app: &AppHandle, client_id: &str, vhdx_path: &str) -> Result<String, String> {
        let path = Path::new(vhdx_path);
        if path.exists() {
            if let Ok(meta) = fs::metadata(path) {
                if meta.len() > 10 * 1024 * 1024 {
                    let vhdx_validate_script = format!(
                        r#"
$vhd = Get-VHD -Path '{}' -ErrorAction SilentlyContinue
if ($vhd -and $vhd.MinimumSize -and $vhd.MinimumSize -gt 0) {{
    Write-Output "VHDX_HAS_OS:$([math]::Round($vhd.FileSize/1MB, 0))"
}} else {{
    Write-Output "VHDX_EMPTY_DISK"
}}
"#,
                        vhdx_path
                    );
                    let validate_out = hidden_powershell()
                        .args(["-Command", &vhdx_validate_script])
                        .output();
                    let is_bootable = match &validate_out {
                        Ok(out) => {
                            let stdout = String::from_utf8_lossy(&out.stdout);
                            stdout.contains("VHDX_HAS_OS:")
                        }
                        Err(_) => meta.len() > 500 * 1024 * 1024,
                    };
                    if is_bootable {
                        let msg = format!("Valid FastFree NixOS appliance VHDX verified ({} MB)", meta.len() / (1024 * 1024));
                        InstallerLogger::info("PROVISIONING", &msg);
                        return Ok(msg);
                    } else {
                        InstallerLogger::warn(
                            "PROVISIONING",
                            &format!("Existing VHDX '{}' ({} MB) is an empty dynamic disk with no OS partitions. Removing to deploy bootable image.", vhdx_path, meta.len() / (1024 * 1024))
                        );
                        let _ = fs::remove_file(path);
                        #[cfg(windows)]
                        {
                            let del_script = format!(
                                r#"
Stop-VM -Name 'FastFree-{cid}' -TurnOff -Force -ErrorAction SilentlyContinue | Out-Null
Get-VMSnapshot -VMName 'FastFree-{cid}' -ErrorAction SilentlyContinue | Remove-VMSnapshot -ErrorAction SilentlyContinue | Out-Null
Get-VMHardDiskDrive -VMName 'FastFree-{cid}' -ErrorAction SilentlyContinue | Remove-VMHardDiskDrive -ErrorAction SilentlyContinue | Out-Null
icacls "{p}" /grant "$($env:USERNAME):(F)" /c /q | Out-Null
Remove-Item -LiteralPath "{p}" -Force -ErrorAction SilentlyContinue | Out-Null
"#,
                                cid = client_id, p = vhdx_path
                            );
                            let _ = hidden_powershell().args(["-Command", &del_script]).output();
                        }
                    }
                } else {
                    InstallerLogger::warn(
                        "PROVISIONING",
                        &format!("Existing disk '{}' is an empty stub ({} bytes). Removing to deploy real image.", vhdx_path, meta.len())
                    );
                    let _ = fs::remove_file(path);
                    #[cfg(windows)]
                    {
                        let del_script = format!(
                            r#"
Stop-VM -Name 'FastFree-{cid}' -TurnOff -Force -ErrorAction SilentlyContinue | Out-Null
Get-VMSnapshot -VMName 'FastFree-{cid}' -ErrorAction SilentlyContinue | Remove-VMSnapshot -ErrorAction SilentlyContinue | Out-Null
Get-VMHardDiskDrive -VMName 'FastFree-{cid}' -ErrorAction SilentlyContinue | Remove-VMHardDiskDrive -ErrorAction SilentlyContinue | Out-Null
icacls "{p}" /grant "$($env:USERNAME):(F)" /c /q | Out-Null
Remove-Item -LiteralPath "{p}" -Force -ErrorAction SilentlyContinue | Out-Null
"#,
                            cid = client_id, p = vhdx_path
                        );
                        let _ = hidden_powershell().args(["-Command", &del_script]).output();
                    }
                }
            }
        }

        // Multi-path local discovery for pre-existing Clan appliance VHDX images
        let mut local_candidates = Vec::new();
        let search_node_ids = [client_id, "client2", "client1"];
        for cid in search_node_ids {
            if let Some(parent) = path.parent() {
                if let Some(grandparent) = parent.parent() {
                    local_candidates.push(grandparent.join("Appliance").join(cid).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", cid)));
                    local_candidates.push(grandparent.join("Appliance").join(cid).join("Virtual Hard Disks").join(format!("{}.vhdx", cid)));
                    local_candidates.push(grandparent.join("Appliance").join(cid).join(format!("fastfree_{}.vhdx", cid)));
                    local_candidates.push(grandparent.join("Appliance").join(cid).join(format!("{}.vhdx", cid)));
                    local_candidates.push(grandparent.join("fastos").join("vhd").join("ext4.vhdx"));
                }
            }
            for drive in ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"] {
                let p_drive = Path::new(drive);
                local_candidates.push(p_drive.join("fastfree").join("Appliance").join(cid).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", cid)));
                local_candidates.push(p_drive.join("FastFree").join("Appliance").join(cid).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", cid)));
                local_candidates.push(p_drive.join("fastfree").join("Appliance").join(cid).join(format!("fastfree_{}.vhdx", cid)));
                local_candidates.push(p_drive.join("FastFree").join("Appliance").join(cid).join(format!("{}.vhdx", cid)));
                local_candidates.push(p_drive.join("fastfree").join("VMs").join(format!("fastfree_{}.vhdx", cid)));
                local_candidates.push(p_drive.join("FastFree").join("VMs").join(format!("fastfree_{}.vhdx", cid)));
                local_candidates.push(p_drive.join("fastfree").join("fastos").join("vhd").join("ext4.vhdx"));
            }
        }

        let mut seen_candidates = std::collections::HashSet::new();
        for candidate in local_candidates {
            let clean_path = match candidate.canonicalize() {
                Ok(p) => p,
                Err(_) => candidate.clone(),
            };
            if !seen_candidates.insert(clean_path) {
                continue;
            }

            if candidate.exists() {
                if let Ok(meta) = fs::metadata(&candidate) {
                    if meta.len() > 100 * 1024 * 1024 {
                        let size_mb = meta.len() / (1024 * 1024);

                        if let (Ok(can_c), Ok(can_p)) = (candidate.canonicalize(), path.canonicalize()) {
                            if can_c == can_p {
                                let success_msg = format!("FastFree NixOS appliance image already verified at target storage '{}' ({} MB)", path.display(), size_mb);
                                InstallerLogger::info("PROVISIONING", &success_msg);
                                let _ = app.emit("provision-step", serde_json::json!({
                                    "step": 2,
                                    "phase": "Image Provisioning",
                                    "message": success_msg.clone(),
                                    "success": true
                                }));
                                return Ok(success_msg);
                            }
                        }

                        let info_msg = format!("Discovered local FastFree appliance image at '{}' ({} MB). Deploying directly...", candidate.display(), size_mb);
                        InstallerLogger::info("PROVISIONING", &info_msg);
                        let _ = app.emit("provision-step", serde_json::json!({
                            "step": 2,
                            "phase": "Image Provisioning",
                            "message": format!("Detected existing appliance image at '{}' ({} MB). Copying to target storage...", candidate.display(), size_mb),
                            "success": true
                        }));
                        if let Some(parent_dir) = path.parent() {
                            let _ = fs::create_dir_all(parent_dir);
                        }
                        match fs::copy(&candidate, path) {
                            Ok(_) => {
                                let success_msg = format!("FastFree NixOS appliance deployed from local cache '{}' ({} MB)", candidate.display(), size_mb);
                                InstallerLogger::info("PROVISIONING", &success_msg);
                                return Ok(success_msg);
                            }
                            Err(e) => {
                                InstallerLogger::warn("PROVISIONING", &format!("Could not copy image from '{}' to '{}': {}", candidate.display(), path.display(), e));
                            }
                        }
                    }
                }
            }
        }

        // Remote download fallback
        let primary_url = format!(
            "https://github.com/FastFreeCloud/fastfree/releases/download/clan-images/fastfree_{}.vhdx.zst",
            client_id
        );
        let fallback_url = "https://github.com/FastFreeCloud/fastfree/releases/download/clan-images/fastfree_client2.vhdx.zst".to_string();
        let zst_temp_path = format!("{}.download.zst", vhdx_path);

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(3600))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let (url, mut response) = {
            InstallerLogger::info("PROVISIONING", &format!("Resolving FastFree NixOS appliance image for '{}'...", client_id));
            let probe = client.get(&primary_url).send().await;
            match probe {
                Ok(res) if res.status().is_success() => {
                    InstallerLogger::info("PROVISIONING", &format!("Node-specific image found: {}", primary_url));
                    (primary_url.clone(), res)
                }
                Ok(res) if res.status().as_u16() == 404 => {
                    InstallerLogger::info(
                        "PROVISIONING",
                        &format!("Node-specific image not available ({}); using base FastFree NixOS appliance image.", res.status())
                    );
                    let _ = app.emit("provision-step", serde_json::json!({
                        "step": 2,
                        "phase": "Image Provisioning",
                        "message": format!("Downloading FastFree NixOS base appliance image for {}...", client_id),
                        "success": true
                    }));
                    match client.get(&fallback_url).send().await {
                        Ok(r) if r.status().is_success() => (fallback_url.clone(), r),
                        Ok(r) => {
                            return Err(format!(
                                "FastFree NixOS appliance image unavailable (HTTP {}). Please place '{}.vhdx' in the FastFree VMs folder.",
                                r.status(), client_id
                            ));
                        }
                        Err(e) => {
                            return Err(format!(
                                "Network error retrieving appliance image: {}. Please connect to the internet or manually place '{}.vhdx' in the FastFree VMs folder.",
                                e, client_id
                            ));
                        }
                    }
                }
                Ok(res) => {
                    return Err(format!(
                        "Repository returned HTTP {} for image retrieval. Please ensure an active internet connection.",
                        res.status()
                    ));
                }
                Err(e) => {
                    return Err(format!(
                        "Network error connecting to image repository: {}. Please connect to internet or manually place '{}.vhdx' in the FastFree VMs folder.",
                        e, client_id
                    ));
                }
            }
        };

        InstallerLogger::info("PROVISIONING", &format!("Downloading FastFree NixOS Clan image from '{}'...", url));
        let _ = app.emit("provision-step", serde_json::json!({
            "step": 2,
            "phase": "Image Provisioning",
            "message": format!("Connecting to repository to retrieve FastFree NixOS image for {}...", client_id),
            "success": true
        }));

        let total_bytes = response.content_length().unwrap_or(0);
        let mut downloaded_bytes: u64 = 0;
        let mut last_pct: u32 = 0;

        let mut temp_file = tokio::fs::File::create(&zst_temp_path)
            .await
            .map_err(|e| format!("Failed to create temporary file '{}': {}", zst_temp_path, e))?;

        use tokio::io::AsyncWriteExt;
        while let Ok(Some(chunk)) = response.chunk().await {
            temp_file.write_all(&chunk).await.map_err(|e| format!("Write chunk error: {}", e))?;
            downloaded_bytes += chunk.len() as u64;

            if total_bytes > 0 {
                let pct = ((downloaded_bytes as f64 / total_bytes as f64) * 100.0) as u32;
                if pct >= last_pct + 5 || pct == 100 {
                    last_pct = pct;
                    let _ = app.emit("provision-download-progress", serde_json::json!({
                        "downloaded": downloaded_bytes,
                        "total": total_bytes,
                        "percent": pct,
                        "phase": "Downloading NixOS Appliance Image"
                    }));
                }
            }
        }
        temp_file.flush().await.map_err(|e| e.to_string())?;
        drop(temp_file);

        InstallerLogger::info("PROVISIONING", &format!("Decompressing zstd image to '{}'...", vhdx_path));
        let _ = app.emit("provision-step", serde_json::json!({
            "step": 2,
            "phase": "Image Decompression",
            "message": "Decompressing FastFree NixOS Clan appliance disk image...",
            "success": true
        }));

        let zst_clone = zst_temp_path.clone();
        let vhdx_clone = vhdx_path.to_string();
        tokio::task::spawn_blocking(move || -> Result<(), String> {
            let input_file = std::fs::File::open(&zst_clone)
                .map_err(|e| format!("Failed to open downloaded archive: {}", e))?;
            let mut decoder = zstd::stream::Decoder::new(input_file)
                .map_err(|e| format!("Failed to initialize zstd decoder: {}", e))?;
            let mut output_file = std::fs::File::create(&vhdx_clone)
                .map_err(|e| format!("Failed to create destination VHDX: {}", e))?;
            std::io::copy(&mut decoder, &mut output_file)
                .map_err(|e| format!("Failed to decompress image stream: {}", e))?;
            output_file.sync_all().map_err(|e| e.to_string())?;
            Ok(())
        })
        .await
        .map_err(|e| format!("Decompression task join error: {}", e))??;

        let _ = std::fs::remove_file(&zst_temp_path);
        InstallerLogger::info("PROVISIONING", &format!("NixOS appliance image provisioned at '{}'", vhdx_path));
        Ok(format!("FastFree NixOS image decompressed and verified successfully ({} MB)", downloaded_bytes / (1024 * 1024)))
    }
}
