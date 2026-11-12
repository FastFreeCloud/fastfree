# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Designation(Document):
    def validate(self):
        if not self.designation_name:
            frappe.throw(_("Designation Name is required"))
