# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Invoice(Document):
    def validate(self):
        self.set_title()
        self.validate_party()
        self.calculate_amounts()

    def set_title(self):
        party = self.customer or self.supplier or ""
        label = f"{self.invoice_type} Invoice"
        self.title = f"{label} - {party}" if party else label

    def validate_party(self):
        if self.invoice_type == "Sales" and not self.customer:
            frappe.throw(_("Customer is required for a Sales Invoice"))
        if self.invoice_type == "Purchase" and not self.supplier:
            frappe.throw(_("Supplier is required for a Purchase Invoice"))
        if self.customer and self.supplier:
            frappe.throw(_("Select either a Customer or a Supplier, not both"))

    def calculate_amounts(self):
        quantity = flt(self.quantity)
        unit_price = flt(self.unit_price)
        self.amount = quantity * unit_price
        self.total_amount = (
            flt(self.amount) + flt(self.tax_amount) - flt(self.discount_amount)
        )
        self.grand_total = flt(self.total_amount)

    def on_submit(self):
        self.status = "Submitted"
        self.outstanding_amount = flt(self.grand_total)

    def on_cancel(self):
        self.status = "Cancelled"
