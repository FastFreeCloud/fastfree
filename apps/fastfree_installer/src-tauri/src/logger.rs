use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

static LOG_LOCK: Mutex<()> = Mutex::new(());

#[derive(Debug, Clone, Copy)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
            LogLevel::Debug => "DEBUG",
        }
    }
}

pub struct InstallerLogger;

impl InstallerLogger {
    /// Return the %APPDATA%\FastFree directory
    pub fn get_appdata_dir() -> PathBuf {
        std::env::var("APPDATA")
            .map(|p| PathBuf::from(p).join("FastFree"))
            .unwrap_or_else(|_| {
                std::env::var("USERPROFILE")
                    .map(|p| PathBuf::from(p).join(".fastfree"))
                    .unwrap_or_else(|_| PathBuf::from("."))
            })
    }

    /// Return the %APPDATA%\FastFree\installer.log path
    pub fn get_log_path() -> PathBuf {
        Self::get_appdata_dir().join("installer.log")
    }

    /// Primary log writing routine with thread-safe file appending
    pub fn log(level: LogLevel, component: &str, message: &str) {
        let _guard = LOG_LOCK.lock().unwrap();
        let timestamp = Self::get_timestamp();
        let formatted = format!("[{}] [{}] [{}] {}\n", timestamp, level.as_str(), component, message);

        // Also print to stderr for live CLI/DevTools visibility
        eprint!("{}", formatted);

        let path = Self::get_log_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
            let _ = file.write_all(formatted.as_bytes());
        }
    }

    pub fn info(component: &str, message: &str) {
        Self::log(LogLevel::Info, component, message);
    }

    pub fn warn(component: &str, message: &str) {
        Self::log(LogLevel::Warn, component, message);
    }

    pub fn error(component: &str, message: &str) {
        Self::log(LogLevel::Error, component, message);
    }

    pub fn debug(component: &str, message: &str) {
        Self::log(LogLevel::Debug, component, message);
    }

    /// Read the complete contents of installer.log
    pub fn read_all_logs() -> Result<String, String> {
        let path = Self::get_log_path();
        if !path.exists() {
            return Ok(String::new());
        }
        fs::read_to_string(&path).map_err(|e| format!("Failed to read log file at {}: {}", path.display(), e))
    }

    /// Export a forensic diagnostic bundle to the specified path or default APPDATA location
    pub fn export_bundle(target_path: Option<String>) -> Result<String, String> {
        let log_content = Self::read_all_logs()?;
        let out_path = if let Some(p) = target_path {
            PathBuf::from(p)
        } else {
            let timestamp_secs = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            Self::get_appdata_dir().join(format!("fastfree_diagnostic_bundle_{}.log", timestamp_secs))
        };

        if let Some(parent) = out_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let mut bundle = String::new();
        bundle.push_str("================================================================================\n");
        bundle.push_str(" FASTFREE SOVEREIGN NODE - FORENSIC DIAGNOSTIC BUNDLE\n");
        bundle.push_str("================================================================================\n");
        bundle.push_str(&format!("Generated At: {}\n", Self::get_timestamp()));
        bundle.push_str(&format!("Target Host Architecture: {} / {}\n", std::env::consts::OS, std::env::consts::ARCH));
        bundle.push_str(&format!("Installer Log File Location: {}\n\n", Self::get_log_path().display()));
        bundle.push_str("============================== SYSTEM TRACE LOGS ===============================\n");
        bundle.push_str(&log_content);
        bundle.push_str("\n============================ END OF DIAGNOSTIC BUNDLE =========================\n");

        fs::write(&out_path, bundle)
            .map_err(|e| format!("Failed to write diagnostic bundle to {}: {}", out_path.display(), e))?;

        Self::info(
            "DIAGNOSTICS",
            &format!("Diagnostic bundle exported to: {}", out_path.display()),
        );

        Ok(out_path.to_string_lossy().to_string())
    }

    /// Formats timestamp as YYYY-MM-DD HH:MM:SS.mmm
    pub fn get_timestamp() -> String {
        #[cfg(windows)]
        {
            use windows::Win32::System::SystemInformation::GetLocalTime;
            let st = unsafe { GetLocalTime() };
            format!(
                "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:03}",
                st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds
            )
        }
        #[cfg(not(windows))]
        {
            let secs = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            format!("epoch-{}", secs)
        }
    }
}
