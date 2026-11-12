# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import date_diff, getdate


class LeaveApplication(Document):
    def validate(self):
        self.set_employee_name()
        self.validate_dates()
        self.set_total_leave_days()

    def set_employee_name(self):
        if not self.employee_name and self.employee:
            self.employee_name = frappe.db.get_value(
                "Employee", self.employee, "employee_name"
            ) or ""

    def validate_dates(self):
        if not self.from_date or not self.to_date:
            return
        if getdate(self.to_date) < getdate(self.from_date):
            frappe.throw(_("To Date must be on or after From Date"))

    def set_total_leave_days(self):
        if not self.from_date or not self.to_date:
            return
        days = date_diff(self.to_date, self.from_date) + 1
        if self.half_day and self.half_day_date:
            days -= 0.5
        self.total_leave_days = days

    def on_submit(self):
        self.status = "Approved"

    def on_cancel(self):
        self.status = "Cancelled"
