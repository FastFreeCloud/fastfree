; ==============================================================================
; FastFree OS Sovereign Node - Modular Windows Hyper-V Installer
; ==============================================================================
; Inno Setup 6.3+ Modular Architecture (Zero PowerShell - Pure Pascal & WinAPI)
;
; Documentation References:
;   * Script Format: https://jrsoftware.org/ishelp/index.php?topic=scriptformatoverview
;   * Wizard Pages:  https://jrsoftware.org/ishelp/index.php?topic=scriptpages
;   * Script Classes: https://jrsoftware.org/ishelp/index.php?topic=scriptclasses
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

; Dynamic auto-detection: Picks drive with greatest free space
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

; Modern Windows 11 Fluent Design & Branded Icon
WizardStyle=modern
SetupIconFile=Assets\Icons\app.ico

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

[Files]
Source: "fastfree_{#AppMachine}.vhdx"; DestDir: "{app}\Virtual Hard Disks"; Flags: ignoreversion
Source: "Assets\Icons\app.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\FastFree ERP Portal ({#AppMachine})"; Filename: "http://{#AppMachine}.fastfree.local"; IconFilename: "{app}\app.ico"
Name: "{group}\Hyper-V Manager"; Filename: "{sys}\virtmgmt.msc"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\FastFree ERP ({#AppMachine})"; Filename: "http://{#AppMachine}.fastfree.local"; IconFilename: "{app}\app.ico"

[Run]
Filename: "http://{#AppMachine}.fastfree.local"; Description: "Open FastFree ERP Portal in default web browser"; Flags: postinstall shellexec nowait skipifsilent; Check: not NeedRestart

; ==============================================================================
; Modular Pascal Script Engine
; ==============================================================================
[Code]
#include "Scripts\Types.pas"
#include "Scripts\Logic.pas"
#include "Pages\Components.pas"
#include "Pages\Finish.pas"

procedure InitializeWizard();
begin
  InitializeModernWizard();
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := HandleNextButtonClick(CurPageID);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  HandleCurStepChanged(CurStep);
end;
