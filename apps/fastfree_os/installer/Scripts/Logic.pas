// ==============================================================================
// FastFree OS Installer - Core System Logic (Pure Pascal Script & WinAPI / WMI)
// ==============================================================================

function GetDriveType(lpRootPathName: String): UINT;
external 'GetDriveTypeW@kernel32.dll stdcall';

// ------------------------------------------------------------------------------
// Smart Drive Selection: Auto-detects partition with the largest free capacity
// ------------------------------------------------------------------------------
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
  BestDrive := 'C:\'; // Default fallback

  for I := Ord('C') to Ord('Z') do
  begin
    DriveLetter := Chr(I);
    RootPath := DriveLetter + ':\';
    if GetDriveType(RootPath) = DRIVE_FIXED then
    begin
      if GetSpaceOnDisk64(RootPath, FreeBytes, TotalBytes) then
      begin
        FreeGB := FreeBytes / (1024 * 1024 * 1024);
        Log(Format('Inspecting drive %s: %.2f GB free', [RootPath, FreeGB]));
        if FreeBytes > MaxFreeBytes then
        begin
          MaxFreeBytes := FreeBytes;
          BestDrive := RootPath;
        end;
      end;
    end;
  end;

  FreeGB := MaxFreeBytes / (1024 * 1024 * 1024);
  Result := AddBackslash(BestDrive) + 'FastFree\Appliance\{#AppMachine}';
  Log(Format('Auto-selected best target drive: %s (%.2f GB available)', [Result, FreeGB]));
end;

// ------------------------------------------------------------------------------
// Extracts root drive path (e.g. "D:\FastFree\Appliance" -> "D:\")
// ------------------------------------------------------------------------------
function ExtractDriveRoot(const Path: String): String;
begin
  if (Length(Path) >= 2) and (Path[2] = ':') then
    Result := Copy(Path, 1, 2) + '\'
  else
    Result := ExtractFileDrive(Path) + '\';
end;

// ------------------------------------------------------------------------------
// Validates disk space: Enforces minimum free space threshold (>= 20 GB)
// ------------------------------------------------------------------------------
function ValidateDiskSpace(const SelectedPath: String): Boolean;
var
  DriveRoot: String;
  FreeBytes, TotalBytes: Int64;
  RequiredBytes: Int64;
  FreeGB: Extended;
begin
  Result := True;
  DriveRoot := ExtractDriveRoot(SelectedPath);
  RequiredBytes := Int64(MIN_REQUIRED_GB) * 1024 * 1024 * 1024;

  if GetSpaceOnDisk64(DriveRoot, FreeBytes, TotalBytes) then
  begin
    FreeGB := FreeBytes / (1024 * 1024 * 1024);
    if FreeBytes < RequiredBytes then
    begin
      MsgBox(
        Format('Drive %s has only %.2f GB of free disk space.'#13#10 +
               'FastFree Virtual Machine requires at least %d GB of free space.'#13#10#13#10 +
               'Please select an alternate drive with greater capacity.',
               [DriveRoot, FreeGB, MIN_REQUIRED_GB]),
        mbCriticalError, MB_OK
      );
      Result := False;
    end;
  end
  else
  begin
    MsgBox('Unable to query disk capacity for: ' + DriveRoot, mbError, MB_OK);
    Result := False;
  end;
end;

// ------------------------------------------------------------------------------
// Hyper-V Service & Virtualization Verification (Registry & WMI)
// ------------------------------------------------------------------------------
function IsHyperVActive(): Boolean;
begin
  Result := RegKeyExists(HKLM, 'SYSTEM\CurrentControlSet\Services\vmms');
end;

// ------------------------------------------------------------------------------
// Native Windows DISM Activation (No PowerShell Required)
// ------------------------------------------------------------------------------
function EnableHyperVViaDISM(): Boolean;
var
  DismExe, DismParams: String;
  ExitCode: Integer;
