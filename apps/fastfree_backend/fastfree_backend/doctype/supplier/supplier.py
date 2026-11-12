# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Supplier(Document):
    def validate(self):
        self.validate_email()

    def validate_email(self):
        if self.email and "@" not in self.email:
            frappe.throw(_("Invalid email address"))
