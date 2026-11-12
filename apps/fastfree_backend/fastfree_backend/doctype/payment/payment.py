# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Payment(Document):
    def validate(self):
        self.set_title()
        self.validate_party()
        self.validate_amount()

    def set_title(self):
        self.title = f"{self.payment_type} - {self.party or ''}"

    def validate_party(self):
        if self.payment_type == "Receive" and self.party_type != "Customer":
            frappe.throw(_("Payment Type Receive requires a Customer"))
        if self.payment_type == "Pay" and self.party_type not in ("Supplier", "Employee"):
            frappe.throw(_("Payment Type Pay requires a Supplier or an Employee"))

    def validate_amount(self):
        if flt(self.amount) <= 0:
            frappe.throw(_("Amount must be greater than zero"))

    def on_submit(self):
        self.status = "Submitted"

    def on_cancel(self):
        self.status = "Cancelled"
