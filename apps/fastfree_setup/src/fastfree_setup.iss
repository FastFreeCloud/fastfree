; ============================================================================
; FastFree Setup — Inno Setup 7 Script
; Version: 1.0.0
; Copyright: 2026 FastFree. All rights reserved.
; Platform: Windows 10/11 64-bit only
; Language: English only
; ============================================================================
#define MyAppName "FastFree Setup"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "FastFree"
#define MyAppURL "https://fastfree.dev"

[Setup]
; --- App Info ---
AppId={{B7A3C2E1-4D5F-6A8B-9C0D-E1F2A3B4C5D6}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppCopyright=Copyright (C) 2026 FastFree

; --- Version Requirements ---
MinVersion=10.0.17763
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

; --- Installer ---
DefaultDirName={autopf}\FastFree
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\output
OutputBaseFilename=fastfree_setup
Compression=lzma2/ultra64
SolidCompression=yes
LZMANumBlockThreads=4
SetupIconFile=..\resources\images\setup-icon.ico

; --- Appearance ---
WizardStyle=modern
WizardSizePercent=110
WizardImageFile=..\resources\images\wizard-image.bmp
WizardSmallImageFile=..\resources\images\wizard-small.bmp

; --- UI ---
UninstallDisplayIcon={app}\unins000.exe
UninstallDisplayName={#MyAppName}
UninstallFilesDir={app}
CloseApplications=force
RestartApplications=no
AlwaysRestart=no
ChangesEnvironment=yes
UsePreviousPrivileges=yes
RestartIfNeededByRun=yes
FlatComponentsList=yes
ShowComponentSizes=yes

; --- Logging ---
SetupLogging=yes

; --- Version Info ---
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName}
VersionInfoCopyright=Copyright (C) 2026 FastFree
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

; --- Privileges ---
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; --- License ---
LicenseFile=..\resources\license.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "Full Installation (All tools)"; Flags: iscustom
Name: "minimal"; Description: "Minimal Installation (Docker tools only)"

[Components]
Name: "docker"; Description: "Docker CLI v29.7 — Build and run containerized applications"; Types: full minimal; Flags: fixed
Name: "compose"; Description: "Docker Compose v5.5 — Define multi-container apps with YAML"; Types: full minimal
Name: "sevenzip"; Description: "7-Zip v26.02 — High-ratio file archiver (7z, ZIP, TAR, GZ)"; Types: full

[Tasks]
Name: "addpath_docker"; Description: "Add Docker CLI to system PATH"; GroupDescription: "Environment Variables:"; Components: docker; Flags: checkedonce
Name: "addpath_compose"; Description: "Add Docker Compose to system PATH"; GroupDescription: "Environment Variables:"; Components: compose; Flags: checkedonce
Name: "addpath_7zip"; Description: "Add 7-Zip to system PATH"; GroupDescription: "Environment Variables:"; Components: sevenzip; Flags: checkedonce
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce
Name: "startmenu"; Description: "Create a Start Menu folder"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Files]
; --- Docker CLI ---
Source: "..\tools\docker-cli\docker.exe"; DestDir: "{app}\docker-cli"; Flags: ignoreversion; Components: docker
Source: "..\tools\docker-cli\*.dll"; DestDir: "{app}\docker-cli"; Flags: ignoreversion skipifsourcedoesntexist; Components: docker

; --- Docker Compose ---
Source: "..\tools\docker-compose\docker-compose.exe"; DestDir: "{app}\docker-compose"; Flags: ignoreversion; Components: compose

; --- 7-Zip ---
Source: "..\tools\7zip\7zr.exe"; DestDir: "{app}\7zip"; DestName: "7z.exe"; Flags: ignoreversion; Components: sevenzip

