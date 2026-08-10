# AGENTS.md — FastFree HR

## ملاحظات سريعة

- **الاسم**: `fastfree-hr` (version `0.0.1`)
- **النوع**: Pakcage خاص (private) — module ES
- **النقطة الرئيسية**: `src/index.ts`
- **التبعيات الأساسية**: `fastfree-auth` (workspace), `vue ^3.5.22`, `vue-router ^5.0.6`, `pinia ^4.0.2`, `quasar ^2.23.1`, `@quasar/extras ^2.0.0`
- **Boot Order**: يُحمّل بعد `fastfree-purchase-init` وقبل `fastfree-crm-init`
- **tsconfig**: يرث من `../../tsconfig.json` مع `noEmit: true`
- **عدد الشاشات**: 7
- **عدد الخدمات**: 9 ملفات خدمة (48 دالة مُصدّرة)
- **عدد الأنواع**: 13 نوع
- **عدد مفاتيح الترجمة**: 114 (EN + AR)

## وصف الحزمة

حزمة الموارد البشرية (HR) توفر إدارة شاملة للموظفين في نظام FastFree. تتضمن إدارة الموظفين، الأقسام، الوظائف، الحضور، الإجازات، قوائم العطلات، قسائم الرواتب، ومعالجة الرواتب (Payroll). تتكامل مع `fastfree-auth` للحصول على بيانات Frappe/ERPNext عبر API.

## هيكل الملفات

```
packages/fastfree_hr/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Entry point — barrel export
    ├── init.ts                           # تهيئة الحزمة (تسجيل الترجمات + الشاشات)
    ├── screens.ts                        # تسجيل الشاشات في lowcode registry
    ├── locales/
    │   ├── en.ts                         # ترجمات إنجليزية (114 مفتاح)
    │   └── ar.ts                         # ترجمات عربية (114 مفتاح)
    ├── types/
    │   └── index.ts                      # تعريفات TypeScript (13 نوع)
    ├── stores/
    │   └── useHrStore.ts                 # Pinia store
    ├── services/
    │   ├── index.ts                      # Barrel export للخدمات
    │   ├── employee.service.ts           # خدمات الموظفين
    │   ├── department.service.ts         # خدمات الأقسام
    │   ├── designation.service.ts        # خدمات الوظائف
    │   ├── attendance.service.ts         # خدمات الحضور
    │   ├── leaveApplication.service.ts   # خدمات طلبات الإجازة
    │   ├── holidayList.service.ts        # خدمات قوائم العطلات
    │   ├── salarySlip.service.ts         # خدمات قسائم الرواتب
    │   ├── payroll.service.ts            # خدمات معالجة الرواتب
    │   └── report.service.ts             # خدمات التقارير
    └── screens/
        ├── EmployeeList.vue              # شاشة قائمة الموظفين
        ├── EmployeeForm.vue              # شاشة إضافة/تعديل موظف
        ├── DepartmentForm.vue            # شاشة إدارة الأقسام
        ├── DesignationList.vue           # شاشة إدارة الوظائف
        ├── AttendanceList.vue            # شاشة سجل الحضور
        ├── LeaveApplicationList.vue      # شاشة طلبات الإجازة
        └── PayrollScreen.vue             # شاشة الرواتب والمعالجة
```

## الأنواع (Types)

### `src/types/index.ts`

