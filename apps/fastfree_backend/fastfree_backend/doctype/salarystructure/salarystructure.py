# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class SalaryStructure(Document):
    def validate(self):
        self.validate_dates()
        self.calculate_net_pay()

    def validate_dates(self):
        if self.from_date and self.to_date:
            if getdate(self.to_date) < getdate(self.from_date):
                frappe.throw(_("To Date must be on or after From Date"))

    def calculate_net_pay(self):
        self.gross_pay = flt(self.base)
        self.total_deduction = flt(self.leave_without_pay)
        self.net_pay = flt(self.gross_pay) - flt(self.total_deduction)

    def on_submit(self):
        self.status = "Active"

    def on_cancel(self):
        self.status = "Cancelled"
