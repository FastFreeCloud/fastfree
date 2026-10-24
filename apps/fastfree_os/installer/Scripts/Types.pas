// ==============================================================================
// FastFree OS Installer - Types, Constants and Shared State
// ==============================================================================

const
  DRIVE_FIXED = 3;
  MIN_REQUIRED_GB = 20; // Minimum 20 GB required for VHDX + Database storage

var
  MustRestartComputer: Boolean;
  ComponentsCustomPage: TWizardPage;
  EditVMName: TEdit;
  EditCpuCount: TEdit;
  EditMemoryMB: TEdit;
  CheckAutoStartVM: TNewCheckBox;
  CheckEnableHyperV: TNewCheckBox;

function NeedRestart(): Boolean;
begin
  Result := MustRestartComputer;
end;