| النوع | الوصف |
|-------|-------|
| `ApiResponse<T>` | استجابة API عامة — مُعاد تصدير من `fastfree-auth` |
| `EmployeeStatus` | union type: `'Active' \| 'Left' \| 'Inactive' \| 'Suspended' \| 'Terminated' \| 'Retired'` |
| `Employee` | واجهة الموظف — `employee_id`, `employee_name`, `department`, `designation`, `company`, `status`, `date_of_joining`, `personal_email`, `company_email`, `phone`, `gender`, `blood_group`, `birth_date`, `current_address`, `permanent_address`, `user`, `holiday_list` |
| `Department` | واجهة القسم — `name`, `department_name`, `company`, `parent_department`, `description`, `disabled`, `branch` |
| `Designation` | واجهة الوظيفة — `name`, `designation_name`, `department`, `description`, `is_line_manager` |
| `AttendanceStatus` | union type: `'Present' \| 'Absent' \| 'Half Day' \| 'On Leave' \| 'Weekly Off' \| 'Holiday'` |
| `Attendance` | واجهة الحضور — `name`, `employee`, `employee_name`, `attendance_date`, `status`, `company`, `posting_date`, `in_time`, `out_time`, `hours` |
| `LeaveStatus` | union type: `'Open' \| 'Submitted' \| 'Approved' \| 'Rejected' \| 'Cancelled' \| 'Closed'` |
| `LeaveApplication` | واجهة طلب الإجازة — `name`, `employee`, `employee_name`, `company`, `from_date`, `to_date`, `total_days`, `status`, `leave_type`, `reason`, `half_day`, `posting_date` |
| `LeaveType` | واجهة نوع الإجازة — `name`, `leave_type_name`, `max_days`, `require_sandwich`, `allow_encashment`, `include_holidays` |
| `Holiday` | واجهة العطلة — `holiday_date`, `description`, `weekly_off` |
| `HolidayList` | واجهة قائمة العطلات — `name`, `holiday_list_name`, `holidays` (Holiday[]) |
| `SalarySlipStatus` | union type: `'Draft' \| 'Submitted' \| 'Cancelled' \| 'Paid'` |
| `SalarySlip` | واجهة قسيمة الراتب — `name`, `employee`, `employee_name`, `company`, `net_pay`, `net_total`, `total_incentives`, `total_deductions`, `gross_pay`, `start_date`, `end_date`, `posting_date`, `status`, `payment_period` |
| `HrSummary` | واجهة ملخص HR — `total_employees`, `active_employees`, `present_today`, `absent_today`, `on_leave_today`, `half_day_today`, `total_attendance_today`, `pending_leave_applications`, `total_leave_applications`, `upcoming_holidays` |

## الخدمات (Services)

### `employee.service.ts` — خدمات الموظفين

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getEmployees()` | — | جلب جميع الموظفين (حد أقصى 500) |
| `getEmployee(id)` | `id: string` | جلب موظف واحد بالمعرف |
| `createEmployee(data)` | `Partial<Employee>` | إنشاء موظف جديد |
| `updateEmployee(id, data)` | `id: string, Partial<Employee>` | تعديل بيانات موظف |
| `deleteEmployee(id)` | `id: string` | حذف موظف |

**Doctype**: `Employee`
**الحقول المُجلبة**: `employee`, `employee_name`, `department`, `designation`, `status`, `date_of_joining`, `company`, `personal_email`, `company_email`, `phone`

### `department.service.ts` — خدمات الأقسام

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getDepartments()` | — | جلب جميع الأقسام (حد أقصى 500) |
| `getDepartment(name)` | `name: string` | جلب قسم واحد بالاسم |
| `createDepartment(data)` | `Partial<Department>` | إنشاء قسم جديد |
| `updateDepartment(name, data)` | `name: string, Partial<Department>` | تعديل بيانات قسم |
| `deleteDepartment(name)` | `name: string` | حذف قسم |

**Doctype**: `Department`
**الحقول المُجلبة**: `name`, `department_name`, `company`, `parent_department`, `description`, `disabled`, `branch`

### `designation.service.ts` — خدمات الوظائف

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getDesignations()` | — | جلب جميع الوظائف (حد أقصى 500) |
| `getDesignation(name)` | `name: string` | جلب وظيفة واحدة بالاسم |
| `createDesignation(data)` | `Partial<Designation>` | إنشاء وظيفة جديدة |
| `updateDesignation(name, data)` | `name: string, Partial<Designation>` | تعديل بيانات وظيفة |
| `deleteDesignation(name)` | `name: string` | حذف وظيفة |

**Doctype**: `Designation`
**الحقول المُجلبة**: `name`, `designation_name`, `department`, `description`, `is_line_manager`

### `attendance.service.ts` — خدمات الحضور

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getAttendance(date?)` | `date?: string` | جلب سجل الحضور (فلتر بالتاريخ اختياري) |
| `getAttendanceForEmployee(employeeId, fromDate, toDate)` | `string, string, string` | جلب حضور موظف في فترة محددة |
| `createAttendance(data)` | `Partial<Attendance>` | إنشاء سجل حضور |
| `updateAttendance(name, data)` | `name: string, Partial<Attendance>` | تعديل سجل حضور |
| `deleteAttendance(name)` | `name: string` | حذف سجل حضور |
| `submitAttendance(name)` | `name: string` | ترحيل سجل حضور (frappe.client.submit_single) |
| `cancelAttendance(name)` | `name: string` | إلغاء سجل حضور (frappe.client.cancel) |

