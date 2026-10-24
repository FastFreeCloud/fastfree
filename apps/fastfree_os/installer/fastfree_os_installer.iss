; ==============================================================================
; FastFree OS Sovereign Node - Modern Windows Hyper-V Installer
; ==============================================================================
; Inno Setup 6.3+ Script
;
; Features:
;   * Ultra-modern Windows 11 Fluent UI (WizardStyle=modern dynamic) with auto Dark/Light mode.
;   * Smart Drive Selection: Auto-detects the drive with the LARGEST available free space
;     (avoids forcing installation on C:\ drive which is frequently constrained).
;   * High-capacity disk space guard (enforces >= 20GB free space before installation).
;   * Automated Hyper-V Generation 2 VM deployment via elevated PowerShell.
;   * Desktop shortcuts to launch FastFree ERP in browser & Hyper-V Manager.
; ==============================================================================

#ifndef AppName
  #define AppName "FastFree Sovereign Node"
#endif
#ifndef AppVersion
  #define AppVersion "26.05.0"
#endif
#ifndef AppPublisher
  #define AppPublisher "FastFree Cloud Ecosystem"
#endif
#ifndef AppURL
  #define AppURL "https://fastfree.cloud"
#endif
#ifndef AppMachine
  #define AppMachine "client2"
#endif
#ifndef OutputExeName
  #define OutputExeName "client2_setup"
#endif