begin
  Result := False;
  DismExe := ExpandConstant('{sys}\dism.exe');
  DismParams := '/Online /Enable-Feature /All /FeatureName:Microsoft-Hyper-V-All /NoRestart /Quiet';

  Log('Activating Hyper-V features via native Windows DISM: ' + DismExe);
  WizardForm.ProgressGauge.Style := npbstMarquee;
  WizardForm.StatusLabel.Caption := 'Enabling Microsoft Hyper-V platform via DISM...';

  if Exec(DismExe, DismParams, '', SW_HIDE, ewWaitUntilTerminated, ExitCode) then
  begin
    Log(Format('DISM exited with code: %d', [ExitCode]));
    // 0 = Success, 3010 = Success (Reboot required)
    if (ExitCode = 0) or (ExitCode = 3010) then
    begin
      MustRestartComputer := True;
      Result := True;
      Log('Hyper-V successfully enabled. System reboot scheduled.');
    end
    else
    begin
      Log(Format('DISM failed with exit code: %d', [ExitCode]));
    end;
  end
  else
  begin
    Log('Failed to execute dism.exe.');
  end;

  WizardForm.ProgressGauge.Style := npbstNormal;
end;

// ------------------------------------------------------------------------------
// Native WMI Generation 2 VM Provisioning (Pure COM Automation - No PowerShell)
// ------------------------------------------------------------------------------
function ProvisionHyperVVMNative(const VmName, VhdxPath: String; CpuCount, MemoryMB: Integer): Boolean;
var
  WMI: Variant;
  VMService: Variant;
  InParams, OutParams: Variant;
  VSSD: Variant;
  RetVal: Integer;
begin
  Result := False;
  try
    Log(Format('Connecting to Hyper-V WMI (root\virtualization\v2) for VM "%s"...', [VmName]));
    WMI := CreateOleObject('winmgmts:{impersonationLevel=impersonate}!\\.\root\virtualization\v2');
    VMService := WMI.Get('Msvm_VirtualSystemManagementService.Name="vmms"');

    // Create Virtual System Setting Data for Generation 2 VM
    VSSD := WMI.Get('Msvm_VirtualSystemSettingData').SpawnInstance_();
    VSSD.ElementName := VmName;
    VSSD.VirtualSystemSubType := 'Microsoft:Hyper-V:SubType:2';
    VSSD.Notes := ['FastFree Sovereign Monorepo Node'];

    InParams := VMService.Methods_.Item('DefineSystem').InParameters.SpawnInstance_();
    InParams.SystemSettings := VSSD.GetText_(1);

    OutParams := VMService.ExecMethod_('DefineSystem', InParams);
    RetVal := OutParams.ReturnValue;

    if (RetVal = 0) or (RetVal = 4096) then
    begin
      Log(Format('Hyper-V VM "%s" successfully defined via native WMI (Return Code: %d).', [VmName, RetVal]));
      Result := True;
    end
    else
    begin
      Log(Format('Hyper-V WMI DefineSystem returned status code: %d', [RetVal]));
    end;
  except
    Log('WMI Provisioning notice: ' + GetExceptionMessage);
  end;
end;

// ------------------------------------------------------------------------------
// Post-Installation Workflow Dispatcher
// ------------------------------------------------------------------------------
procedure HandlePostInstall();
var
  VmName, VhdxPath: String;
  CpuCount, MemoryMB: Integer;
begin
  VmName := EditVMName.Text;
  VhdxPath := ExpandConstant('{app}\Virtual Hard Disks\fastfree_{#AppMachine}.vhdx');
  CpuCount := StrToIntDef(EditCpuCount.Text, 4);
  MemoryMB := StrToIntDef(EditMemoryMB.Text, 4096);

  if not IsHyperVActive() then
  begin
    if CheckEnableHyperV.Checked then
    begin
      EnableHyperVViaDISM();
    end
    else
    begin
      Log('Hyper-V is inactive and automatic activation was unchecked.');
    end;
  end
  else
  begin
    Log('Hyper-V hypervisor is active. Proceeding with native VM provisioning...');
    ProvisionHyperVVMNative(VmName, VhdxPath, CpuCount, MemoryMB);
  end;
end;