**Doctype**: `Attendance`
**الحقول المُجلبة**: `name`, `employee`, `employee_name`, `attendance_date`, `status`, `company`, `posting_date`, `in_time`, `out_time`, `hours`

### `leaveApplication.service.ts` — خدمات طلبات الإجازة

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getLeaveApplications()` | — | جلب جميع طلبات الإجازة (حد أقصى 500) |
| `getLeaveApplication(name)` | `name: string` | جلب طلب إجازة واحد |
| `createLeaveApplication(data)` | `Partial<LeaveApplication>` | إنشاء طلب إجازة جديد |
| `updateLeaveApplication(name, data)` | `name: string, Partial<LeaveApplication>` | تعديل طلب إجازة |
| `deleteLeaveApplication(name)` | `name: string` | حذف طلب إجازة |
| `submitLeaveApplication(name)` | `name: string` | ترحيل طلب إجازة |
| `cancelLeaveApplication(name)` | `name: string` | إلغاء طلب إجازة |

**Doctype**: `Leave Application`
**الحقول المُجلبة**: `name`, `employee`, `employee_name`, `company`, `from_date`, `to_date`, `total_days`, `status`, `leave_type`, `reason`, `half_day`, `posting_date`

### `holidayList.service.ts` — خدمات قوائم العطلات

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getHolidayLists()` | — | جلب جميع قوائم العطلات (حد أقصى 500) |
| `getHolidayList(name)` | `name: string` | جلب قائمة عطلات واحدة |
| `createHolidayList(data)` | `Partial<HolidayList>` | إنشاء قائمة عطلات جديدة |
| `updateHolidayList(name, data)` | `name: string, Partial<HolidayList>` | تعديل قائمة عطلات |
| `deleteHolidayList(name)` | `name: string` | حذف قائمة عطلات |

**Doctype**: `Holiday List`
**الحقول المُجلبة**: `name`, `holiday_list_name`, `holidays`

