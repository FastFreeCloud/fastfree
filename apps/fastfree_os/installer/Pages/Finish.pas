// ==============================================================================
// FastFree OS Installer - Wizard Styling & Finish Page Customization
// ==============================================================================
// Reference: https://jrsoftware.org/ishelp/index.php?topic=scriptpages
// Reference: https://jrsoftware.org/ishelp/index.php?topic=scriptclasses

procedure InitializeModernWizard();
begin
  // Flat modern styling: eliminate legacy 3D bevel lines
  WizardForm.Bevel.Visible := False;
  WizardForm.BeveledLabel.Visible := False;

  // Modern Windows 11 Fluent typography
  WizardForm.Font.Name := 'Segoe UI Variable Text';
  WizardForm.Font.Size := 9;

  WizardForm.WelcomeLabel1.Font.Name := 'Segoe UI Variable Display';
  WizardForm.WelcomeLabel1.Font.Size := 14;
  WizardForm.WelcomeLabel1.Font.Style := [fsBold];

  WizardForm.PageNameLabel.Font.Name := 'Segoe UI Variable Display';
  WizardForm.PageNameLabel.Font.Size := 11;
  WizardForm.PageNameLabel.Font.Style := [fsBold];

  WizardForm.FinishedHeadingLabel.Font.Name := 'Segoe UI Variable Display';
  WizardForm.FinishedHeadingLabel.Font.Size := 14;
  WizardForm.FinishedHeadingLabel.Font.Style := [fsBold];

  // Initialize the custom components configuration page
  CreateComponentsPage();
end;

function HandleNextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  // 1. Directory Selection Validation: Check disk capacity
  if CurPageID = wpSelectDir then
  begin
    Result := ValidateDiskSpace(WizardDirValue);
  end
  // 2. Custom Components Page Validation: Check VM specifications
  else if (ComponentsCustomPage <> nil) and (CurPageID = ComponentsCustomPage.ID) then
  begin
    Result := ValidateComponentsPage();
  end;
end;

procedure HandleCurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    HandlePostInstall();
  end;
end;
