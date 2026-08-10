import type { Component } from 'vue'

interface ScreenConfig {
  component: Component
  label: string
  icon: string
  groupId: string
}

type RegisterScreen = (type: string, config: ScreenConfig) => void
type RegisterGroup = (name: string, icon: string) => void
type RegisterGroupPage = (groupName: string, page: { screenType: string; label: string; icon: string }) => void

/**
 * Register auth screens with the lowcode shell.
 * Pass the registry functions loaded from the lowcode module.
 */
export function registerAuthScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  const AUTH_GROUP_NAME = 'groups.authentication'
  registerGroup(AUTH_GROUP_NAME, 'mdi-shield-lock')

  const screens = [
    { type: 'auth-login', loader: () => import('./screens/AuthLogin.vue'), label: 'login', icon: 'mdi-login' },
    { type: 'auth-users', loader: () => import('./screens/UsersManager.vue'), label: 'users', icon: 'mdi-account-group' },
    { type: 'auth-roles', loader: () => import('./screens/RolesManager.vue'), label: 'roles', icon: 'mdi-shield-account' },
    { type: 'auth-license', loader: () => import('./screens/LicenseInfo.vue'), label: 'license', icon: 'mdi-license' },
    { type: 'auth-profile', loader: () => import('./screens/UserProfile.vue'), label: 'profile', icon: 'mdi-account-circle' },
  ]

  for (const screen of screens) {
    const component = screen.loader() as unknown as Component
    registerScreen(screen.type, {
      component,
      label: screen.label,
      icon: screen.icon,
      groupId: AUTH_GROUP_NAME,
    })

    registerGroupPage(AUTH_GROUP_NAME, {
      screenType: screen.type,
      label: screen.label,
      icon: screen.icon,
    })
  }
}
