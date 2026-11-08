# FastFree ERP — Autonomous Development Goals

## Vision
Develop FastFree ERP into a complete, production-ready Enterprise Resource Planning system with 9 apps and 9 packages, using free/open-source tools only.

## Current State
- **Frontend:** Quasar (Vue 3 + TypeScript), 9 apps, 9 packages, monorepo (pnpm)
- **Backend:** Frappe (Python) — scaffold only (7 files, 250 lines)
- **Infrastructure:** NixOS/Clan (11 nodes)
- **Desktop:** Tauri (Rust)
- **Website:** Next.js
- **Design Score:** 7/10
- **Testing:** 2 Cypress E2E specs, no Vitest config
- **Android:** 4 Capacitor apps (ERP, POS, HR, Ledger)

## Development Team (Hermes Profiles)
| Profile | Role | Specialty |
|---------|------|-----------|
| cto | CTO/Engineering Manager | Architecture, coordination, decisions |
| pm | Product Manager | Requirements, roadmap, prioritization |
| architect | Software Architect | System design, patterns, scalability |
| uiux | UI/UX Designer | Design system, RTL, accessibility |
| frontend | Frontend Developer | Vue/Quasar, components, stores |
| backend | Backend Developer | Frappe/Python, DocTypes, API |
| devops | DevOps Engineer | CI/CD, NixOS, deployment |
| qa | QA Engineer | Testing, quality assurance |
| security | Security Engineer | Audits, vulnerability scanning |
| reviewer | Code Reviewer | Code quality, best practices |

## Autonomous Development Goals

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish solid foundation for all modules

1. **Backend Scaffold → Full API**
   - Create Frappe DocTypes for all modules (Employee, Department, etc.)
   - Implement REST API endpoints
   - Add authentication and permissions
   - Set up database migrations

2. **Testing Infrastructure**
   - Configure Vitest for unit tests
   - Set up Cypress for E2E tests
   - Add test coverage reporting
   - Create test data fixtures

3. **CI/CD Pipeline**
   - GitHub Actions for lint, typecheck, test, build
   - Automated PR checks
   - Deployment to staging

### Phase 2: HR Module (Week 3-4)
**Goal:** Complete HR module with full CRUD

1. **Employee Management**
   - Employee list, create, edit, delete
   - Employee profile with documents
   - Search and filtering

2. **Department & Designation**
   - Department CRUD
   - Designation CRUD
   - Org chart

3. **Attendance & Leave**
   - Attendance tracking
   - Leave application and approval
   - Leave balance calculation

4. **Payroll**
   - Salary structure
   - Payroll processing
   - Salary slip generation

5. **Reports**
   - Employee reports
   - Attendance reports
   - Payroll reports

### Phase 3: Accounting Module (Week 5-6)
**Goal:** Complete accounting with ledger, invoices, payments

1. **Chart of Accounts**
2. **Journal Entries**
3. **Invoices (Sales & Purchase)**
4. **Payments**
5. **Bank Reconciliation**
6. **Financial Reports**

### Phase 4: Inventory Module (Week 7-8)
**Goal:** Complete inventory management

1. **Items & Categories**
2. **Stock Management**
3. **Warehouses**
4. **Stock Movements**
5. **Inventory Reports**

### Phase 5: Sales & Purchase (Week 9-10)
**Goal:** Complete sales and purchase workflows

1. **Sales Orders & Quotations**
2. **Purchase Orders & RFQs**
3. **Customer & Supplier Management**
4. **Sales/Purchase Reports**

### Phase 6: Integration & Polish (Week 11-12)
**Goal:** Integrate all modules and polish

1. **Cross-module integration**
2. **Dashboard & Analytics**
3. **Notifications & Alerts**
4. **Performance optimization**
5. **Security audit**
6. **Documentation**

## Development Workflow

### Daily Cycle
1. **Morning:** Check Kanban board, pick tasks
2. **Development:** Use subagents for parallel work
3. **Review:** Code review + security scan
4. **Test:** Run tests + E2E
5. **Commit:** Git commit with descriptive message
6. **Evening:** Update Kanban, plan next day

### Task Assignment
- PM defines requirements → creates Kanban tasks
- CTO assigns tasks to specialists
- Specialists implement using subagents
- QA tests implementation
- Security scans for vulnerabilities
- Reviewer reviews code
- DevOps deploys to staging

### Quality Gates
- TypeScript strict mode: 0 errors
- ESLint: 0 warnings
- Test coverage: >80%
- Security scan: 0 critical/high
- Code review: approved

## Free-First Tools
- **LLM:** reflection/beam-1.0-501b-a23b:free (Nous)
- **Frontend:** Quasar, Vue 3, TypeScript, Pinia, Vite
- **Backend:** Frappe, Python, MariaDB
- **Testing:** Vitest, Cypress, Playwright, Midscene
- **Security:** Semgrep, OWASP ZAP
- **CI/CD:** GitHub Actions
- **Infrastructure:** NixOS, Clan, Docker
- **Monitoring:** Prometheus, Grafana (open source)

## Metrics
- **Code Coverage:** Target 80%+
- **TypeScript Errors:** 0
- **ESLint Warnings:** 0
- **Security Vulnerabilities:** 0 critical/high
- **Build Time:** <5 minutes
- **Test Time:** <2 minutes

## Success Criteria
- All 9 apps build successfully
- All 9 packages have tests
- HR module fully functional
- Accounting module fully functional
- Inventory module fully functional
- Sales/Purchase modules fully functional
- Design score: 9/10
- Security audit: pass
- Documentation: complete