### `salarySlip.service.ts` — خدمات قسائم الرواتب

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getSalarySlips(fromDate?, toDate?)` | `string?, string?` | جلب قسائم الرواتب (فلتر بالتاريخ اختياري) |
| `getSalarySlip(name)` | `name: string` | جلب قسيمة راتب واحدة |
| `createSalarySlip(data)` | `Partial<SalarySlip>` | إنشاء قسيمة راتب جديدة |
| `updateSalarySlip(name, data)` | `name: string, Partial<SalarySlip>` | تعديل قسيمة راتب |
| `deleteSalarySlip(name)` | `name: string` | حذف قسيمة راتب |
| `submitSalarySlip(name)` | `name: string` | ترحيل قسيمة راتب |
| `cancelSalarySlip(name)` | `name: string` | إلغاء قسيمة راتب |

**Doctype**: `Salary Slip`
**الحقول المُجلبة**: `name`, `employee`, `employee_name`, `company`, `net_pay`, `net_total`, `total_incentives`, `total_deductions`, `gross_pay`, `start_date`, `end_date`, `posting_date`, `status`, `payment_period`

### `payroll.service.ts` — خدمات معالجة الرواتب

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `processPayroll(company, postingDate, payrollCostCenter)` | `string, string, string` | معالجة الرواتب لشركة في تاريخ محدد (payroll.process_payroll) |
| `getPayrollSettings()` | — | جلب إعدادات الرواتب (payroll.get_settings) |

### `report.service.ts` — خدمات التقارير

| الدالة | المعاملات | الوصف |
|--------|-----------|-------|
| `getAttendanceReport(fromDate, toDate, employee?)` | `string, string, string?` | تقرير الحضور (attendance.report.attendance) |
| `getLeaveReport(fromDate, toDate, employee?)` | `string, string, string?` | تقرير الإجازات (leave_application.report.leave) |
| `getPayrollReport(fromDate, toDate)` | `string, string` | تقرير الرواتب (payroll.report.payroll) |

## الشاشات (Screens)

### `screens.ts` — تسجيل الشاشات

| screen type | الملف | label | الأيقونة |
|------------|-------|-------|---------|
| `hr-employees` | `EmployeeList.vue` | `hr.employees` | `mdi-account-group` |
| `hr-employee-form` | `EmployeeForm.vue` | `hr.addEmployee` | `mdi-account-plus` |
| `hr-departments` | `DepartmentForm.vue` | `hr.departments` | `mdi-office-building` |
| `hr-designations` | `DesignationList.vue` | `hr.designations` | `mdi-account-tie` |
| `hr-attendance` | `AttendanceList.vue` | `hr.attendance` | `mdi-calendar-check` |
| `hr-leave` | `LeaveApplicationList.vue` | `hr.leave` | `mdi-calendar-minus` |
| `hr-payroll` | `PayrollScreen.vue` | `hr.payroll` | `mdi-cash-multiple` |

**المجموعة**: `hr.hr` — أيقونة: `mdi-account-group`

---

### `EmployeeList.vue` — شاشة قائمة الموظفين

- **الوصف**: جدول يعرض جميع الموظفين مع البحث والفلترة
- **الأعمدة**: `employee_name`, `department`, `designation`, `status`, `date_of_joining`, `actions`
- **الإجراءات**: تعديل (pencil)، حذف (delete) مع تأكيد
- **المكونات الفرعية**: `EmployeeForm` (dialog)
- **المكتبات**: `useLcI18n`, `useStatusHelpers('hr')`, `useHrStore`
- **الأحداث**: `onMounted → store.fetchEmployees()`

### `EmployeeForm.vue` — شاشة إضافة/تعديل موظف

- **الوصف**: dialog formulario لإنشاء أو تعديل موظف
- **الحقول**: `employee_name` (text, مطلوب), `department` (select, مطلوب), `designation` (select), `date_of_joining` (date, مطلوب), `personal_email` (email), `company_email` (email), `phone` (text), `gender` (select), `status` (select, مطلوب)
- **خيارات gender**: Male, Female, Other
- **خيارات status**: Active, Inactive, Suspended, Left, Terminated, Retired
- **خيارات department**: من `store.departments`
- **خيارات designation**: من `store.designations`
- **الProps**: `modelValue: boolean`, `employee?: Employee | null`
- **الأحداث**: `update:modelValue`, `saved`
- **المكتبات**: `useLcI18n`, `useHrStore`, `createEmployee`, `updateEmployee`

### `DepartmentForm.vue` — شاشة إدارة الأقسام

- **الوصف**: جدول + dialog لإدارة الأقسام (إضافة/تعديل/حذف)
- **الأعمدة**: `name`, `department_name`, `parent_department`, `description`, `disabled`, `actions`
- **الحقول في الفورم**: `department_name` (text, مطلوب), `parent_department` (select, اختياري), `description` (textarea)
- **الإجراءات**: تعديل (pencil)، حذف (delete) مع تأكيد
- **المكتبات**: `useLcI18n`, `useHrStore`, `createDepartment`, `updateDepartment`, `deleteDepartment`

### `DesignationList.vue` — شاشة إدارة الوظائف

- **الوصف**: جدول + dialog لإدارة الوظائف (إضافة/تعديل/حذف)
- **الأعمدة**: `name`, `designation_name`, `department`, `description`, `actions`
- **الحقول في الفورم**: `designation_name` (text, مطلوب), `department` (select, اختياري), `description` (textarea)
- **الإجراءات**: تعديل (pencil)، حذف (delete) مع تأكيد
- **المكتبات**: `useLcI18n`, `useHrStore`, `createDesignation`, `updateDesignation`, `deleteDesignation`

### `AttendanceList.vue` — شاشة سجل الحضور

- **الوصف**: جدول يعرض سجلات الحضور مع حالة مترجمة
- **الأعمدة**: `employee_name`, `attendance_date`, `status` (badge), `in_time`, `out_time`, `hours`
- **المكتبات**: `useLcI18n`, `useStatusHelpers('hr')`, `useHrStore`
- **الأحداث**: `onMounted → store.fetchAttendance()`

### `LeaveApplicationList.vue` — شاشة طلبات الإجازة

- **الوصف**: جدول يعرض طلبات الإجازة مع إجراءات الترحيل والإلغاء والحذف
- **الأعمدة**: `employee_name`, `from_date`, `to_date`, `total_days`, `leave_type`, `status` (badge), `actions`
- **الإجراءات**:
  - ترحيل (check) — للطلبات بحالة `Open` أو `Draft`
  - إلغاء (close) — للطلبات بحالة `Submitted`
  - حذف (delete) — للطلبات بحالة `Open` أو `Draft`
- **نافذة التأكيد**: 3 نوافذ (تأكيد الترحيل، تأكيد الإلغاء، تأكيد الحذف)
- **المكتبات**: `useLcI18n`, `useStatusHelpers('hr')`, `useHrStore`, `submitLeaveApplication`, `cancelLeaveApplication`, `deleteLeaveApplication`

### `PayrollScreen.vue` — شاشة الرواتب

- **الوصف**: لوحة معلومات + معالجة الرواتب
- **بطاقات الملخص**: `totalEmployees`, `activeEmployees`, `presentToday`, `absentToday`, `onLeaveToday`, `halfDayToday`, `pendingLeaves`
- **الإجراء**: معالجة الرواتب (processPayroll) عبر `payroll.process_payroll`
- **المكتبات**: `useLcI18n`, `useFormatNumber`, `useHrStore`, `processPayroll`, `getAttendanceReport`, `getLeaveReport`
- **الأحداث**: `onMounted → loadData()` (Promise.all لـ 3 مصادر بيانات)

## الـ Store

### `useHrStore` — Pinia Store

**المعرّف**: `fastfree-hr`

#### الحالة (State)

| الحالة | النوع | الوصف |
|--------|-------|-------|
| `employees` | `ref<Employee[]>` | قائمة الموظفين |
| `departments` | `ref<Department[]>` | قائمة الأقسام |
| `designations` | `ref<Designation[]>` | قائمة الوظائف |
| `attendance` | `ref<Attendance[]>` | سجلات الحضور |
| `leaveApplications` | `ref<LeaveApplication[]>` | طلبات الإجازة |
| `salarySlips` | `ref<SalarySlip[]>` | قسائم الرواتب |
| `loading` | `ref<boolean>` | حالة التحميل |
| `error` | `ref<string \| null>` | رسالة الخطأ |

#### الإجراءات (Actions)

| الإجراء | المعاملات | الوصف |
|---------|-----------|-------|
| `fetchEmployees()` | — | جلب الموظفين من `getEmployees()` |
| `fetchDepartments()` | — | جلب الأقسام من `getDepartments()` |
| `fetchDesignations()` | — | جلب الوظائف من `getDesignations()` |
| `fetchAttendance(date?)` | `date?: string` | جلب الحضور من `getAttendance()` |
| `fetchLeaveApplications()` | — | جلب طلبات الإجازة من `getLeaveApplications()` |
| `fetchSalarySlips()` | — | جلب قسائم الرواتب من `getSalarySlips()` |
| `$reset()` | — | إعادة تعيين جميع الحالات للقيم الافتراضية |

## الترجمات

### `locales/en.ts` — الإنجليزية (114 مفتاح)

| المجموعة | المفاتيح |
|----------|---------|
| **hr** | `hr`, `groups.hr` |
| **Screens** | `screens.hr-employees`, `screens.hr-departments`, `screens.hr-attendance`, `screens.hr-leave`, `screens.hr-holidays`, `screens.hr-payroll`, `screens.hr-dashboard` |
| **Employees** | `employees`, `addEmployee`, `editEmployee`, `employeeName`, `employeeId`, `dateOfJoining`, `personalEmail`, `companyEmail`, `company`, `gender`, `male`, `female`, `other`, `deleteEmployeeConfirm`, `employeeSaved`, `employeeDeleted` |
| **Departments** | `departments`, `addDepartment`, `editDepartment`, `departmentName`, `parentDepartment`, `description`, `deleteDepartmentConfirm`, `departmentSaved`, `departmentDeleted`, `selectDepartment` |
| **Designations** | `designations`, `addDesignation`, `editDesignation`, `designationName`, `deleteDesignationConfirm`, `designationSaved`, `designationDeleted`, `selectDesignation` |
| **Attendance** | `attendance`, `attendanceDate`, `punchIn`, `punchOut`, `hours`, `present`, `absent`, `halfDay`, `onLeave`, `weeklyOff`, `holiday` |
| **Leave** | `leave`, `leaveType`, `fromDate`, `toDate`, `totalDays`, `reason`, `submitLeaveConfirm`, `cancelLeaveConfirm`, `deleteLeaveConfirm`, `leaveSubmitted`, `leaveCancelled`, `leaveDeleted` |
| **Holidays** | `holidays`, `holidayList`, `addHoliday`, `editHoliday`, `holidayDate` |
| **Payroll** | `payroll`, `salarySlip`, `netPay`, `processPayroll`, `processPayrollConfirm`, `payrollProcessed`, `grossPay`, `totalIncentives`, `totalDeductions`, `paymentPeriod` |
| **Dashboard** | `totalEmployees`, `activeEmployees`, `presentToday`, `absentToday`, `onLeaveToday`, `halfDayToday`, `pendingLeaves`, `upcomingHolidays` |
| **Status** | `status.present`, `status.absent`, `status.half_day`, `status.on_leave`, `status.weekly_off`, `status.holiday`, `status.active`, `status.left`, `status.inactive`, `status.suspended`, `status.terminated`, `status.retired`, `status.open`, `status.draft`, `status.submitted`, `status.approved`, `status.rejected`, `status.cancelled`, `status.closed`, `status.paid` |
| **Common** | `common.add`, `common.edit`, `common.delete`, `common.save`, `common.cancel`, `common.submit`, `common.search`, `common.name`, `common.status`, `common.date`, `common.actions`, `common.noData`, `common.confirmDelete`, `common.error`, `common.refresh`, `common.total`, `common.close`, `common.active`, `common.draft`, `common.submitted`, `common.cancelled`, `common.paid`, `common.approved`, `common.rejected` |
| **Validation** | `validation.fieldRequired` |

### `locales/ar.ts` — العربية (114 مفتاح)

نفس المفاتيح بالضبط مع القيم العربية المقابلة.

## التبعيات

### تبعيات مباشرة (package.json)

| الحزمة | الإصدار | الوصف |
|--------|---------|-------|
| `fastfree-auth` | `workspace:*` | حزمة المصادقة والـ API client (getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost, callGet) |
| `vue` | `^3.5.22` | Vue.js framework |
| `vue-router` | `^5.0.6` | التوجيه |
| `pinia` | `^4.0.2` | إدارة الحالة |
| `quasar` | `^2.23.1` | إطار عمل UI |
| `@quasar/extras` | `^2.0.0` | أيقونات Material Design |

### تبعيات استيراد داخلية (from source)

| المصدر | الاستيراد |
|--------|----------|
| `fastfree-auth` | `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`, `callGet`, `ApiResponse` |
| `quasar-app-extension-fastfree-lowcode/src/runtime/i18n` | `useLcI18n` |
| `quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers` | `useStatusHelpers` |
| `quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber` | `useFormatNumber` |
| `quasar-app-extension-fastfree-lowcode/src/runtime/index` | `registerMessages`, `registerScreen`, `registerGroup`, `registerGroupPage` |

## سجل التغييرات

### 2026-08-08 — جلسة بناء fastfree_hr

1. إنشاء Types كاملة: `Employee`, `Department`, `Designation`, `Attendance`, `LeaveApplication`, `HolidayList`, `SalarySlip`, `HrSummary`
2. 9 خدمات: `employee`, `department`, `designation`, `attendance`, `leaveApplication`, `holidayList`, `salarySlip`, `payroll`, `report`
3. 7 شاشات: `EmployeeList`, `EmployeeForm`, `DepartmentForm`, `DesignationList`, `AttendanceList`, `LeaveApplicationList`, `PayrollScreen`
4. 114 مفتاح ترجمة (EN + AR)
5. `useHrStore` (Pinia) بـ 6 fetch methods
6. Boot file + quasar.config integration

### 2026-08-08 — إصلاحات TypeCheck (17 → 0)

1. `attendance.service.ts` — filters من array → Record object
2. `salarySlip.service.ts` — filters من array → Record object
3. `screens.ts` — إضافة AsyncComponentLoader type annotation
4. `AttendanceList.vue` — handler signature conflict fix
5. `EmployeeForm.vue` — exactOptionalPropertyTypes fixes (7 errors)
6. `PayrollScreen.vue` — string|undefined → string fix

### 2026-08-08 — إصلاحات شاملة (5 إصلاحات)

1. `EmployeeForm.vue` — نقل import { computed } إلى الأعلى
2. `PayrollScreen.vue` — استبدال hardcoded values بـ refs + shared formatNumber
3. `LeaveApplicationList.vue` — فحص result.success + shared statusHelpers
4. `AttendanceList.vue` — shared statusHelpers
5. `EmployeeList.vue` — shared statusHelpers
