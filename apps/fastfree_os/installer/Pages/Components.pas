// ==============================================================================
// FastFree OS Installer - Components & VM Configuration Page
// ==============================================================================
// Built using Inno Setup TWizardPage, TLabel, TEdit, TNewCheckBox classes.
// Reference: https://jrsoftware.org/ishelp/index.php?topic=scriptpages
// Reference: https://jrsoftware.org/ishelp/index.php?topic=scriptclasses

procedure CreateComponentsPage();
var
  LblVMName, LblCpu, LblMemory, LblHint: TLabel;
  TopPos: Integer;
begin
  ComponentsCustomPage := CreateCustomPage(
    wpSelectDir,
    'FastFree Node Configuration',
    'Specify the virtual hardware specifications and launch options for your appliance.'
  );

  TopPos := ScaleY(8);

  // Hint description
  LblHint := TLabel.Create(ComponentsCustomPage);
  LblHint.Parent := ComponentsCustomPage.Surface;
  LblHint.Left := ScaleX(0);
  LblHint.Top := TopPos;
  LblHint.Width := ComponentsCustomPage.SurfaceWidth;
  LblHint.Caption := 'The installer will configure a Generation 2 Hyper-V virtual machine optimized for sovereign ERP workloads.';
  LblHint.WordWrap := True;
  TopPos := TopPos + ScaleY(38);

  // VM Name Label & Input
  LblVMName := TLabel.Create(ComponentsCustomPage);
  LblVMName.Parent := ComponentsCustomPage.Surface;
  LblVMName.Left := ScaleX(0);
  LblVMName.Top := TopPos;
  LblVMName.Caption := 'Virtual Machine Name:';
  LblVMName.Font.Style := [fsBold];
  TopPos := TopPos + ScaleY(18);

  EditVMName := TEdit.Create(ComponentsCustomPage);
  EditVMName.Parent := ComponentsCustomPage.Surface;
  EditVMName.Left := ScaleX(0);
  EditVMName.Top := TopPos;
  EditVMName.Width := ScaleX(320);
  EditVMName.Text := 'FastFree-{#AppMachine}';
  TopPos := TopPos + ScaleY(34);

  // CPU Count Label & Input
  LblCpu := TLabel.Create(ComponentsCustomPage);
  LblCpu.Parent := ComponentsCustomPage.Surface;
  LblCpu.Left := ScaleX(0);
  LblCpu.Top := TopPos;
  LblCpu.Caption := 'Virtual CPU Cores (Recommended: 4):';
  LblCpu.Font.Style := [fsBold];
  TopPos := TopPos + ScaleY(18);

  EditCpuCount := TEdit.Create(ComponentsCustomPage);
  EditCpuCount.Parent := ComponentsCustomPage.Surface;
  EditCpuCount.Left := ScaleX(0);
  EditCpuCount.Top := TopPos;
  EditCpuCount.Width := ScaleX(120);
  EditCpuCount.Text := '4';
  TopPos := TopPos + ScaleY(34);

  // Memory Label & Input
  LblMemory := TLabel.Create(ComponentsCustomPage);
  LblMemory.Parent := ComponentsCustomPage.Surface;
  LblMemory.Left := ScaleX(0);
  LblMemory.Top := TopPos;
  LblMemory.Caption := 'Assigned Memory in MB (Recommended: 4096):';
  LblMemory.Font.Style := [fsBold];
  TopPos := TopPos + ScaleY(18);

  EditMemoryMB := TEdit.Create(ComponentsCustomPage);
  EditMemoryMB.Parent := ComponentsCustomPage.Surface;
  EditMemoryMB.Left := ScaleX(0);
  EditMemoryMB.Top := TopPos;
  EditMemoryMB.Width := ScaleX(120);
  EditMemoryMB.Text := '4096';
  TopPos := TopPos + ScaleY(38);

  // Auto-Start Checkbox
  CheckAutoStartVM := TNewCheckBox.Create(ComponentsCustomPage);
  CheckAutoStartVM.Parent := ComponentsCustomPage.Surface;
  CheckAutoStartVM.Left := ScaleX(0);
  CheckAutoStartVM.Top := TopPos;
  CheckAutoStartVM.Width := ComponentsCustomPage.SurfaceWidth;
  CheckAutoStartVM.Caption := 'Automatically start FastFree Virtual Machine on Windows boot';
  CheckAutoStartVM.Checked := True;
  TopPos := TopPos + ScaleY(26);

  // Enable Hyper-V Feature Checkbox
  CheckEnableHyperV := TNewCheckBox.Create(ComponentsCustomPage);
  CheckEnableHyperV.Parent := ComponentsCustomPage.Surface;
  CheckEnableHyperV.Left := ScaleX(0);
  CheckEnableHyperV.Top := TopPos;
  CheckEnableHyperV.Width := ComponentsCustomPage.SurfaceWidth;
  CheckEnableHyperV.Caption := 'Automatically enable Microsoft Hyper-V platform via DISM if not present';
  CheckEnableHyperV.Checked := True;
end;

function ValidateComponentsPage(): Boolean;
var
  CpuVal, MemVal: Integer;
begin
  Result := True;

  if Trim(EditVMName.Text) = '' then
  begin
    MsgBox('Please enter a valid name for the virtual machine.', mbError, MB_OK);
    Result := False;
    Exit;
  end;

  CpuVal := StrToIntDef(EditCpuCount.Text, 0);
  if CpuVal < 1 then
  begin
    MsgBox('CPU Cores must be at least 1 (4 recommended).', mbError, MB_OK);
    Result := False;
    Exit;
  end;

  MemVal := StrToIntDef(EditMemoryMB.Text, 0);
  if MemVal < 2048 then
  begin
    MsgBox('Assigned memory must be at least 2048 MB (4096 MB recommended).', mbError, MB_OK);
    Result := False;
    Exit;
  end;
end;
