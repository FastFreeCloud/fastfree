# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, time_diff_in_hours


class Attendance(Document):
    def validate(self):
        self.set_employee_name()
        self.calculate_working_hours()

    def set_employee_name(self):
        if not self.employee_name and self.employee:
            self.employee_name = frappe.db.get_value(
                "Employee", self.employee, "employee_name"
            ) or ""

    def calculate_working_hours(self):
        if self.in_time and self.out_time:
            self.working_hours = flt(time_diff_in_hours(self.out_time, self.in_time))
