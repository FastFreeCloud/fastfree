# @fastfree/hr

> Human resources management for FastFree ERP — Employees, Departments, Attendance, Leave, Payroll.

[![npm version](https://img.shields.io/badge/npm-0.0.1-blue.svg)](https://npmjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
  - [Services](#services)
  - [Types](#types)
  - [Screens](#screens)
- [Shared Utilities](#shared-utilities)
- [Configuration](#configuration)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| **Employee Management** | Full CRUD for employee records — name, department, designation, status, contact info |
| **Department & Designation** | Manage organizational structure with hierarchical departments and job titles |
| **Attendance Tracking** | Punch in/out, daily attendance logs with status badges (Present, Absent, Half Day, etc.) |
| **Leave Applications** | Submit, approve, reject, cancel leave requests with type and duration tracking |
| **Holiday Lists** | Configure company holiday calendars with weekly off flags |
| **Salary Slips** | Generate, submit, and manage individual salary slip records |
| **Payroll Processing** | Process payroll for entire company in one action via Frappe RPC |
| **Reports** | Attendance, leave, and payroll reports with date range filtering |
| **i18n** | 114 translation keys in English and Arabic |
| **Pinia Store** | Centralized state management with lazy-loaded fetch actions |
| **Lowcode Integration** | Registers 7 screens into the FastFree lowcode workspace |

---

## Install

This package is part of the FastFree monorepo and is consumed as a workspace dependency:

```bash
# From the monorepo root
pnpm install
```

The package is **private** (`"private": true`) and not published to npm. It is imported directly via the workspace protocol:

```json
{
  "dependencies": {
    "fastfree-hr": "workspace:*"
  }
}
```

---

## Quick Start

### 1. Register the HR module (boot file)

The HR package auto-registers its screens and translations during app initialization. The boot order is:

```
fastfree-auth-init → fastfree-accounting-init → fastfree-inventory-init
→ fastfree-sales-init → fastfree-purchase-init → fastfree-hr-init
→ fastfree-crm-init → i18n → register-service-worker
```

### 2. Use the Pinia store in a component

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useHrStore } from 'fastfree-hr'

const store = useHrStore()

onMounted(async () => {
  await Promise.all([
    store.fetchEmployees(),
    store.fetchDepartments(),
    store.fetchAttendance(),
  ])
})
</script>

<template>
  <div>
    <p>Total employees: {{ store.employees.length }}</p>
    <q-spinner v-if="store.loading" />
    <div v-else>
      <div v-for="emp in store.employees" :key="emp.employee_id">
        {{ emp.employee_name }} — {{ emp.department }}
      </div>
    </div>
  </div>
</template>
```

### 3. Call a service directly (without the store)

```ts
import { getEmployees, createEmployee, processPayroll } from 'fastfree-hr'

// Fetch all employees
const result = await getEmployees()
if (result.success) {
  console.log('Employees:', result.data)
}

// Create a new employee
const newEmp = await createEmployee({
  employee_name: 'John Doe',
  department: 'Engineering',
  designation: 'Software Engineer',
  status: 'Active',
  date_of_joining: '2026-08-01',
})

// Process payroll for the company
await processPayroll('FastFree LLC', '2026-08-01', 'Cost Center - HR')
```

---

## Architecture

```
packages/fastfree_hr/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Barrel export — all public APIs
    ├── init.ts                           # Boot registration (locales + screens)
    ├── screens.ts                        # Lowcode screen registration
    ├── locales/
    │   ├── en.ts                         # English translations (114 keys)
    │   └── ar.ts                         # Arabic translations (114 keys)
    ├── types/
    │   └── index.ts                      # TypeScript interfaces (14 types)
    ├── stores/
    │   └── useHrStore.ts                 # Pinia store
    ├── services/
    │   ├── index.ts                      # Barrel export for services
    │   ├── employee.service.ts           # Employee CRUD
    │   ├── department.service.ts         # Department CRUD
    │   ├── designation.service.ts        # Designation CRUD
    │   ├── attendance.service.ts         # Attendance + submit/cancel
    │   ├── leaveApplication.service.ts   # Leave application + submit/cancel
    │   ├── holidayList.service.ts        # Holiday list CRUD
    │   ├── salarySlip.service.ts         # Salary slip + submit/cancel
    │   ├── payroll.service.ts            # Payroll processing (RPC)
    │   └── report.service.ts             # Attendance/leave/payroll reports
    └── screens/
        ├── EmployeeList.vue              # Employee list with search/filter
        ├── EmployeeForm.vue              # Create/edit employee dialog
        ├── DepartmentForm.vue            # Department manage (table + dialog)
        ├── DesignationList.vue           # Designation manage (table + dialog)
        ├── AttendanceList.vue            # Attendance log with status badges
        ├── LeaveApplicationList.vue      # Leave requests with workflow actions
        └── PayrollScreen.vue             # Dashboard + payroll processing
```

**Key Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `fastfree-auth` | `workspace:*` | API client (`getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`, `callGet`) |
| `vue` | `^3.5.22` | UI framework |
| `vue-router` | `^5.0.6` | Routing |
| `pinia` | `^4.0.2` | State management |
| `quasar` | `^2.23.1` | UI component library |
| `@quasar/extras` | `^2.0.0` | Material Design Icons |

---

## API Reference

### Services

All services communicate with Frappe/ERPNext via the `fastfree-auth` API client.

#### Employee

```ts
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from 'fastfree-hr'

// Fetch all employees (max 500)
const result = await getEmployees()
// → { success: boolean, data: Employee[], message?: string }

// Fetch single employee by ID
const emp = await getEmployee('HR-EMP-00001')

// Create employee
const created = await createEmployee({
  employee_name: 'Jane Smith',
  department: 'Engineering',
  designation: 'Senior Engineer',
  status: 'Active',
  date_of_joining: '2026-01-15',
  personal_email: 'jane@example.com',
  phone: '+1234567890',
  gender: 'Female',
})

// Update employee
await updateEmployee('HR-EMP-00001', {
  designation: 'Lead Engineer',
  status: 'Active',
})

// Delete employee
await deleteEmployee('HR-EMP-00001')
```

#### Department

```ts
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from 'fastfree-hr'

const departments = await getDepartments()

const dept = await getDepartment('Engineering')

await createDepartment({
  department_name: 'Product',
  company: 'FastFree LLC',
  description: 'Product development team',
})

await updateDepartment('Product', {
  description: 'Product & Design team',
})

await deleteDepartment('Product')
```

#### Designation

```ts
import {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from 'fastfree-hr'

const designations = await getDesignations()

await createDesignation({
  designation_name: 'Tech Lead',
  department: 'Engineering',
  is_line_manager: true,
})
```

#### Attendance

```ts
import {
  getAttendance,
  getAttendanceForEmployee,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  submitAttendance,
  cancelAttendance,
} from 'fastfree-hr'

// All attendance records
const all = await getAttendance()

// Filter by date
const today = await getAttendance('2026-08-08')

// Employee attendance in date range
const empAtt = await getAttendanceForEmployee(
  'HR-EMP-00001',
  '2026-08-01',
  '2026-08-31'
)

// Create attendance record
const att = await createAttendance({
  employee: 'HR-EMP-00001',
  attendance_date: '2026-08-08',
  status: 'Present',
  in_time: '09:00:00',
  out_time: '17:30:00',
  hours: 8.5,
})

// Submit (finalize) attendance
await submitAttendance(att.data.name)

// Cancel submitted attendance
await cancelAttendance(att.data.name)
```

#### Leave Application

```ts
import {
  getLeaveApplications,
  getLeaveApplication,
  createLeaveApplication,
  updateLeaveApplication,
  deleteLeaveApplication,
  submitLeaveApplication,
  cancelLeaveApplication,
} from 'fastfree-hr'

const leaves = await getLeaveApplications()

// Create a leave request
const leave = await createLeaveApplication({
  employee: 'HR-EMP-00001',
  from_date: '2026-08-10',
  to_date: '2026-08-14',
  total_days: 5,
  leave_type: 'Annual Leave',
  reason: 'Family vacation',
  status: 'Open',
})

// Submit for approval
await submitLeaveApplication(leave.data.name)

// Cancel a submitted request
await cancelLeaveApplication(leave.data.name)

// Delete a draft request
await deleteLeaveApplication(leave.data.name)
```

#### Holiday List

```ts
import {
  getHolidayLists,
  getHolidayList,
  createHolidayList,
  updateHolidayList,
  deleteHolidayList,
} from 'fastfree-hr'

const lists = await getHolidayLists()

await createHolidayList({
  holiday_list_name: '2026 UAE Holidays',
  holidays: [
    { holiday_date: '2026-01-01', description: "New Year's Day" },
    { holiday_date: '2026-12-25', description: 'Christmas', weekly_off: true },
  ],
})
```

#### Salary Slip

```ts
import {
  getSalarySlips,
  getSalarySlip,
  createSalarySlip,
  updateSalarySlip,
  deleteSalarySlip,
  submitSalarySlip,
  cancelSalarySlip,
} from 'fastfree-hr'

// All salary slips
const slips = await getSalarySlips()

// Filter by date range
const augSlips = await getSalarySlips('2026-08-01', '2026-08-31')

// Create salary slip
const slip = await createSalarySlip({
  employee: 'HR-EMP-00001',
  start_date: '2026-08-01',
  end_date: '2026-08-31',
  gross_pay: 10000,
  total_deductions: 2000,
  net_pay: 8000,
  status: 'Draft',
})

// Submit salary slip
await submitSalarySlip(slip.data.name)
```

#### Payroll

```ts
import { processPayroll, getPayrollSettings } from 'fastfree-hr'

// Process payroll for the entire company
await processPayroll('FastFree LLC', '2026-08-01', 'Cost Center - HR')

// Fetch payroll configuration
const settings = await getPayrollSettings()
```

#### Reports

```ts
import { getAttendanceReport, getLeaveReport, getPayrollReport } from 'fastfree-hr'

// Attendance report
const attReport = await getAttendanceReport('2026-08-01', '2026-08-31')
// Filter by employee
const empReport = await getAttendanceReport('2026-08-01', '2026-08-31', 'HR-EMP-00001')

// Leave report
const leaveReport = await getLeaveReport('2026-08-01', '2026-08-31')

// Payroll report
const payrollReport = await getPayrollReport('2026-08-01', '2026-08-31')
```

---

### Types

All types are exported from `fastfree-hr`. Frappe/ERPNext field names use `snake_case`.

#### `Employee`

```ts
interface Employee {
  employee_id: string
  employee_name: string
  department?: string
  designation?: string
  company?: string
  status: EmployeeStatus          // 'Active' | 'Left' | 'Inactive' | 'Suspended' | 'Terminated' | 'Retired'
  date_of_joining: string
  personal_email?: string
  company_email?: string
  phone?: string
  gender?: string
  blood_group?: string
  birth_date?: string
  current_address?: string
  permanent_address?: string
  user?: string
  holiday_list?: string
}
```

#### `Department`

```ts
interface Department {
  name: string
  department_name: string
  company?: string
  parent_department?: string
  description?: string
  disabled?: boolean
  branch?: string
}
```

#### `Designation`

```ts
interface Designation {
  name: string
  designation_name: string
  department?: string
  description?: string
  is_line_manager?: boolean
}
```

#### `Attendance`

```ts
interface Attendance {
  name: string
  employee: string
  employee_name?: string
  attendance_date: string
  status: AttendanceStatus        // 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Weekly Off' | 'Holiday'
  company?: string
  posting_date?: string
  in_time?: string
  out_time?: string
  hours?: number
}
```

#### `LeaveApplication`

```ts
interface LeaveApplication {
  name: string
  employee: string
  employee_name?: string
  company?: string
  from_date: string
  to_date: string
  total_days: number
  status: LeaveStatus             // 'Open' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled' | 'Closed'
  leave_type?: string
  reason?: string
  half_day?: boolean
  posting_date?: string
}
```

#### `LeaveType`

```ts
interface LeaveType {
  name: string
  leave_type_name: string
  max_days?: number
  require_sandwich?: boolean
  allow_encashment?: boolean
  include_holidays?: boolean
}
```

#### `Holiday` / `HolidayList`

```ts
interface Holiday {
  holiday_date: string
  description?: string
  weekly_off?: boolean
}

interface HolidayList {
  name: string
  holiday_list_name: string
  holidays?: Holiday[]
}
```

#### `SalarySlip`

```ts
interface SalarySlip {
  name: string
  employee: string
  employee_name?: string
  company?: string
  net_pay?: number
  net_total?: number
  total_incentives?: number
  total_deductions?: number
  gross_pay?: number
  start_date?: string
  end_date?: string
  posting_date?: string
  status?: SalarySlipStatus       // 'Draft' | 'Submitted' | 'Cancelled' | 'Paid'
  payment_period?: string
}
```

#### `HrSummary`

```ts
interface HrSummary {
  total_employees: number
  active_employees: number
  present_today: number
  absent_today: number
  on_leave_today: number
  half_day_today: number
  total_attendance_today: number
  pending_leave_applications: number
  total_leave_applications: number
  upcoming_holidays: number
}
```

---

### Screens

7 screens are registered into the lowcode workspace under the **HR** group (`mdi-account-group`).

| Screen Type | Component | Description |
|-------------|-----------|-------------|
| `hr-employees` | `EmployeeList.vue` | Table of all employees with search, filter, edit, and delete |
| `hr-employee-form` | `EmployeeForm.vue` | Dialog form for creating/editing an employee |
| `hr-departments` | `DepartmentForm.vue` | Table + dialog for managing departments |
| `hr-designations` | `DesignationList.vue` | Table + dialog for managing job designations |
| `hr-attendance` | `AttendanceList.vue` | Attendance log with color-coded status badges |
| `hr-leave` | `LeaveApplicationList.vue` | Leave requests with submit/cancel/delete workflow actions |
| `hr-payroll` | `PayrollScreen.vue` | Dashboard summary cards + payroll processing button |

---

## Shared Utilities

The HR package leverages shared composables from `fastfree_lowcode`:

| Utility | Import | Purpose |
|---------|--------|---------|
| `useLcI18n` | `quasar-app-extension-fastfree-lowcode/src/runtime/i18n` | Translation composable for i18n keys |
| `useStatusHelpers` | `quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers` | `translateStatus()` + `statusColor()` for badge rendering |
| `useFormatNumber` | `quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber` | Locale-aware number formatting |
| `registerMessages` | `quasar-app-extension-fastfree-lowcode/src/runtime/index` | Register i18n translation messages |
| `registerScreen` | `quasar-app-extension-fastfree-lowcode/src/runtime/index` | Register a screen in the lowcode registry |
| `registerGroup` | `quasar-app-extension-fastfree-lowcode/src/runtime/index` | Register a sidebar group |
| `registerGroupPage` | `quasar-app-extension-fastfree-lowcode/src/runtime/index` | Register a page within a group |

---

## Configuration

### Boot Order

The HR module registers during `fastfree-hr-init` — after purchase and before CRM:

```ts
// quasar.config.ts (simplified)
build: {
  boot: [
    'fastfree-auth-init',
    'fastfree-accounting-init',
    'fastfree-inventory-init',
    'fastfree-sales-init',
    'fastfree-purchase-init',
    'fastfree-hr-init',      // ← HR registers here
    'fastfree-crm-init',
    'i18n',
    'register-service-worker',
  ],
}
```

### TypeScript

Inherits from the monorepo root `tsconfig.json` with `noEmit: true`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  }
}
```

### Pinia Store

The store is auto-registered when imported. Use it in any component:

```ts
import { useHrStore } from 'fastfree-hr'

const store = useHrStore()

// State
store.employees        // Employee[]
store.departments      // Department[]
store.designations     // Designation[]
store.attendance       // Attendance[]
store.leaveApplications // LeaveApplication[]
store.salarySlips      // SalarySlip[]
store.loading          // boolean
store.error            // string | null

// Actions
await store.fetchEmployees()
await store.fetchDepartments()
await store.fetchDesignations()
await store.fetchAttendance()         // optional: fetchAttendance('2026-08-08')
await store.fetchLeaveApplications()
await store.fetchSalarySlips()
store.$reset()
```

---

## License

MIT © FastFree
