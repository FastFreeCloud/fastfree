import re
from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document


class Employee(Document):
    def validate(self):
        self._validate_required()
        self._validate_email()
        self._validate_dates()
        self._validate_employee_number()

    def _validate_required(self):
        if not self.employee_name:
            frappe.throw(_("Employee Name is required"))
        if not self.employee_number:
            frappe.throw(_("Employee Number is required"))
        if not self.date_of_joining:
            frappe.throw(_("Date of Joining is required"))
        if not self.status:
            frappe.throw(_("Status is required"))

    def _validate_email(self):
        if self.email:
            pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
            if not re.match(pattern, self.email):
                frappe.throw(_("Invalid email address"))

    def _validate_dates(self):
        if self.date_of_birth and self.date_of_joining:
            try:
                dob = frappe.utils.getdate(self.date_of_birth)
                doj = frappe.utils.getdate(self.date_of_joining)
            except Exception:
                frappe.throw(_("Invalid date value"))
                return
            if dob >= doj:
                frappe.throw(_("Date of Birth must be before Date of Joining"))
            if dob > date.today():
                frappe.throw(_("Date of Birth cannot be in the future"))

    def _validate_employee_number(self):
        if self.employee_number:
            existing = frappe.db.get_value(
                "Employee", {"employee_number": self.employee_number, "name": ["!=", self.name or ""]}
            )
            if existing:
                frappe.throw(_("Employee Number already exists"))