; --- License & Documentation ---
Source: "..\resources\license.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
; --- Start Menu ---
Name: "{group}\Docker CLI"; Filename: "cmd.exe"; Parameters: "/K docker --version"; Components: docker; Tasks: startmenu
Name: "{group}\Docker Compose"; Filename: "cmd.exe"; Parameters: "/K docker compose version"; Components: compose; Tasks: startmenu
Name: "{group}\7-Zip"; Filename: "{app}\7zip\7z.exe"; Components: sevenzip; Tasks: startmenu
Name: "{group}\FastFree"; Filename: {#MyAppURL}; Comment: "FastFree Website"; Tasks: startmenu
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"; Tasks: startmenu

; --- Desktop ---
Name: "{userdesktop}\FastFree Docker"; Filename: "cmd.exe"; Parameters: "/K docker --version"; Components: docker; Tasks: desktopicon; IconFilename: "{app}\docker-cli\docker.exe"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: filesandordirs; Name: "{group}"

; ============================================================================
; Custom Messages
; ============================================================================
[Messages]
SetupWindowTitle=FastFree Setup — %1
SetupAppTitle=FastFree Setup
BeveledLabel=FastFree Setup v1.0.0

; --- Status Messages ---
StatusExtractFiles=Extracting files...
StatusCreateIcons=Creating shortcuts...
StatusCreateRegistryEntries=Creating registry entries...
StatusSavingUninstall=Saving uninstall information...

; --- Buttons ---
ButtonBack=< &Back
ButtonNext=&Next >
ButtonInstall=&Install
ButtonFinish=&Finish
ButtonCancel=Cancel

; --- Confirm Exit ---
ExitSetupTitle=Exit Setup
ExitSetupMessage=Setup is not complete. If you exit now, the program will not be installed.\n\nAre you sure you want to exit?

; --- Uninstall ---
ConfirmUninstall=Are you sure you want to completely remove FastFree and all of its components?
UninstalledAll=FastFree was successfully removed from your computer.

; ============================================================================
; Pascal Script
; ============================================================================
[Code]

const
  WM_SETTINGCHANGE = $001A;

var
  SysInfoPage: TWizardPage;
  SysInfoUsername: TNewStaticText;
  SysInfoComputer: TNewStaticText;
  SysInfoWindows: TNewStaticText;
  SysInfoArch: TNewStaticText;
  SysInfoDisk: TNewStaticText;
  SysInfoCPU: TNewStaticText;
  SysInfoRAM: TNewStaticText;

// ============================================================================
// System Info Functions
// ============================================================================

function GetUsername: String;
begin
  Result := ExpandConstant('{username}');
end;

function GetComputerName: String;
begin
  Result := ExpandConstant('{computername}');
end;

function GetWindowsEdition: String;
var
  Edition: String;
begin
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\Windows NT\CurrentVersion',
    'ProductName', Edition) then
    Result := Edition
  else
    Result := 'Unknown';
end;

function GetArchitecture: String;
begin
  if IsWin64 then
    Result := '64-bit (x64)'
  else
    Result := '32-bit (x86)';
end;

function GetDiskSpace: String;
var
  ResultCode: Integer;
  TempFile: String;
  SL: TStringList;
  i: Integer;
  Line: String;
  FreeBytes: Int64;
  DriveLetter: String;
