# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Account(Document):
    def validate(self):
        self.validate_parent()
        self.validate_root_type()

    def validate_parent(self):
        if self.parent_account and self.parent_account == self.name:
            frappe.throw(_("An account cannot be its own parent"))

    def validate_root_type(self):
        if self.root_type and self.root_type not in (
            "Asset", "Liability", "Income", "Expense", "Equity"
        ):
            frappe.throw(_("Invalid Root Type"))
