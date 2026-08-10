import {
  defineAsyncComponent,
  type Component,
  type AsyncComponentLoader,
} from "vue";

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

type RegisterScreen = (type: string, registration: ScreenRegistration) => void;
type RegisterGroup = (name: string, icon: string) => void;
type RegisterGroupPage = (
  groupName: string,
  page: Omit<GroupPage, "id">,
) => void;

const CRM_GROUP = "crm.crm";

interface CrmScreen {
  type: string;
  loader: AsyncComponentLoader;
  label: string;
  icon: string;
}

export function registerCrmScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  registerGroup(CRM_GROUP, "mdi-account-tie");

  const screens: CrmScreen[] = [
    {
      type: "crm-leads",
      loader: () => import("./screens/LeadList.vue"),
      label: "crm.leads",
      icon: "mdi-account-group",
    },
    {
      type: "crm-lead-form",
      loader: () => import("./screens/LeadForm.vue"),
      label: "crm.addLead",
      icon: "mdi-account-plus",
    },
    {
      type: "crm-opportunities",
      loader: () => import("./screens/OpportunityList.vue"),
      label: "crm.opportunities",
      icon: "mdi-handshake",
    },
    {
      type: "crm-opportunity-form",
      loader: () => import("./screens/OpportunityForm.vue"),
      label: "crm.addOpportunity",
      icon: "mdi-handshake-plus",
    },
    {
      type: "crm-contacts",
      loader: () => import("./screens/ContactList.vue"),
      label: "crm.contacts",
      icon: "mdi-account-multiple",
    },
    {
      type: "crm-dashboard",
      loader: () => import("./screens/CrmDashboard.vue"),
      label: "crm.dashboard",
      icon: "mdi-view-dashboard",
    },
  ];

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader);
    registerScreen(s.type, {
      component,
      label: s.label,
      icon: s.icon,
      groupId: CRM_GROUP,
    });
    registerGroupPage(CRM_GROUP, {
      screenType: s.type,
      label: s.label,
      icon: s.icon,
    });
  }
}
