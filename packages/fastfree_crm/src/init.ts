// ============================================================
// FastFree CRM — Initialization
// ============================================================

import type { Component } from "vue";
import { CRM_MESSAGES_EN } from "./locales/en";
import { CRM_MESSAGES_AR } from "./locales/ar";
import { registerCrmScreens } from "./screens";

interface ScreenRegistration {
  component: Component;
  label?: string;
  icon?: string;
  groupId?: string;
}

interface GroupPage {
  screenType: string;
  label: string;
  icon: string;
}

let registerMessages:
  | ((
      namespace: string,
      en: Record<string, string>,
      ar: Record<string, string>,
    ) => void)
  | null = null;
let registerScreen:
  ((type: string, registration: ScreenRegistration) => void) | null = null;
let registerGroup: ((name: string, icon: string) => void) | null = null;
let registerGroupPage:
  ((groupName: string, page: Omit<GroupPage, "id">) => void) | null = null;

async function loadLowcodeRegistry(): Promise<void> {
  try {
    const mod =
      await import("quasar-app-extension-fastfree-lowcode/src/runtime/index");
    registerMessages = mod.registerMessages;
    registerScreen = mod.registerScreen;
    registerGroup = mod.registerGroup;
    registerGroupPage = mod.registerGroupPage;
  } catch {
    console.warn("[FastFree CRM] Could not load lowcode registry.");
  }
}

export async function initFastFreeCrm(): Promise<void> {
  await loadLowcodeRegistry();

  if (registerMessages) {
    registerMessages("crm", CRM_MESSAGES_EN, CRM_MESSAGES_AR);
  }

  if (registerScreen && registerGroup && registerGroupPage) {
    registerCrmScreens(registerScreen, registerGroup, registerGroupPage);
  }
}
