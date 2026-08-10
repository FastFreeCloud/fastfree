import { defineAsyncComponent, type Component, type AsyncComponentLoader } from 'vue'

interface ScreenRegistration {
  component: Component
  label?: string
  icon?: string
  groupId?: string
}

interface GroupPage {
  screenType: string
  label: string
  icon: string
}

type RegisterScreen = (type: string, registration: ScreenRegistration) => void
type RegisterGroup = (name: string, icon: string) => void
type RegisterGroupPage = (groupName: string, page: Omit<GroupPage, 'id'>) => void

const HR_GROUP = 'hr.hr'

interface HrScreen {
  type: string
  loader: AsyncComponentLoader
  label: string
  icon: string
}

export function registerHrScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  registerGroup(HR_GROUP, 'mdi-account-group')

  const screens: HrScreen[] = [
    { type: 'hr-employees', loader: () => import('./screens/EmployeeList.vue'), label: 'hr.employees', icon: 'mdi-account-group' },
    { type: 'hr-employee-form', loader: () => import('./screens/EmployeeForm.vue'), label: 'hr.addEmployee', icon: 'mdi-account-plus' },
    { type: 'hr-departments', loader: () => import('./screens/DepartmentForm.vue'), label: 'hr.departments', icon: 'mdi-office-building' },
    { type: 'hr-designations', loader: () => import('./screens/DesignationList.vue'), label: 'hr.designations', icon: 'mdi-account-tie' },
    { type: 'hr-attendance', loader: () => import('./screens/AttendanceList.vue'), label: 'hr.attendance', icon: 'mdi-calendar-check' },
    { type: 'hr-leave', loader: () => import('./screens/LeaveApplicationList.vue'), label: 'hr.leave', icon: 'mdi-calendar-minus' },
    { type: 'hr-payroll', loader: () => import('./screens/PayrollScreen.vue'), label: 'hr.payroll', icon: 'mdi-cash-multiple' },
  ]

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader)
    registerScreen(s.type, { component, label: s.label, icon: s.icon, groupId: HR_GROUP })
    registerGroupPage(HR_GROUP, { screenType: s.type, label: s.label, icon: s.icon })
  }
}
