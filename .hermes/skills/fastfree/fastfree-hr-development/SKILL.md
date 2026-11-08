---
name: fastfree-hr-development
description: "Develop FastFree HR module: employees, payroll, leave."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, hr, employees, payroll, leave, attendance]
    related_skills: [fastfree-development, project-cleanup, codebase-inspection]
---

# FastFree HR Development Skill

Develop the FastFree HR module — employees, departments, designations, attendance, leave, payroll, salary slips, and reports.

## When to Use

- User asks to develop, modify, or extend FastFree HR features
- User wants to add new HR screens, services, or stores
- User wants to modify employee, department, designation, attendance, leave, or payroll logic
- User needs to add HR-specific reports or analytics

## Prerequisites

- FastFree project at `C:\Users\FastFree\Desktop\fastfree`
- HR package: `packages/fastfree_hr/`
- HR app: `apps/fastfree_hr/`
- Frappe backend for HR DocTypes (Employee, Department, etc.)

## How to Run

### Start HR dev server

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm --filter fastfree_hr dev
```

### Run HR tests

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm --filter fastfree_hr test
```

### Build HR app

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm --filter fastfree_hr build
```

## Quick Reference

| Screen | File | Purpose |
|--------|------|---------|
| Employee List | `screens/EmployeeList.vue` | List all employees |
| Employee Form | `screens/EmployeeForm.vue` | Create/edit employee |
| Department Form | `screens/DepartmentForm.vue` | Manage departments |
| Designation List | `screens/DesignationList.vue` | Manage designations |
| Attendance List | `screens/AttendanceList.vue` | Track attendance |
| Leave Application | `screens/LeaveApplicationList.vue` | Manage leave requests |
| Payroll | `screens/PayrollScreen.vue` | Process payroll |

| Service | File | Purpose |
|---------|------|---------|
| Employee | `services/employee.service.ts` | Employee CRUD |
| Department | `services/department.service.ts` | Department CRUD |
| Designation | `services/designation.service.ts` | Designation CRUD |
| Attendance | `services/attendance.service.ts` | Attendance tracking |
| Leave | `services/leaveApplication.service.ts` | Leave management |
| Payroll | `services/payroll.service.ts` | Payroll processing |
| Salary Slip | `services/salarySlip.service.ts` | Salary slip generation |
| Holiday | `services/holidayList.service.ts` | Holiday management |
| Report | `services/report.service.ts` | HR reports |

## Architecture

### HR Package Structure
```
packages/fastfree_hr/
├── src/
│   ├── index.ts              # Package entry
│   ├── init.ts               # Initialization
│   ├── screens.ts            # Screen registry
│   ├── screens/              # 7 Vue screens
│   ├── services/             # 9 API services
│   ├── stores/               # Pinia store (useHrStore)
│   ├── types/                # TypeScript types
│   └── locales/              # i18n (en, ar)
├── package.json
└── tsconfig.json
```

### HR Store (useHrStore)
Central Pinia store managing:
- Employee list and selected employee
- Department list
- Designation list
- Attendance records
- Leave applications
- Payroll runs
- Salary slips

### HR Services Pattern
Each service follows this pattern:
```typescript
// services/employee.service.ts
import { frappe } from '@fastfree/auth';

export const employeeService = {
  async list(params?: ListParams) {
    return await frappe.call('fastfree_hr.api.employee.get_list', params);
  },
  async get(name: string) {
    return await frappe.call('fastfree_hr.api.employee.get', { name });
  },
  async create(data: Employee) {
    return await frappe.call('fastfree_hr.api.employee.create', data);
  },
  async update(name: string, data: Partial<Employee>) {
    return await frappe.call('fastfree_hr.api.employee.update', { name, ...data });
  },
  async delete(name: string) {
    return await frappe.call('fastfree_hr.api.employee.delete', { name });
  },
};
```

### HR Screen Pattern
Each screen follows this pattern:
```vue
<template>
  <q-page class="q-pa-md">
    <h1>{{ $t('hr.employees.title') }}</h1>
    <!-- List/Form content -->
  </q-page>
</template>

<script setup lang="ts">
import { useHrStore } from '../stores/useHrStore';
const store = useHrStore();
</script>
```

## Procedure

### Adding a new HR feature (e.g., Training Management):

1. **Create type** — Add `Training` interface to `types/index.ts`
2. **Create service** — Create `services/training.service.ts`
3. **Update store** — Add training state/actions to `useHrStore.ts`
4. **Create screens** — Create `screens/TrainingList.vue` and `screens/TrainingForm.vue`
5. **Register screens** — Add to `screens.ts`
6. **Add i18n** — Add keys to `locales/en.ts` and `locales/ar.ts`
7. **Add backend API** — Create Frappe DocType and API endpoints
8. **Test** — Write unit and E2E tests
9. **Build** — `pnpm --filter fastfree_hr build`

### Delegating HR development to subagents:

Use `delegate_task` with parallel workstreams:
- **Frontend subagent**: Create Vue screens, update store, add i18n
- **Backend subagent**: Create Frappe DocTypes, API endpoints, validation
- **Test subagent**: Write unit tests, E2E tests, test data
- **Docs subagent**: Update README, API docs, user guide

### Using bots for HR development:

```bash
# Inspect HR codebase
python bots/project_bot.py  # includes HR analysis

# Design audit (HR screens)
python bots/design_auditor_bot.py

# Architecture mapping (HR dependencies)
python bots/architecture_mapper_bot.py
```

## Free-First Policy

- Use only free/open-source tools
- All profiles use the same free model (no paid models)
- Prefer local models and free APIs
- Never enable billing or use paid fallbacks

## Pitfalls
- Frappe DocTypes must match TypeScript types exactly
- Leave balance calculations need holiday list integration
- Payroll processing requires salary structure setup
- Attendance tracking needs shift management
- Arabic translations must use proper HR terminology
- RTL layout for Arabic HR screens
- Employee permissions (role-based access)
- pnpm may not be in PATH — use `node_modules/.bin/vitest` directly
- Frappe backend: create DocType JSON + controller .py + API endpoints in separate files
- Vitest tests: use `vi.mock()` for Frappe API layer, target 100% coverage on services
- RTL: use CSS variables and logical properties (margin-inline-start, not margin-left)
- Accessibility: add ARIA labels, roles, aria-modal, aria-required on all interactive elements
- i18n: verify en.ts and ar.ts have identical key sets
- Frappe controller: validate() method for required fields, email format, date logic, unique constraints
- Employee DocType: autoname by employee_number, permissions for System Manager/HR Manager/HR User

## Verification

- Run `pnpm --filter fastfree_hr typecheck` — should pass
- Run `pnpm --filter fastfree_hr lint` — should pass
- Run `pnpm --filter fastfree_hr test` — should pass
- Run `pnpm --filter fastfree_hr build` — should succeed
- Check HR screens render correctly in both LTR and RTL
