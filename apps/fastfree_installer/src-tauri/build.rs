fn main() {
    let mut windows = tauri_build::WindowsAttributes::new();
    windows = windows.window_icon_path("icons/icon.ico");

    // The packaged installer must elevate (Hyper-V node provisioning needs
    // admin), but `tauri dev` launches the exe from a plain terminal and
    // Windows blocks it with ERROR_ELEVATION_REQUIRED ("never executed").
    // Debug builds therefore run as the invoking user; the app already logs
    // its elevation state at boot. Release builds keep requireAdministrator.
    let execution_level = if cfg!(debug_assertions) {
        "asInvoker"
    } else {
        "requireAdministrator"
    };

    windows = windows.app_manifest(&format!(
        r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="{execution_level}" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
    </windowsSettings>
  </application>
</assembly>
"#
    ));
    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