begin
  Result := 'N/A';
  DriveLetter := Copy(ExpandConstant('{autopf}'), 1, 2);
  TempFile := ExpandConstant('{tmp}\disk.txt');
  Exec('cmd.exe', '/c wmic logicaldisk where "DeviceID=''' + DriveLetter + '''" get FreeSpace /value > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ResultCode = 0 then
  begin
    SL := TStringList.Create;
    try
      SL.LoadFromFile(TempFile);
      for i := 0 to SL.Count - 1 do
      begin
        Line := Trim(SL[i]);
        if Pos('FreeSpace=', Line) = 1 then
        begin
          FreeBytes := StrToInt64(Copy(Line, 11, Length(Line)));
          Result := IntToStr(FreeBytes div 1048576) + ' MB free';
          Break;
        end;
      end;
    finally
      SL.Free;
    end;
  end;
end;

function GetCPUName: String;
var
  CPUName: String;
begin
  if RegQueryStringValue(HKLM, 'HARDWARE\DESCRIPTION\System\CentralProcessor\0',
    'ProcessorNameString', CPUName) then
    Result := CPUName
  else
    Result := 'Unknown CPU';
end;

function GetRAM: String;
var
  ResultCode: Integer;
  TempFile: String;
  SL: TStringList;
  i: Integer;
  Line: String;
begin
  Result := 'N/A';
  TempFile := ExpandConstant('{tmp}\ram.txt');
  Exec('cmd.exe', '/c wmic computersystem get TotalPhysicalMemory /value > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ResultCode = 0 then
  begin
    SL := TStringList.Create;
    try
      SL.LoadFromFile(TempFile);
      for i := 0 to SL.Count - 1 do
      begin
        Line := Trim(SL[i]);
        if Pos('TotalPhysicalMemory=', Line) = 1 then
        begin
          Result := IntToStr(StrToInt64(Copy(Line, 22, Length(Line))) div 1048576) + ' MB';
          Break;
        end;
      end;
    finally
      SL.Free;
    end;
  end;
end;

// ============================================================================
// PATH Management Functions
// ============================================================================

function NeedsAddPath(Dir: string): Boolean;
var
  Path: string;
  P: Integer;
begin
  Result := True;
  Path := GetEnv('PATH');
  P := Pos(Uppercase(Dir), Uppercase(Path));
  if P > 0 then
  begin
    if (P = 1) or (Path[P - 1] = ';') then
    begin
      if (P + Length(Dir) - 1 = Length(Path)) or (Path[P + Length(Dir)] = ';') then
        Result := False;
    end;
  end;
end;

procedure EnvAddPath(const Dir: string);
var
  Path: string;
begin
  if NeedsAddPath(Dir) then
  begin
    Path := GetEnv('PATH');
    if Path = '' then
      Path := Dir
    else
      Path := Path + ';' + Dir;
    if RegWriteStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'Path', Path) then
      Log('PATH added: ' + Dir)
    else
      Log('ERROR: Failed to add PATH: ' + Dir);
  end
  else
    Log('Already in PATH: ' + Dir);
end;

procedure EnvRemovePath(const Dir: string);
var
  Path, NewPath, UpperDir: string;
  P, Len: Integer;
begin
  Path := GetEnv('PATH');
  UpperDir := Uppercase(Dir);
  NewPath := '';
  P := 1;
  Len := Length(Dir);

  while P <= Length(Path) do
  begin
    if Uppercase(Copy(Path, P, Len + 1)) = UpperDir + ';' then
      P := P + Len + 1
    else if (Uppercase(Copy(Path, P, Len)) = UpperDir) and (P + Len - 1 = Length(Path)) then
      P := P + Len
    else
    begin
      if NewPath <> '' then
        NewPath := NewPath + ';';
      while (P <= Length(Path)) and (Path[P] <> ';') do
      begin
        NewPath := NewPath + Path[P];
        P := P + 1;
      end;
      if P <= Length(Path) then
        P := P + 1;
    end;
  end;

  if NewPath <> Path then
  begin
    if NewPath = '' then
      NewPath := 'C:\Windows\system32;C:\Windows';
    if RegWriteStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'Path', NewPath) then
      Log('PATH removed: ' + Dir)
    else
      Log('ERROR: Failed to remove PATH: ' + Dir);
  end
  else
    Log('Path not found: ' + Dir);
end;

// ============================================================================
// Create Label Helper
// ============================================================================

function CreateInfoLabel(Page: TWizardPage; Top: Integer; Caption: String): TNewStaticText;
begin
  Result := TNewStaticText.Create(Page);
  Result.Parent := Page.Surface;
  Result.Left := ScaleX(10);
  Result.Top := ScaleY(Top);
  Result.Width := Page.SurfaceWidth - ScaleX(20);
  Result.AutoSize := False;
  Result.WordWrap := True;
  Result.Caption := Caption;
  Result.Font.Name := 'Segoe UI';
  Result.Font.Size := 10;
end;

function CreateInfoValue(Page: TWizardPage; Top: Integer; Caption: String): TNewStaticText;
begin
  Result := TNewStaticText.Create(Page);
  Result.Parent := Page.Surface;
  Result.Left := ScaleX(180);
  Result.Top := ScaleY(Top);
  Result.Width := Page.SurfaceWidth - ScaleX(190);
  Result.AutoSize := False;
  Result.WordWrap := True;
  Result.Caption := Caption;
  Result.Font.Name := 'Segoe UI';
  Result.Font.Size := 10;
  Result.Font.Style := [fsBold];
end;

// ============================================================================
// Wizard Form Customization
// ============================================================================

procedure InitializeWizard;
begin
  // --- Create System Info Page (before Welcome) ---
  SysInfoPage := CreateCustomPage(wpWelcome, 'System Information', 'Your system is ready for installation.');

  // Username
  CreateInfoLabel(SysInfoPage, 20, 'Username:').Font.Style := [fsBold];
  SysInfoUsername := CreateInfoValue(SysInfoPage, 20, GetUsername);

  // Computer Name
  CreateInfoLabel(SysInfoPage, 50, 'Computer Name:').Font.Style := [fsBold];
  SysInfoComputer := CreateInfoValue(SysInfoPage, 50, GetComputerName);

  // Windows Edition
  CreateInfoLabel(SysInfoPage, 80, 'Windows:').Font.Style := [fsBold];
  SysInfoWindows := CreateInfoValue(SysInfoPage, 80, GetWindowsEdition);

  // Architecture
  CreateInfoLabel(SysInfoPage, 110, 'Architecture:').Font.Style := [fsBold];
  SysInfoArch := CreateInfoValue(SysInfoPage, 110, GetArchitecture);

  // CPU
  CreateInfoLabel(SysInfoPage, 140, 'Processor:').Font.Style := [fsBold];
  SysInfoCPU := CreateInfoValue(SysInfoPage, 140, GetCPUName);

  // RAM
  CreateInfoLabel(SysInfoPage, 170, 'Memory:').Font.Style := [fsBold];
  SysInfoRAM := CreateInfoValue(SysInfoPage, 170, GetRAM);

  // Disk Space
  CreateInfoLabel(SysInfoPage, 200, 'Disk Space:').Font.Style := [fsBold];
  SysInfoDisk := CreateInfoValue(SysInfoPage, 200, GetDiskSpace);

  // --- Welcome Page Styling ---
  WizardForm.WelcomeLabel1.Font.Name := 'Segoe UI';
  WizardForm.WelcomeLabel1.Font.Size := 18;
  WizardForm.WelcomeLabel1.Font.Style := [fsBold];
  WizardForm.WelcomeLabel1.Font.Color := $00D48C3C;

  WizardForm.WelcomeLabel2.Font.Name := 'Segoe UI';
  WizardForm.WelcomeLabel2.Font.Size := 9;

  WizardForm.BeveledLabel.Caption := ' FastFree Setup v1.0.0 ';
end;

// ============================================================================
// Per-Page Customization
// ============================================================================

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = SysInfoPage.ID then
  begin
    WizardForm.PageNameLabel.Caption := 'System Information';
    WizardForm.PageDescriptionLabel.Caption := 'Your system is ready for installation.';
  end;

  case CurPageID of
    wpWelcome:
    begin
      WizardForm.WelcomeLabel1.Caption := 'FastFree Setup';
      WizardForm.WelcomeLabel2.Caption :=
        'Set up your development environment in minutes.' + #13#10 + #13#10 +
        'This installer includes:' + #13#10 + #13#10 +
        '   Docker CLI & Compose for containerization' + #13#10 +
        '   7-Zip for file management' + #13#10 + #13#10 +
        'All tools are configured automatically.' + #13#10 + #13#10 +
        'Click Next to continue.';
    end;

    wpLicense:
    begin
      WizardForm.PageNameLabel.Caption := 'License Agreement';
      WizardForm.PageDescriptionLabel.Caption := 'Please read the following License Agreement before continuing.';
    end;

    wpSelectDir:
    begin
      WizardForm.PageNameLabel.Caption := 'Installation Location';
      WizardForm.PageDescriptionLabel.Caption := 'Where should FastFree be installed?';
    end;

    wpSelectComponents:
    begin
      WizardForm.PageNameLabel.Caption := 'Choose Components';
      WizardForm.PageDescriptionLabel.Caption := 'Select the tools you want to install.';
    end;

    wpSelectTasks:
    begin
      WizardForm.PageNameLabel.Caption := 'Configuration';
      WizardForm.PageDescriptionLabel.Caption := 'Choose additional tasks.';
    end;

    wpReady:
    begin
      WizardForm.PageNameLabel.Caption := 'Ready to Install';
      WizardForm.PageDescriptionLabel.Caption := 'Review your settings and click Install to begin.';
    end;

    wpInstalling:
    begin
      WizardForm.PageNameLabel.Caption := 'Installing';
      WizardForm.PageDescriptionLabel.Caption := 'Please wait while FastFree is being installed...';
    end;

    wpFinished:
    begin
      WizardForm.FinishedHeadingLabel.Caption := 'Installation Complete!';
      WizardForm.FinishedHeadingLabel.Font.Size := 14;
      WizardForm.FinishedHeadingLabel.Font.Style := [fsBold];
      WizardForm.FinishedHeadingLabel.Font.Color := $00D48C3C;

      WizardForm.FinishedLabel.Caption :=
        'FastFree has been installed successfully.' + #13#10 + #13#10 +
        'All tools are ready to use.' + #13#10 + #13#10 +
        'Open a new terminal and try:' + #13#10 + #13#10 +
        '   docker --version' + #13#10 +
        '   docker compose version' + #13#10 +
        '   7z --help';
    end;
  end;
end;

// ============================================================================
// Ready Page Summary
// ============================================================================

function CalcRequiredSpace: Cardinal;
begin
  Result := 0;
  if WizardIsComponentSelected('sevenzip') then
    Result := Result + 3145728;
  if WizardIsComponentSelected('docker') then
    Result := Result + 52428800;
  if WizardIsComponentSelected('compose') then
    Result := Result + 5242880;
  Result := Result + (Result div 10);
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
var
  S: String;
  DiskMB: Integer;
begin
  S := '';
  DiskMB := CalcRequiredSpace div 1048576;

  S := S + '========================================' + NewLine;
  S := S + '  FastFree Setup — Installation Summary' + NewLine;
  S := S + '========================================' + NewLine;
  S := S + NewLine;

  S := S + 'SYSTEM' + NewLine;
  S := S + '------' + NewLine;
  S := S + Space + 'User: ' + GetUsername + NewLine;
  S := S + Space + 'PC: ' + GetComputerName + NewLine;
  S := S + Space + 'OS: ' + GetWindowsEdition + NewLine;
  S := S + Space + 'Arch: ' + GetArchitecture + NewLine;
  S := S + NewLine;

  S := S + 'DESTINATION' + NewLine;
  S := S + '----------' + NewLine;
  S := S + Space + ExpandConstant('{app}') + NewLine;
  S := S + NewLine;

  S := S + 'COMPONENTS' + NewLine;
  S := S + '----------' + NewLine;
  if WizardIsComponentSelected('docker') then
    S := S + Space + 'Docker CLI v29.7          [Installed]' + NewLine
  else
    S := S + Space + 'Docker CLI v29.7          [Skipped]' + NewLine;

  if WizardIsComponentSelected('compose') then
    S := S + Space + 'Docker Compose v5.5       [Installed]' + NewLine
  else
    S := S + Space + 'Docker Compose v5.5       [Skipped]' + NewLine;

  if WizardIsComponentSelected('sevenzip') then
    S := S + Space + '7-Zip v26.02              [Installed]' + NewLine
  else
    S := S + Space + '7-Zip v26.02              [Skipped]' + NewLine;
  S := S + NewLine;

  S := S + 'ENVIRONMENT' + NewLine;
  S := S + '-----------' + NewLine;
  if WizardIsTaskSelected('addpath_docker') then
    S := S + Space + 'Docker CLI to PATH        [Yes]' + NewLine
  else
    S := S + Space + 'Docker CLI to PATH        [No]' + NewLine;

  if WizardIsTaskSelected('addpath_compose') then
    S := S + Space + 'Docker Compose to PATH    [Yes]' + NewLine
  else
    S := S + Space + 'Docker Compose to PATH    [No]' + NewLine;

  if WizardIsTaskSelected('addpath_7zip') then
    S := S + Space + '7-Zip to PATH             [Yes]' + NewLine
  else
    S := S + Space + '7-Zip to PATH             [No]' + NewLine;
  S := S + NewLine;

  S := S + 'SHORTCUTS' + NewLine;
  S := S + '---------' + NewLine;
  if WizardIsTaskSelected('desktopicon') then
    S := S + Space + 'Desktop shortcut          [Yes]' + NewLine
  else
    S := S + Space + 'Desktop shortcut          [No]' + NewLine;

  if WizardIsTaskSelected('startmenu') then
    S := S + Space + 'Start Menu folder         [Yes]' + NewLine
  else
    S := S + Space + 'Start Menu folder         [No]' + NewLine;
  S := S + NewLine;

  S := S + 'DISK SPACE' + NewLine;
  S := S + '----------' + NewLine;
  S := S + Space + 'Required: ~' + IntToStr(DiskMB) + ' MB' + NewLine;
  S := S + Space + 'Available: ' + GetDiskSpace + NewLine;

  S := S + NewLine;
  S := S + '========================================' + NewLine;
  S := S + '  Click Install to begin setup' + NewLine;
  S := S + '========================================' + NewLine;

  Result := S;
end;

// ============================================================================
// Page Navigation
// ============================================================================

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;

function BackButtonClick(PageID: Integer): Boolean;
begin
  Result := True;
end;

function NextButtonClick(PageID: Integer): Boolean;
begin
  Result := True;
end;

// ============================================================================
// Installation Events
// ============================================================================

procedure CurStepChanged(CurStep: TSetupStep);
var
  DockerPath, ComposePath, SevenZipPath: string;
  Errors: TStringList;
begin
  if CurStep = ssPostInstall then
  begin
    Log('=== Post-Install Started ===');

    DockerPath := ExpandConstant('{app}\docker-cli');
    ComposePath := ExpandConstant('{app}\docker-compose');
    SevenZipPath := ExpandConstant('{app}\7zip');

    Log('Install directory: ' + ExpandConstant('{app}'));
    Log('Docker path: ' + DockerPath);
    Log('Compose path: ' + ComposePath);
    Log('7-Zip path: ' + SevenZipPath);

    if WizardIsTaskSelected('addpath_docker') then
      EnvAddPath(DockerPath);
    if WizardIsTaskSelected('addpath_compose') then
      EnvAddPath(ComposePath);
    if WizardIsTaskSelected('addpath_7zip') then
      EnvAddPath(SevenZipPath);

    CreateDir(ExpandConstant('{userappdata}\FastFree'));
    CreateDir(ExpandConstant('{userappdata}\FastFree\docker'));

    Log('--- Validating Installation ---');
    Errors := TStringList.Create;
    try
      if WizardIsComponentSelected('docker') then
      begin
        if FileExists(ExpandConstant('{app}\docker-cli\docker.exe')) then
          Log('docker.exe: OK')
        else
        begin
          Errors.Add('docker.exe not found');
          Log('docker.exe: MISSING');
        end;
      end;
      if WizardIsComponentSelected('compose') then
      begin
        if FileExists(ExpandConstant('{app}\docker-compose\docker-compose.exe')) then
          Log('docker-compose.exe: OK')
        else
        begin
          Errors.Add('docker-compose.exe not found');
          Log('docker-compose.exe: MISSING');
        end;
      end;
      if WizardIsComponentSelected('sevenzip') then
      begin
        if FileExists(ExpandConstant('{app}\7zip\7z.exe')) then
          Log('7z.exe: OK')
        else
        begin
          Errors.Add('7z.exe not found');
          Log('7z.exe: MISSING');
        end;
      end;

      if Errors.Count > 0 then
        MsgBox('Installation validation found errors:' + #13#10 + #13#10 +
          Errors.Text + #13#10 + #13#10 +
          'Some tools may not work correctly.', mbConfirmation, MB_OK)
      else
        Log('Installation validation passed - all files present');
    finally
      Errors.Free;
    end;

    Log('=== FastFree Setup Complete ===');
  end;
end;

// ============================================================================
// Uninstall Events
// ============================================================================

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DockerPath, ComposePath, SevenZipPath: string;
begin
  if CurUninstallStep = usUninstall then
  begin
    DockerPath := ExpandConstant('{app}\docker-cli');
    ComposePath := ExpandConstant('{app}\docker-compose');
    SevenZipPath := ExpandConstant('{app}\7zip');

    EnvRemovePath(DockerPath);
    EnvRemovePath(ComposePath);
    EnvRemovePath(SevenZipPath);

    DelTree(ExpandConstant('{userappdata}\FastFree'), True, True, True);

    Log('FastFree Setup uninstalled.');
  end;
end;