[Setup]
AppId={{C62F8B70-4E81-4FA3-94BE-A2D5E8B18129}
AppName={#AppName} ({#AppMachine})
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}

; Dynamic auto-detection: picks the drive with the greatest free disk space (never forces C:\)
DefaultDirName={code:GetDefaultDir}
DefaultGroupName=FastFree
OutputDir=..\..\..\dist-installer
OutputBaseFilename={#OutputExeName}
Compression=lzma2/ultra64
SolidCompression=yes

; Required Windows Privileges
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Modern Windows 11 Fluent Design
WizardStyle=modern

; Directory page settings
EnableDirDoesntExistWarning=no
DirExistsWarning=no
DisableDirPage=no

; Clean Uninstall Support
UninstallDisplayName={#AppName} ({#AppMachine})

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[LangOptions]
DialogFontName=Segoe UI Variable Text
DialogFontSize=9
WelcomeFontName=Segoe UI Variable Display
WelcomeFontSize=14

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "Automatically launch FastFree Virtual Machine on system startup"; GroupDescription: "Virtual Machine Settings:"; Flags: unchecked

[Files]
; Deployment scripts & VM files
Source: "Register-FastFreeVM.ps1"; DestDir: "{tmp}"; Flags: dontcopy
Source: "fastfree_{#AppMachine}.vhdx"; DestDir: "{app}\Virtual Hard Disks"; Flags: ignoreversion

[Icons]
Name: "{group}\FastFree ERP Portal ({#AppMachine})"; Filename: "http://{#AppMachine}.fastfree.local"; IconFilename: "{sys}\shell32.dll"; IconIndex: 14
Name: "{group}\Hyper-V Manager"; Filename: "{sys}\virtmgmt.msc"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\FastFree ERP ({#AppMachine})"; Filename: "http://{#AppMachine}.fastfree.local"; Tasks: desktopicon; IconFilename: "{sys}\shell32.dll"; IconIndex: 14

[Run]
Filename: "http://{#AppMachine}.fastfree.local"; Description: "Open FastFree ERP Portal in browser"; Flags: postinstall shellexec nowait skipifsilent

[Code]
const
  DRIVE_FIXED = 3;
  MIN_REQUIRED_GB = 20; // Minimum 20 GB required for VHDX + database + snapshot headroom

// Windows API for drive type inspection
function GetDriveType(lpRootPathName: String): UINT;
external 'GetDriveTypeW@kernel32.dll stdcall';

// =============================================================================
// Smart Drive Selection: Auto-select the drive with the largest available space
// =============================================================================
function GetDefaultDir(Param: String): String;
var
  I: Integer;
  DriveLetter: Char;
  RootPath: String;
  FreeBytes, TotalBytes: Int64;
  MaxFreeBytes: Int64;
  BestDrive: String;
  FreeGB: Extended;
begin
  MaxFreeBytes := 0;
  BestDrive := 'C:\'; // Safe initial fallback

  // Iterate over drive letters C: to Z:
  for I := Ord('C') to Ord('Z') do
  begin
    DriveLetter := Chr(I);
    RootPath := DriveLetter + ':\';
    if GetDriveType(RootPath) = DRIVE_FIXED then
    begin
      if GetSpaceOnDisk64(RootPath, FreeBytes, TotalBytes) then
      begin
        FreeGB := FreeBytes / (1024 * 1024 * 1024);
        Log(Format('Inspected drive %s - Free space: %.2f GB', [RootPath, FreeGB]));
        // If this drive has more space than previously discovered drives
        if FreeBytes > MaxFreeBytes then
        begin
          MaxFreeBytes := FreeBytes;
          BestDrive := RootPath;
        end;
      end;
    end;
  end;

  // Build target directory on the selected drive (e.g. D:\FastFree\Appliance\client2)
  FreeGB := MaxFreeBytes / (1024 * 1024 * 1024);
  Result := AddBackslash(BestDrive) + 'FastFree\Appliance\{#AppMachine}';
  Log(Format('Auto-selected target directory on best drive: %s (%.2f GB available)', [Result, FreeGB]));
end;

// Helper to extract drive root (e.g. "D:\FastFree\Appliance" -> "D:\")
function ExtractDriveRoot(const Path: String): String;
begin
  if (Length(Path) >= 2) and (Path[2] = ':') then
    Result := Copy(Path, 1, 2) + '\'
  else
    Result := ExtractFileDrive(Path) + '\';
end;

// =============================================================================
// Disk Space Validator: Enforce minimum required space on chosen target partition
// =============================================================================
function NextButtonClick(CurPageID: Integer): Boolean;
var
  SelectedPath, DriveRoot: String;
  FreeBytes, TotalBytes: Int64;
  RequiredBytes: Int64;
  FreeGB, RequiredGB: Extended;
begin
  Result := True;

  if CurPageID = wpSelectDir then
  begin
    SelectedPath := WizardDirValue;
    DriveRoot := ExtractDriveRoot(SelectedPath);
    RequiredBytes := Int64(MIN_REQUIRED_GB) * 1024 * 1024 * 1024;

    if GetSpaceOnDisk64(DriveRoot, FreeBytes, TotalBytes) then
    begin
      FreeGB := FreeBytes / (1024 * 1024 * 1024);
      RequiredGB := MIN_REQUIRED_GB;

      if FreeBytes < RequiredBytes then
      begin
        MsgBox(
          Format('Drive %s has only %.2f GB of free space.'#13#10 +
                 'FastFree Virtual Machine requires at least %.0f GB of free disk space.'#13#10#13#10 +
                 'Please choose a different drive (such as D:\ or E:\) with sufficient capacity.', [DriveRoot, FreeGB, RequiredGB]),
          mbCriticalError, MB_OK
        );
        Result := False;
      end;
    end
    else
    begin
      MsgBox('Could not query free space for path: ' + DriveRoot, mbError, MB_OK);
      Result := False;
    end;
  end;
end;

// =============================================================================
// Modern Typography and Flat Bevel-less Styling
// =============================================================================
procedure InitializeWizard();
begin
  // Remove dated 3D bevels for a clean, flat aesthetic
  WizardForm.Bevel.Visible := False;
  WizardForm.BeveledLabel.Visible := False;

  // Set modern typography
  WizardForm.Font.Name := 'Segoe UI Variable Text';
  WizardForm.Font.Size := 9;

  WizardForm.WelcomeLabel1.Font.Name := 'Segoe UI Variable Display';
  WizardForm.WelcomeLabel1.Font.Size := 14;
  WizardForm.WelcomeLabel1.Font.Style := [fsBold];

  WizardForm.PageNameLabel.Font.Name := 'Segoe UI Variable Display';
  WizardForm.PageNameLabel.Font.Size := 11;
  WizardForm.PageNameLabel.Font.Style := [fsBold];
end;

// =============================================================================
// Hyper-V Generation 2 VM Auto-Provisioning
// =============================================================================
function RegisterHyperVVirtualMachine(): Boolean;
var
  PowerShellExe: String;
  ScriptPath: String;
  VhdxPath: String;
  AppDir: String;
  LogFile: String;
  Params: String;
  ResultCode: Integer;
  DummyCode: Integer;
begin
  Result := True;

  PowerShellExe := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  ScriptPath := ExpandConstant('{tmp}\Register-FastFreeVM.ps1');
  AppDir := ExpandConstant('{app}');
  VhdxPath := ExpandConstant('{app}\Virtual Hard Disks\fastfree_{#AppMachine}.vhdx');
  LogFile := AppDir + '\fastfree_hyperv_install.log';

  Params := Format(
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%s" -VmName "FastFree-{#AppMachine}" -VhdxPath "%s" -InstallDir "%s" -CpuCount 4 -MemoryGB 4 -AutoEnableHyperV', [ScriptPath, VhdxPath, AppDir]
  );

  WizardForm.ProgressGauge.Style := npbstMarquee;
  WizardForm.StatusLabel.Caption := 'Configuring Hyper-V Generation 2 Virtual Machine...';

  Log('Executing PowerShell VM registration: ' + Params);

  if Exec(PowerShellExe, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    case ResultCode of
      0: begin
        Log('Hyper-V Virtual Machine successfully created, configured and started.');
      end;
      101: begin
        MsgBox(
          'Hardware Virtualization (Intel VT-x or AMD-V) is disabled in your computer''s BIOS/UEFI settings.'#13#10#13#10 +
          'Please enable CPU Virtualization in your motherboard BIOS and run setup again.',
          mbCriticalError, MB_OK
        );
        Result := False;
      end;
      102: begin
        MsgBox(
          'Microsoft Hyper-V is currently disabled on this computer.'#13#10#13#10 +
          'To enable Hyper-V, please run PowerShell as Administrator and execute:'#13#10 +
          'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All'#13#10#13#10 +
          'Then restart your computer and run setup again.',
          mbCriticalError, MB_OK
        );
        Result := False;
      end;
      103: begin
        MsgBox(
          'Virtual hard disk file (fastfree_{#AppMachine}.vhdx) was not found in destination directory.',
          mbCriticalError, MB_OK
        );
        Result := False;
      end;
      104: begin
        MsgBox(
          'Microsoft Hyper-V has been automatically enabled on your computer!'#13#10#13#10 +
          'A system restart is required to activate the Hyper-V hypervisor.'#13#10 +
          'Please restart your PC and run setup again to complete the FastFree VM deployment.',
          mbInformation, MB_OK
        );
        Result := False;
      end;
      else begin
        MsgBox(
          Format('Hyper-V registration encountered an error (Code: %d).'#13#10#13#10 +
                 'Detailed diagnostic log was saved to:'#13#10 +
                 '%s', [ResultCode, LogFile]),
          mbError, MB_OK
        );
        Result := False;
      end;
    end;

    // Automatically open the log file if an error occurred and log exists
    if (not Result) and FileExists(LogFile) then
    begin
      ShellExec('open', 'notepad.exe', LogFile, '', SW_SHOWNORMAL, ewNoWait, DummyCode);
    end;
  end
  else
  begin
    MsgBox('Failed to launch Windows PowerShell to register the virtual machine.', mbCriticalError, MB_OK);
    Result := False;
  end;

  WizardForm.ProgressGauge.Style := npbstNormal;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // After files are unpacked, register & launch the VM
    RegisterHyperVVirtualMachine();
  end;
end;
