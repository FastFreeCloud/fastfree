# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class SalesOrder(Document):
    def validate(self):
        self.set_title()
        self.calculate_amounts()

    def set_title(self):
        customer = self.customer or ""
        self.title = f"Sales Order - {customer}" if customer else "Sales Order"

    def calculate_amounts(self):
        self.amount = flt(self.quantity) * flt(self.rate)
        self.total_amount = (
            flt(self.amount) + flt(self.tax_amount) - flt(self.discount_amount)
        )
        self.grand_total = flt(self.total_amount)

    def on_submit(self):
        self.status = "Submitted"

    def on_cancel(self):
        self.status = "Cancelled"
